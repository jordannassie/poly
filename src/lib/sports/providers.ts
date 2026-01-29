/**
 * Sports Data Provider Configuration
 * 
 * Centralizes which data source is used for each league.
 * This allows easy switching between providers without changing component code.
 */

export type DataProvider = "api-sports-cache" | "sportsdataio" | "mock";

/**
 * Get the data source for NFL
 * Currently hardcoded to use API-Sports cached tables only.
 */
export function getNflDataSource(): DataProvider {
  return "api-sports-cache";
}

/**
 * Get the data source for NBA
 * Still using SportsDataIO for now.
 */
export function getNbaDataSource(): DataProvider {
  return "sportsdataio";
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
    case "mlb":
      return getMlbDataSource();
    case "nhl":
      return getNhlDataSource();
    default:
      return "mock";
  }
}

/**
 * Check if a league should use API-Sports cache
 */
export function usesApiSportsCache(league: string): boolean {
  return getDataSource(league) === "api-sports-cache";
}

/**
 * Check if a league should use SportsDataIO
 */
export function usesSportsDataIO(league: string): boolean {
  return getDataSource(league) === "sportsdataio";
}
