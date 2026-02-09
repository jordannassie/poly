/**
 * Sports Games from Supabase Cache (sports_games table)
 * 
 * Provides games data from the unified sports_games table.
 * Used for NBA, MLB, NHL, and Soccer.
 */

import { createClient } from "@supabase/supabase-js";
import { isRealGame, PLACEHOLDER_TEAM_NAMES } from "./placeholderTeams";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Cache for enabled soccer league IDs (refresh every 5 minutes)
let enabledSoccerLeagueIds: number[] | null = null;
let enabledSoccerLeaguesCacheTime = 0;
const SOCCER_LEAGUES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get enabled soccer league IDs from sports_leagues table
 */
async function getEnabledSoccerLeagueIds(): Promise<number[]> {
  // Check cache
  const now = Date.now();
  if (enabledSoccerLeagueIds !== null && now - enabledSoccerLeaguesCacheTime < SOCCER_LEAGUES_CACHE_TTL) {
    return enabledSoccerLeagueIds;
  }

  const client = getClient();
  if (!client) {
    console.warn("[games-cache] No client for fetching enabled leagues");
    return [];
  }

  const { data, error } = await client
    .from("sports_leagues")
    .select("league_id")
    .eq("sport", "soccer")
    .eq("enabled", true);

  if (error) {
    console.error("[games-cache] Error fetching enabled soccer leagues:", error.message);
    // Return cached value if available, otherwise empty
    return enabledSoccerLeagueIds || [];
  }

  enabledSoccerLeagueIds = (data || []).map(l => l.league_id);
  enabledSoccerLeaguesCacheTime = now;
  
  console.log(`[games-cache] Enabled soccer leagues: ${enabledSoccerLeagueIds.length} (${enabledSoccerLeagueIds.join(", ")})`);
  return enabledSoccerLeagueIds;
}

// Type matching sports_games v2 table with lifecycle extensions
export interface CachedGame {
  id: number;
  league: string;
  external_game_id: string;
  provider: string;
  season: number;
  starts_at: string;
  status: string;           // Raw status from provider
  status_norm?: string;     // Normalized: SCHEDULED, LIVE, FINAL, CANCELED, POSTPONED
  status_raw?: string;      // Original raw status
  winner_side?: string;     // HOME, AWAY, DRAW (for FINAL games)
  home_team: string;        // Team name (no FK)
  away_team: string;        // Team name (no FK)
  home_score: number | null;
  away_score: number | null;
  league_id?: number | null; // API-Sports league ID (for filtering)
  finalized_at?: string;
  settled_at?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at?: string;
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
 * Filter out placeholder games (NFC vs AFC, All-Stars, TBD, etc.)
 * Safety net in case any slipped through sync
 */
function filterRealGames(games: CachedGame[]): CachedGame[] {
  return games.filter(game => isRealGame(game.home_team, game.away_team));
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
  const leagueNormalized = league.toLowerCase();

  let query = client
    .from("sports_games")
    .select("*")
    .eq("league", leagueNormalized)
    .gte("starts_at", startOfDay)
    .lte("starts_at", endOfDay)
    .order("starts_at", { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error(`[games-cache] Error fetching ${league} games:`, error.message);
    return [];
  }

  let games = data || [];

  // For soccer, filter by enabled leagues
  if (leagueNormalized === "soccer") {
    const enabledLeagueIds = await getEnabledSoccerLeagueIds();
    if (enabledLeagueIds.length > 0) {
      const beforeFilter = games.length;
      games = games.filter(g => g.league_id && enabledLeagueIds.includes(g.league_id));
      console.log(`[games-cache] Soccer filter: ${beforeFilter} -> ${games.length} games (enabled leagues: ${enabledLeagueIds.length})`);
    } else {
      console.warn("[games-cache] No enabled soccer leagues - returning empty");
      return [];
    }
  }

  // Filter out placeholder games (NFC vs AFC, etc.)
  return filterRealGames(games);
}

/**
 * Get upcoming games from sports_games table for a league
 * Uses indexed query on (league, starts_at)
 * Includes both upcoming scheduled games and live/in-progress games
 */
export async function getUpcomingGamesFromCache(
  league: string,
  days: number = 30
): Promise<CachedGame[]> {
  const client = getClient();
  if (!client) {
    console.error(`[games-cache] getUpcomingGamesFromCache: No Supabase client`);
    return [];
  }

  const leagueNormalized = league.toLowerCase();
  
  // Start from beginning of today (UTC) to include games that started earlier today
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  // Use higher limit for longer date ranges, cap at 200 for performance
  const queryLimit = Math.min(200, days > 90 ? 200 : 100);

  console.log(`[games-cache] QUERY league=${leagueNormalized} days=${days} from=${startOfToday.toISOString()} to=${endDate.toISOString()}`);

  const { data, error, count } = await client
    .from("sports_games")
    .select("*", { count: "exact" })
    .eq("league", leagueNormalized)
    .gte("starts_at", startOfToday.toISOString())
    .lte("starts_at", endDate.toISOString())
    .order("starts_at", { ascending: true })
    .limit(queryLimit);

  if (error) {
    console.error(`[games-cache] ERROR league=${leagueNormalized} error="${error.message}" code=${error.code} hint="${error.hint || 'none'}"`);
    return [];
  }

  let games = data || [];

  // For soccer, filter by enabled leagues
  if (leagueNormalized === "soccer") {
    const enabledLeagueIds = await getEnabledSoccerLeagueIds();
    if (enabledLeagueIds.length > 0) {
      const beforeFilter = games.length;
      games = games.filter(g => g.league_id && enabledLeagueIds.includes(g.league_id));
      console.log(`[games-cache] Soccer filter (upcoming): ${beforeFilter} -> ${games.length} games (enabled leagues: ${enabledLeagueIds.length})`);
    } else {
      console.warn("[games-cache] No enabled soccer leagues - returning empty");
      return [];
    }
  }

  // Filter out placeholder games (NFC vs AFC, etc.)
  const filtered = filterRealGames(games);
  console.log(`[games-cache] RESULT league=${leagueNormalized} totalInDb=${count} returned=${data?.length || 0} afterFilter=${filtered.length}`);

  return filtered;
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
 * Uses status_norm from database (source of truth) instead of inferring from time/raw status
 */
export function transformCachedGame(
  game: CachedGame,
  teamMap: Map<string, { id: number; name: string; logo: string | null; slug: string }>
): SimplifiedGame {
  // Look up teams by name (lowercase for matching)
  const homeTeam = teamMap.get(game.home_team.toLowerCase());
  const awayTeam = teamMap.get(game.away_team.toLowerCase());

  // Use status_norm from database (source of truth)
  // Fallback to parsing raw status for backwards compatibility
  const statusNorm = game.status_norm?.toUpperCase() || '';
  let isOver = false;
  let isInProgress = false;
  let isCanceled = false;
  
  if (statusNorm) {
    // Use normalized status from database
    isOver = statusNorm === 'FINAL';
    isInProgress = statusNorm === 'LIVE';
    isCanceled = statusNorm === 'CANCELED' || statusNorm === 'POSTPONED';
  } else {
    // Fallback: Parse from raw status (legacy support)
    const statusLower = (game.status || "").toLowerCase();
    isOver = statusLower.includes("final") || statusLower.includes("finished") || statusLower === "ft";
    isInProgress = statusLower.includes("progress") || statusLower.includes("live") || 
                   statusLower.includes("1h") || statusLower.includes("2h") ||
                   statusLower.includes("q1") || statusLower.includes("q2") ||
                   statusLower.includes("q3") || statusLower.includes("q4");
    isCanceled = statusLower.includes("cancel") || statusLower.includes("postpone");
  }
  
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
  days: number = 30
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

// ============================================================================
// HOMEPAGE GAME QUERIES
// ============================================================================

/**
 * Get "Hot Right Now" games - starts_at between now() and now()+24h
 * Returns games from ALL leagues
 */
export async function getHotGamesFromCache(): Promise<CachedGame[]> {
  const client = getClient();
  if (!client) {
    console.error("[games-cache] getHotGamesFromCache: No Supabase client");
    return [];
  }

  const now = new Date();
  const end24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  console.log(`[games-cache] getHotGamesFromCache: querying starts_at >= ${now.toISOString()} AND <= ${end24h.toISOString()}`);

  const { data, error, count } = await client
    .from("sports_games")
    .select("*", { count: "exact" })
    .gte("starts_at", now.toISOString())
    .lte("starts_at", end24h.toISOString())
    .order("starts_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[games-cache] Error fetching hot games:", error.message, "code:", error.code, "hint:", error.hint);
    return [];
  }

  let games = data || [];

  // Filter soccer games by enabled leagues
  const enabledLeagueIds = await getEnabledSoccerLeagueIds();
  if (enabledLeagueIds.length > 0) {
    games = games.filter(g => {
      if (g.league === "soccer") {
        return g.league_id && enabledLeagueIds.includes(g.league_id);
      }
      return true; // Keep non-soccer games
    });
  } else {
    // No enabled soccer leagues, filter them all out
    games = games.filter(g => g.league !== "soccer");
  }

  // Filter out placeholder games (NFC vs AFC, etc.)
  const filtered = filterRealGames(games);
  console.log(`[games-cache] Hot games (next 24h): returned=${data?.length || 0} filtered=${filtered.length} totalInWindow=${count}`);
  return filtered;
}

/**
 * Get "Starting Soon" games - starts_at between now() and now()+7d
 * Returns games from ALL leagues
 */
export async function getStartingSoonGamesFromCache(): Promise<CachedGame[]> {
  const client = getClient();
  if (!client) {
    console.error("[games-cache] getStartingSoonGamesFromCache: No Supabase client");
    return [];
  }

  const now = new Date();
  const end7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  console.log(`[games-cache] getStartingSoonGamesFromCache: querying starts_at >= ${now.toISOString()} AND <= ${end7d.toISOString()}`);

  const { data, error, count } = await client
    .from("sports_games")
    .select("*", { count: "exact" })
    .gte("starts_at", now.toISOString())
    .lte("starts_at", end7d.toISOString())
    .order("starts_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("[games-cache] Error fetching starting soon games:", error.message, "code:", error.code, "hint:", error.hint);
    return [];
  }

  let games = data || [];

  // Filter soccer games by enabled leagues
  const enabledLeagueIds = await getEnabledSoccerLeagueIds();
  if (enabledLeagueIds.length > 0) {
    games = games.filter(g => {
      if (g.league === "soccer") {
        return g.league_id && enabledLeagueIds.includes(g.league_id);
      }
      return true; // Keep non-soccer games
    });
  } else {
    // No enabled soccer leagues, filter them all out
    games = games.filter(g => g.league !== "soccer");
  }

  // Filter out placeholder games (NFC vs AFC, etc.)
  const filtered = filterRealGames(games);
  console.log(`[games-cache] Starting soon games (next 7d): returned=${data?.length || 0} filtered=${filtered.length} totalInWindow=${count}`);
  return filtered;
}

/**
 * Get "Live" games - status indicates in-progress
 * Returns games from ALL leagues that are currently live
 */
export async function getLiveGamesFromCache(): Promise<CachedGame[]> {
  const client = getClient();
  if (!client) {
    return [];
  }

  // Live statuses to check for (case-insensitive patterns)
  // Common API-Sports live statuses: "In Progress", "1H", "2H", "Q1", "Q2", "Q3", "Q4", "HT", "LIVE"
  const livePatterns = [
    "in progress",
    "inprogress", 
    "live",
    "1h", "2h", "ht", // soccer halves
    "q1", "q2", "q3", "q4", "ot", // basketball/football quarters
    "p1", "p2", "p3", // hockey periods
  ];

  // Query for games that started recently (within last 6 hours) and have a live-ish status
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const now = new Date();

  const { data, error } = await client
    .from("sports_games")
    .select("*")
    .gte("starts_at", sixHoursAgo.toISOString())
    .lte("starts_at", now.toISOString())
    .order("starts_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[games-cache] Error fetching live games:", error.message);
    return [];
  }

  let games = data || [];

  // Filter soccer games by enabled leagues
  const enabledLeagueIds = await getEnabledSoccerLeagueIds();
  if (enabledLeagueIds.length > 0) {
    games = games.filter(g => {
      if (g.league === "soccer") {
        return g.league_id && enabledLeagueIds.includes(g.league_id);
      }
      return true; // Keep non-soccer games
    });
  } else {
    // No enabled soccer leagues, filter them all out
    games = games.filter(g => g.league !== "soccer");
  }

  // Filter for live status and filter out placeholders
  const liveGames = filterRealGames(games).filter(game => {
    const statusLower = (game.status || "").toLowerCase();
    // Not finished/final
    if (statusLower.includes("final") || statusLower.includes("finished") || statusLower === "ft") {
      return false;
    }
    // Not canceled/postponed
    if (statusLower.includes("cancel") || statusLower.includes("postpone")) {
      return false;
    }
    // Check if any live pattern matches
    return livePatterns.some(pattern => statusLower.includes(pattern));
  });

  console.log(`[games-cache] Live games: ${liveGames.length} (placeholders filtered)`);
  return liveGames;
}

/**
 * Get all team maps for multiple leagues at once
 */
export async function getAllTeamMapsFromCache(): Promise<Map<string, { id: number; name: string; logo: string | null; slug: string }>> {
  const client = getClient();
  if (!client) {
    return new Map();
  }

  const { data, error } = await client
    .from("sports_teams")
    .select("id, name, logo, slug, league");

  if (error || !data) {
    console.error("[games-cache] Error fetching all teams:", error?.message);
    return new Map();
  }

  // Map by "league:teamname" (lowercase for matching)
  const map = new Map<string, { id: number; name: string; logo: string | null; slug: string }>();
  let teamsWithLogo = 0;
  for (const team of data) {
    const key = `${team.league.toLowerCase()}:${team.name.toLowerCase()}`;
    map.set(key, {
      id: team.id,
      name: team.name,
      logo: team.logo,
      slug: team.slug,
    });
    if (team.logo) teamsWithLogo++;
  }

  console.log(`[games-cache] getAllTeamMapsFromCache: ${data.length} teams loaded, ${teamsWithLogo} have logos`);

  return map;
}
