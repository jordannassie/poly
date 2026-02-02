/**
 * Hardened API-Sports HTTP Client
 * 
 * Ensures 100% compliance with API-Sports requirements:
 * - GET requests ONLY
 * - Only header allowed: x-apisports-key
 * - No Content-Type, no Authorization, no body
 * - Returns parsed JSON
 */

export interface ApiSportsResponse<T = unknown> {
  data: T;
  errors: string[];
  results: number;
  response: T;
}

export interface ApiSportsError {
  message: string;
  status?: number;
}

/**
 * Make a GET request to API-Sports
 * 
 * @param url - Full URL including query params (e.g., "https://v1.basketball.api-sports.io/teams?league=12&season=2024")
 * @param apiKey - The x-apisports-key value
 * @returns Parsed JSON response
 * @throws Error if request fails or returns non-200
 */
export async function apiSportsFetch<T = unknown>(
  url: string,
  apiKey: string
): Promise<T> {
  // Validate inputs
  if (!url) {
    throw new Error("API-Sports: URL is required");
  }
  if (!apiKey) {
    throw new Error("API-Sports: API key is required");
  }

  // Create a minimal headers object with ONLY the API key
  // Do not add Content-Type, Authorization, or any other headers
  const headers = new Headers();
  headers.set("x-apisports-key", apiKey);

  // Log the request for debugging (without exposing full key)
  const maskedKey = apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4);
  console.log(`[apiSportsFetch] GET ${url} (key: ${maskedKey})`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      // Explicitly ensure no body is sent
      body: undefined,
      // Disable any automatic caching that might add headers
      cache: "no-store",
    });

    // Log response status
    console.log(`[apiSportsFetch] Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      // Try to get error details from response body
      let errorDetail = "";
      try {
        const errorBody = await response.text();
        errorDetail = errorBody.substring(0, 200); // Limit error text length
      } catch {
        // Ignore if we can't read the body
      }
      
      throw new Error(
        `API-Sports returned ${response.status}: ${response.statusText}${errorDetail ? ` - ${errorDetail}` : ""}`
      );
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    // Re-throw with context
    if (error instanceof Error) {
      // Don't double-wrap our own errors
      if (error.message.startsWith("API-Sports")) {
        throw error;
      }
      throw new Error(`API-Sports request failed: ${error.message}`);
    }
    throw new Error("API-Sports request failed: Unknown error");
  }
}

/**
 * Build a full API-Sports URL from base URL and endpoint
 * 
 * @param baseUrl - Base URL (e.g., "https://v1.basketball.api-sports.io")
 * @param endpoint - Endpoint with query params (e.g., "/teams?league=12&season=2024")
 * @returns Full URL
 */
export function buildApiSportsUrl(baseUrl: string, endpoint: string): string {
  // Ensure no double slashes between base and endpoint
  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${cleanBase}${cleanEndpoint}`;
}

/**
 * Convenience wrapper that builds URL and fetches
 */
export async function apiSportsGet<T = unknown>(
  baseUrl: string,
  endpoint: string,
  apiKey: string
): Promise<T> {
  const url = buildApiSportsUrl(baseUrl, endpoint);
  return apiSportsFetch<T>(url, apiKey);
}
