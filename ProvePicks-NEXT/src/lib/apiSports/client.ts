/**
 * Hardened API-Sports HTTP Client
 * 
 * Ensures 100% compliance with API-Sports requirements:
 * - GET requests ONLY
 * - Only header allowed: x-apisports-key
 * - No Content-Type, no Authorization, no body
 * - Returns parsed JSON
 * - NEVER parses HTML as JSON - returns structured error instead
 */

export interface ApiSportsResponse<T = unknown> {
  data: T;
  errors: string[];
  results: number;
  response: T;
}

export interface ApiSportsError {
  ok: false;
  message: string;
  status?: number;
  contentType?: string;
  bodySnippet?: string;
}

export interface ApiSportsResult<T = unknown> {
  ok: true;
  data: T;
}

export type ApiSportsFetchResult<T = unknown> = ApiSportsResult<T> | ApiSportsError;

/**
 * Make a GET request to API-Sports with safe response parsing
 * 
 * @param url - Full URL including query params (e.g., "https://v1.basketball.api-sports.io/teams?league=12&season=2024")
 * @param apiKey - The x-apisports-key value
 * @returns Parsed JSON response or structured error
 */
export async function apiSportsFetchSafe<T = unknown>(
  url: string,
  apiKey: string
): Promise<ApiSportsFetchResult<T>> {
  // Validate inputs
  if (!url) {
    return {
      ok: false,
      message: "API-Sports: URL is required",
    };
  }
  if (!apiKey) {
    return {
      ok: false,
      message: "API-Sports: API key is required (check APISPORTS_KEY env var)",
    };
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

    // Get content-type header
    const contentType = response.headers.get("content-type") || "";
    
    // Log response status
    console.log(`[apiSportsFetch] Response: ${response.status} ${response.statusText}, content-type: ${contentType}`);

    // Read body as text first (safe for any response type)
    const bodyText = await response.text();
    
    // Check if response is not OK
    if (!response.ok) {
      return {
        ok: false,
        message: `API-Sports returned ${response.status}: ${response.statusText}`,
        status: response.status,
        contentType,
        bodySnippet: bodyText.substring(0, 200),
      };
    }

    // Check if content-type is JSON
    if (!contentType.includes("application/json")) {
      return {
        ok: false,
        message: `API-Sports returned non-JSON response (${contentType})`,
        status: response.status,
        contentType,
        bodySnippet: bodyText.substring(0, 200),
      };
    }

    // Parse JSON
    try {
      const data = JSON.parse(bodyText);
      return { ok: true, data: data as T };
    } catch (parseError) {
      return {
        ok: false,
        message: `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : "Unknown parse error"}`,
        status: response.status,
        contentType,
        bodySnippet: bodyText.substring(0, 200),
      };
    }
  } catch (error) {
    // Network or other error
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
}

/**
 * Make a GET request to API-Sports (throws on error)
 * 
 * @param url - Full URL including query params (e.g., "https://v1.basketball.api-sports.io/teams?league=12&season=2024")
 * @param apiKey - The x-apisports-key value
 * @returns Parsed JSON response
 * @throws Error if request fails or returns non-200/non-JSON
 */
export async function apiSportsFetch<T = unknown>(
  url: string,
  apiKey: string
): Promise<T> {
  const result = await apiSportsFetchSafe<T>(url, apiKey);
  
  if (!result.ok) {
    const error = result as ApiSportsError;
    let errorMsg = error.message;
    if (error.status) errorMsg += ` (status: ${error.status})`;
    if (error.contentType) errorMsg += ` (content-type: ${error.contentType})`;
    if (error.bodySnippet) errorMsg += ` | Body: ${error.bodySnippet}`;
    throw new Error(errorMsg);
  }
  
  return result.data;
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

/**
 * Safe version of apiSportsGet that returns result object instead of throwing
 */
export async function apiSportsGetSafe<T = unknown>(
  baseUrl: string,
  endpoint: string,
  apiKey: string
): Promise<ApiSportsFetchResult<T>> {
  const url = buildApiSportsUrl(baseUrl, endpoint);
  return apiSportsFetchSafe<T>(url, apiKey);
}
