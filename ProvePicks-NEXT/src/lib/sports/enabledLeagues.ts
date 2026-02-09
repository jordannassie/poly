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
 * Season calculation (dynamic, works through 2030):
 * - NFL: Season year = games Sep-Dec use that year, Jan-Feb use prior year
 *   Example: Feb 2026 game → season 2025, Sep 2026 game → season 2026
 * - NBA: Season year = Oct-Jun spanning two years, API uses start year
 *   Example: Feb 2026 game → season 2025 (2025-2026), Oct 2026 → season 2026 (2026-2027)
 * - NHL: Same as NBA (Oct-Jun)
 * - MLB: Season year = calendar year (Apr-Oct)
 *   Example: Apr 2026 → season 2026
 * - Soccer: Season year = Aug-May spanning two years, uses start year
 *   Example: Feb 2026 → season 2025 (2025-26), Aug 2026 → season 2026 (2026-27)
 * 
 * Note: The `season` field below is the BASE season. The sync logic dynamically
 * calculates the correct season per date using seasonForDate().
 */
export const ENABLED_LEAGUES: EnabledLeague[] = [
  {
    sportKey: "NFL",
    leagueId: 1,
    season: 2026,  // Will sync 2025-2026 seasons based on date
    displayName: "NFL",
  },
  {
    sportKey: "NBA",
    leagueId: 12,
    season: 2026,  // API format: 2025-2026 or 2026-2027 based on date
    displayName: "NBA",
  },
  {
    sportKey: "NHL",
    leagueId: 57,
    season: 2026,  // Will sync 2025-2026 seasons based on date
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
    season: 2026,  // Will sync 2025-2026 seasons based on date
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
