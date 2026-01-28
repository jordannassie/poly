/**
 * GET /api/admin/sports/status
 * Returns current SportsDataIO status, cache info, and provider health.
 * Protected by ADMIN_TOKEN.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllStatuses, getProviderHealth, getGamesInProgress } from "@/lib/sportsdataio/status";
import { getAllCacheInfo, getCacheStats } from "@/lib/sportsdataio/cache";
import { getAllLeagues, getEnabledLeagueKeys, type LeagueConfig } from "@/config/leagues";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) {
    return false; // No token configured = deny all
  }

  // Check header first
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) {
    return true;
  }

  // Check query param
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  if (queryToken === ADMIN_TOKEN) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const health = getProviderHealth();
    const gamesInProgress = getGamesInProgress();
    const statuses = getAllStatuses();
    const cacheInfo = getAllCacheInfo();
    const cacheStats = getCacheStats();
    
    // Get league configuration
    const allLeagues = getAllLeagues();
    const enabledLeagueKeys = getEnabledLeagueKeys();

    // Transform statuses for JSON serialization
    const statusesJson = statuses.map((s) => ({
      ...s,
      lastSuccessAt: s.lastSuccessAt?.toISOString() || null,
      lastErrorAt: s.lastErrorAt?.toISOString() || null,
    }));

    // Transform cache info for JSON serialization
    const cacheInfoJson = cacheInfo.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      expiresAt: c.expiresAt.toISOString(),
    }));

    // Build league status overview
    const leagueStatus = allLeagues.map((league: LeagueConfig) => {
      const leagueStatuses = statusesJson.filter(s => 
        s.key.toLowerCase().includes(league.key.toLowerCase())
      );
      const hasErrors = leagueStatuses.some(s => s.errorCount > 0);
      const lastSuccess = leagueStatuses
        .filter(s => s.lastSuccessAt)
        .sort((a, b) => new Date(b.lastSuccessAt!).getTime() - new Date(a.lastSuccessAt!).getTime())[0];

      return {
        key: league.key,
        label: league.label,
        enabled: league.enabled,
        status: !league.enabled ? "DISABLED" : 
                hasErrors ? "DEGRADED" : 
                lastSuccess ? "ONLINE" : "UNKNOWN",
        lastSuccess: lastSuccess?.lastSuccessAt || null,
        endpointCount: leagueStatuses.length,
      };
    });

    return NextResponse.json({
      health,
      gamesInProgress,
      leagues: {
        all: allLeagues.map(l => ({ key: l.key, label: l.label, enabled: l.enabled })),
        enabled: enabledLeagueKeys,
        status: leagueStatus,
      },
      statuses: statusesJson,
      cache: {
        stats: cacheStats,
        entries: cacheInfoJson,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
