/**
 * Sports Games from Supabase Cache (sports_games table)
 * 
 * Provides games data from the unified sports_games table.
 * Used for NBA, MLB, NHL, and Soccer.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Type matching sports_games table
export interface CachedGame {
  id: string;
  league: string;
  api_game_id: number;
  home_team_id: number | null;
  away_team_id: number | null;
  start_time: string | null;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  season: number | null;
  raw: any;
}

// Simplified game format for frontend
export interface SimplifiedGame {
  GameKey: string;
  GameID: number;
  Date: string;
  DateTime: string;
  Season: number | null;
  Week: number;
  AwayTeam: string;
  HomeTeam: string;
  AwayScore: number | null;
  HomeScore: number | null;
  Status: string;
  HasStarted: boolean;
  IsInProgress: boolean;
  IsOver: boolean;
  IsClosed: boolean;
  Canceled: boolean;
  AwayTeamData?: any;
  HomeTeamData?: any;
}

/**
 * Get games from sports_games table for a specific league and date
 */
export async function getGamesFromCache(
  league: string,
  date: string
): Promise<CachedGame[]> {
  const client = getClient();
  if (!client) {
    console.warn("[games-cache] Supabase client not available");
    return [];
  }

  // Create date range for the day (start of day to end of day in UTC)
  const startOfDay = `${date}T00:00:00Z`;
  const endOfDay = `${date}T23:59:59Z`;

  const { data, error } = await client
    .from("sports_games")
    .select("*")
    .eq("league", league.toUpperCase())
    .gte("start_time", startOfDay)
    .lte("start_time", endOfDay)
    .order("start_time", { ascending: true });

  if (error) {
    console.error(`[games-cache] Error fetching ${league} games:`, error.message);
    return [];
  }

  return data || [];
}

/**
 * Get upcoming games from sports_games table for a league
 */
export async function getUpcomingGamesFromCache(
  league: string,
  days: number = 7
): Promise<CachedGame[]> {
  const client = getClient();
  if (!client) {
    return [];
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + days);

  const { data, error } = await client
    .from("sports_games")
    .select("*")
    .eq("league", league.toUpperCase())
    .gte("start_time", now.toISOString())
    .lte("start_time", endDate.toISOString())
    .order("start_time", { ascending: true })
    .limit(50);

  if (error) {
    console.error(`[games-cache] Error fetching upcoming ${league} games:`, error.message);
    return [];
  }

  return data || [];
}

/**
 * Get a single game by ID
 */
export async function getGameFromCache(
  league: string,
  gameId: number
): Promise<CachedGame | null> {
  const client = getClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("sports_games")
    .select("*")
    .eq("league", league.toUpperCase())
    .eq("api_game_id", gameId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get team data from sports_teams for lookups
 */
export async function getTeamMapFromCache(
  league: string
): Promise<Map<number, { name: string; logo_path: string | null; logo_url_original: string | null }>> {
  const client = getClient();
  if (!client) {
    return new Map();
  }

  const { data, error } = await client
    .from("sports_teams")
    .select("api_team_id, name, logo_path, logo_url_original")
    .eq("league", league.toUpperCase());

  if (error || !data) {
    return new Map();
  }

  const map = new Map<number, { name: string; logo_path: string | null; logo_url_original: string | null }>();
  for (const team of data) {
    map.set(team.api_team_id, {
      name: team.name,
      logo_path: team.logo_path,
      logo_url_original: team.logo_url_original,
    });
  }

  return map;
}

/**
 * Transform cached game to frontend format
 */
export function transformCachedGame(
  game: CachedGame,
  teamMap: Map<number, { name: string; logo_path: string | null; logo_url_original: string | null }>
): SimplifiedGame {
  const homeTeam = game.home_team_id ? teamMap.get(game.home_team_id) : null;
  const awayTeam = game.away_team_id ? teamMap.get(game.away_team_id) : null;

  // Parse status
  const statusLower = (game.status || "").toLowerCase();
  const isOver = statusLower.includes("final") || statusLower.includes("finished") || statusLower === "ft";
  const isInProgress = statusLower.includes("progress") || statusLower.includes("live") || 
                       statusLower.includes("1h") || statusLower.includes("2h") ||
                       statusLower.includes("q1") || statusLower.includes("q2") ||
                       statusLower.includes("q3") || statusLower.includes("q4");
  const isCanceled = statusLower.includes("cancel") || statusLower.includes("postpone");
  const hasStarted = isOver || isInProgress || game.home_score !== null || game.away_score !== null;

  // Generate abbreviation from team name
  const getAbbr = (name: string | undefined) => {
    if (!name) return "";
    return name.split(" ").map(w => w.charAt(0)).join("").slice(0, 3).toUpperCase();
  };

  // Get logo URL
  const getLogoUrl = (team: { logo_path: string | null; logo_url_original: string | null } | null) => {
    if (!team) return null;
    if (team.logo_path) {
      return `${supabaseUrl}/storage/v1/object/public/SPORTS/${team.logo_path}`;
    }
    return team.logo_url_original || null;
  };

  return {
    GameKey: String(game.api_game_id),
    GameID: game.api_game_id,
    Date: game.start_time || "",
    DateTime: game.start_time || "",
    Season: game.season,
    Week: 0,
    AwayTeam: getAbbr(awayTeam?.name),
    HomeTeam: getAbbr(homeTeam?.name),
    AwayScore: game.away_score,
    HomeScore: game.home_score,
    Status: game.status || "Scheduled",
    HasStarted: hasStarted,
    IsInProgress: isInProgress,
    IsOver: isOver,
    IsClosed: isOver,
    Canceled: isCanceled,
    AwayTeamData: awayTeam ? {
      TeamID: game.away_team_id,
      Key: getAbbr(awayTeam.name),
      Name: awayTeam.name,
      FullName: awayTeam.name,
      WikipediaLogoUrl: getLogoUrl(awayTeam),
    } : undefined,
    HomeTeamData: homeTeam ? {
      TeamID: game.home_team_id,
      Key: getAbbr(homeTeam.name),
      Name: homeTeam.name,
      FullName: homeTeam.name,
      WikipediaLogoUrl: getLogoUrl(homeTeam),
    } : undefined,
  };
}

/**
 * Get games with team data joined - ready for frontend
 */
export async function getGamesWithTeamsFromCache(
  league: string,
  date: string
): Promise<SimplifiedGame[]> {
  const [games, teamMap] = await Promise.all([
    getGamesFromCache(league, date),
    getTeamMapFromCache(league),
  ]);

  return games.map(game => transformCachedGame(game, teamMap));
}

/**
 * Get upcoming games with team data joined
 */
export async function getUpcomingGamesWithTeamsFromCache(
  league: string,
  days: number = 7
): Promise<SimplifiedGame[]> {
  const [games, teamMap] = await Promise.all([
    getUpcomingGamesFromCache(league, days),
    getTeamMapFromCache(league),
  ]);

  return games.map(game => transformCachedGame(game, teamMap));
}

/**
 * Get game count for a league
 */
export async function getGameCountFromCache(league: string): Promise<number> {
  const client = getClient();
  if (!client) {
    return 0;
  }

  const { count, error } = await client
    .from("sports_games")
    .select("id", { count: "exact", head: true })
    .eq("league", league.toUpperCase());

  if (error) {
    return 0;
  }

  return count || 0;
}
