/**
 * Sports Teams from Supabase Cache (sports_teams table)
 * 
 * This module provides teams data from the cached Supabase table:
 * - public.sports_teams
 * 
 * New schema:
 * - id: bigint (API-Sports team ID, part of composite PK)
 * - league: text (nfl, nba, mlb, nhl, soccer - lowercase)
 * - name: text
 * - slug: text (unique, URL-friendly)
 * - logo: text (logo URL)
 * - country: text (nullable)
 * 
 * Supports all leagues that have been synced via the admin API-Sports sync.
 * No external API calls are made - all data comes from the database.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create a client for querying cache tables
function getClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Names to filter out (conferences, not actual teams)
const EXCLUDED_NAMES = ["afc", "nfc", "east", "west"];

// Type matching the NEW sports_teams table schema
export interface CachedSportsTeam {
  id: number;          // API-Sports team ID
  league: string;      // nfl, nba, mlb, nhl, soccer (lowercase)
  name: string;
  slug: string;
  logo: string | null; // Logo URL
  country: string | null;
  updated_at?: string;
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
 * League values in DB are LOWERCASE: nfl, nba, mlb, nhl, soccer
 */
export async function getTeamsFromCache(league: string): Promise<CachedSportsTeam[]> {
  const client = getClient();
  if (!client) {
    console.warn("[sports-teams-cache] Supabase client not available");
    return [];
  }

  // ALWAYS lowercase the league for query
  const leagueLower = league.toLowerCase();

  const { data, error } = await client
    .from("sports_teams")
    .select("id, league, name, slug, logo, country, updated_at")
    .eq("league", leagueLower)
    .order("name");

  if (error) {
    console.error(`[sports-teams-cache] Failed to fetch ${league} teams:`, error.message);
    return [];
  }

  // Filter out AFC/NFC (conferences, not teams)
  const filtered = (data || []).filter(t => !EXCLUDED_NAMES.includes(t.name.toLowerCase()));
  return filtered;
}

/**
 * Get team count from sports_teams table for a specific league
 */
export async function getTeamCountFromCache(league: string): Promise<number> {
  const client = getClient();
  if (!client) {
    return 0;
  }

  // ALWAYS lowercase the league for query
  const leagueLower = league.toLowerCase();

  const { count, error } = await client
    .from("sports_teams")
    .select("id", { count: "exact", head: true })
    .eq("league", leagueLower);

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
  // Use the logo URL directly from the new schema
  const logoUrl = team.logo || null;

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
    teamId: team.id,
    name: team.name,
    city,
    fullName: team.name,
    abbreviation,
    logoUrl,
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
