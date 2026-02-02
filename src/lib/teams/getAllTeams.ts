/**
 * Get All Teams
 * 
 * Fetches all teams from the sports_teams cache for browsing.
 */

import { createClient } from "@supabase/supabase-js";
import { slugifyTeam } from "./slugifyTeam";
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

export interface TeamListItem {
  id: string;
  league: string;
  apiTeamId: number;
  name: string;
  slug: string;
  logoUrl: string;
  primaryColor: string;
}

/**
 * Get all teams for a specific league
 */
export async function getTeamsByLeague(league: string): Promise<TeamListItem[]> {
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
    console.error(`[getAllTeams] Error fetching ${league} teams:`, error?.message);
    return [];
  }

  return teams.map(transformTeam);
}

/**
 * Get all teams across all leagues
 */
export async function getAllTeams(): Promise<TeamListItem[]> {
  const client = getClient();
  if (!client) {
    return [];
  }

  const { data: teams, error } = await client
    .from("sports_teams")
    .select("id, league, api_team_id, name, logo_path, logo_url_original")
    .order("name");

  if (error || !teams) {
    console.error("[getAllTeams] Error fetching teams:", error?.message);
    return [];
  }

  return teams.map(transformTeam);
}

/**
 * Get team counts per league
 */
export async function getTeamCountsByLeague(): Promise<Record<string, number>> {
  const client = getClient();
  if (!client) {
    return {};
  }

  const { data: teams, error } = await client
    .from("sports_teams")
    .select("league");

  if (error || !teams) {
    return {};
  }

  const counts: Record<string, number> = {};
  for (const team of teams) {
    counts[team.league] = (counts[team.league] || 0) + 1;
  }

  return counts;
}

/**
 * Transform raw database team to TeamListItem
 */
function transformTeam(team: {
  id: string;
  league: string;
  api_team_id: number;
  name: string;
  logo_path: string | null;
  logo_url_original: string | null;
}): TeamListItem {
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
