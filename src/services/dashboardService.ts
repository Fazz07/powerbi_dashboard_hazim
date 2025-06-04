// src/services/dashboardService.ts
// ... (existing imports) ...
import { DashboardPage } from '@/types/page';
import { ChatMessage } from '@/types/chat'; // NEW IMPORT for ChatMessage type

const API_BASE_URL = import.meta.env.VITE_YOUR_BACKEND_API_URL || 'http://localhost:3000';

// Defines the payload structure expected by the backend's PUT /api/user/dashboard endpoint.
interface SaveDashboardPayload {
  visualOrder: DashboardPage[];
  selectedDynamicReports: string[];
}

// Utility function to retrieve the authentication token from localStorage.
const getAuthToken = (): string | null => {
  try {
    const userString = localStorage.getItem('user');
    if (userString) {
      const parsedUser = JSON.parse(userString);
      return parsedUser.id_token || null;
    }
  } catch (e) {
    console.error("Failed to parse user data from localStorage for auth token:", e);
  }
  return null;
};

// --- MODIFIED: getDeterministicUserIdFromToken for client-side to be simpler ---
// It should derive the *same* string that the backend uses to hash.
// For dummy tokens, the backend hashes the `userIdentifier` (e.g., "test1_at_example_dot_com").
// So, this function needs to extract that `userIdentifier`.
const getDeterministicUserIdFromToken = (token: string): string | null => {
  if (token.startsWith('dummy-jwt-token-for-user-')) {
    const parts = token.split('dummy-jwt-token-for-user-');
    if (parts.length > 1) {
      // The `userIdentifier` is the part the backend directly hashes.
      // Example: 'test1_at_example_dot_com'
      return parts[1]; 
    }
  }
  return null;
};

// --- MODIFIED: getCurrentUserId for more robust client-side ID access ---
export const getCurrentUserId = (): string | null => {
  const token = getAuthToken();
  if (!token) return null;

  // Option 1: If it's a dummy token, derive the identifier used for hashing
  const dummyUserIdentifier = getDeterministicUserIdFromToken(token);
  if (dummyUserIdentifier) {
    // For *client-side* purposes, we can use the identifier itself,
    // or if we needed the *exact* hash, we'd need a SHA256 polyfill.
    // For now, let's return the identifier, assuming the backend uses it correctly.
    // In a real app, this ID would come from the JWT's 'sub' claim after decoding.
    // Given the prompt "sanitized `createDummyUserIdentifier` appended", this is the correct part.
    return dummyUserIdentifier;
  }

  // Option 2: If it's a real JWT (not a dummy one),
  // in a real application, you would decode the JWT on the client
  // and extract the 'sub' claim (subject) which is the user ID.
  // For this project, since real JWTs are verified only on the backend,
  // we'll rely on the backend to know the `userId` via `req.user.id`.
  // The client side generally shouldn't try to derive the ID from a real JWT
  // unless you have a proper JWT decoding library.
  
  // For now, if it's a real token, we can't reliably get the "sub" here client-side.
  // The backend will handle it based on the token.
  // This function is primarily for the *dummy token* scenario.
  console.warn("getCurrentUserId: Cannot reliably get user ID from real JWT client-side. Rely on backend for authorization.");
  return null; 
};

/**
 * Fetches the user's dashboard customization data from the backend.
 * @returns A Promise that resolves to an array of DashboardPage objects.
 *          Returns an empty array if no customization is found (404 response).
 * @throws An error if authentication fails or other API errors occur.
 */
export const fetchUserDashboardCustomization = async (): Promise<DashboardPage[]> => {
  const token = getAuthToken();
  if (!token) {
    console.error("No authentication token available for fetching dashboard customization.");
    throw new Error("Unauthorized: No token.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/user/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      console.log("No existing dashboard customization found for user.");
      return []; // Return empty array if no customization exists
    }

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`Failed to fetch dashboard customization: ${response.status} - ${errorBody.message || response.statusText}`);
    }

    const data = await response.json();
    console.log("Fetched dashboard customization:", data);

    return data as DashboardPage[];

  } catch (error) {
    console.error("Error fetching user dashboard customization:", error);
    throw error;
  }
};

/**
 * Saves the user's dashboard customization data to the backend.
 * @param pagesToSave An array of DashboardPage objects representing the current dashboard state.
 * @returns A Promise that resolves when the save operation is successful.
 * @throws An error if authentication fails or other API errors occur.
 */
export const saveUserDashboardCustomization = async (pagesToSave: DashboardPage[]): Promise<void> => {
  const token = getAuthToken();
  if (!token) {
    console.error("No authentication token available for saving dashboard customization.");
    throw new Error("Unauthorized: No token.");
  }

  const payload: SaveDashboardPayload = {
    visualOrder: pagesToSave,
    selectedDynamicReports: [],
  };
  console.log("Saving dashboard customization with payload:", payload);

  try {
    const response = await fetch(`${API_BASE_URL}/api/user/dashboard`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`Failed to save dashboard customization: ${response.status} - ${errorBody.message || response.statusText}`);
    }

    console.log("Dashboard customization saved successfully.");
  } catch (error) {
    console.error("Error saving user dashboard customization:", error);
    throw error;
  }
};

// NEW: Function to save a chat session
export const saveChatSession = async (sessionId: string, messages: ChatMessage[], reason: 'timeout' | 'manual_close'): Promise<void> => {
  const token = getAuthToken();
  if (!token) {
    console.error("No authentication token available for saving chat session.");
    throw new Error("Unauthorized: No token.");
  }

  const payload = {
    sessionId,
    messages,
    reason,
  };

  console.log(`Saving chat session ${sessionId} for reason: ${reason}. Messages count: ${messages.length}`);

  try {
    const response = await fetch(`${API_BASE_URL}/api/session/save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`Failed to save chat session: ${response.status} - ${errorBody.message || response.statusText}`);
    }

    console.log(`Chat session ${sessionId} saved successfully.`);
  } catch (error) {
    console.error(`Error saving chat session ${sessionId}:`, error);
    throw error;
  }
};