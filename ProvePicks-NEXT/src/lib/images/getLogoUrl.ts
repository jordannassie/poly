/**
 * Team Logo URL Helper
 * 
 * Single source of truth for building team logo URLs.
 * Handles Supabase storage paths, absolute URLs, and null fallbacks.
 * 
 * Supports optional proxy mode via NEXT_PUBLIC_IMAGE_PROXY=1 env var.
 * When enabled, images are served via /api/public-image to bypass DNS issues.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SPORTS_BUCKET = "SPORTS";
const USE_PROXY = process.env.NEXT_PUBLIC_IMAGE_PROXY === "1";

// Debug logging counter (temporary but shipped for debugging)
let debugLogCount = 0;
const MAX_DEBUG_LOGS = 5;

/**
 * Normalize a storage path by stripping prefixes
 */
function normalizePath(path: string): string {
  let cleanPath = path;
  
  // Remove leading slash if present
  if (cleanPath.startsWith("/")) {
    cleanPath = cleanPath.slice(1);
  }
  
  // Strip leading "SPORTS/" if already present (avoid duplication)
  if (cleanPath.startsWith("SPORTS/")) {
    cleanPath = cleanPath.slice(7);
  }
  
  // Strip leading full storage path if somehow duplicated
  if (cleanPath.startsWith("storage/v1/object/public/SPORTS/")) {
    cleanPath = cleanPath.slice(32);
  }
  
  return cleanPath;
}

/**
 * Get a properly formatted logo URL from various input formats
 * 
 * Priority:
 * 1. If input is already an absolute URL (http/https) -> return as-is (or proxy if enabled)
 * 2. If input looks like a storage path -> build URL (direct or proxy based on config)
 * 3. If input is null/undefined/empty -> return null
 * 
 * @param logo - The logo field from database (could be URL, path, or null)
 * @returns Full URL string or null if no logo available
 */
export function getLogoUrl(logo: string | null | undefined): string | null {
  // No logo provided
  if (!logo || typeof logo !== "string" || !logo.trim()) {
    return null;
  }

  const trimmed = logo.trim();
  let resolvedUrl: string | null = null;

  // Data URL (base64 encoded) - always return as-is
  if (trimmed.startsWith("data:")) {
    resolvedUrl = trimmed;
  }
  // Already an absolute URL
  else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    // Check if it's a Supabase storage URL that should be proxied
    if (USE_PROXY && trimmed.includes("supabase.co/storage/v1/object/public/SPORTS/")) {
      // Extract the path from the URL and proxy it
      const match = trimmed.match(/\/storage\/v1\/object\/public\/SPORTS\/(.+)$/);
      if (match && match[1]) {
        const path = normalizePath(match[1]);
        resolvedUrl = `/api/public-image?bucket=${SPORTS_BUCKET}&path=${encodeURIComponent(path)}`;
      } else {
        resolvedUrl = trimmed;
      }
    } else {
      resolvedUrl = trimmed;
    }
  }
  // Looks like a storage path (e.g., "logos/teams/nfl/1.png")
  else {
    const cleanPath = normalizePath(trimmed);
    
    if (USE_PROXY) {
      // Use the proxy route
      resolvedUrl = `/api/public-image?bucket=${SPORTS_BUCKET}&path=${encodeURIComponent(cleanPath)}`;
    } else if (SUPABASE_URL) {
      // Build direct Supabase storage URL
      resolvedUrl = `${SUPABASE_URL}/storage/v1/object/public/${SPORTS_BUCKET}/${cleanPath}`;
    }
  }

  // Debug logging (temporary but shipped for debugging)
  if (typeof window !== "undefined" && debugLogCount < MAX_DEBUG_LOGS && logo) {
    debugLogCount++;
    console.log(`[getLogoUrl ${debugLogCount}/${MAX_DEBUG_LOGS}] input="${logo}" → output="${resolvedUrl}" (PROXY=${USE_PROXY ? 'ON' : 'OFF'})`);
  }

  return resolvedUrl;
}

/**
 * Get initials from a team name for fallback display
 * 
 * @param name - Team name (e.g., "Kansas City Chiefs")
 * @returns 2-3 character abbreviation (e.g., "KC" or "CHI")
 */
export function getTeamInitials(name: string | null | undefined): string {
  if (!name || typeof name !== "string") {
    return "??";
  }

  const words = name.trim().split(/\s+/);
  
  // If single word, take first 2-3 chars
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }

  // For multi-word names, take first letter of each word (up to 3)
  // But prefer last word for team names like "Kansas City Chiefs"
  if (words.length === 2) {
    // "Los Angeles" -> "LA", "Real Madrid" -> "RM"
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  // 3+ words: use first letter of first and last word
  // "Kansas City Chiefs" -> "KC"
  // "Manchester United FC" -> "MU" or just take abbreviation style
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Check if a URL is likely to work (basic validation)
 * 
 * @param url - URL to validate
 * @returns true if the URL looks valid
 */
export function isValidLogoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
