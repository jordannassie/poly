/**
 * Team Logo URL Helper
 * 
 * Provides consistent team logo URLs with fallback logic.
 * Prioritizes Supabase Storage URLs over API-Sports URLs.
 */

import { getStoragePublicUrl } from "@/lib/supabase/storage";

// Default placeholder for teams without logos
const PLACEHOLDER_LOGO = "/placeholder-team.png";

export interface TeamWithLogo {
  logo_path?: string | null;
  logo_url_original?: string | null;
  logo?: string | null; // Legacy field from api_sports_nfl_teams
}

/**
 * Get the best available logo URL for a team
 * 
 * Priority:
 * 1. logo_path (Supabase Storage) - most reliable
 * 2. logo_url_original (API-Sports URL) - fallback
 * 3. logo (legacy field) - compatibility fallback
 * 4. Placeholder image - last resort
 * 
 * @param team - Team object with logo fields
 * @param placeholder - Optional custom placeholder URL
 * @returns URL string for the team logo
 */
export function getTeamLogoUrl(
  team: TeamWithLogo | null | undefined,
  placeholder: string = PLACEHOLDER_LOGO
): string {
  if (!team) {
    return placeholder;
  }

  // Priority 1: Supabase Storage path
  if (team.logo_path) {
    const storageUrl = getStoragePublicUrl(team.logo_path);
    if (storageUrl) {
      return storageUrl;
    }
  }

  // Priority 2: Original API-Sports URL
  if (team.logo_url_original) {
    return team.logo_url_original;
  }

  // Priority 3: Legacy logo field (from api_sports_nfl_teams)
  if (team.logo) {
    return team.logo;
  }

  // Priority 4: Placeholder
  return placeholder;
}

/**
 * Check if a team has a locally stored logo
 * 
 * @param team - Team object with logo fields
 * @returns true if the team has a logo stored in Supabase Storage
 */
export function hasLocalLogo(team: TeamWithLogo | null | undefined): boolean {
  return !!(team?.logo_path);
}

/**
 * Get logo URL directly from a storage path
 * Useful when you have just the path without the full team object
 * 
 * @param logoPath - Path in Supabase Storage (e.g., "logos/teams/nfl/1.png")
 * @param fallback - Fallback URL if path is empty
 * @returns Full public URL
 */
export function getLogoUrlFromPath(
  logoPath: string | null | undefined,
  fallback: string = PLACEHOLDER_LOGO
): string {
  if (!logoPath) {
    return fallback;
  }
  
  const url = getStoragePublicUrl(logoPath);
  return url || fallback;
}
