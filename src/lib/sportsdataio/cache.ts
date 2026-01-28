/**
 * Simple in-memory cache for SportsDataIO data.
 * Stores data with TTL and provides cache management utilities.
 */

export interface CacheEntry<T = unknown> {
  data: T;
  createdAt: number;
  ttlMs: number;
  key: string;
}

// In-memory cache storage
const cache = new Map<string, CacheEntry>();

// Default TTL values (in milliseconds)
export const TTL = {
  TEAMS: 24 * 60 * 60 * 1000, // 24 hours
  GAMES: 5 * 60 * 1000,       // 5 minutes
  SCORES: 30 * 1000,          // 30 seconds (live)
  STANDINGS: 60 * 60 * 1000,  // 1 hour
} as const;

/**
 * Generate a cache key
 */
export function getCacheKey(league: string, endpoint: string, params?: string): string {
  const base = `sportsdataio:${league}:${endpoint}`;
  return params ? `${base}:${params}` : base;
}

/**
 * Get data from cache if valid
 */
export function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  
  if (!entry) {
    return null;
  }
  
  const now = Date.now();
  const age = now - entry.createdAt;
  
  if (age > entry.ttlMs) {
    // Expired, remove from cache
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

/**
 * Set data in cache
 */
export function setInCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, {
    data,
    createdAt: Date.now(),
    ttlMs,
    key,
  });
}

/**
 * Delete a specific cache entry
 */
export function deleteFromCache(key: string): boolean {
  return cache.delete(key);
}

/**
 * Flush all SportsDataIO cache entries
 */
export function flushSportsDataCache(): number {
  let count = 0;
  for (const key of cache.keys()) {
    if (key.startsWith("sportsdataio:")) {
      cache.delete(key);
      count++;
    }
  }
  return count;
}

/**
 * Flush cache for a specific league
 */
export function flushLeagueCache(league: string): number {
  let count = 0;
  const prefix = `sportsdataio:${league}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      count++;
    }
  }
  return count;
}

/**
 * Get all cache entries info (for admin display)
 */
export interface CacheInfo {
  key: string;
  createdAt: Date;
  expiresAt: Date;
  ttlMs: number;
  ageMs: number;
  remainingMs: number;
  isExpired: boolean;
}

export function getAllCacheInfo(): CacheInfo[] {
  const now = Date.now();
  const result: CacheInfo[] = [];
  
  for (const [key, entry] of cache.entries()) {
    if (!key.startsWith("sportsdataio:")) continue;
    
    const ageMs = now - entry.createdAt;
    const remainingMs = Math.max(0, entry.ttlMs - ageMs);
    
    result.push({
      key,
      createdAt: new Date(entry.createdAt),
      expiresAt: new Date(entry.createdAt + entry.ttlMs),
      ttlMs: entry.ttlMs,
      ageMs,
      remainingMs,
      isExpired: ageMs > entry.ttlMs,
    });
  }
  
  return result;
}

/**
 * Get cache stats
 */
export function getCacheStats(): { totalEntries: number; sportsDataEntries: number } {
  let sportsDataEntries = 0;
  for (const key of cache.keys()) {
    if (key.startsWith("sportsdataio:")) {
      sportsDataEntries++;
    }
  }
  return {
    totalEntries: cache.size,
    sportsDataEntries,
  };
}
