/**
 * Team Slug Utilities
 * 
 * Convert team names to URL-friendly slugs and vice versa.
 */

/**
 * Convert a team name to a URL-friendly slug
 * 
 * Examples:
 * - "Los Angeles Lakers" -> "los-angeles-lakers"
 * - "New England Patriots" -> "new-england-patriots"
 * - "Manchester United" -> "manchester-united"
 * - "49ers" -> "49ers"
 * 
 * @param teamName - The team name to slugify
 * @returns URL-friendly slug
 */
export function slugifyTeam(teamName: string): string {
  return teamName
    .toLowerCase()
    .trim()
    .replace(/['']/g, "") // Remove apostrophes
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Convert a slug back to a searchable pattern
 * This is used to match slugs against team names in the database
 * 
 * @param slug - The URL slug
 * @returns Pattern that can be used for case-insensitive matching
 */
export function slugToSearchPattern(slug: string): string {
  // Replace hyphens with spaces for searching
  return slug.replace(/-/g, " ");
}

/**
 * Generate a unique team slug that includes the league
 * Used for disambiguation (e.g., "Giants" exists in NFL and MLB)
 * 
 * @param league - League code (e.g., "NFL", "NBA")
 * @param teamName - Team name
 * @returns Combined slug like "nfl-new-york-giants"
 */
export function generateFullTeamSlug(league: string, teamName: string): string {
  return `${league.toLowerCase()}-${slugifyTeam(teamName)}`;
}
