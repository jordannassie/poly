/**
 * Get Team by Slug
 * 
 * Fetches team data from the sports_teams cache using league and slug.
 */

import { createClient } from "@supabase/supabase-js";
import { slugToSearchPattern, slugifyTeam } from "./slugifyTeam";
import { getTeamLogoUrl } from "./getTeamLogoUrl";
import { getTeamColor } from "./teamColors";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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
}

/**
 * Fetch a team by league and slug
 * 
 * @param league - League code (e.g., "nfl", "nba", "soccer")
 * @param slug - Team slug (e.g., "new-england-patriots")
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

  const leagueUpper = league.toUpperCase();
  
  // Fetch all teams for this league
  const { data: teams, error } = await client
    .from("sports_teams")
    .select("id, league, api_team_id, name, logo_path, logo_url_original")
    .eq("league", leagueUpper);

  if (error) {
    console.error("[getTeamBySlug] Error fetching teams:", error.message);
    return null;
  }

  if (!teams || teams.length === 0) {
    return null;
  }

  // Find the team whose slugified name matches the slug
  const matchedTeam = teams.find(team => slugifyTeam(team.name) === slug);

  if (!matchedTeam) {
    // Try partial match as fallback
    const searchPattern = slugToSearchPattern(slug).toLowerCase();
    const partialMatch = teams.find(team => 
      team.name.toLowerCase().includes(searchPattern) ||
      searchPattern.includes(team.name.toLowerCase())
    );
    
    if (!partialMatch) {
      return null;
    }
    
    return transformTeam(partialMatch);
  }

  return transformTeam(matchedTeam);
}

/**
 * Transform raw database team to TeamData
 */
function transformTeam(team: {
  id: string;
  league: string;
  api_team_id: number;
  name: string;
  logo_path: string | null;
  logo_url_original: string | null;
}): TeamData {
  const logoUrl = getTeamLogoUrl({
    logo_path: team.logo_path,
    logo_url_original: team.logo_url_original,
  });

  return {
    id: team.id,
    league: team.league,
    apiTeamId: team.api_team_id,
    name: team.name,
    slug: slugifyTeam(team.name),
    logoUrl: logoUrl !== "/placeholder-team.png" ? logoUrl : "",
    primaryColor: getTeamColor(team.name, team.league),
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
    .select("id, league, api_team_id, name, logo_path, logo_url_original")
    .eq("league", league.toUpperCase())
    .order("name");

  if (error || !teams) {
    return [];
  }

  return teams.map(transformTeam);
}
