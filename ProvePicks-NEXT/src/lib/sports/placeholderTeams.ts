/**
 * Placeholder Team Detection
 * 
 * Utility functions and constants to identify and filter out
 * non-real teams like "NFC", "AFC", "All-Stars", "TBD", etc.
 */

/**
 * List of known placeholder/generic team names that are NOT real teams.
 * These are conference games, all-star games, placeholder matches, etc.
 */
export const PLACEHOLDER_TEAM_NAMES = [
  "NFC",
  "AFC",
  "TBD",
  "TBA",
  "All-Stars",
  "All Stars",
  "All-Star",
  "All Star",
  "Conference",
  "Unknown",
  "Team",
  "Team 1",
  "Team 2",
  "Home",
  "Away",
  "East",
  "West",
  "North",
  "South",
  "National",
  "American",
  "Pro Bowl",
  "Pro-Bowl",
  "Skills Challenge",
] as const;

/**
 * Set for O(1) lookup (lowercase)
 */
const PLACEHOLDER_SET = new Set(
  PLACEHOLDER_TEAM_NAMES.map(name => name.toLowerCase())
);

/**
 * Check if a team name is a real team name (not a placeholder)
 * 
 * Returns false for:
 * - null/undefined/empty names
 * - names in PLACEHOLDER_TEAM_NAMES list
 * - names shorter than 2 characters
 * - names that are just "Team X" format
 */
export function isRealTeamName(name: string | null | undefined): boolean {
  if (!name || typeof name !== "string") {
    return false;
  }
  
  const trimmed = name.trim();
  
  // Too short to be a real team name
  if (trimmed.length < 2) {
    return false;
  }
  
  // Check against placeholder list (case-insensitive)
  if (PLACEHOLDER_SET.has(trimmed.toLowerCase())) {
    return false;
  }
  
  // Check for "Team X" pattern (e.g., "Team 123", "Team Unknown")
  if (/^team\s+\d+$/i.test(trimmed) || /^team\s+unknown$/i.test(trimmed)) {
    return false;
  }
  
  return true;
}

/**
 * Check if a game has real teams (not placeholders)
 * 
 * A game is "real" if:
 * - Both team names pass isRealTeamName()
 */
export function isRealGame(
  homeTeam: string | null | undefined,
  awayTeam: string | null | undefined
): boolean {
  return isRealTeamName(homeTeam) && isRealTeamName(awayTeam);
}

/**
 * SQL-compatible list for filtering (single-quoted, comma-separated)
 * Used for direct SQL queries
 */
export function getPlaceholderNamesForSQL(): string {
  return PLACEHOLDER_TEAM_NAMES.map(name => `'${name}'`).join(", ");
}

/**
 * Array for use in Supabase .in() queries (lowercase)
 */
export function getPlaceholderNamesArray(): string[] {
  return PLACEHOLDER_TEAM_NAMES.map(name => name.toLowerCase());
}
