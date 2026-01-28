/**
 * GET /api/admin/sports/status
 * Returns current SportsDataIO status, cache info, and provider health.
 * Protected by ADMIN_TOKEN.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllStatuses, getProviderHealth, getGamesInProgress } from "@/lib/sportsdataio/status";
import { getAllCacheInfo, getCacheStats } from "@/lib/sportsdataio/cache";

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

    return NextResponse.json({
      health,
      gamesInProgress,
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
