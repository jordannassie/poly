/**
 * Sports Data Provider Configuration
 * 
 * Centralizes which data source is used for each league.
 * This allows easy switching between providers without changing component code.
 * 
 * Provider types:
 * - "api-sports-cache": Uses api_sports_nfl_teams/games tables (NFL-specific)
 * - "sports-teams-cache": Uses the new sports_teams table (NBA, Soccer, etc.)
 * - "sportsdataio": Uses SportsDataIO API (legacy)
 * - "mock": Uses mock data (fallback)
 */

export type DataProvider = "api-sports-cache" | "sports-teams-cache" | "sportsdataio" | "mock";

/**
 * Get the data source for NFL
 * Uses API-Sports cached tables (api_sports_nfl_teams).
 */
export function getNflDataSource(): DataProvider {
  return "api-sports-cache";
}

/**
 * Get the data source for NBA
 * Uses sports_teams table.
 */
export function getNbaDataSource(): DataProvider {
  return "sports-teams-cache";
}

/**
 * Get the data source for Soccer
 * Uses sports_teams table.
 */
export function getSoccerDataSource(): DataProvider {
  return "sports-teams-cache";
}

/**
 * Get the data source for MLB
 * Uses sports_teams/sports_games cache.
 */
export function getMlbDataSource(): DataProvider {
  return "sports-teams-cache";
}

/**
 * Get the data source for NHL
 * Uses sports_teams/sports_games cache.
 */
export function getNhlDataSource(): DataProvider {
  return "sports-teams-cache";
}

/**
 * Get the data source for any league
 */
export function getDataSource(league: string): DataProvider {
  switch (league.toLowerCase()) {
    case "nfl":
      return getNflDataSource();
    case "nba":
      return getNbaDataSource();
    case "soccer":
      return getSoccerDataSource();
    case "mlb":
      return getMlbDataSource();
    case "nhl":
      return getNhlDataSource();
    default:
      return "mock";
  }
}

/**
 * Check if a league should use API-Sports cache (NFL-specific tables)
 */
export function usesApiSportsCache(league: string): boolean {
  return getDataSource(league) === "api-sports-cache";
}

/**
 * Check if a league should use the new sports_teams cache
 */
export function usesSportsTeamsCache(league: string): boolean {
  return getDataSource(league) === "sports-teams-cache";
}

/**
 * Check if a league should use SportsDataIO
 */
export function usesSportsDataIO(league: string): boolean {
  return getDataSource(league) === "sportsdataio";
}

/**
 * Check if a league should use the unified sports_games cache
 * (All leagues except NFL which uses api_sports_nfl_games)
 */
export function usesSportsGamesCache(league: string): boolean {
  const source = getDataSource(league);
  return source === "sports-teams-cache";
}

/**
 * Check if a league uses any cache (not live API)
 */
export function usesAnyCache(league: string): boolean {
  const source = getDataSource(league);
  return source === "api-sports-cache" || source === "sports-teams-cache";
}

/**
 * All supported leagues for frontend
 */
export const ALL_FRONTEND_LEAGUES = ["nfl", "nba", "mlb", "nhl", "soccer"] as const;
export type FrontendLeague = (typeof ALL_FRONTEND_LEAGUES)[number];

/**
 * Check if a league is valid for frontend
 */
export function isValidFrontendLeague(league: string): league is FrontendLeague {
  return ALL_FRONTEND_LEAGUES.includes(league.toLowerCase() as FrontendLeague);
}
