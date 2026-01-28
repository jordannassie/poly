/**
 * SportsDataIO API client with caching and status tracking.
 * API key is kept server-side only.
 */

import { recordSuccess, recordError } from "./status";
import { getFromCache, setInCache, getCacheKey, TTL } from "./cache";

// API configuration - key is server-side only
const API_KEY = process.env.SPORTSDATAIO_API_KEY || "";
const BASE_URLS: Record<string, string> = {
  nfl: "https://api.sportsdata.io/v3/nfl",
  nba: "https://api.sportsdata.io/v3/nba",
  mlb: "https://api.sportsdata.io/v3/mlb",
  nhl: "https://api.sportsdata.io/v3/nhl",
};

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
  const baseUrl = BASE_URLS[league.toLowerCase()];
  if (!baseUrl) {
    throw new Error(`Unsupported league: ${league}`);
  }

  const url = `${baseUrl}${path}?key=${API_KEY}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        "Ocp-Apim-Subscription-Key": API_KEY,
      },
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
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

// ============ Public API Methods ============

export interface Team {
  TeamID: number;
  Key: string;
  City: string;
  Name: string;
  Conference?: string;
  Division?: string;
  PrimaryColor?: string;
  SecondaryColor?: string;
  WikipediaLogoUrl?: string;
}

export interface Game {
  GameID: number;
  Season: number;
  SeasonType: number;
  Status: string;
  DateTime: string;
  AwayTeam: string;
  HomeTeam: string;
  AwayTeamScore?: number;
  HomeTeamScore?: number;
  Channel?: string;
  StadiumID?: number;
}

/**
 * Get all teams for a league
 */
export async function getTeams(league: League): Promise<Team[]> {
  return fetchWithCache<Team[]>(
    league,
    "teams",
    "/scores/json/Teams",
    TTL.TEAMS
  );
}

/**
 * Force refresh teams cache
 */
export async function refreshTeams(league: League): Promise<Team[]> {
  const cacheKey = getCacheKey(league, "teams");
  // Delete existing cache
  const { deleteFromCache } = await import("./cache");
  deleteFromCache(cacheKey);
  // Fetch fresh data
  return getTeams(league);
}

/**
 * Get games for a specific date
 */
export async function getGamesByDate(
  league: League,
  date: string // YYYY-MM-DD
): Promise<Game[]> {
  const path = `/scores/json/GamesByDate/${date}`;
  return fetchWithCache<Game[]>(
    league,
    "games",
    path,
    TTL.GAMES,
    date
  );
}

/**
 * Force refresh games cache for a date
 */
export async function refreshGamesByDate(
  league: League,
  date: string
): Promise<Game[]> {
  const cacheKey = getCacheKey(league, "games", date);
  const { deleteFromCache } = await import("./cache");
  deleteFromCache(cacheKey);
  return getGamesByDate(league, date);
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get tomorrow's date in YYYY-MM-DD format
 */
export function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

/**
 * Warm cache by fetching teams and upcoming games
 */
export async function warmCache(league: League): Promise<{
  teamsCount: number;
  todayGamesCount: number;
  tomorrowGamesCount: number;
}> {
  const today = getTodayDate();
  const tomorrow = getTomorrowDate();

  const [teams, todayGames, tomorrowGames] = await Promise.all([
    getTeams(league),
    getGamesByDate(league, today),
    getGamesByDate(league, tomorrow),
  ]);

  return {
    teamsCount: teams.length,
    todayGamesCount: todayGames.length,
    tomorrowGamesCount: tomorrowGames.length,
  };
}
