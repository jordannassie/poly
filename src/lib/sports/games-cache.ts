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

// Type matching sports_games v2 table
export interface CachedGame {
  id: number;
  league: string;
  external_game_id: string;
  provider: string;
  season: number;
  starts_at: string;
  status: string;
  home_team: string;  // Team name (no FK)
  away_team: string;  // Team name (no FK)
  home_score: number | null;
  away_score: number | null;
  created_at: string;
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
    .eq("league", league.toLowerCase())
    .gte("starts_at", startOfDay)
    .lte("starts_at", endOfDay)
    .order("starts_at", { ascending: true });

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
    .eq("league", league.toLowerCase())
    .gte("starts_at", now.toISOString())
    .lte("starts_at", endDate.toISOString())
    .order("starts_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error(`[games-cache] Error fetching upcoming ${league} games:`, error.message);
    return [];
  }

  console.log(`[games-cache] ${league} upcoming: ${data?.length || 0} games in next ${days} days`);

  return data || [];
}

/**
 * Get a single game by ID
 */
export async function getGameFromCache(
  league: string,
  gameId: string
): Promise<CachedGame | null> {
  const client = getClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("sports_games")
    .select("*")
    .eq("league", league.toLowerCase())
    .eq("external_game_id", gameId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get team data from sports_teams for lookups by name
 */
export async function getTeamMapFromCache(
  league: string
): Promise<Map<string, { id: number; name: string; logo: string | null; slug: string }>> {
  const client = getClient();
  if (!client) {
    return new Map();
  }

  const { data, error } = await client
    .from("sports_teams")
    .select("id, name, logo, slug")
    .eq("league", league.toLowerCase());

  if (error || !data) {
    return new Map();
  }

  // Map by team name (lowercase for matching)
  const map = new Map<string, { id: number; name: string; logo: string | null; slug: string }>();
  for (const team of data) {
    map.set(team.name.toLowerCase(), {
      id: team.id,
      name: team.name,
      logo: team.logo,
      slug: team.slug,
    });
  }

  return map;
}

/**
 * Transform cached game to frontend format
 */
export function transformCachedGame(
  game: CachedGame,
  teamMap: Map<string, { id: number; name: string; logo: string | null; slug: string }>
): SimplifiedGame {
  // Look up teams by name (lowercase for matching)
  const homeTeam = teamMap.get(game.home_team.toLowerCase());
  const awayTeam = teamMap.get(game.away_team.toLowerCase());

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
    // For NFL, try to get last word (e.g., "Arizona Cardinals" -> "Cardinals" -> "CAR")
    const words = name.split(" ");
    if (words.length > 1) {
      return words[words.length - 1].slice(0, 3).toUpperCase();
    }
    return name.slice(0, 3).toUpperCase();
  };

  return {
    GameKey: game.external_game_id,
    GameID: parseInt(game.external_game_id, 10) || 0,
    Date: game.starts_at,
    DateTime: game.starts_at,
    Season: game.season,
    Week: 0,
    AwayTeam: getAbbr(game.away_team),
    HomeTeam: getAbbr(game.home_team),
    AwayScore: game.away_score,
    HomeScore: game.home_score,
    Status: game.status || "scheduled",
    HasStarted: hasStarted,
    IsInProgress: isInProgress,
    IsOver: isOver,
    IsClosed: isOver,
    Canceled: isCanceled,
    AwayTeamData: {
      TeamID: awayTeam?.id || 0,
      Key: getAbbr(game.away_team),
      Name: game.away_team,
      FullName: game.away_team,
      WikipediaLogoUrl: awayTeam?.logo || null,
    },
    HomeTeamData: {
      TeamID: homeTeam?.id || 0,
      Key: getAbbr(game.home_team),
      Name: game.home_team,
      FullName: game.home_team,
      WikipediaLogoUrl: homeTeam?.logo || null,
    },
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
    .eq("league", league.toLowerCase());

  if (error) {
    return 0;
  }

  return count || 0;
}
