// backend/server.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const qs = require("qs");
const crypto = require("crypto"); // Make sure crypto is imported
const path = require("path");
const NodeCache = require("node-cache");
const https = require("https");
const { CosmosClient } = require("@azure/cosmos");
const jwt = require('jsonwebtoken');
const JwksRsa = require('jwks-rsa');
const config = require("./config"); 

const app = express();
app.use(cors());
app.use(express.json());

// State storage with TTL (10 minutes)
const stateCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Token cache for multiple reports
const tokenCache = new Map();

const PORT = process.env.PORT || 3000;

// Axios instance with keep-alive
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ keepAlive: true }),
});

const azureOpenAIApiUrl = `https://${config.azureOpenAIApiInstanceName}.openai.azure.com/openai/deployments/${config.azureOpenAIApiDeploymentName}/chat/completions?api-version=${config.azureOpenAIApiVersion}`;

// --- Container Variables ---
let customizationContainer;
let sessionHistoryContainer; 
let llmConfigurationContainer;

const llmConfigCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // Cache LLM config for 5 minutes
const LLM_CONFIG_CACHE_KEY = 'llm_config_cache';

// --- Default LLM Configuration (fallback) ---
const DEFAULT_LLM_CONFIG = {
  systemPrompt: "You are a helpful AI assistant designed to analyze dashboard data. Provide insights based *only* on the data snapshot provided. Do not make up information.",
  temperature: 0.7,
  max_tokens: 500,
};

const jwksClient = JwksRsa({
  jwksUri: `https://login.microsoftonline.com/${config.tenantId}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000,
});

function getSigningKey(header, callback) {
  if (!header || !header.kid) {
    return callback(new Error('JWT header missing kid.'));
  }
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error(`[${getISTTime()}] Error fetching signing key:`, err);
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

const jwtOptions = {
  audience: config.clientId,
  issuer: `https://login.microsoftonline.com/${config.tenantId}/v2.0`,
  algorithms: ["RS256"],
};

// --- NEW: Helper to generate a deterministic ID for dummy users ---
function generateDeterministicUserId(inputString) {
  // Use SHA256 to create a consistent, unique hash for the input string (e.g., email)
  const hash = crypto.createHash('sha256');
  hash.update(inputString);
  // Take a portion of the hash for a shorter, but still unique-enough ID for dev purposes
  return hash.digest('hex').substring(0, 16); // e.g., "9Rwj..."
}

// --- Initialize Cosmos DB ---
async function initializeCosmosDb() {
  try {
    const client = new CosmosClient({
      endpoint: config.cosmosDbEndpoint,
      key: config.cosmosDbKey,
    });
    const database = client.database(config.cosmosDbDatabaseId);

    await client.databases.createIfNotExists({ id: config.cosmosDbDatabaseId });

    // --- Customization Container ---
    const customizationContainerResponse = await database.containers.createIfNotExists({
      id: config.cosmosDbContainerId,
      partitionKey: { paths: ["/userId"] },
    });
    customizationContainer = customizationContainerResponse.container;
    console.log(`[${getISTTime()}] Cosmos DB Initialized: Customization Container=${config.cosmosDbContainerId}`);

    // --- Session History Container ---
    const sessionContainerId = config.cosmosDbSessionContainerId; 
    if (!sessionContainerId) {
        throw new Error("Missing COSMOS_SESSION_CONTAINER_ID in configuration");
    }
    const sessionContainerResponse = await database.containers.createIfNotExists({
      id: sessionContainerId,
      partitionKey: { paths: ["/userId"] }, 
    });
    sessionHistoryContainer = sessionContainerResponse.container; 
    console.log(`[${getISTTime()}] Cosmos DB Initialized: Session History Container=${sessionContainerId}`);

    // --- LLM Configuration Container ---
    const llmContainerResponse = await database.containers.createIfNotExists({
        id: config.cosmosDbLlmConfigContainerId,
        partitionKey: { paths: ["/configId"] },
    });
    llmConfigurationContainer = llmContainerResponse.container;
    console.log(`[${getISTTime()}] Cosmos DB Initialized: LLM Config Container=${config.cosmosDbLlmConfigContainerId}`);

    // --- Pre-fetch LLM config on startup ---
    await getLLMConfiguration(true);

  } catch (error) {
    console.error(`[${getISTTime()}] FATAL: Failed to initialize Cosmos DB:`, error);
    process.exit(1);
  }
}

// Authentication Middleware
const verifyAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log(`[${getISTTime()}] Auth Error: Missing or malformed Authorization header`);
        return res.status(401).json({ message: 'Unauthorized: Missing or invalid token format' });
    }
    const token = authHeader.split(' ')[1];

    // --- DEV-ONLY: Dummy Token Bypass ---
    // Look for tokens starting with 'dummy-jwt-token-for-user-'
    if (token.startsWith('dummy-jwt-token-for-user-')) { 
        const parts = token.split('dummy-jwt-token-for-user-');
        if (parts.length > 1) {
            // The part after the prefix is the user identifier (e.g., "user_at_example_dot_com")
            const userIdentifier = parts[1];
            // Generate a deterministic ID based on this identifier
            const devUserId = generateDeterministicUserId(userIdentifier);
            const devUserName = userIdentifier.replace(/_at_/g, '@').replace(/_dot_/g, '.'); // Convert back to email format
            
            console.warn(`[${getISTTime()}] DEV-ONLY: Bypassing JWT verification for dummy user: ${devUserName} (ID: ${devUserId})`);
            req.user = {
                id: devUserId, 
                name: devUserName.split('@')[0], // Simple name extraction
                email: devUserName,
            };
            next(); 
            return; 
        }
    }
    // --- END DEV-ONLY BYPASS ---

    jwt.verify(token, getSigningKey, jwtOptions, (err, decoded) => {
        if (err) {
        console.error(`[${getISTTime()}] Auth Error: JWT Verification failed:`, err.message);
        if (err.name === 'TokenExpiredError') return res.status(401).json({ message: 'Unauthorized: Token expired' });
        if (err.name === 'JsonWebTokenError') return res.status(401).json({ message: `Unauthorized: Invalid token (${err.message})` });
        if (err.message.includes('Unable to find a signing key')) return res.status(401).json({ message: 'Unauthorized: Cannot verify token signature (key issue)'});
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }

        if (!decoded || !decoded.sub) {
            console.error(`[${getISTTime()}] Auth Error: Invalid token payload - missing 'sub' claim.`);
            return res.status(401).json({ message: 'Unauthorized: Invalid token payload' });
        }

        req.user = {
            id: decoded.sub,
            name: decoded.name,
            email: decoded.preferred_username,
        };
        console.log(`[${getISTTime()}] Auth Success: User ${req.user.id} (${req.user.name || 'N/A'}) authenticated.`);
        next();
    });
};

// --- GET User Dashboard Customization ---
app.get("/api/user/dashboard", verifyAuth, async (req, res) => {
   const userId = req.user.id;
   console.log(`[${getISTTime()}] GET /api/user/dashboard for user: ${userId}`);
   if (!customizationContainer) return res.status(503).json({ message: "Customization Database not available" });

   try {
       const { resource: customization } = await customizationContainer.item(userId, userId).read();
       if (customization) {
         // The new structure saves pages directly under a 'pages' key.
         // If old format (where 'visualOrder' was the array of pages) is encountered, adapt.
         if (customization.pages) {
             res.json(customization.pages); // Return the array of pages
         } else if (customization.visualOrder && Array.isArray(customization.visualOrder)) {
             // This branch is for backward compatibility if `visualOrder` previously stored the array of pages.
             console.warn(`[${getISTTime()}] Found old customization format for ${userId}. Returning 'visualOrder' as pages.`);
             res.json(customization.visualOrder);
         } else {
             // If no recognizable page structure is found.
             console.warn(`[${getISTTime()}] Customization found for ${userId} but no 'pages' or 'visualOrder' array. Returning 404.`);
             res.status(404).json({ message: "No usable customization data found" });
         }
       } else {
         res.status(404).json({ message: "No customization found" });
       }
   } catch (error) {
       if (error.code === 404) {
           console.log(`[${getISTTime()}] No customization found for user ${userId}`);
           return res.status(404).json({ message: "No customization found" });
       }
       console.error(`[${getISTTime()}] Error fetching dashboard config for ${userId}:`, error);
       res.status(500).json({ message: "Failed to fetch dashboard customization" });
   }
});

// --- PUT (Save/Update) User Dashboard Customization ---
app.put("/api/user/dashboard", verifyAuth, express.json(), async (req, res) => {
   const userId = req.user.id;
   // Expect 'visualOrder' in the request body to be the array of DashboardPage objects.
   // `selectedDynamicReports` is also passed for backward compatibility, but not used here.
   const { visualOrder: pages, selectedDynamicReports } = req.body; 

   console.log(`[${getISTTime()}] PUT /api/user/dashboard for user: ${userId}`);
   if (!customizationContainer) return res.status(503).json({ message: "Customization Database not available" });

   // Validate incoming data: `pages` (received as `visualOrder`) should be an array.
   if (!Array.isArray(pages)) {
       return res.status(400).json({ message: "Invalid data format. Expected 'visualOrder' (pages) as an array." });
   }

   const customizationData = {
       id: userId,        // Document ID (same as userId)
       userId: userId,    // Partition Key for Cosmos DB
       pages: pages,      // Store the array of pages directly
       // selectedDynamicReports: selectedDynamicReports, // You can store this if needed, otherwise omit
       lastUpdated: new Date().toISOString(), // Timestamp of last update
   };

   try {
       // Use `upsert` to create the document if it doesn't exist, or replace it if it does.
       const { resource: savedCustomization } = await customizationContainer.items.upsert(customizationData);
       console.log(`[${getISTTime()}] Saved customization for user ${userId}`);
       res.status(200).json(savedCustomization);
   } catch (error) {
       console.error(`[${getISTTime()}] Error saving dashboard config for ${userId}:`, error);
       res.status(500).json({ message: "Failed to save dashboard customization" });
   }
});


// --- Time formatting functions ---
function formatToIST(timestamp) {
    return new Date(timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function getISTTime() {
    const date = new Date();
    const options = { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false };
    return date.toLocaleTimeString("en-IN", options);
}


// --- Token Cache Utilities ---
function isTokenExpired(reportId) {
    const tokenData = tokenCache.get(reportId);
    if (!tokenData) return true;
    return Date.now() >= tokenData.expirationTime - 5 * 60 * 1000; // 5-minute buffer
}
function setToken(reportId, tokenData) {
    if (!tokenData || !tokenData.token || !tokenData.expiration) {
      console.log(`[${getISTTime()}] Token Cache - Invalid token data for report ${reportId}`);
      return;
    }
    const expirationTime = new Date(tokenData.expiration).getTime();
    tokenCache.set(reportId, {
      embedToken: tokenData.token,
      expirationTime,
    });
    const expiryIST = formatToIST(expirationTime);
    console.log(`[${getISTTime()}] Token Cache - Token cached for report ${reportId}, expires at ${expiryIST} IST`);

    const timeToRefresh = expirationTime - Date.now() - 5 * 60 * 1000;
    if (timeToRefresh > 0) {
      setTimeout(() => {
        console.log(`[${getISTTime()}] Token Refresher - Refreshing token for report ${reportId}`);
        getEmbedToken(reportId, true).catch((err) => console.error(`[${getISTTime()}] Token Refresh Error: ${err.message}`));
      }, timeToRefresh);
    }
}

// --- OAuth Endpoints ---
app.get("/auth/login", (req, res) => {
    const state = crypto.randomBytes(16).toString("hex");
    stateCache.set(state, true);
    const authUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?client_id=${config.clientId}&response_type=code&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_mode=query&scope=openid%20profile%20email&state=${state}`;
    res.redirect(authUrl);
});

app.get("/auth/callback", async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send("Missing code or state");
    if (stateCache.get(state) === undefined) {
        console.log(`[${getISTTime()}] GET /auth/callback - Invalid or expired state: ${state}`);
        return res.status(400).send("Invalid or expired state parameter");
    }
    stateCache.del(state);
    try {
        const tokenResponse = await axiosInstance.post(
            `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
            qs.stringify({ grant_type: "authorization_code", code, redirect_uri: config.redirectUri, client_id: config.clientId, client_secret: config.clientSecret }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        const userToken = tokenResponse.data;
        const redirectUrl = `${config.frontendRedirectUri}?token=${userToken.id_token}`;
        res.redirect(redirectUrl);
    } catch (error) {
        console.error(`[${getISTTime()}] GET /auth/callback - Error: ${error.message}`);
        res.status(500).send("Authentication failed");
    }
});

// --- Embed Token Generation ---
async function getEmbedToken(reportId, forceRefresh = false) {
    if (!forceRefresh && !isTokenExpired(reportId)) {
        const tokenData = tokenCache.get(reportId);
        console.log("tokenData.embedToken", tokenData.embedToken);
        return { token: tokenData.embedToken, expiration: new Date(tokenData.expirationTime).toISOString() };
    }
    try {
        const tokenResponse = await axiosInstance.post(
            `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
            qs.stringify({ grant_type: "client_credentials", client_id: config.clientId, client_secret: config.clientSecret, scope: "https://analysis.windows.net/powerbi/api/.default" }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        const accessToken = tokenResponse.data.access_token;
        await axiosInstance.get(
            `https://api.powerbi.com/v1.0/myorg/groups/${config.workspaceId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const embedResponse = await axiosInstance.post(
            `https://api.powerbi.com/v1.0/myorg/groups/${config.workspaceId}/reports/${reportId}/GenerateToken`,
            { accessLevel: "View", allowSaveAs: false },
            { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
        );
        setToken(reportId, embedResponse.data);
        return embedResponse.data;
    } catch (error) {
        console.error(`[${getISTTime()}] getEmbedToken - Error: ${error.message}`);
        throw error;
    }
}

app.get("/getEmbedToken", async (req, res) => {
    const reportId = config.reportId;
    const forceRefresh = req.query.forceRefresh === "true";
    try {
        const result = await getEmbedToken(reportId, forceRefresh);
        const embedUrl = `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${config.workspaceId}`;
        const tokenData = tokenCache.get(reportId);
        const expirationIST = tokenData ? formatToIST(tokenData.expirationTime) : "N/A";
        res.json({
            token: result.token,
            embedUrl,
            expiration: `${expirationIST} IST`,
            reportId,
            cacheStatus: tokenData && !isTokenExpired(reportId) ? `Cached token valid until ${new Date(tokenData.expirationTime).toISOString()}` : "No valid token in cache",
        });
    } catch (error) {
        res.status(500).json({ error: true, errorMessage: "Failed to generate embed token", details: error.message });
    }
});

// --- LLM Configuration Fetching ---
async function getLLMConfiguration(forceRefresh = false) {
    const cachedConfig = llmConfigCache.get(LLM_CONFIG_CACHE_KEY);
    if (!forceRefresh && cachedConfig) {
        console.log(`[${getISTTime()}] LLM Config: Using cached config.`);
        return cachedConfig;
    }

    if (!llmConfigurationContainer) {
        console.warn(`[${getISTTime()}] LLM Config: Container not available, using default.`);
        return DEFAULT_LLM_CONFIG;
    }

    try {
        const docId = config.llmConfigDocId;
        const partitionKey = config.llmConfigPartitionKey;
        console.log(`[${getISTTime()}] LLM Config: Fetching from DB (ID=${docId}, PK=${partitionKey})`);
        const { resource } = await llmConfigurationContainer.item(docId, partitionKey).read();

        if (resource) {
            const configData = {
                systemPrompt: resource.systemPrompt || DEFAULT_LLM_CONFIG.systemPrompt,
                temperature: resource.temperature ?? DEFAULT_LLM_CONFIG.temperature, 
                max_tokens: resource.max_tokens || DEFAULT_LLM_CONFIG.max_tokens,
            };
            console.log(`[${getISTTime()}] LLM Config: Found in DB:`, configData);
            llmConfigCache.set(LLM_CONFIG_CACHE_KEY, configData); 
            return configData;
        } else {
            console.warn(`[${getISTTime()}] LLM Config: Config document not found in DB, using default.`);
            llmConfigCache.set(LLM_CONFIG_CACHE_KEY, DEFAULT_LLM_CONFIG); 
            return DEFAULT_LLM_CONFIG;
        }
    } catch (err) {
        if (err.code === 404) {
            console.warn(`[${getISTTime()}] LLM Config: Config document not found (404), using default.`);
        } else {
            console.error(`[${getISTTime()}] LLM Config: Error reading config from DB:`, err);
        }
        llmConfigCache.set(LLM_CONFIG_CACHE_KEY, DEFAULT_LLM_CONFIG); 
        return DEFAULT_LLM_CONFIG;
    }
}

// --- LLM Response Endpoint (Stream, No History Persistence) ---
app.post('/llm-response', verifyAuth, async (req, res) => {
  const userId = req.user.id;
  console.log("req.body: ", req.body);
  const { data, messages: currentSessionMessages, userInput } = req.body;

  console.log(`[${getISTTime()}] POST /llm-response User: ${userId}, Input: "${userInput}"`);

  if (!userInput || !Array.isArray(currentSessionMessages)) {
      return res.status(400).json({ error: "Missing userInput or invalid messages format" });
  }

  try {
      const llmConfig = await getLLMConfiguration();

      const messagesForLLM = [
          {
              role: "system",
              content: `${llmConfig.systemPrompt}\n*If the data is not available request the user to wait untill the charts load!\n\n*Use the following data:\n${data}`
          },
          ...currentSessionMessages, 
          { role: "user", content: userInput }
      ];

      console.log(`[${getISTTime()}] LLM Request User: ${userId} - Temp: ${llmConfig.temperature}, MaxTokens: ${llmConfig.max_tokens}. Messages sent: ${messagesForLLM.length}`);

      const llmResponse = await axiosInstance.post(azureOpenAIApiUrl, {
          messages: messagesForLLM, 
          stream: true,
          temperature: llmConfig.temperature,
          max_tokens: llmConfig.max_tokens
      }, {
          headers: {
              'api-key': config.azureOpenAIApiKey,
              'Content-Type': 'application/json'
          },
          responseType: 'stream'
      });
      const responseStream = llmResponse.data;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      responseStream.on('data', (chunk) => {
          res.write(chunk); 
      });

      responseStream.on('end', () => {
          console.log(`[${getISTTime()}] LLM Stream End User: ${userId}.`);
          res.end(); 
      });

      responseStream.on('error', (streamError) => {
          console.error(`[${getISTTime()}] LLM Stream Error User ${userId}:`, streamError);
          if (!res.headersSent) {
              res.status(500).json({ error: 'LLM stream failed' });
          } else {
              res.write('event: error\ndata: {"message": "Stream error occurred"}\n\n');
              res.end();
          }
      });

  } catch (error) {
      console.error(`[${getISTTime()}] LLM Endpoint Error User ${userId}:`, error.response?.data || error.message);
      if (!res.headersSent) {
         res.status(error.response?.status || 500).json({ error: 'LLM processing failed', details: error.response?.data?.error?.message || error.message });
      } else {
         res.write(`event: error\ndata: {"message": "Internal server error: ${error.message}"}\n\n`);
         res.end();
      }
  }
});


// --- NEW: Save Chat Session Endpoint ---
app.post("/api/session/save", verifyAuth, async (req, res) => {
    const userId = req.user.id;
    const { sessionId, messages, reason } = req.body; 

    console.log(`[${getISTTime()}] POST /api/session/save User: ${userId}, Session: ${sessionId}, Reason: ${reason}, Messages: ${messages?.length ?? 0}`);

    if (!sessionHistoryContainer) {
        return res.status(503).json({ message: "Session Database not available" });
    }
    if (!sessionId || !Array.isArray(messages) || messages.length === 0 || !reason) {
        return res.status(400).json({ message: "Invalid data: Missing sessionId, messages, zero messages, or reason" });
    }

    const sessionData = {
        id: sessionId,          
        sessionId: sessionId,   
        userId: userId,         
        messages: messages,     
        saveReason: reason,     
        sessionEndedAt: new Date().toISOString(),
    };

    try {
        await sessionHistoryContainer.items.create(sessionData); 
        console.log(`[${getISTTime()}] Session Saved: User ${userId}, Session ${sessionId}`);
        res.status(201).json({ message: "Session saved successfully" });
    } catch (error) {
        console.error(`[${getISTTime()}] Error saving session User ${userId}, Session ${sessionId}:`, error);
        if (error.code === 409) {
             return res.status(409).json({ message: "Conflict: Session ID already exists" });
        }
        res.status(500).json({ message: "Failed to save session data" });
    }
});


// --- Static Files and Catch-all ---
app.use(express.static(path.join(__dirname, "../dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist", "index.html"), (err) => {
    if (err) res.status(500).send(err);
  });
});

// Initialize DB and Start Server
initializeCosmosDb().then(() => {
    app.listen(PORT, () => {
        console.log(`[${getISTTime()}] Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error(`[${getISTTime()}] Server failed to start due to DB initialization error: ${err}`);
    process.exit(1);
});