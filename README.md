🚀 Customizable PowerBI Dashboard with AI Assistant

This repository hosts a modern web application designed to provide a highly customizable dashboard for visualizing Power BI reports, enhanced with an integrated AI assistant for deeper data insights. Users can tailor their dashboard layout, add or remove Power BI visuals, create multiple pages, and interact with their data using natural language queries powered by Azure OpenAI.

The project is structured into a React/TypeScript frontend and a Node.js/Express backend, interacting with Azure Power BI Embedded, Azure Active Directory, Azure OpenAI Service, and Azure Cosmos DB for persistence.

✨ Features

Dynamic Power BI Visual Embedding: Seamlessly embed and display specific visuals from a Power BI report within the dashboard.

Customizable Grid Layout: Users can drag, resize, and remove charts in an interactive grid.

Multi-Page Dashboard: Create and manage multiple custom dashboard pages, each with its own set of visuals and layout.

AI Chatbot Integration: An Azure OpenAI-powered assistant provides insights and answers questions based on the visible Power BI data.

Real-time Notifications: In-app notification system for user feedback and alerts.

Theme Switching: Toggle between light and dark modes.

User Authentication: Secure authentication using Azure AD OAuth2/OpenID Connect.

State Persistence: User-specific dashboard layouts and chat history are saved in Azure Cosmos DB.

Responsive Design: Adapts to various screen sizes.


🛠️ Technologies Used

Frontend:

React: JavaScript library for building user interfaces.

TypeScript: Superset of JavaScript for type safety.

Vite: Fast development build tool.

Tailwind CSS: Utility-first CSS framework.

Shadcn UI: Reusable UI components built with Radix UI and Tailwind CSS.

React Grid Layout: For drag-and-drop and resizable grid functionality.

Power BI Client SDK: @microsoft/powerbi-client-react and powerbi-client for embedding.

Backend:

Node.js: JavaScript runtime.

Express.js: Web application framework.

@azure/cosmos: Azure Cosmos DB Node.js SDK.

jose / jsonwebtoken / jwks-rsa: For JWT token validation and JWKS fetching.

@langchain/azure-openai / @langchain/core: For interacting with Azure OpenAI service (mocked for streaming in server.js).

Azure Services:

Azure Power BI Embedded: For embedding Power BI reports and visuals.

Azure Active Directory (Azure AD): For user authentication (OAuth2/OpenID Connect).

Azure OpenAI Service: For AI chatbot capabilities.

Azure Cosmos DB: NoSQL database for storing user customizations and chat history.

🚀 Getting Started

Follow these instructions to set up and run the project locally.

Prerequisites

Node.js: v18.x or higher (LTS recommended)

npm: v9.x or higher (comes with Node.js) or Yarn

Git: Latest version

An Azure Account: With permissions to create and manage the necessary resources.

☁️ Azure Cloud Resource Setup

Before running the application, you must configure the following Azure services:

Azure App Registration (for Authentication):

Register a new application in your Azure AD tenant.

Set Web as a Redirect URI to your backend's /auth/callback endpoint (e.g., http://localhost:3000/auth/callback for local development).

Generate a Client Secret and record its value immediately.

Grant API permissions for Power BI Service (e.g., Report.Read.All, Report.ReadWrite.All, Workspace.Read.All).

Note your Application (client) ID and Directory (tenant) ID.

Power BI Workspace and Report:

Have an existing Power BI Workspace and a report within it.

Record your Workspace ID and the Report ID of the report you want to embed.

Azure OpenAI Service:

Deploy an Azure OpenAI resource.

Create a Chat Completion Model deployment (e.g., gpt-35-turbo).

Record your API Key, Instance Name, Deployment Name, and API Version.

Azure Cosmos DB:

Create an Azure Cosmos DB account (Core (SQL) API).

Record your Endpoint and Primary Key.

The application will automatically create the necessary databases and containers (UserDashboards, Customizations, ConversationHistory, LlmConfig, SessionHistory) if they don't exist.

💡 Tip: Refer to the official Azure documentation for detailed step-by-step guides on setting up these services.

🔑 Environment Configuration

Create a .env file in the root directory of the project and another .env file inside the backend/ directory.

Root .env (for Frontend):

VITE_YOUR_BACKEND_API_URL="http://localhost:3000" # Or your deployed backend URL
VITE_FRONTEND_REDIRECT_URI="http://localhost:5173" # Or your deployed frontend URL
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Env
IGNORE_WHEN_COPYING_END

backend/.env (for Backend):

# Azure AD / Authentication
CLIENT_ID="<Your_Azure_AD_Application_Client_ID>"
CLIENT_SECRET="<Your_Azure_AD_Client_Secret_Value>"
TENANT_ID="<Your_Azure_AD_Directory_Tenant_ID>"

# Power BI Embedding
WORKSPACE_ID="<Your_PowerBI_Workspace_ID_GUID>"
REPORT_ID="<Your_PowerBI_Report_ID_GUID>"
REDIRECT_URI="http://localhost:3000/auth/callback" # Backend callback URL (must match App Registration)
FRONTEND_REDIRECT_URI="http://localhost:5173" # Frontend URL after successful login (must match VITE_FRONTEND_REDIRECT_URI)

# Azure OpenAI
AZURE_OPENAI_API_KEY="<Your_Azure_OpenAI_API_Key>"
AZURE_OPENAI_INSTANCE_NAME="<Your_Azure_OpenAI_Resource_Name>"
AZURE_OPENAI_DEPLOYMENT_NAME="<Your_Azure_OpenAI_Model_Deployment_Name>" # e.g., gpt-35-turbo-deployment
AZURE_OPENAI_API_VERSION="2024-02-15-preview" # Or your specific version

# Azure Cosmos DB
COSMOS_DB_ENDPOINT="<Your_Cosmos_DB_Endpoint_URI>"
COSMOS_DB_KEY="<Your_Cosmos_DB_Primary_Key>"
# Optional: customize database/container IDs
COSMOS_DB_DATABASE_ID="UserDashboards"
COSMOS_DB_CONTAINER_ID="Customizations"
COSMOS_DB_CHATHISTORY_CONTAINER_ID="ConversationHistory"
COSMOS_DB_LLM_CONFIG_CONTAINER_ID="LlmConfig"
COSMOS_DB_LLM_CONFIG_DOC_ID="defaultConfig"
COSMOS_DB_LLM_CONFIG_PARTITION_KEY="global"
COSMOS_SESSION_CONTAINER_ID="SessionHistory"

# Backend Server Port
PORT=3000
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Env
IGNORE_WHEN_COPYING_END

⚠️ Security Warning: Never commit .env files to Git. .gitignore is configured to ignore them. For production deployments, use secure environment variable management (e.g., Azure App Service Application Settings).

⬇️ Installation

From the project root directory:

# Install backend dependencies
cd backend
npm install
# or yarn install

# Navigate back to root and install frontend dependencies
cd ..
npm install
# or yarn install
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END
💻 Running Locally

Start the Backend Server:

cd backend
npm start
# or yarn start
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END

The backend server will run on http://localhost:3000 (or your configured PORT).

Start the Frontend Development Server:

cd ..
npm run dev
# or yarn dev
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END

The frontend application will typically open in your browser at http://localhost:5173.

💡 Local Authentication Bypass: For local development, you can use a "dummy token" mechanism. On the Login page, entering any email and password will simulate a successful login and store a dummy JWT token in localStorage. This allows you to test user-specific data persistence in Cosmos DB without needing a full Azure AD setup.

🔑 Authentication Flow

The application uses OAuth2.0 with OpenID Connect for user authentication via Azure AD.

Login Initiation: Unauthenticated users accessing the frontend are redirected to /login, which initiates the OAuth flow via the backend's /auth/login endpoint.

Azure AD Authorization: The backend redirects to Azure AD for user authentication.

Token Exchange: Upon successful authentication, Azure AD returns an authorization code to the backend. The backend exchanges this code for an access_token and an id_token.

Frontend Redirection: The backend redirects the user back to the frontend (FRONTEND_REDIRECT_URI) with the id_token in the URL.

Local Storage: The frontend stores the id_token in localStorage for session management and cleans the URL.

API Authorization: All subsequent frontend API calls to the backend include the id_token in the Authorization: Bearer <id_token> header. The backend validates this JWT token to authenticate requests.

🧠 Architecture Highlights

Separation of Concerns: Distinct frontend (React) and backend (Node.js) responsibilities.

Power BI Integration:

Visible Power BI visuals are embedded directly into the frontend.

A hidden Power BI report instance is embedded on the frontend to programmatically extract summarized data from various visuals, which is then used by the AI assistant for contextual insights.

AI Assistant Proxy: The backend acts as a secure proxy to Azure OpenAI, injecting extracted Power BI data into the LLM's system prompt and streaming responses.

Cosmos DB Persistence: User dashboard layouts and chat history are stored in Azure Cosmos DB, partitioned by userId.

🚢 Deployment

This application can be deployed to Azure using Azure App Services.

Frontend: The dist/ folder (generated by npm run build) can be deployed to an Azure Static Web App or an App Service configured for static content.

Backend: The backend/ folder can be deployed to an Azure App Service (Node.js Linux Web App).

Ensure all environment variables from your .env files are configured as Application Settings in your respective Azure App Service instances for secure and correct operation in a production environment.

🤝 Contributing

Contributions are welcome! If you find a bug, have a feature request, or want to improve the codebase, please:

Fork the repository.

Create a new branch (git checkout -b feature/your-feature-name).

Make your changes and ensure tests pass (if applicable).

Commit your changes (git commit -m 'feat: Add new feature').

Push to your fork (git push origin feature/your-feature-name).

Open a Pull Request to the main branch of this repository.

Please follow existing code style and ensure your commits are descriptive.

⚠️ Troubleshooting

Missing Environment Variables:

Symptom: Backend fails to start or frontend API calls fail.

Solution: Verify all variables in backend/.env and /.env (root) are set. For deployment, check Azure App Service Application Settings.

Power BI Embedding Issues:

Symptom: Blank visuals, errors in console.

Solution: Check CLIENT_ID, CLIENT_SECRET, TENANT_ID, WORKSPACE_ID, REPORT_ID values. Confirm correct API permissions in Azure AD App Registration. Verify REDIRECT_URI matches.

AI Chatbot Not Responding:

Symptom: No AI replies or generic errors.

Solution: Ensure Azure OpenAI API keys, instance name, deployment name, and API version are correct. Check backend logs for OpenAI errors. Verify the hidden Power BI report loads correctly.

Cosmos DB Connection Issues:

Symptom: Data not saving or loading.

Solution: Confirm COSMOS_DB_ENDPOINT and COSMOS_DB_KEY are correct. Check backend logs for Cosmos DB errors.

Authentication Redirect Loops:

Symptom: Browser continuously redirects.

Solution: Verify REDIRECT_URI and FRONTEND_REDIRECT_URI are consistent across Azure AD App Registration, backend config, and frontend config. Clear browser cache/cookies.

❓ Support

For any questions, issues, or feature requests, please open an issue in this GitHub repository or reach out to the project maintainers.

Developed with ❤️ and TypeScript.