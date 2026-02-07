/**
 * Status Normalization Utility
 * 
 * Pure function to normalize game status from various providers
 * to our canonical status: SCHEDULED | LIVE | FINAL | CANCELED | POSTPONED
 */

export type StatusNorm = 'SCHEDULED' | 'LIVE' | 'FINAL' | 'CANCELED' | 'POSTPONED';

// API-Sports status codes by category
const LIVE_STATUSES = new Set([
  // Soccer
  '1h', '2h', 'ht', 'et', 'bt', 'p', 'live', 'int',
  // Basketball  
  'q1', 'q2', 'q3', 'q4', 'ot', 'bt',
  // American Football
  'q1', 'q2', 'q3', 'q4', 'ot', 'ht',
  // Hockey
  'p1', 'p2', 'p3', 'ot', 'bt', 'pt',
  // Baseball
  'in1', 'in2', 'in3', 'in4', 'in5', 'in6', 'in7', 'in8', 'in9', 'ie',
  // Generic
  'in progress', 'inprogress', 'inp', 'playing', 'started',
]);

const FINAL_STATUSES = new Set([
  // Soccer
  'ft', 'aet', 'pen', 'aw', 'wo',
  // Generic
  'final', 'f', 'f/ot', 'f/so', 'ended', 'finished', 'completed',
  'post', // post-game (considered final)
  'awd', // awarded
  'over',
]);

const CANCELED_STATUSES = new Set([
  'canc', 'canceled', 'cancelled', 'abd', 'abdn', 'abandoned',
  'void', 'voided',
]);

const POSTPONED_STATUSES = new Set([
  'pst', 'postponed', 'post', 'delayed', 'susp', 'suspended',
  'int', // interrupted - treat as postponed unless scores indicate live
]);

const SCHEDULED_STATUSES = new Set([
  'ns', 'not started', 'scheduled', 'tbd', 'upcoming',
  'pre', 'prematch',
]);

/**
 * Normalize status from any provider to our canonical status
 * 
 * @param provider - Data provider name (e.g., 'api-sports')
 * @param rawStatus - Raw status string from provider
 * @param extra - Extra fields like hasScores, isOverBooleans
 */
export function normalizeStatus(
  provider: string,
  rawStatus: string | null | undefined,
  extra?: {
    homeScore?: number | null;
    awayScore?: number | null;
    isOver?: boolean;
    isCanceled?: boolean;
    isInProgress?: boolean;
    startTime?: Date | string;
  }
): StatusNorm {
  // Handle null/undefined
  if (!rawStatus) {
    // Fallback to boolean checks if available
    if (extra?.isCanceled) return 'CANCELED';
    if (extra?.isOver) return 'FINAL';
    if (extra?.isInProgress) return 'LIVE';
    return 'SCHEDULED';
  }

  const status = rawStatus.toLowerCase().trim();

  // 1. Check explicit canceled first (highest priority for terminal states)
  if (CANCELED_STATUSES.has(status) || extra?.isCanceled) {
    return 'CANCELED';
  }

  // 2. Check postponed
  if (POSTPONED_STATUSES.has(status)) {
    // If there are scores, it's actually live
    if (extra?.homeScore !== null && extra?.homeScore !== undefined && 
        extra?.awayScore !== null && extra?.awayScore !== undefined) {
      if (extra.homeScore > 0 || extra.awayScore > 0) {
        return 'LIVE'; // Has scores, so it's live/in-progress
      }
    }
    return 'POSTPONED';
  }

  // 3. Check final
  if (FINAL_STATUSES.has(status) || extra?.isOver) {
    return 'FINAL';
  }

  // 4. Check live
  if (LIVE_STATUSES.has(status) || extra?.isInProgress) {
    return 'LIVE';
  }

  // 5. Check scheduled
  if (SCHEDULED_STATUSES.has(status)) {
    return 'SCHEDULED';
  }

  // 6. Pattern matching for quarter/period/half indicators
  if (/^(q[1-4]|p[1-3]|in[1-9]|[12]h|ot|et)$/i.test(status)) {
    return 'LIVE';
  }

  // 7. If status contains certain keywords
  if (status.includes('progress') || status.includes('live') || status.includes('playing')) {
    return 'LIVE';
  }
  if (status.includes('final') || status.includes('ended') || status.includes('finished')) {
    return 'FINAL';
  }
  if (status.includes('cancel') || status.includes('abandon')) {
    return 'CANCELED';
  }
  if (status.includes('postpon') || status.includes('delay') || status.includes('suspend')) {
    return 'POSTPONED';
  }

  // 8. If we have scores and game should have started, assume live
  if (extra?.startTime) {
    const startDate = typeof extra.startTime === 'string' 
      ? new Date(extra.startTime) 
      : extra.startTime;
    
    const now = new Date();
    if (startDate < now && (extra?.homeScore || extra?.awayScore)) {
      return 'LIVE';
    }
  }

  // 9. Log unknown status and default to SCHEDULED
  console.warn(`[statusNorm] Unknown status "${rawStatus}" from ${provider}, defaulting to SCHEDULED`);
  return 'SCHEDULED';
}

/**
 * Determine the winner side from scores
 */
export function determineWinner(
  homeScore: number | null,
  awayScore: number | null
): 'HOME' | 'AWAY' | 'DRAW' | null {
  if (homeScore === null || awayScore === null) {
    return null;
  }
  if (homeScore > awayScore) return 'HOME';
  if (awayScore > homeScore) return 'AWAY';
  return 'DRAW';
}

/**
 * Check if a status is terminal (game cannot change anymore)
 */
export function isTerminalStatus(status: StatusNorm): boolean {
  return status === 'FINAL' || status === 'CANCELED' || status === 'POSTPONED';
}

/**
 * Check if a status indicates the game needs settlement
 */
export function needsSettlement(status: StatusNorm): boolean {
  return status === 'FINAL' || status === 'CANCELED';
}
