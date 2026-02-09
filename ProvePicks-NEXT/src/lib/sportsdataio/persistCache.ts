/**
 * Persistent cache for SportsDataIO data.
 * Stores cache in Supabase for reliability on serverless platforms.
 * 
 * This ensures that even when Netlify serverless functions lose their
 * in-memory cache between invocations, we can still import games from
 * the persistent Supabase cache.
 */

import { getAdminClient } from "@/lib/supabase/admin";

const PROVIDER = "sportsdataio";

// TTL values in milliseconds (matching in-memory cache)
const TTL_MS = {
  TEAMS: 24 * 60 * 60 * 1000,    // 24 hours
  GAMES: 60 * 60 * 1000,          // 1 hour (longer for persistent cache)
  SCORES: 5 * 60 * 1000,          // 5 minutes
} as const;

/**
 * Generate a cache key for Supabase storage
 */
export function generateCacheKey(league: string, endpoint: string, date?: string): string {
  const parts = [PROVIDER, league.toLowerCase(), endpoint];
  if (date) {
    parts.push(date);
  }
  return parts.join(":");
}

/**
 * Upsert data into the persistent cache
 */
export async function upsertCache(params: {
  league: string;
  endpoint: string;
  date?: string;
  payload: unknown;
  ttlMs?: number;
}): Promise<boolean> {
  const client = getAdminClient();
  if (!client) {
    console.warn("[persistCache] Admin client not available - skipping persistence");
    return false;
  }

  const { league, endpoint, date, payload, ttlMs } = params;
  const cacheKey = generateCacheKey(league, endpoint, date);
  const now = new Date();
  const expiresAt = ttlMs ? new Date(now.getTime() + ttlMs) : null;

  try {
    const { error } = await client
      .from("sports_cache")
      .upsert({
        provider: PROVIDER,
        league: league.toLowerCase(),
        endpoint,
        cache_date: date || null,
        cache_key: cacheKey,
        payload,
        fetched_at: now.toISOString(),
        expires_at: expiresAt?.toISOString() || null,
        status: "ok",
        error: null,
      }, {
        onConflict: "cache_key",
      });

    if (error) {
      console.error("[persistCache] Upsert error:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[persistCache] Exception:", err);
    return false;
  }
}

/**
 * Get data from persistent cache
 */
export async function getFromPersistentCache<T>(params: {
  league: string;
  endpoint: string;
  date?: string;
}): Promise<{ data: T | null; fromCache: boolean; expired: boolean }> {
  const client = getAdminClient();
  if (!client) {
    return { data: null, fromCache: false, expired: false };
  }

  const { league, endpoint, date } = params;
  const cacheKey = generateCacheKey(league, endpoint, date);

  try {
    const { data, error } = await client
      .from("sports_cache")
      .select("payload, expires_at, fetched_at")
      .eq("cache_key", cacheKey)
      .single();

    if (error || !data) {
      return { data: null, fromCache: false, expired: false };
    }

    // Check if expired
    const now = new Date();
    const expired = data.expires_at ? new Date(data.expires_at) < now : false;

    return {
      data: data.payload as T,
      fromCache: true,
      expired,
    };
  } catch (err) {
    console.error("[persistCache] Get error:", err);
    return { data: null, fromCache: false, expired: false };
  }
}

/**
 * Record an error in the cache
 */
export async function recordCacheError(params: {
  league: string;
  endpoint: string;
  date?: string;
  error: string;
}): Promise<void> {
  const client = getAdminClient();
  if (!client) return;

  const { league, endpoint, date, error } = params;
  const cacheKey = generateCacheKey(league, endpoint, date);

  try {
    await client
      .from("sports_cache")
      .upsert({
        provider: PROVIDER,
        league: league.toLowerCase(),
        endpoint,
        cache_date: date || null,
        cache_key: cacheKey,
        payload: {},
        fetched_at: new Date().toISOString(),
        status: "error",
        error,
      }, {
        onConflict: "cache_key",
      });
  } catch (err) {
    console.error("[persistCache] Record error failed:", err);
  }
}
