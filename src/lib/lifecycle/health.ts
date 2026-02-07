/**
 * Game Lifecycle Health Checks
 * 
 * Monitors for stuck games, orphaned settlements, and processing issues
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    stuck_live: HealthCheck;
    stuck_scheduled: HealthCheck;
    final_not_queued: HealthCheck;
    queued_too_long: HealthCheck;
    failed_many: HealthCheck;
    processing_stale: HealthCheck;
  };
  summary: {
    total_issues: number;
    critical_count: number;
    warning_count: number;
  };
  checked_at: string;
}

export interface HealthCheck {
  status: 'ok' | 'warning' | 'critical';
  count: number;
  threshold: number;
  description: string;
  items?: Array<{
    id: number;
    league: string;
    external_game_id: string;
    home_team?: string;
    away_team?: string;
    starts_at?: string;
    status_norm?: string;
    updated_at?: string;
    attempts?: number;
  }>;
}

// Thresholds for different health states
const THRESHOLDS = {
  stuck_live: { warning: 1, critical: 5 },
  stuck_scheduled: { warning: 5, critical: 20 },
  final_not_queued: { warning: 1, critical: 3 },
  queued_too_long: { warning: 3, critical: 10 },
  failed_many: { warning: 2, critical: 5 },
  processing_stale: { warning: 1, critical: 3 },
};

/**
 * Run all health checks
 */
export async function runHealthChecks(
  adminClient: SupabaseClient,
  options?: { includeItems?: boolean }
): Promise<HealthCheckResult> {
  const includeItems = options?.includeItems ?? true;

  // Run all checks in parallel
  const [
    stuckLive,
    stuckScheduled,
    finalNotQueued,
    queuedTooLong,
    failedMany,
    processingStale,
  ] = await Promise.all([
    checkStuckLiveGames(adminClient, includeItems),
    checkStuckScheduledGames(adminClient, includeItems),
    checkFinalNotQueued(adminClient, includeItems),
    checkQueuedTooLong(adminClient, includeItems),
    checkFailedMany(adminClient, includeItems),
    checkProcessingStale(adminClient, includeItems),
  ]);

  // Calculate summary
  const checks = {
    stuck_live: stuckLive,
    stuck_scheduled: stuckScheduled,
    final_not_queued: finalNotQueued,
    queued_too_long: queuedTooLong,
    failed_many: failedMany,
    processing_stale: processingStale,
  };

  const allChecks = Object.values(checks);
  const criticalCount = allChecks.filter(c => c.status === 'critical').length;
  const warningCount = allChecks.filter(c => c.status === 'warning').length;
  const totalIssues = allChecks.reduce((sum, c) => sum + c.count, 0);

  // Determine overall status
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (criticalCount > 0) {
    status = 'critical';
  } else if (warningCount > 0) {
    status = 'warning';
  }

  return {
    status,
    checks,
    summary: {
      total_issues: totalIssues,
      critical_count: criticalCount,
      warning_count: warningCount,
    },
    checked_at: new Date().toISOString(),
  };
}

/**
 * Check for LIVE games that started more than 6 hours ago
 */
async function checkStuckLiveGames(
  adminClient: SupabaseClient,
  includeItems: boolean
): Promise<HealthCheck> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const query = adminClient
    .from('sports_games')
    .select(includeItems ? '*' : 'id', { count: 'exact' })
    .eq('status_norm', 'LIVE')
    .lt('starts_at', sixHoursAgo)
    .is('finalized_at', null);

  const { data, count, error } = await query;

  if (error) {
    console.error('[health] stuck_live check failed:', error.message);
    return {
      status: 'warning',
      count: 0,
      threshold: THRESHOLDS.stuck_live.warning,
      description: 'LIVE games with start_time > 6 hours ago (should be finished)',
    };
  }

  const actualCount = count || 0;
  const status = getCheckStatus(actualCount, THRESHOLDS.stuck_live);

  return {
    status,
    count: actualCount,
    threshold: THRESHOLDS.stuck_live.warning,
    description: 'LIVE games with start_time > 6 hours ago (should be finished)',
    items: includeItems ? formatGameItems(data) : undefined,
  };
}

/**
 * Check for SCHEDULED games that started more than 8 hours ago
 */
async function checkStuckScheduledGames(
  adminClient: SupabaseClient,
  includeItems: boolean
): Promise<HealthCheck> {
  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();

  const query = adminClient
    .from('sports_games')
    .select(includeItems ? '*' : 'id', { count: 'exact' })
    .eq('status_norm', 'SCHEDULED')
    .lt('starts_at', eightHoursAgo)
    .is('finalized_at', null);

  const { data, count, error } = await query;

  if (error) {
    console.error('[health] stuck_scheduled check failed:', error.message);
    return {
      status: 'warning',
      count: 0,
      threshold: THRESHOLDS.stuck_scheduled.warning,
      description: 'SCHEDULED games with start_time > 8 hours ago (never started?)',
    };
  }

  const actualCount = count || 0;
  const status = getCheckStatus(actualCount, THRESHOLDS.stuck_scheduled);

  return {
    status,
    count: actualCount,
    threshold: THRESHOLDS.stuck_scheduled.warning,
    description: 'SCHEDULED games with start_time > 8 hours ago (never started?)',
    items: includeItems ? formatGameItems(data) : undefined,
  };
}

/**
 * Check for FINAL games without a settlement_queue row
 */
async function checkFinalNotQueued(
  adminClient: SupabaseClient,
  includeItems: boolean
): Promise<HealthCheck> {
  // Find FINAL games with no settled_at and no settlement_queue entry
  const { data, error } = await adminClient
    .from('sports_games')
    .select(includeItems ? '*' : 'id')
    .eq('status_norm', 'FINAL')
    .is('settled_at', null)
    .limit(100);

  if (error) {
    console.error('[health] final_not_queued check failed:', error.message);
    return {
      status: 'warning',
      count: 0,
      threshold: THRESHOLDS.final_not_queued.warning,
      description: 'FINAL games with no settlement_queue entry and not settled',
    };
  }

  // Check which ones have no queue entry
  const orphanedGames: any[] = [];
  if (data && data.length > 0) {
    for (const game of data) {
      const { data: queueItem } = await adminClient
        .from('settlement_queue')
        .select('id')
        .eq('game_id', game.id)
        .single();

      if (!queueItem) {
        orphanedGames.push(game);
      }
    }
  }

  const actualCount = orphanedGames.length;
  const status = getCheckStatus(actualCount, THRESHOLDS.final_not_queued);

  return {
    status,
    count: actualCount,
    threshold: THRESHOLDS.final_not_queued.warning,
    description: 'FINAL games with no settlement_queue entry and not settled',
    items: includeItems ? formatGameItems(orphanedGames) : undefined,
  };
}

/**
 * Check for queue items stuck in QUEUED/PROCESSING for > 30 minutes
 */
async function checkQueuedTooLong(
  adminClient: SupabaseClient,
  includeItems: boolean
): Promise<HealthCheck> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data, count, error } = await adminClient
    .from('settlement_queue')
    .select(includeItems ? '*, sports_games(*)' : 'id', { count: 'exact' })
    .in('status', ['QUEUED', 'PROCESSING'])
    .lt('updated_at', thirtyMinutesAgo);

  if (error) {
    console.error('[health] queued_too_long check failed:', error.message);
    return {
      status: 'warning',
      count: 0,
      threshold: THRESHOLDS.queued_too_long.warning,
      description: 'QUEUED/PROCESSING items stale for > 30 minutes',
    };
  }

  const actualCount = count || 0;
  const status = getCheckStatus(actualCount, THRESHOLDS.queued_too_long);

  return {
    status,
    count: actualCount,
    threshold: THRESHOLDS.queued_too_long.warning,
    description: 'QUEUED/PROCESSING items stale for > 30 minutes',
    items: includeItems ? formatQueueItems(data) : undefined,
  };
}

/**
 * Check for FAILED items with >= 5 attempts
 */
async function checkFailedMany(
  adminClient: SupabaseClient,
  includeItems: boolean
): Promise<HealthCheck> {
  const { data, count, error } = await adminClient
    .from('settlement_queue')
    .select(includeItems ? '*, sports_games(*)' : 'id', { count: 'exact' })
    .eq('status', 'FAILED')
    .gte('attempts', 5);

  if (error) {
    console.error('[health] failed_many check failed:', error.message);
    return {
      status: 'warning',
      count: 0,
      threshold: THRESHOLDS.failed_many.warning,
      description: 'FAILED items with 5+ attempts (need manual intervention)',
    };
  }

  const actualCount = count || 0;
  const status = getCheckStatus(actualCount, THRESHOLDS.failed_many);

  return {
    status,
    count: actualCount,
    threshold: THRESHOLDS.failed_many.warning,
    description: 'FAILED items with 5+ attempts (need manual intervention)',
    items: includeItems ? formatQueueItems(data) : undefined,
  };
}

/**
 * Check for PROCESSING items that haven't been updated in 10 minutes (stale lock)
 */
async function checkProcessingStale(
  adminClient: SupabaseClient,
  includeItems: boolean
): Promise<HealthCheck> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data, count, error } = await adminClient
    .from('settlement_queue')
    .select(includeItems ? '*, sports_games(*)' : 'id', { count: 'exact' })
    .eq('status', 'PROCESSING')
    .lt('locked_at', tenMinutesAgo);

  if (error) {
    console.error('[health] processing_stale check failed:', error.message);
    return {
      status: 'warning',
      count: 0,
      threshold: THRESHOLDS.processing_stale.warning,
      description: 'PROCESSING items with stale lock (> 10 minutes)',
    };
  }

  const actualCount = count || 0;
  const status = getCheckStatus(actualCount, THRESHOLDS.processing_stale);

  return {
    status,
    count: actualCount,
    threshold: THRESHOLDS.processing_stale.warning,
    description: 'PROCESSING items with stale lock (> 10 minutes)',
    items: includeItems ? formatQueueItems(data) : undefined,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getCheckStatus(
  count: number,
  thresholds: { warning: number; critical: number }
): 'ok' | 'warning' | 'critical' {
  if (count >= thresholds.critical) return 'critical';
  if (count >= thresholds.warning) return 'warning';
  return 'ok';
}

function formatGameItems(data: any[] | null): HealthCheck['items'] {
  if (!data) return [];
  return data.slice(0, 20).map(game => ({
    id: game.id,
    league: game.league,
    external_game_id: game.external_game_id,
    home_team: game.home_team,
    away_team: game.away_team,
    starts_at: game.starts_at,
    status_norm: game.status_norm,
    updated_at: game.updated_at,
  }));
}

function formatQueueItems(data: any[] | null): HealthCheck['items'] {
  if (!data) return [];
  return data.slice(0, 20).map(item => ({
    id: item.game_id,
    league: item.league,
    external_game_id: item.external_game_id,
    home_team: item.sports_games?.home_team,
    away_team: item.sports_games?.away_team,
    starts_at: item.sports_games?.starts_at,
    status_norm: item.status,
    updated_at: item.updated_at,
    attempts: item.attempts,
  }));
}

/**
 * Release stale processing locks
 * Items that have been PROCESSING for > 10 minutes are reset to QUEUED
 */
export async function releaseStaleProcessingLocks(
  adminClient: SupabaseClient
): Promise<number> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data, error } = await adminClient
    .from('settlement_queue')
    .update({
      status: 'QUEUED',
      locked_by: null,
      locked_at: null,
    })
    .eq('status', 'PROCESSING')
    .lt('locked_at', tenMinutesAgo)
    .select('id');

  if (error) {
    console.error('[health] releaseStaleProcessingLocks failed:', error.message);
    return 0;
  }

  const count = data?.length || 0;
  if (count > 0) {
    console.log(`[health] Released ${count} stale processing locks`);
  }

  return count;
}

/**
 * Enqueue orphaned FINAL games that were never queued for settlement
 */
export async function enqueueOrphanedFinalGames(
  adminClient: SupabaseClient
): Promise<number> {
  // Find FINAL games with no settled_at and no settlement_queue entry
  const { data: finalGames, error } = await adminClient
    .from('sports_games')
    .select('*')
    .eq('status_norm', 'FINAL')
    .is('settled_at', null)
    .limit(100);

  if (error || !finalGames) {
    console.error('[health] enqueueOrphanedFinalGames query failed:', error?.message);
    return 0;
  }

  let enqueued = 0;

  for (const game of finalGames) {
    // Check if already in queue
    const { data: existing } = await adminClient
      .from('settlement_queue')
      .select('id')
      .eq('game_id', game.id)
      .single();

    if (!existing) {
      // Determine winner
      let winner: 'HOME' | 'AWAY' | 'DRAW' | null = null;
      if (game.home_score !== null && game.away_score !== null) {
        if (game.home_score > game.away_score) winner = 'HOME';
        else if (game.away_score > game.home_score) winner = 'AWAY';
        else winner = 'DRAW';
      }

      // Enqueue
      const { error: insertError } = await adminClient
        .from('settlement_queue')
        .insert({
          game_id: game.id,
          league: game.league,
          external_game_id: game.external_game_id,
          provider: game.provider || 'api-sports',
          status: 'QUEUED',
          outcome: winner || game.winner_side,
        });

      if (!insertError) {
        enqueued++;
        console.log(`[health] Enqueued orphaned FINAL game ${game.id}`);
      }
    }
  }

  return enqueued;
}
