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
 * Season notes (as of Feb 2026):
 * - NFL: 2025 season runs Sep 2025 - Feb 2026 (current)
 * - NBA: 2025-26 season, API uses season=2025 (Oct 2025 - Jun 2026)
 * - NHL: 2025-26 season, API uses season=2025 (Oct 2025 - Jun 2026)
 * - MLB: 2026 season (Apr-Oct 2026, upcoming)
 * - Soccer: 2025-26 season
 */
export const ENABLED_LEAGUES: EnabledLeague[] = [
  {
    sportKey: "NFL",
    leagueId: 1,
    season: 2025,  // 2025 season = Sep 2025 - Feb 2026
    displayName: "NFL",
  },
  {
    sportKey: "NBA",
    leagueId: 12,
    season: 2025,  // 2025-26 season = Oct 2025 - Jun 2026
    displayName: "NBA",
  },
  {
    sportKey: "NHL",
    leagueId: 57,
    season: 2025,  // 2025-26 season = Oct 2025 - Jun 2026
    displayName: "NHL",
  },
  {
    sportKey: "MLB",
    leagueId: 1,
    season: 2026,  // 2026 season = Apr-Oct 2026
    displayName: "MLB",
  },
  {
    sportKey: "SOCCER",
    leagueId: 39, // Premier League
    season: 2025,  // 2025-26 season
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
