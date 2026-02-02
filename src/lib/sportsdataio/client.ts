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
import { upsertCache } from "./persistCache";

// API configuration - key is server-side only
const API_KEY = process.env.SPORTSDATAIO_API_KEY || "";
const BASE_URL = "https://api.sportsdata.io/v3";

// Supported leagues (SportsDataIO)
export const SUPPORTED_LEAGUES = ["nfl", "nba", "mlb", "nhl"] as const;
export type League = (typeof SUPPORTED_LEAGUES)[number];

// Extended leagues including soccer (for API-Sports/cache-based data)
export const ALL_LEAGUES = ["nfl", "nba", "mlb", "nhl", "soccer"] as const;
export type ExtendedLeague = (typeof ALL_LEAGUES)[number];

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
 * Also persists to Supabase for reliability on serverless platforms
 */
async function fetchWithCache<T>(
  league: string,
  endpoint: string,
  path: string,
  ttlMs: number,
  cacheParams?: string
): Promise<T> {
  const cacheKey = getCacheKey(league, endpoint, cacheParams);

  // Check in-memory cache first
  const cached = getFromCache<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Fetch from API
  const data = await fetchFromAPI<T>(league, endpoint, path);

  // Store in in-memory cache
  setInCache(cacheKey, data, ttlMs);

  // Also persist to Supabase for reliability on serverless platforms
  // This runs async and doesn't block the response
  upsertCache({
    league,
    endpoint,
    date: cacheParams, // cacheParams is typically the date for scores
    payload: data,
    ttlMs: ttlMs * 12, // Persist with longer TTL (12x for reliability)
  }).catch((err) => {
    console.warn("[fetchWithCache] Supabase persist failed:", err);
  });

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
  WikipediaWordMarkUrl?: string;
  GlobalTeamID?: number;
  StadiumID?: number;
}

/**
 * Get the best available logo URL for a team
 */
export function getTeamLogoUrl(team: Team): string | null {
  // Try WikipediaLogoUrl first (most common)
  if (team.WikipediaLogoUrl && team.WikipediaLogoUrl.trim()) {
    return team.WikipediaLogoUrl;
  }
  // Fallback to word mark
  if (team.WikipediaWordMarkUrl && team.WikipediaWordMarkUrl.trim()) {
    return team.WikipediaWordMarkUrl;
  }
  return null;
}

/**
 * Get the normalized game ID from a score
 * NFL uses GameKey (string), NBA/MLB/NHL use GameID (number)
 */
export function getGameId(score: Score): string {
  if (score.GameKey) {
    return score.GameKey;
  }
  if (score.GameID !== undefined) {
    return String(score.GameID);
  }
  // Fallback: generate an ID from date and teams
  return `${score.Date}-${score.AwayTeam}-${score.HomeTeam}`.replace(/[^a-zA-Z0-9-]/g, "");
}

export interface Score {
  // Game identifiers - NFL uses GameKey, NBA/MLB/NHL use GameID
  GameKey?: string;
  GameID?: number;
  
  // Common fields across all leagues
  SeasonType?: number;
  Season?: number;
  Week?: number;
  Date: string;
  DateTime?: string; // NBA/NHL use DateTime
  Day?: string; // Some leagues use Day
  AwayTeam: string;
  HomeTeam: string;
  AwayScore?: number | null;
  HomeScore?: number | null;
  AwayTeamScore?: number | null; // NBA/NHL use this
  HomeTeamScore?: number | null; // NBA/NHL use this
  Channel?: string | null;
  
  // Status fields - varies by league
  Status?: string; // NBA/NHL use Status: "Scheduled", "InProgress", "Final", etc.
  IsClosed?: boolean; // NBA/NHL use IsClosed instead of IsOver
  HasStarted?: boolean;
  IsInProgress?: boolean;
  IsOver?: boolean;
  Canceled?: boolean;
  Closed?: boolean;
  
  // NFL-specific fields (optional for other leagues)
  PointSpread?: number | null;
  OverUnder?: number | null;
  Quarter?: string | null;
  TimeRemaining?: string | null;
  Possession?: string | null;
  Down?: number | null;
  Distance?: number | null;
  YardLine?: number | null;
  YardLineTerritory?: string | null;
  RedZone?: boolean | null;
  AwayScoreQuarter1?: number | null;
  AwayScoreQuarter2?: number | null;
  AwayScoreQuarter3?: number | null;
  AwayScoreQuarter4?: number | null;
  AwayScoreOvertime?: number | null;
  HomeScoreQuarter1?: number | null;
  HomeScoreQuarter2?: number | null;
  HomeScoreQuarter3?: number | null;
  HomeScoreQuarter4?: number | null;
  HomeScoreOvertime?: number | null;
  Has1stQuarterStarted?: boolean;
  Has2ndQuarterStarted?: boolean;
  Has3rdQuarterStarted?: boolean;
  Has4thQuarterStarted?: boolean;
  IsOvertime?: boolean;
  DownAndDistance?: string | null;
  QuarterDescription?: string | null;
  StadiumID?: number | null;
  LastUpdated?: string | null;
  GeoLat?: number | null;
  GeoLong?: number | null;
  ForecastTempLow?: number | null;
  ForecastTempHigh?: number | null;
  ForecastDescription?: string | null;
  ForecastWindChill?: number | null;
  ForecastWindSpeed?: number | null;
  AwayTeamMoneyLine?: number | null;
  HomeTeamMoneyLine?: number | null;
  LastPlay?: string | null;
}

/**
 * Normalize game status across all leagues
 * NFL uses IsOver/IsInProgress/Canceled booleans
 * NBA/NHL use Status string: "Scheduled", "InProgress", "Final", "Canceled", "Postponed"
 */
export function getGameStatus(score: Score): "scheduled" | "in_progress" | "final" | "postponed" | "canceled" {
  // Check Status string first (NBA/NHL)
  if (score.Status) {
    const status = score.Status.toLowerCase();
    if (status === "canceled") return "canceled";
    if (status === "postponed") return "postponed";
    if (status === "final" || status === "f" || status === "f/ot") return "final";
    if (status === "inprogress" || status === "in progress") return "in_progress";
    if (status === "scheduled") return "scheduled";
  }
  
  // Check boolean fields (NFL/MLB)
  if (score.Canceled) return "canceled";
  if (score.IsOver || score.IsClosed) return "final";
  if (score.IsInProgress) return "in_progress";
  
  return "scheduled";
}

/**
 * Get the normalized away team score
 */
export function getAwayScore(score: Score): number | null {
  return score.AwayScore ?? score.AwayTeamScore ?? null;
}

/**
 * Get the normalized home team score
 */
export function getHomeScore(score: Score): number | null {
  return score.HomeScore ?? score.HomeTeamScore ?? null;
}

/**
 * Get the normalized game date
 */
export function getGameDate(score: Score): string {
  return score.DateTime || score.Date || score.Day || "";
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

// ============ NHL API Methods ============

/**
 * Get all NHL teams
 * Endpoint: GET /v3/nhl/scores/json/Teams
 */
export async function getNhlTeams(): Promise<Team[]> {
  return fetchWithCache<Team[]>(
    "nhl",
    "teams",
    "/Teams",
    TTL.TEAMS
  );
}

/**
 * Force refresh NHL teams cache
 */
export async function refreshNhlTeams(): Promise<Team[]> {
  const cacheKey = getCacheKey("nhl", "teams");
  const { deleteFromCache } = await import("./cache");
  deleteFromCache(cacheKey);
  return getNhlTeams();
}

/**
 * Get NHL scores/games by date
 * Endpoint: GET /v3/nhl/scores/json/GamesByDate/{date}
 * NHL uses ISO date format: YYYY-MM-DD
 */
export async function getNhlScoresByDate(isoDate: string): Promise<Score[]> {
  return fetchWithCache<Score[]>(
    "nhl",
    "scores",
    `/GamesByDate/${isoDate}`,
    TTL.GAMES,
    isoDate
  );
}

/**
 * Force refresh NHL scores cache for a date
 */
export async function refreshNhlScoresByDate(isoDate: string): Promise<Score[]> {
  const cacheKey = getCacheKey("nhl", "scores", isoDate);
  const { deleteFromCache } = await import("./cache");
  deleteFromCache(cacheKey);
  return getNhlScoresByDate(isoDate);
}

/**
 * Check if any NHL games are currently in progress
 * NHL doesn't have a dedicated endpoint, so we check game statuses
 */
export async function areNhlGamesInProgress(): Promise<boolean> {
  try {
    const today = getTodayIso();
    const games = await getNhlScoresByDate(today);
    return games.some(g => g.IsInProgress);
  } catch {
    return false;
  }
}

/**
 * Warm NHL cache by fetching teams and upcoming games
 */
export async function warmNhlCache(): Promise<{
  teamsCount: number;
  todayGamesCount: number;
  tomorrowGamesCount: number;
  gamesInProgress: boolean;
}> {
  const today = getTodayIso();
  const tomorrow = getTomorrowIso();

  const [teams, todayScores, tomorrowScores] = await Promise.all([
    getNhlTeams(),
    getNhlScoresByDate(today),
    getNhlScoresByDate(tomorrow),
  ]);

  const gamesInProgress = todayScores.some(g => g.IsInProgress);

  return {
    teamsCount: teams.length,
    todayGamesCount: todayScores.length,
    tomorrowGamesCount: tomorrowScores.length,
    gamesInProgress,
  };
}

// ============ NBA API Methods ============

/**
 * Get all NBA teams
 * Endpoint: GET /v3/nba/scores/json/Teams
 */
export async function getNbaTeams(): Promise<Team[]> {
  return fetchWithCache<Team[]>(
    "nba",
    "teams",
    "/Teams",
    TTL.TEAMS
  );
}

/**
 * Force refresh NBA teams cache
 */
export async function refreshNbaTeams(): Promise<Team[]> {
  const cacheKey = getCacheKey("nba", "teams");
  const { deleteFromCache } = await import("./cache");
  deleteFromCache(cacheKey);
  return getNbaTeams();
}

/**
 * Get NBA scores/games by date
 * Endpoint: GET /v3/nba/scores/json/GamesByDate/{date}
 * NBA uses ISO date format: YYYY-MM-DD
 */
export async function getNbaScoresByDate(isoDate: string): Promise<Score[]> {
  return fetchWithCache<Score[]>(
    "nba",
    "scores",
    `/GamesByDate/${isoDate}`,
    TTL.GAMES,
    isoDate
  );
}

/**
 * Force refresh NBA scores cache for a date
 */
export async function refreshNbaScoresByDate(isoDate: string): Promise<Score[]> {
  const cacheKey = getCacheKey("nba", "scores", isoDate);
  const { deleteFromCache } = await import("./cache");
  deleteFromCache(cacheKey);
  return getNbaScoresByDate(isoDate);
}

/**
 * Check if any NBA games are currently in progress
 */
export async function areNbaGamesInProgress(): Promise<boolean> {
  try {
    const today = getTodayIso();
    const games = await getNbaScoresByDate(today);
    return games.some(g => g.IsInProgress);
  } catch {
    return false;
  }
}

/**
 * Warm NBA cache
 */
export async function warmNbaCache(): Promise<{
  teamsCount: number;
  todayGamesCount: number;
  tomorrowGamesCount: number;
  gamesInProgress: boolean;
}> {
  const today = getTodayIso();
  const tomorrow = getTomorrowIso();

  const [teams, todayScores, tomorrowScores] = await Promise.all([
    getNbaTeams(),
    getNbaScoresByDate(today),
    getNbaScoresByDate(tomorrow),
  ]);

  return {
    teamsCount: teams.length,
    todayGamesCount: todayScores.length,
    tomorrowGamesCount: tomorrowScores.length,
    gamesInProgress: todayScores.some(g => g.IsInProgress),
  };
}

// ============ MLB API Methods ============

/**
 * Get all MLB teams
 * Endpoint: GET /v3/mlb/scores/json/Teams
 */
export async function getMlbTeams(): Promise<Team[]> {
  return fetchWithCache<Team[]>(
    "mlb",
    "teams",
    "/Teams",
    TTL.TEAMS
  );
}

/**
 * Force refresh MLB teams cache
 */
export async function refreshMlbTeams(): Promise<Team[]> {
  const cacheKey = getCacheKey("mlb", "teams");
  const { deleteFromCache } = await import("./cache");
  deleteFromCache(cacheKey);
  return getMlbTeams();
}

/**
 * Get MLB scores/games by date
 * Endpoint: GET /v3/mlb/scores/json/GamesByDate/{date}
 * MLB uses ISO date format: YYYY-MM-DD
 */
export async function getMlbScoresByDate(isoDate: string): Promise<Score[]> {
  return fetchWithCache<Score[]>(
    "mlb",
    "scores",
    `/GamesByDate/${isoDate}`,
    TTL.GAMES,
    isoDate
  );
}

/**
 * Force refresh MLB scores cache for a date
 */
export async function refreshMlbScoresByDate(isoDate: string): Promise<Score[]> {
  const cacheKey = getCacheKey("mlb", "scores", isoDate);
  const { deleteFromCache } = await import("./cache");
  deleteFromCache(cacheKey);
  return getMlbScoresByDate(isoDate);
}

/**
 * Check if any MLB games are currently in progress
 */
export async function areMlbGamesInProgress(): Promise<boolean> {
  try {
    const today = getTodayIso();
    const games = await getMlbScoresByDate(today);
    return games.some(g => g.IsInProgress);
  } catch {
    return false;
  }
}

/**
 * Warm MLB cache
 */
export async function warmMlbCache(): Promise<{
  teamsCount: number;
  todayGamesCount: number;
  tomorrowGamesCount: number;
  gamesInProgress: boolean;
}> {
  const today = getTodayIso();
  const tomorrow = getTomorrowIso();

  const [teams, todayScores, tomorrowScores] = await Promise.all([
    getMlbTeams(),
    getMlbScoresByDate(today),
    getMlbScoresByDate(tomorrow),
  ]);

  return {
    teamsCount: teams.length,
    todayGamesCount: todayScores.length,
    tomorrowGamesCount: tomorrowScores.length,
    gamesInProgress: todayScores.some(g => g.IsInProgress),
  };
}

// ============ Generic Methods ============

/**
 * Get teams for any league
 */
export async function getTeams(league: League): Promise<Team[]> {
  switch (league) {
    case "nfl": return getNflTeams();
    case "nba": return getNbaTeams();
    case "mlb": return getMlbTeams();
    case "nhl": return getNhlTeams();
    default: throw new Error(`League ${league} not yet implemented`);
  }
}

/**
 * Refresh teams for any league
 */
export async function refreshTeams(league: League): Promise<Team[]> {
  switch (league) {
    case "nfl": return refreshNflTeams();
    case "nba": return refreshNbaTeams();
    case "mlb": return refreshMlbTeams();
    case "nhl": return refreshNhlTeams();
    default: throw new Error(`League ${league} not yet implemented`);
  }
}

/**
 * Get games by date for any league
 */
export async function getGamesByDate(league: League, isoDate: string): Promise<Score[]> {
  switch (league) {
    case "nfl": return getNflScoresByDate(isoDate);
    case "nba": return getNbaScoresByDate(isoDate);
    case "mlb": return getMlbScoresByDate(isoDate);
    case "nhl": return getNhlScoresByDate(isoDate);
    default: throw new Error(`League ${league} not yet implemented`);
  }
}

/**
 * Refresh games for any league
 */
export async function refreshGamesByDate(league: League, isoDate: string): Promise<Score[]> {
  switch (league) {
    case "nfl": return refreshNflScoresByDate(isoDate);
    case "nba": return refreshNbaScoresByDate(isoDate);
    case "mlb": return refreshMlbScoresByDate(isoDate);
    case "nhl": return refreshNhlScoresByDate(isoDate);
    default: throw new Error(`League ${league} not yet implemented`);
  }
}

/**
 * Check if games are in progress for any league
 */
export async function areGamesInProgress(league: League): Promise<boolean> {
  switch (league) {
    case "nfl": return areNflGamesInProgress();
    case "nba": return areNbaGamesInProgress();
    case "mlb": return areMlbGamesInProgress();
    case "nhl": return areNhlGamesInProgress();
    default: return false;
  }
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
  switch (league) {
    case "nfl": return warmNflCache();
    case "nba": return warmNbaCache();
    case "mlb": return warmMlbCache();
    case "nhl": return warmNhlCache();
    default: throw new Error(`League ${league} not yet implemented`);
  }
}

// Re-export date helpers for convenience
export { getTodayIso as getTodayDate, getTomorrowIso as getTomorrowDate } from "./nflDate";
