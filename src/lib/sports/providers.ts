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
 * Still using SportsDataIO for now.
 */
export function getMlbDataSource(): DataProvider {
  return "sportsdataio";
}

/**
 * Get the data source for NHL
 * Still using SportsDataIO for now.
 */
export function getNhlDataSource(): DataProvider {
  return "sportsdataio";
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
