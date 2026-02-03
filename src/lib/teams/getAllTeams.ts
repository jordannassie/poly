/**
 * Get All Teams
 * 
 * Fetches all teams from the sports_teams cache for browsing.
 * Uses the new schema: id, league, name, slug, logo, country
 */

import { createClient } from "@supabase/supabase-js";
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
  country?: string;
}

/**
 * Get all teams for a specific league
 * League values in DB are lowercase: nfl, nba, mlb, nhl, soccer
 */
export async function getTeamsByLeague(league: string): Promise<TeamListItem[]> {
  const client = getClient();
  if (!client) {
    return [];
  }

  // ALWAYS lowercase the league for query
  const leagueLower = league.toLowerCase();

  const { data: teams, error } = await client
    .from("sports_teams")
    .select("id, league, name, slug, logo, country")
    .eq("league", leagueLower)
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
    .select("id, league, name, slug, logo, country")
    .order("league")
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
 * New schema: id is the API team ID (bigint), logo is the URL
 */
function transformTeam(team: {
  id: number;
  league: string;
  name: string;
  slug: string;
  logo: string | null;
  country?: string | null;
}): TeamListItem {
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
