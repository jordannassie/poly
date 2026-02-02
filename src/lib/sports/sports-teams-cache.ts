/**
 * Sports Teams from Supabase Cache (sports_teams table)
 * 
 * This module provides teams data from the cached Supabase table:
 * - public.sports_teams
 * 
 * Supports all leagues that have been synced via the admin API-Sports sync.
 * No external API calls are made - all data comes from the database.
 */

import { createClient } from "@supabase/supabase-js";
import { getTeamLogoUrl } from "@/lib/teams/getTeamLogoUrl";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create a client for querying cache tables
function getClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Type matching the sports_teams table
export interface CachedSportsTeam {
  id: string;
  league: string;
  api_team_id: number;
  name: string;
  logo_path: string | null;
  logo_url_original: string | null;
  updated_at: string;
}

// Simplified team format for frontend
export interface SimplifiedTeam {
  teamId: number;
  name: string;
  city: string;
  fullName: string;
  abbreviation: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  conference: string | null;
  division: string | null;
}

/**
 * Get all teams from sports_teams table for a specific league
 */
export async function getTeamsFromCache(league: string): Promise<CachedSportsTeam[]> {
  const client = getClient();
  if (!client) {
    console.warn("[sports-teams-cache] Supabase client not available");
    return [];
  }

  const { data, error } = await client
    .from("sports_teams")
    .select("id, league, api_team_id, name, logo_path, logo_url_original, updated_at")
    .eq("league", league.toUpperCase())
    .order("name");

  if (error) {
    console.error(`[sports-teams-cache] Failed to fetch ${league} teams:`, error.message);
    return [];
  }

  return data || [];
}

/**
 * Get team count from sports_teams table for a specific league
 */
export async function getTeamCountFromCache(league: string): Promise<number> {
  const client = getClient();
  if (!client) {
    return 0;
  }

  const { count, error } = await client
    .from("sports_teams")
    .select("id", { count: "exact", head: true })
    .eq("league", league.toUpperCase());

  if (error) {
    console.error(`[sports-teams-cache] Failed to count ${league} teams:`, error.message);
    return 0;
  }

  return count || 0;
}

/**
 * Transform cached sports_team to the simplified format expected by frontend
 */
export function transformCachedSportsTeamToSimplified(team: CachedSportsTeam): SimplifiedTeam {
  // Use the getTeamLogoUrl helper for proper fallback logic
  const logoUrl = getTeamLogoUrl({
    logo_path: team.logo_path,
    logo_url_original: team.logo_url_original,
  });

  // Extract city from team name if possible (e.g., "Los Angeles Lakers" -> "Los Angeles")
  // For now, just use empty city since we don't have this data reliably
  const city = "";
  
  // Generate abbreviation from team name (take first letters of each word, max 3)
  const abbreviation = team.name
    .split(" ")
    .map(w => w.charAt(0).toUpperCase())
    .join("")
    .slice(0, 3);

  return {
    teamId: team.api_team_id,
    name: team.name,
    city,
    fullName: team.name,
    abbreviation,
    logoUrl: logoUrl !== "/placeholder-team.png" ? logoUrl : null,
    primaryColor: null,
    secondaryColor: null,
    conference: null,
    division: null,
  };
}

/**
 * Get simplified teams for a league (ready for frontend consumption)
 */
export async function getSimplifiedTeamsFromCache(league: string): Promise<SimplifiedTeam[]> {
  const teams = await getTeamsFromCache(league);
  return teams.map(transformCachedSportsTeamToSimplified);
}

/**
 * Check if teams exist in the cache for a league
 */
export async function hasTeamsInCache(league: string): Promise<boolean> {
  const count = await getTeamCountFromCache(league);
  return count > 0;
}

/**
 * Get all available leagues that have teams in the cache
 */
export async function getAvailableLeaguesFromCache(): Promise<string[]> {
  const client = getClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("sports_teams")
    .select("league")
    .order("league");

  if (error) {
    console.error("[sports-teams-cache] Failed to get leagues:", error.message);
    return [];
  }

  // Get unique leagues
  const leagues = new Set<string>();
  for (const row of data || []) {
    leagues.add(row.league);
  }

  return Array.from(leagues);
}
