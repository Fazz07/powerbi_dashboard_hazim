// src/services/dashboardService.ts
import { DashboardPage } from '@/types/page';

const API_BASE_URL = import.meta.env.VITE_YOUR_BACKEND_API_URL || 'http://localhost:3000';

// Defines the payload structure expected by the backend's PUT /api/user/dashboard endpoint.
// `visualOrder` here represents the array of DashboardPage objects.
interface SaveDashboardPayload {
  visualOrder: DashboardPage[];
  // selectedDynamicReports is included for backend compatibility, but can be empty if not explicitly used.
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

    // The backend's GET endpoint now returns the array of pages directly.
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

  // Construct the payload as expected by the backend's PUT endpoint.
  // The 'visualOrder' key now holds the entire array of DashboardPage objects.
  const payload: SaveDashboardPayload = {
    visualOrder: pagesToSave,
    selectedDynamicReports: [], // Placeholder; adjust if your backend explicitly uses this for something else
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