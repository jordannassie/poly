/**
 * Get Team by Slug
 * 
 * Fetches team data from the sports_teams cache using league and slug.
 * 
 * New schema:
 * - id: API team ID (bigint)
 * - league: lowercase (nfl, nba, mlb, nhl, soccer)
 * - name, slug, logo, country
 * 
 * URL format: /teams/{league}/{slug}
 * Example: /teams/nfl/arizona-cardinals
 */

import { createClient } from "@supabase/supabase-js";
import { getTeamColor } from "./teamColors";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Names to filter out (conferences, not actual teams)
const EXCLUDED_NAMES = ["afc", "nfc", "east", "west"];

function getClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export interface TeamData {
  id: string;
  league: string;
  apiTeamId: number;
  name: string;
  slug: string;
  logoUrl: string;
  primaryColor: string;
  country?: string;
}

/**
 * Fetch a team by league and slug
 * 
 * Slug format: {league}-{id}-{name} (e.g., "nfl-1-arizona-cardinals")
 * URL: /teams/{league}/{slug}
 * 
 * @param league - League code (e.g., "nfl", "nba", "soccer")
 * @param slug - Team slug (e.g., "nfl-1-arizona-cardinals")
 * @returns TeamData or null if not found
 */
export async function getTeamBySlug(
  league: string,
  slug: string
): Promise<TeamData | null> {
  const client = getClient();
  if (!client) {
    console.warn("[getTeamBySlug] Supabase client not available");
    return null;
  }

  // Always lowercase for query
  const leagueLower = league.toLowerCase();
  const slugLower = slug.toLowerCase();
  
  // Query directly by slug (slug is globally unique)
  const { data: team, error } = await client
    .from("sports_teams")
    .select("id, league, name, slug, logo, country")
    .eq("slug", slugLower)
    .single();

  if (error || !team) {
    // Try fallback: search by league + slug pattern match
    // Useful for legacy URLs or partial slugs
    const { data: teams } = await client
      .from("sports_teams")
      .select("id, league, name, slug, logo, country")
      .eq("league", leagueLower)
      .ilike("slug", `%${slugLower}%`)
      .limit(1);
    
    if (teams && teams.length > 0) {
      return transformTeam(teams[0]);
    }
    
    console.log("[getTeamBySlug] Team not found:", { league: leagueLower, slug: slugLower });
    return null;
  }

  // Verify league matches (slug might match but wrong league)
  if (team.league !== leagueLower) {
    console.log("[getTeamBySlug] League mismatch:", { expected: leagueLower, actual: team.league });
    return null;
  }

  // Filter out conferences
  if (EXCLUDED_NAMES.includes(team.name.toLowerCase())) {
    return null;
  }

  return transformTeam(team);
}

/**
 * Transform raw database team to TeamData
 */
function transformTeam(team: {
  id: number;
  league: string;
  name: string;
  slug: string;
  logo: string | null;
  country?: string | null;
}): TeamData {
  return {
    id: String(team.id),
    league: team.league,
    apiTeamId: team.id,
    name: team.name,
    slug: team.slug,
    logoUrl: team.logo || "",
    primaryColor: getTeamColor(team.name, team.league),
    country: team.country || undefined,
  };
}

/**
 * Get all teams for a league (for listing/navigation)
 */
export async function getAllTeamsForLeague(league: string): Promise<TeamData[]> {
  const client = getClient();
  if (!client) {
    return [];
  }

  const { data: teams, error } = await client
    .from("sports_teams")
    .select("id, league, name, slug, logo, country")
    .eq("league", league.toLowerCase())
    .order("name");

  if (error || !teams) {
    return [];
  }

  // Filter out conferences
  const filtered = teams.filter(t => !EXCLUDED_NAMES.includes(t.name.toLowerCase()));
  return filtered.map(transformTeam);
}
