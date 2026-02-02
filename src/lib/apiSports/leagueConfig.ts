/**
 * API-Sports League Configuration
 * 
 * Defines API endpoints and settings for each supported league.
 * Each league has its own API-Sports subdomain and endpoint structure.
 */

export type SupportedLeague = "NFL" | "NBA" | "SOCCER";

export interface LeagueConfig {
  league: SupportedLeague;
  displayName: string;
  baseUrl: string;
  teamsEndpoint: string;
  // Some APIs return teams nested differently
  teamExtractor: (response: any) => ApiSportsTeamRaw[];
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
  teamExtractor: (response: any) => response.response || [],
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
  teamExtractor: (response: any) => response.response || [],
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
  // Premier League teams - league 39, season 2024
  teamsEndpoint: "/teams?league=39&season=2024",
  teamExtractor: (response: any) => {
    // Soccer API returns { team: {...}, venue: {...} } structure
    return (response.response || []).map((item: any) => item.team || item);
  },
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
    case "SOCCER":
      return SOCCER_CONFIG;
    default:
      throw new Error(`Unsupported league: ${league}`);
  }
}

/**
 * All supported league configurations
 */
export const LEAGUE_CONFIGS: Record<SupportedLeague, LeagueConfig> = {
  NFL: NFL_CONFIG,
  NBA: NBA_CONFIG,
  SOCCER: SOCCER_CONFIG,
};

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
