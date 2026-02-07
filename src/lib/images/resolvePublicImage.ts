/**
 * Resolves any image path/URL to a valid absolute Supabase Storage URL.
 * 
 * Input may be:
 * 1) relative path like "logos/images-1.png" or "logos/teams/xyz.png"
 * 2) bucket-relative like "SPORTS/logos/images-1.png"
 * 3) full URL already starting with "http"
 * 
 * Output: valid absolute URL or null if input is invalid
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const BUCKET_NAME = "SPORTS";

// Debug logging counter (log first 5 per page load)
let debugLogCount = 0;
const MAX_DEBUG_LOGS = 5;

export function resolvePublicImage(input: string | null | undefined): string | null {
  // Handle null/undefined/empty
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  let resolvedUrl: string | null = null;

  // Case 1: Already a full URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    resolvedUrl = trimmed;
  } else if (SUPABASE_URL) {
    // Case 2: Relative path - need to build full URL
    let cleanPath = trimmed;

    // Strip leading slash
    if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.slice(1);
    }

    // Strip leading "SPORTS/" if already present (avoid duplication)
    if (cleanPath.startsWith("SPORTS/")) {
      cleanPath = cleanPath.slice(7); // Remove "SPORTS/"
    }

    // Strip leading bucket path variations
    if (cleanPath.startsWith("storage/v1/object/public/SPORTS/")) {
      cleanPath = cleanPath.slice(32);
    }

    resolvedUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${cleanPath}`;
  }

  // Debug logging (temporary but shipped)
  if (typeof window !== "undefined" && debugLogCount < MAX_DEBUG_LOGS) {
    debugLogCount++;
    console.log(`[resolvePublicImage ${debugLogCount}/${MAX_DEBUG_LOGS}] input="${input}" → output="${resolvedUrl}"`);
  }

  return resolvedUrl;
}

/**
 * Reset debug log counter (call on page navigation if needed)
 */
export function resetImageDebugLogs() {
  debugLogCount = 0;
}

/**
 * Get team initials for fallback display
 */
export function getTeamInitials(name: string | null | undefined): string {
  if (!name || typeof name !== "string") {
    return "??";
  }
  
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  
  // Take first letter of first two words
  return (words[0][0] + words[1][0]).toUpperCase();
}
