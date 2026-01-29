/**
 * NFL Data from API-Sports Cache (Supabase)
 * 
 * This module provides NFL teams and games data from the cached Supabase tables:
 * - public.api_sports_nfl_teams
 * - public.api_sports_nfl_games
 * 
 * No external API calls are made - all data comes from the database.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create a client for querying cache tables
function getClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Types matching the cache tables
export interface CachedNflTeam {
  team_id: number;
  name: string;
  code: string | null;
  city: string | null;
  logo: string | null;
}

export interface CachedNflGame {
  game_id: number;
  game_date: string | null;
  status: string | null;
  league_id: number | null;
  season: number | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
}

// Conference/group names to filter out (not real teams)
const CONFERENCE_NAMES = [
  "afc",
  "nfc",
  "american football conference",
  "national football conference",
  "all-stars",
  "all stars",
];

/**
 * Check if a team entry is a real NFL team (not a conference)
 */
export function isRealNflTeam(team: CachedNflTeam): boolean {
  // Must have a valid logo URL
  if (!team.logo || team.logo.trim() === "") {
    return false;
  }
  
  // Filter out conference entries by name
  const nameLower = team.name.toLowerCase();
  if (CONFERENCE_NAMES.some(conf => nameLower.includes(conf))) {
    return false;
  }
  
  // Code should be 2-3 characters for real NFL teams
  if (team.code && team.code.length > 3) {
    return false;
  }
  
  // Prefer logos from the official API-Sports path
  // But don't require it - some valid teams might have different URLs
  
  return true;
}

/**
 * Get all NFL teams from cache (raw, unfiltered)
 */
export async function getNflTeamsFromCacheRaw(): Promise<CachedNflTeam[]> {
  const client = getClient();
  if (!client) {
    console.warn("[nfl-cache] Supabase client not available");
    return [];
  }

  const { data, error } = await client
    .from("api_sports_nfl_teams")
    .select("team_id, name, code, city, logo")
    .order("name");

  if (error) {
    console.error("[nfl-cache] Failed to fetch teams:", error.message);
    return [];
  }

  return data || [];
}

/**
 * Get all NFL teams from cache (filtered to real teams only)
 */
export async function getNflTeamsFromCache(): Promise<CachedNflTeam[]> {
  const allTeams = await getNflTeamsFromCacheRaw();
  return allTeams.filter(isRealNflTeam);
}

/**
 * Get NFL games from cache for a date range
 */
export async function getNflGamesFromCache(
  fromDate: string,
  toDate: string
): Promise<CachedNflGame[]> {
  const client = getClient();
  if (!client) {
    console.warn("[nfl-cache] Supabase client not available");
    return [];
  }

  const { data, error } = await client
    .from("api_sports_nfl_games")
    .select("game_id, game_date, status, league_id, season, home_team_id, away_team_id, home_score, away_score")
    .gte("game_date", `${fromDate}T00:00:00Z`)
    .lte("game_date", `${toDate}T23:59:59Z`)
    .order("game_date", { ascending: true });

  if (error) {
    console.error("[nfl-cache] Failed to fetch games:", error.message);
    return [];
  }

  return data || [];
}

/**
 * Get NFL games from cache for a specific date
 */
export async function getNflGamesByDateFromCache(
  date: string
): Promise<CachedNflGame[]> {
  return getNflGamesFromCache(date, date);
}

/**
 * Build a team lookup map from cached teams
 */
export async function getNflTeamMap(): Promise<Map<number, CachedNflTeam>> {
  const teams = await getNflTeamsFromCache();
  const map = new Map<number, CachedNflTeam>();
  for (const team of teams) {
    map.set(team.team_id, team);
  }
  return map;
}

/**
 * Transform cached game to the format expected by existing components
 * This adapts the API-Sports cache format to match SportsDataIO format
 */
export function transformCachedGameToLegacyFormat(
  game: CachedNflGame,
  teamMap: Map<number, CachedNflTeam>
) {
  const homeTeam = game.home_team_id ? teamMap.get(game.home_team_id) : null;
  const awayTeam = game.away_team_id ? teamMap.get(game.away_team_id) : null;

  // Map status to legacy format
  const statusLower = (game.status || "").toLowerCase();
  const isOver = statusLower.includes("final") || statusLower.includes("finished") || statusLower === "ft";
  const isInProgress = statusLower.includes("progress") || statusLower.includes("live") || statusLower.includes("q");
  const hasStarted = isOver || isInProgress || game.home_score !== null || game.away_score !== null;

  return {
    GameKey: String(game.game_id),
    GameID: game.game_id,
    Date: game.game_date || "",
    DateTime: game.game_date || "",
    Season: game.season,
    Week: 0, // Not available in API-Sports cache
    AwayTeam: awayTeam?.code || "",
    HomeTeam: homeTeam?.code || "",
    AwayScore: game.away_score,
    HomeScore: game.home_score,
    Status: game.status || "Scheduled",
    HasStarted: hasStarted,
    IsInProgress: isInProgress,
    IsOver: isOver,
    IsClosed: isOver,
    Canceled: statusLower.includes("cancel") || statusLower.includes("postpone"),
    AwayTeamData: awayTeam ? {
      TeamID: awayTeam.team_id,
      Key: awayTeam.code || "",
      City: awayTeam.city || "",
      Name: awayTeam.name,
      FullName: awayTeam.city ? `${awayTeam.city} ${awayTeam.name}` : awayTeam.name,
      WikipediaLogoUrl: awayTeam.logo,
    } : undefined,
    HomeTeamData: homeTeam ? {
      TeamID: homeTeam.team_id,
      Key: homeTeam.code || "",
      City: homeTeam.city || "",
      Name: homeTeam.name,
      FullName: homeTeam.city ? `${homeTeam.city} ${homeTeam.name}` : homeTeam.name,
      WikipediaLogoUrl: homeTeam.logo,
    } : undefined,
  };
}

/**
 * Transform cached team to the format expected by existing components
 */
export function transformCachedTeamToLegacyFormat(team: CachedNflTeam) {
  return {
    teamId: team.team_id,
    name: team.name,
    city: team.city || "",
    fullName: team.city ? `${team.city} ${team.name}` : team.name,
    abbreviation: team.code || "",
    logoUrl: team.logo,
    primaryColor: null,
    secondaryColor: null,
    conference: null,
    division: null,
  };
}
