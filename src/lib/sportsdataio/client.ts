/**
 * SportsDataIO API client with caching and status tracking.
 * API key is kept server-side only.
 * 
 * NFL Endpoints (per official docs):
 * - Teams: GET /v3/nfl/scores/json/Teams
 * - TeamsBasic: GET /v3/nfl/scores/json/TeamsBasic
 * - ScoresByDate: GET /v3/nfl/scores/json/ScoresByDate/{date} where date is YYYY-MMM-DD
 * - AreAnyGamesInProgress: GET /v3/nfl/scores/json/AreAnyGamesInProgress
 */

import { recordSuccess, recordError } from "./status";
import { getFromCache, setInCache, getCacheKey, TTL } from "./cache";
import { toSportsDataIONflDate, getTodayIso, getTomorrowIso } from "./nflDate";

// API configuration - key is server-side only
const API_KEY = process.env.SPORTSDATAIO_API_KEY || "";
const BASE_URL = "https://api.sportsdata.io/v3";

// Supported leagues
export const SUPPORTED_LEAGUES = ["nfl", "nba", "mlb", "nhl"] as const;
export type League = (typeof SUPPORTED_LEAGUES)[number];

/**
 * Internal fetch helper with timing and status tracking
 */
async function fetchFromAPI<T>(
  league: string,
  endpoint: string,
  path: string
): Promise<T> {
  if (!API_KEY) {
    throw new Error("SPORTSDATAIO_API_KEY environment variable is not set");
  }

  const url = `${BASE_URL}/${league}/scores/json${path}?key=${API_KEY}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        "Ocp-Apim-Subscription-Key": API_KEY,
      },
      // Disable Next.js caching to get fresh data
      cache: "no-store",
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      const errorMsg = `HTTP ${response.status}: ${errorText.slice(0, 200)}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    recordSuccess(league, endpoint, latencyMs);
    return data as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    recordError(league, endpoint, message);
    throw error;
  }
}

/**
 * Fetch with cache wrapper
 */
async function fetchWithCache<T>(
  league: string,
  endpoint: string,
  path: string,
  ttlMs: number,
  cacheParams?: string
): Promise<T> {
  const cacheKey = getCacheKey(league, endpoint, cacheParams);

  // Check cache first
  const cached = getFromCache<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Fetch from API
  const data = await fetchFromAPI<T>(league, endpoint, path);

  // Store in cache
  setInCache(cacheKey, data, ttlMs);

  return data;
}

// ============ Type Definitions ============

export interface Team {
  TeamID: number;
  Key: string;
  City: string;
  Name: string;
  FullName?: string;
  Conference?: string;
  Division?: string;
  PrimaryColor?: string;
  SecondaryColor?: string;
  WikipediaLogoUrl?: string;
}

export interface Score {
  GameKey: string;
  SeasonType: number;
  Season: number;
  Week: number;
  Date: string;
  AwayTeam: string;
  HomeTeam: string;
  AwayScore: number | null;
  HomeScore: number | null;
  Channel: string | null;
  PointSpread: number | null;
  OverUnder: number | null;
  Quarter: string | null;
  TimeRemaining: string | null;
  Possession: string | null;
  Down: number | null;
  Distance: number | null;
  YardLine: number | null;
  YardLineTerritory: string | null;
  RedZone: boolean | null;
  AwayScoreQuarter1: number | null;
  AwayScoreQuarter2: number | null;
  AwayScoreQuarter3: number | null;
  AwayScoreQuarter4: number | null;
  AwayScoreOvertime: number | null;
  HomeScoreQuarter1: number | null;
  HomeScoreQuarter2: number | null;
  HomeScoreQuarter3: number | null;
  HomeScoreQuarter4: number | null;
  HomeScoreOvertime: number | null;
  HasStarted: boolean;
  IsInProgress: boolean;
  IsOver: boolean;
  Has1stQuarterStarted: boolean;
  Has2ndQuarterStarted: boolean;
  Has3rdQuarterStarted: boolean;
  Has4thQuarterStarted: boolean;
  IsOvertime: boolean;
  DownAndDistance: string | null;
  QuarterDescription: string | null;
  StadiumID: number | null;
  LastUpdated: string | null;
  GeoLat: number | null;
  GeoLong: number | null;
  ForecastTempLow: number | null;
  ForecastTempHigh: number | null;
  ForecastDescription: string | null;
  ForecastWindChill: number | null;
  ForecastWindSpeed: number | null;
  AwayTeamMoneyLine: number | null;
  HomeTeamMoneyLine: number | null;
  Canceled: boolean;
  Closed: boolean;
  LastPlay: string | null;
}

export interface GameWithTeams extends Score {
  AwayTeamData?: Team;
  HomeTeamData?: Team;
}

// ============ NFL API Methods ============

/**
 * Get all NFL teams
 * Endpoint: GET /v3/nfl/scores/json/Teams
 */
export async function getNflTeams(): Promise<Team[]> {
  return fetchWithCache<Team[]>(
    "nfl",
    "teams",
    "/Teams",
    TTL.TEAMS
  );
}

/**
 * Force refresh NFL teams cache
 */
export async function refreshNflTeams(): Promise<Team[]> {
  const cacheKey = getCacheKey("nfl", "teams");
  const { deleteFromCache } = await import("./cache");
  deleteFromCache(cacheKey);
  return getNflTeams();
}

/**
 * Get NFL scores/games by date
 * Endpoint: GET /v3/nfl/scores/json/ScoresByDate/{date}
 * @param isoDate - Date in YYYY-MM-DD format (will be converted to YYYY-MMM-DD)
 */
export async function getNflScoresByDate(isoDate: string): Promise<Score[]> {
  const nflDate = toSportsDataIONflDate(isoDate);
  return fetchWithCache<Score[]>(
    "nfl",
    "scores",
    `/ScoresByDate/${nflDate}`,
    TTL.GAMES,
    isoDate // Use ISO date as cache key for consistency
  );
}

/**
 * Force refresh NFL scores cache for a date
 */
export async function refreshNflScoresByDate(isoDate: string): Promise<Score[]> {
  const cacheKey = getCacheKey("nfl", "scores", isoDate);
  const { deleteFromCache } = await import("./cache");
  deleteFromCache(cacheKey);
  return getNflScoresByDate(isoDate);
}

/**
 * Get NFL games with team data joined
 */
export async function getNflGamesWithTeams(isoDate: string): Promise<GameWithTeams[]> {
  const [scores, teams] = await Promise.all([
    getNflScoresByDate(isoDate),
    getNflTeams(),
  ]);

  // Create team lookup map
  const teamMap = new Map<string, Team>();
  for (const team of teams) {
    teamMap.set(team.Key, team);
  }

  // Join team data to scores
  return scores.map((score) => ({
    ...score,
    AwayTeamData: teamMap.get(score.AwayTeam),
    HomeTeamData: teamMap.get(score.HomeTeam),
  }));
}

/**
 * Check if any NFL games are currently in progress
 * Endpoint: GET /v3/nfl/scores/json/AreAnyGamesInProgress
 */
export async function areNflGamesInProgress(): Promise<boolean> {
  try {
    const result = await fetchFromAPI<boolean>(
      "nfl",
      "live",
      "/AreAnyGamesInProgress"
    );
    return result;
  } catch {
    return false;
  }
}

/**
 * Warm NFL cache by fetching teams and upcoming games
 */
export async function warmNflCache(): Promise<{
  teamsCount: number;
  todayGamesCount: number;
  tomorrowGamesCount: number;
  gamesInProgress: boolean;
}> {
  const today = getTodayIso();
  const tomorrow = getTomorrowIso();

  const [teams, todayScores, tomorrowScores, gamesInProgress] = await Promise.all([
    getNflTeams(),
    getNflScoresByDate(today),
    getNflScoresByDate(tomorrow),
    areNflGamesInProgress(),
  ]);

  return {
    teamsCount: teams.length,
    todayGamesCount: todayScores.length,
    tomorrowGamesCount: tomorrowScores.length,
    gamesInProgress,
  };
}

// ============ Generic Methods (for other leagues - placeholder) ============

/**
 * Get teams for any league (currently only NFL fully implemented)
 */
export async function getTeams(league: League): Promise<Team[]> {
  if (league === "nfl") {
    return getNflTeams();
  }
  // Placeholder for other leagues
  throw new Error(`League ${league} not yet implemented`);
}

/**
 * Refresh teams for any league
 */
export async function refreshTeams(league: League): Promise<Team[]> {
  if (league === "nfl") {
    return refreshNflTeams();
  }
  throw new Error(`League ${league} not yet implemented`);
}

/**
 * Get games by date for any league
 */
export async function getGamesByDate(league: League, isoDate: string): Promise<Score[]> {
  if (league === "nfl") {
    return getNflScoresByDate(isoDate);
  }
  throw new Error(`League ${league} not yet implemented`);
}

/**
 * Refresh games for any league
 */
export async function refreshGamesByDate(league: League, isoDate: string): Promise<Score[]> {
  if (league === "nfl") {
    return refreshNflScoresByDate(isoDate);
  }
  throw new Error(`League ${league} not yet implemented`);
}

/**
 * Check if games are in progress for any league
 */
export async function areGamesInProgress(league: League): Promise<boolean> {
  if (league === "nfl") {
    return areNflGamesInProgress();
  }
  return false;
}

/**
 * Warm cache for any league
 */
export async function warmCache(league: League): Promise<{
  teamsCount: number;
  todayGamesCount: number;
  tomorrowGamesCount: number;
  gamesInProgress?: boolean;
}> {
  if (league === "nfl") {
    return warmNflCache();
  }
  throw new Error(`League ${league} not yet implemented`);
}

// Re-export date helpers for convenience
export { getTodayIso as getTodayDate, getTomorrowIso as getTomorrowDate } from "./nflDate";
