/**
 * Game Sync Orchestration Module
 * 
 * High-level sync functions that coordinate game fetching, updating,
 * and state tracking. Used by cron jobs and internal API routes.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";
import { 
  syncGamesForDateRange, 
  syncLiveGames as syncLiveGamesCore,
  GameSyncResult 
} from "@/lib/apiSports/gameSync";
import { getLeagueConfig, SupportedLeague } from "@/lib/apiSports/leagueConfig";
import { ENABLED_LEAGUES, EnabledLeague } from "./enabledLeagues";

// ============================================================================
// TYPES
// ============================================================================

export interface SyncResult {
  success: boolean;
  league: string;
  mode: "backfill" | "daily" | "live";
  totalGames: number;
  inserted: number;
  updated: number;
  error?: string;
  duration?: number;
}

export interface BulkSyncResult {
  success: boolean;
  mode: string;
  results: SyncResult[];
  totalGames: number;
  totalInserted: number;
  totalUpdated: number;
  duration: number;
  errors: string[];
}

// ============================================================================
// SYNC STATE MANAGEMENT
// ============================================================================

async function getSyncState(
  client: SupabaseClient,
  sportKey: string,
  leagueId: number,
  season: number
) {
  const { data } = await client
    .from("sports_sync_state")
    .select("*")
    .eq("sport_key", sportKey.toLowerCase())
    .eq("league_id", leagueId)
    .eq("season", season)
    .maybeSingle();
  
  return data;
}

async function updateSyncState(
  client: SupabaseClient,
  sportKey: string,
  leagueId: number,
  season: number,
  updates: {
    last_backfill_at?: string;
    last_daily_sync_at?: string;
    last_live_sync_at?: string;
    backfill_complete?: boolean;
  }
) {
  const { error } = await client
    .from("sports_sync_state")
    .upsert({
      sport_key: sportKey.toLowerCase(),
      league_id: leagueId,
      season,
      ...updates,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "sport_key,league_id,season",
    });
  
  if (error) {
    console.warn(`[sync-state] Failed to update state for ${sportKey}:`, error.message);
  }
}

// ============================================================================
// BACKFILL SYNC
// ============================================================================

/**
 * Backfill an entire season's games.
 * This is typically run once per season, or to catch up on missing games.
 */
export async function backfillSeasonGames(params: {
  sportKey: SupportedLeague;
  leagueId: number;
  season: number;
  force?: boolean;
}): Promise<SyncResult> {
  const { sportKey, leagueId, season, force = false } = params;
  const startTime = Date.now();
  
  console.log(`[games-sync] Starting backfill: sport=${sportKey} league=${leagueId} season=${season}`);
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return {
      success: false,
      league: sportKey,
      mode: "backfill",
      totalGames: 0,
      inserted: 0,
      updated: 0,
      error: "Admin client not available",
    };
  }

  try {
    // Check if already backfilled
    const state = await getSyncState(adminClient, sportKey, leagueId, season);
    if (state?.backfill_complete && !force) {
      console.log(`[games-sync] Backfill already complete for ${sportKey} ${season}, skipping`);
      return {
        success: true,
        league: sportKey,
        mode: "backfill",
        totalGames: 0,
        inserted: 0,
        updated: 0,
        duration: Date.now() - startTime,
      };
    }

    // Calculate date range for the season
    const config = getLeagueConfig(sportKey);
    const now = new Date();
    
    // Season start/end varies by sport
    let fromDate: string;
    let toDate: string;
    
    if (sportKey === "NFL") {
      // NFL: Sep-Feb
      fromDate = `${season}-09-01`;
      toDate = `${season + 1}-02-28`;
    } else if (sportKey === "NBA" || sportKey === "NHL") {
      // NBA/NHL: Oct-Jun
      fromDate = `${season}-10-01`;
      toDate = `${season + 1}-06-30`;
    } else if (sportKey === "MLB") {
      // MLB: Mar-Oct
      fromDate = `${season}-03-01`;
      toDate = `${season}-10-31`;
    } else {
      // Soccer: Aug-May (or year-round for some)
      fromDate = `${season}-08-01`;
      toDate = `${season + 1}-05-31`;
    }

    // Don't sync future dates
    const today = now.toISOString().split("T")[0];
    if (toDate > today) {
      toDate = today;
    }

    const result = await syncGamesForDateRange(
      adminClient,
      sportKey,
      fromDate,
      toDate
    );

    // Update sync state
    await updateSyncState(adminClient, sportKey, leagueId, season, {
      last_backfill_at: new Date().toISOString(),
      backfill_complete: result.success,
    });

    const duration = Date.now() - startTime;
    console.log(`[games-sync] Backfill complete: sport=${sportKey} fetched=${result.totalGames} inserted=${result.inserted} updated=${result.updated} duration=${duration}ms`);

    return {
      success: result.success,
      league: sportKey,
      mode: "backfill",
      totalGames: result.totalGames,
      inserted: result.inserted,
      updated: result.updated,
      error: result.error,
      duration,
    };
  } catch (error) {
    return {
      success: false,
      league: sportKey,
      mode: "backfill",
      totalGames: 0,
      inserted: 0,
      updated: 0,
      error: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - startTime,
    };
  }
}

// ============================================================================
// DAILY SYNC
// ============================================================================

/**
 * Sync games for the next 14 days.
 * This keeps upcoming games up-to-date with schedule changes.
 */
export async function syncGamesByDateRange(params: {
  sportKey: SupportedLeague;
  leagueId: number;
  fromDate?: string;
  toDate?: string;
}): Promise<SyncResult> {
  const { sportKey, leagueId, fromDate, toDate } = params;
  const startTime = Date.now();
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return {
      success: false,
      league: sportKey,
      mode: "daily",
      totalGames: 0,
      inserted: 0,
      updated: 0,
      error: "Admin client not available",
    };
  }

  try {
    const today = new Date();
    const from = fromDate || today.toISOString().split("T")[0];
    
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);
    const to = toDate || endDate.toISOString().split("T")[0];

    console.log(`[games-sync] Daily sync: sport=${sportKey} from=${from} to=${to}`);

    const result = await syncGamesForDateRange(
      adminClient,
      sportKey,
      from,
      to
    );

    // Get season from config
    const config = getLeagueConfig(sportKey);
    
    // Update sync state
    await updateSyncState(adminClient, sportKey, leagueId, config.currentSeason, {
      last_daily_sync_at: new Date().toISOString(),
    });

    const duration = Date.now() - startTime;
    console.log(`[games-sync] Daily sync complete: sport=${sportKey} fetched=${result.totalGames} inserted=${result.inserted} updated=${result.updated} duration=${duration}ms`);

    return {
      success: result.success,
      league: sportKey,
      mode: "daily",
      totalGames: result.totalGames,
      inserted: result.inserted,
      updated: result.updated,
      error: result.error,
      duration,
    };
  } catch (error) {
    return {
      success: false,
      league: sportKey,
      mode: "daily",
      totalGames: 0,
      inserted: 0,
      updated: 0,
      error: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - startTime,
    };
  }
}

// ============================================================================
// LIVE SYNC
// ============================================================================

/**
 * Sync live games to update scores and status in real-time.
 */
export async function syncLiveGames(params: {
  sportKey: SupportedLeague;
  leagueId: number;
}): Promise<SyncResult> {
  const { sportKey, leagueId } = params;
  const startTime = Date.now();
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return {
      success: false,
      league: sportKey,
      mode: "live",
      totalGames: 0,
      inserted: 0,
      updated: 0,
      error: "Admin client not available",
    };
  }

  try {
    console.log(`[games-sync] Live sync: sport=${sportKey}`);

    const result = await syncLiveGamesCore(adminClient, sportKey);

    // Get season from config
    const config = getLeagueConfig(sportKey);
    
    // Update sync state
    await updateSyncState(adminClient, sportKey, leagueId, config.currentSeason, {
      last_live_sync_at: new Date().toISOString(),
    });

    const duration = Date.now() - startTime;
    console.log(`[games-sync] Live sync complete: sport=${sportKey} fetched=${result.totalGames} inserted=${result.inserted} updated=${result.updated} duration=${duration}ms`);

    return {
      success: result.success,
      league: sportKey,
      mode: "live",
      totalGames: result.totalGames,
      inserted: result.inserted,
      updated: result.updated,
      error: result.error,
      duration,
    };
  } catch (error) {
    return {
      success: false,
      league: sportKey,
      mode: "live",
      totalGames: 0,
      inserted: 0,
      updated: 0,
      error: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - startTime,
    };
  }
}

// ============================================================================
// BULK SYNC (All Enabled Leagues)
// ============================================================================

/**
 * Run sync for all enabled leagues
 */
export async function syncAllLeagues(params: {
  mode: "backfill" | "daily" | "live";
  force?: boolean;
}): Promise<BulkSyncResult> {
  const { mode, force = false } = params;
  const startTime = Date.now();
  const results: SyncResult[] = [];
  const errors: string[] = [];

  console.log(`[games-sync] Starting bulk ${mode} sync for ${ENABLED_LEAGUES.length} leagues`);

  for (const league of ENABLED_LEAGUES) {
    let result: SyncResult;

    try {
      switch (mode) {
        case "backfill":
          result = await backfillSeasonGames({
            sportKey: league.sportKey,
            leagueId: league.leagueId,
            season: league.season,
            force,
          });
          break;
        case "daily":
          result = await syncGamesByDateRange({
            sportKey: league.sportKey,
            leagueId: league.leagueId,
          });
          break;
        case "live":
          result = await syncLiveGames({
            sportKey: league.sportKey,
            leagueId: league.leagueId,
          });
          break;
      }

      results.push(result);
      if (!result.success && result.error) {
        errors.push(`${league.sportKey}: ${result.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`${league.sportKey}: ${errorMsg}`);
      results.push({
        success: false,
        league: league.sportKey,
        mode,
        totalGames: 0,
        inserted: 0,
        updated: 0,
        error: errorMsg,
      });
    }

    // Small delay between leagues to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const totalGames = results.reduce((sum, r) => sum + r.totalGames, 0);
  const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
  const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
  const duration = Date.now() - startTime;

  console.log(`[games-sync] Bulk ${mode} complete: totalGames=${totalGames} inserted=${totalInserted} updated=${totalUpdated} duration=${duration}ms`);

  return {
    success: errors.length === 0,
    mode,
    results,
    totalGames,
    totalInserted,
    totalUpdated,
    duration,
    errors,
  };
}
