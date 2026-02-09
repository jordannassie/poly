/**
 * League Configuration
 * Single source of truth for SportsDataIO league integrations
 */

export interface LeagueConfig {
  key: string;
  label: string;
  enabled: boolean;
  description?: string;
  apiPrefix?: string; // SportsDataIO API path prefix
}

// League definitions with enabled/disabled state
export const LEAGUES: Record<string, LeagueConfig> = {
  nfl: { 
    key: "nfl",
    label: "NFL", 
    enabled: true,
    description: "National Football League",
    apiPrefix: "/v3/nfl/scores/json",
  },
  nba: { 
    key: "nba",
    label: "NBA", 
    enabled: true,
    description: "National Basketball Association",
    apiPrefix: "/v3/nba/scores/json",
  },
  mlb: { 
    key: "mlb",
    label: "MLB", 
    enabled: true,
    description: "Major League Baseball",
    apiPrefix: "/v3/mlb/scores/json",
  },
  nhl: { 
    key: "nhl",
    label: "NHL", 
    enabled: true,
    description: "National Hockey League",
    apiPrefix: "/v3/nhl/scores/json",
  },
  ufc: { 
    key: "ufc",
    label: "UFC", 
    enabled: false,
    description: "Ultimate Fighting Championship",
    apiPrefix: "/v3/mma/scores/json",
  },
  soccer: { 
    key: "soccer",
    label: "Soccer", 
    enabled: false,
    description: "Major League Soccer",
    apiPrefix: "/v3/soccer/scores/json",
  },
  ncaafb: {
    key: "ncaafb",
    label: "NCAA FB",
    enabled: false,
    description: "NCAA Football",
    apiPrefix: "/v3/cfb/scores/json",
  },
  ncaabb: {
    key: "ncaabb",
    label: "NCAA BB",
    enabled: false,
    description: "NCAA Basketball",
    apiPrefix: "/v3/cbb/scores/json",
  },
};

// Get all league keys
export function getAllLeagueKeys(): string[] {
  return Object.keys(LEAGUES);
}

// Get enabled leagues only
export function getEnabledLeagues(): LeagueConfig[] {
  return Object.values(LEAGUES).filter(league => league.enabled);
}

// Get enabled league keys
export function getEnabledLeagueKeys(): string[] {
  return getEnabledLeagues().map(l => l.key);
}

// Get disabled leagues
export function getDisabledLeagues(): LeagueConfig[] {
  return Object.values(LEAGUES).filter(league => !league.enabled);
}

// Check if a league is enabled
export function isLeagueEnabled(leagueKey: string): boolean {
  return LEAGUES[leagueKey.toLowerCase()]?.enabled ?? false;
}

// Get league config by key
export function getLeagueConfig(leagueKey: string): LeagueConfig | undefined {
  return LEAGUES[leagueKey.toLowerCase()];
}

// Get all leagues as array (for iteration)
export function getAllLeagues(): LeagueConfig[] {
  return Object.values(LEAGUES);
}

// Array of enabled league keys (convenience export)
export const ENABLED_LEAGUES = Object.entries(LEAGUES)
  .filter(([, v]) => v.enabled)
  .map(([k]) => k);
