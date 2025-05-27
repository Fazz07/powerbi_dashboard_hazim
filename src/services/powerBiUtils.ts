// src/services/powerBiUtils.ts
import * as pbi from 'powerbi-client';

const API_BASE_URL = import.meta.env.VITE_YOUR_BACKEND_API_URL || 'http://localhost:3000';

export interface PowerBiEmbedData {
  token: string; // Backend calls it 'token', let's align
  embedUrl: string; // This is the embed URL for the *report*, not a visual
  reportId: string; // The ID of the main report in Power BI service
  expiration?: string; // Optional: good for debugging
  cacheStatus?: string; // Optional: good for debugging
}

// Initialize the Power BI service (can stay here or move to Dashboard.tsx if preferred)
export const powerBiService = new pbi.service.Service(
  pbi.factories.hpmFactory,
  pbi.factories.wpmpFactory,
  pbi.factories.routerFactory
);

export const fetchMainEmbedData = async (): Promise<PowerBiEmbedData> => {
  try {
    // The backend endpoint /getEmbedToken is not protected by verifyAuth in the provided server.js
    // So, no Authorization header is strictly needed for *this specific endpoint* as is.
    // If it were protected, you'd need to send the JWT from your auth system.
    const response = await fetch(`${API_BASE_URL}/getEmbedToken`); // No /api prefix in backend route
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ errorMessage: "Failed to parse error response" }));
      throw new Error(`Failed to fetch Power BI embed data: ${response.status} - ${errorData.errorMessage || response.statusText}`);
    }
    const data = await response.json();

    if (!data.token || !data.embedUrl || !data.reportId) {
        console.error("Incomplete embed data received from backend:", data);
        throw new Error('Incomplete embed data received from backend (missing token, embedUrl, or reportId).');
    }

    console.log("data.token: ", data.token);
    console.log("data.embedUrl: ", data.embedUrl);
    
    // The backend's embedUrl is for the report. PBI client constructs visual embed URL.
    // The backend's reportId is the one we need.
    return {
        token: data.token,
        embedUrl: data.embedUrl, // This will be the base report embed URL
        reportId: data.reportId,
        expiration: data.expiration,
        cacheStatus: data.cacheStatus
    } as PowerBiEmbedData;
  } catch (error) {
    console.error("Error in fetchMainEmbedData:", error);
    throw error;
  }
};