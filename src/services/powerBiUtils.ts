// src/services/powerBiUtils.ts
import * as pbi from 'powerbi-client';

const API_BASE_URL = import.meta.env.VITE_YOUR_BACKEND_API_URL || 'http://localhost:3000';
console.log('[PBIUtils] API_BASE_URL:', API_BASE_URL);


export interface PowerBiEmbedData {
  token: string;
  embedUrl: string;
  reportId: string;
  expiration?: string;
  cacheStatus?: string;
}

export const powerBiService = new pbi.service.Service(
  pbi.factories.hpmFactory,
  pbi.factories.wpmpFactory,
  pbi.factories.routerFactory
);

export const fetchMainEmbedData = async (): Promise<PowerBiEmbedData> => {
  console.log('[PBIUtils] fetchMainEmbedData called');
  try {
    const response = await fetch(`${API_BASE_URL}/getEmbedToken`);
    console.log('[PBIUtils] fetchMainEmbedData response status:', response.status);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('[PBIUtils] fetchMainEmbedData error response JSON:', errorData);
      } catch (e) {
        const errorText = await response.text();
        console.error('[PBIUtils] fetchMainEmbedData error response text:', errorText);
        errorData = { errorMessage: "Failed to parse error response", errorText };
      }
      throw new Error(`Failed to fetch Power BI embed data: ${response.status} - ${errorData.errorMessage || response.statusText}`);
    }
    const data = await response.json();
    console.log('[PBIUtils] fetchMainEmbedData raw data received:', data);

    if (!data.token || !data.embedUrl || !data.reportId) {
        console.error("[PBIUtils] Incomplete embed data received from backend:", data);
        throw new Error('Incomplete embed data received from backend (missing token, embedUrl, or reportId).');
    }
    
    const embedData: PowerBiEmbedData = {
        token: data.token,
        embedUrl: data.embedUrl,
        reportId: data.reportId,
        expiration: data.expiration,
        cacheStatus: data.cacheStatus
    };
    console.log('[PBIUtils] fetchMainEmbedData processed embedData:', embedData);
    return embedData;

  } catch (error)
{
    console.error("[PBIUtils] Error in fetchMainEmbedData:", error);
    throw error;
  }
};