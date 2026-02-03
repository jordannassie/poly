/**
 * Enabled Leagues Configuration
 * 
 * Defines which leagues are enabled for game syncing.
 * Only leagues in this list will be synced by automated cron jobs.
 * 
 * IMPORTANT: Update this list when enabling/disabling leagues.
 */

import { SupportedLeague } from "@/lib/apiSports/leagueConfig";

export interface EnabledLeague {
  sportKey: SupportedLeague;
  leagueId: number;
  season: number;
  displayName: string;
  // Optional: specific leagues for soccer
  subLeagues?: { id: number; name: string }[];
}

/**
 * Currently enabled leagues for game syncing
 * 
 * Season notes:
 * - NFL: 2024 season runs Sep 2024 - Feb 2025, so season=2024
 * - NBA: 2024-25 season, API uses season=2024
 * - NHL: 2024-25 season, API uses season=2024
 * - MLB: 2025 season (Apr-Oct)
 * - Soccer: 2024-25 season
 */
export const ENABLED_LEAGUES: EnabledLeague[] = [
  {
    sportKey: "NFL",
    leagueId: 1,
    season: 2024,
    displayName: "NFL",
  },
  {
    sportKey: "NBA",
    leagueId: 12,
    season: 2024,
    displayName: "NBA",
  },
  {
    sportKey: "NHL",
    leagueId: 57,
    season: 2024,
    displayName: "NHL",
  },
  {
    sportKey: "MLB",
    leagueId: 1,
    season: 2025,
    displayName: "MLB",
  },
  {
    sportKey: "SOCCER",
    leagueId: 39, // Premier League
    season: 2024,
    displayName: "Soccer - Premier League",
    subLeagues: [
      { id: 39, name: "Premier League" },
      { id: 253, name: "MLS" },
    ],
  },
];

/**
 * Get enabled league by sport key
 */
export function getEnabledLeague(sportKey: string): EnabledLeague | undefined {
  return ENABLED_LEAGUES.find(
    l => l.sportKey.toLowerCase() === sportKey.toLowerCase()
  );
}

/**
 * Check if a league is enabled
 */
export function isLeagueEnabled(sportKey: string): boolean {
  return ENABLED_LEAGUES.some(
    l => l.sportKey.toLowerCase() === sportKey.toLowerCase()
  );
}

/**
 * Get all enabled sport keys
 */
export function getEnabledSportKeys(): string[] {
  return ENABLED_LEAGUES.map(l => l.sportKey.toLowerCase());
}
