/**
 * Game Lifecycle Module
 * 
 * Production-grade game state machine and settlement system
 * 
 * State Machine:
 * SCHEDULED → LIVE → FINAL → SETTLED
 *          ↘      ↘
 *        POSTPONED  CANCELED (terminal, no settle)
 * 
 * Jobs:
 * 1. Discovery: Ingest games (now-36h to now+36h)
 * 2. Sync: Update scores/status for active games
 * 3. Finalize: Mark FINAL games and enqueue settlements
 * 
 * Settlement:
 * - Queue-based processing
 * - Idempotent (safe to retry)
 * - Calculates winners, creates payouts
 */

export { normalizeStatus, determineWinner, isTerminalStatus, needsSettlement } from './statusNorm';
export type { StatusNorm } from './statusNorm';

export { 
  discoverGamesRollingWindow, 
  syncLiveAndWindowGames, 
  finalizeAndEnqueueSettlements,
  getFinalizeCandidates,
} from './jobs';
export type { JobResult, MultiLeagueJobResult, FinalizeCandidateDebug, FinalizeDebugResult } from './jobs';

export {
  listSettlementQueue,
  getQueueStats,
  lockNextQueueItem,
  processSettlement,
  processAllSettlements,
  markQueueItemDone,
  markQueueItemFailed,
  previewSettlement,
  getTreasuryBalance,
  getTreasuryLedger,
  isSettlementProcessed,
} from './settlement';
export type { SettlementQueueItem, SettlementResult, SettlementPreview } from './settlement';

export {
  runHealthChecks,
  releaseStaleProcessingLocks,
  enqueueOrphanedFinalGames,
} from './health';
export type { HealthCheckResult, HealthCheck } from './health';

export {
  acquireJobLock,
  releaseJobLock,
  extendJobLock,
  getJobLocks,
  forceReleaseJobLock,
  cleanupExpiredLocks,
  withJobLock,
} from './jobLock';
export type { JobName, JobLock, LockResult } from './jobLock';
