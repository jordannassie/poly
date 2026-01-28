/**
 * Server-side status tracker for SportsDataIO API health monitoring.
 * Maintains in-memory status per key (league + endpoint).
 */

export type EndpointKey = `${string}:${string}`; // e.g., "nfl:teams", "nfl:games"

export interface EndpointStatus {
  key: EndpointKey;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
  lastLatencyMs: number | null;
  successCount: number;
  errorCount: number;
}

// In-memory status storage
const statusMap = new Map<EndpointKey, EndpointStatus>();

/**
 * Initialize or get status for an endpoint
 */
function getOrCreateStatus(key: EndpointKey): EndpointStatus {
  if (!statusMap.has(key)) {
    statusMap.set(key, {
      key,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      lastLatencyMs: null,
      successCount: 0,
      errorCount: 0,
    });
  }
  return statusMap.get(key)!;
}

/**
 * Record a successful API call
 */
export function recordSuccess(league: string, endpoint: string, latencyMs: number): void {
  const key: EndpointKey = `${league}:${endpoint}`;
  const status = getOrCreateStatus(key);
  status.lastSuccessAt = new Date();
  status.lastLatencyMs = latencyMs;
  status.successCount++;
}

/**
 * Record a failed API call
 */
export function recordError(league: string, endpoint: string, errorMessage: string): void {
  const key: EndpointKey = `${league}:${endpoint}`;
  const status = getOrCreateStatus(key);
  status.lastErrorAt = new Date();
  status.lastErrorMessage = errorMessage;
  status.errorCount++;
}

/**
 * Get all endpoint statuses
 */
export function getAllStatuses(): EndpointStatus[] {
  return Array.from(statusMap.values());
}

/**
 * Get status for a specific endpoint
 */
export function getStatus(league: string, endpoint: string): EndpointStatus | null {
  const key: EndpointKey = `${league}:${endpoint}`;
  return statusMap.get(key) || null;
}

/**
 * Calculate overall provider health status
 */
export function getProviderHealth(): "ONLINE" | "DEGRADED" | "OFFLINE" {
  const statuses = getAllStatuses();
  
  if (statuses.length === 0) {
    return "OFFLINE"; // No data yet
  }
  
  const now = Date.now();
  const TWO_MINUTES = 2 * 60 * 1000;
  const TEN_MINUTES = 10 * 60 * 1000;
  
  let hasRecentSuccess = false;
  let hasRecentError = false;
  let allStale = true;
  
  for (const status of statuses) {
    const lastSuccess = status.lastSuccessAt?.getTime() || 0;
    const lastError = status.lastErrorAt?.getTime() || 0;
    
    if (now - lastSuccess < TWO_MINUTES) {
      hasRecentSuccess = true;
      allStale = false;
    }
    
    if (now - lastSuccess < TEN_MINUTES) {
      allStale = false;
    }
    
    if (lastError > lastSuccess && now - lastError < TWO_MINUTES) {
      hasRecentError = true;
    }
  }
  
  if (allStale) {
    return "OFFLINE";
  }
  
  if (hasRecentSuccess && !hasRecentError) {
    return "ONLINE";
  }
  
  return "DEGRADED";
}

/**
 * Reset all statuses (for testing)
 */
export function resetAllStatuses(): void {
  statusMap.clear();
}
