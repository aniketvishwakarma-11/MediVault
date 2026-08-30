/**
 * Centralized API Base URL resolver for MediVault Frontend.
 * Ensures seamless fallback to the live Render backend in production environments.
 */
export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // If running in browser and not on localhost, use the production Render backend
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return "https://medivault-653s.onrender.com";
    }
  }
  
  return "http://localhost:5000";
}

export const API_BASE_URL = getApiBaseUrl();
