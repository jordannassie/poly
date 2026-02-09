/**
 * API-Sports League Configuration
 * 
 * Defines API endpoints and settings for each supported league.
 * Each league has its own API-Sports subdomain and endpoint structure.
 */

export type SupportedLeague = "NFL" | "NBA" | "MLB" | "NHL" | "SOCCER";

export interface LeagueConfig {
  league: SupportedLeague;
  displayName: string;
  baseUrl: string;
  teamsEndpoint: string;
  gamesEndpoint: string; // Endpoint for fetching games
  liveEndpoint: string; // Endpoint for live games
  leagueId: number; // API-Sports league ID
  currentSeason: number; // Current season year
  // Some APIs return teams nested differently
  teamExtractor: (response: any) => ApiSportsTeamRaw[];
  // Games may also be nested differently
  gameExtractor: (response: any) => any[];
}

// Raw team data from API-Sports (varies slightly by sport)
export interface ApiSportsTeamRaw {
  id: number;
  name: string;
  code?: string | null;
  city?: string | null;
  logo?: string | null;
  // Soccer-specific fields
  country?: string | null;
  national?: boolean;
}

/**
 * NFL Configuration
 * API: v1.american-football.api-sports.io
 */
const NFL_CONFIG: LeagueConfig = {
  league: "NFL",
  displayName: "NFL",
  baseUrl: process.env.API_SPORTS_NFL_BASE_URL || "https://v1.american-football.api-sports.io",
  teamsEndpoint: "/teams?league=1",
  gamesEndpoint: "/games",
  liveEndpoint: "/games?live=all",
  leagueId: 1,
  currentSeason: 2026, // Dynamic: seasonForDate() calculates per game
  teamExtractor: (response: any) => response.response || [],
  gameExtractor: (response: any) => response.response || [],
};

/**
 * NBA Configuration
 * API: v1.basketball.api-sports.io
 * Using league=12 for NBA
 */
const NBA_CONFIG: LeagueConfig = {
  league: "NBA",
  displayName: "NBA",
  baseUrl: process.env.API_SPORTS_NBA_BASE_URL || "https://v1.basketball.api-sports.io",
  teamsEndpoint: "/teams?league=12",
  gamesEndpoint: "/games",
  liveEndpoint: "/games?live=all",
  leagueId: 12,
  currentSeason: 2026, // Dynamic: API uses YYYY-YYYY format (e.g., 2025-2026)
  teamExtractor: (response: any) => response.response || [],
  gameExtractor: (response: any) => response.response || [],
};

/**
 * MLB Configuration
 * API: v1.baseball.api-sports.io
 * Using league=1 for MLB
 */
const MLB_CONFIG: LeagueConfig = {
  league: "MLB",
  displayName: "MLB",
  baseUrl: process.env.API_SPORTS_MLB_BASE_URL || "https://v1.baseball.api-sports.io",
  teamsEndpoint: "/teams?league=1",
  gamesEndpoint: "/games",
  liveEndpoint: "/games?live=all",
  leagueId: 1,
  currentSeason: 2026, // MLB 2026 season (Apr-Oct 2026)
  teamExtractor: (response: any) => response.response || [],
  gameExtractor: (response: any) => response.response || [],
};

/**
 * NHL Configuration
 * API: v1.hockey.api-sports.io
 * Using league=57 for NHL
 */
const NHL_CONFIG: LeagueConfig = {
  league: "NHL",
  displayName: "NHL",
  baseUrl: process.env.API_SPORTS_NHL_BASE_URL || "https://v1.hockey.api-sports.io",
  teamsEndpoint: "/teams?league=57",
  gamesEndpoint: "/games",
  liveEndpoint: "/games?live=all",
  leagueId: 57,
  currentSeason: 2026, // Dynamic: seasonForDate() calculates per game
  teamExtractor: (response: any) => response.response || [],
  gameExtractor: (response: any) => response.response || [],
};

/**
 * Soccer Configuration
 * API: v3.football.api-sports.io
 * Using top leagues - Premier League (39), La Liga (140), Serie A (135), Bundesliga (78), Ligue 1 (61)
 * Default to Premier League for initial sync
 */
const SOCCER_CONFIG: LeagueConfig = {
  league: "SOCCER",
  displayName: "Soccer",
  baseUrl: process.env.API_SPORTS_SOCCER_BASE_URL || "https://v3.football.api-sports.io",
  teamsEndpoint: "/teams?league=39&season=2026",
  gamesEndpoint: "/fixtures",
  liveEndpoint: "/fixtures?live=all",
  leagueId: 39, // Premier League default
  currentSeason: 2026, // Dynamic: seasonForDate() calculates per game
  teamExtractor: (response: any) => {
    // Soccer API returns { team: {...}, venue: {...} } structure
    return (response.response || []).map((item: any) => item.team || item);
  },
  gameExtractor: (response: any) => response.response || [],
};

/**
 * Get configuration for a specific league
 */
export function getLeagueConfig(league: SupportedLeague): LeagueConfig {
  switch (league) {
    case "NFL":
      return NFL_CONFIG;
    case "NBA":
      return NBA_CONFIG;
    case "MLB":
      return MLB_CONFIG;
    case "NHL":
      return NHL_CONFIG;
    case "SOCCER":
      return SOCCER_CONFIG;
    default:
      throw new Error(`Unsupported league: ${league}`);
  }
}

/**
 * Get league config by string (case-insensitive)
 */
export function getLeagueConfigByString(league: string): LeagueConfig | null {
  const normalized = league.toUpperCase() as SupportedLeague;
  try {
    return getLeagueConfig(normalized);
  } catch {
    return null;
  }
}

/**
 * All supported league configurations
 */
export const LEAGUE_CONFIGS: Record<SupportedLeague, LeagueConfig> = {
  NFL: NFL_CONFIG,
  NBA: NBA_CONFIG,
  MLB: MLB_CONFIG,
  NHL: NHL_CONFIG,
  SOCCER: SOCCER_CONFIG,
};

/**
 * List of all supported leagues
 */
export const ALL_LEAGUES: SupportedLeague[] = ["NFL", "NBA", "MLB", "NHL", "SOCCER"];

/**
 * Soccer league IDs for fetching multiple leagues
 */
export const SOCCER_LEAGUES = {
  PREMIER_LEAGUE: 39,
  LA_LIGA: 140,
  SERIE_A: 135,
  BUNDESLIGA: 78,
  LIGUE_1: 61,
  MLS: 253,
  CHAMPIONS_LEAGUE: 2,
};
