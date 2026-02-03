/**
 * Internal Sports Games Sync API
 * 
 * POST /api/internal/sports/sync-games
 * 
 * This is an internal-only route for cron jobs to sync games.
 * Protected by INTERNAL_CRON_SECRET header.
 * 
 * Body:
 * - mode: "backfill" | "daily" | "live" (required)
 * - sportKey?: string (optional, if not provided syncs all enabled leagues)
 * - leagueId?: number (optional)
 * - season?: number (optional)
 * - date?: string (optional, for daily sync date override)
 * - force?: boolean (optional, force backfill even if already complete)
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  syncAllLeagues, 
  backfillSeasonGames, 
  syncGamesByDateRange, 
  syncLiveGames,
  SyncResult 
} from "@/lib/sports/syncGames";
import { getEnabledLeague, ENABLED_LEAGUES } from "@/lib/sports/enabledLeagues";
import { SupportedLeague } from "@/lib/apiSports/leagueConfig";

const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET;

function isAuthorized(request: NextRequest): boolean {
  if (!INTERNAL_CRON_SECRET) {
    console.warn("[sync-games] INTERNAL_CRON_SECRET not configured");
    return false;
  }
  
  const headerSecret = request.headers.get("x-internal-cron-secret");
  return headerSecret === INTERNAL_CRON_SECRET;
}

export async function POST(request: NextRequest) {
  // Validate authorization
  if (!isAuthorized(request)) {
    return NextResponse.json({
      success: false,
      error: "Unauthorized",
    }, { status: 401 });
  }

  let body: {
    mode: "backfill" | "daily" | "live";
    sportKey?: string;
    leagueId?: number;
    season?: number;
    date?: string;
    force?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      success: false,
      error: "Invalid JSON body",
    }, { status: 400 });
  }

  const { mode, sportKey, leagueId, season, date, force } = body;

  // Validate mode
  if (!mode || !["backfill", "daily", "live"].includes(mode)) {
    return NextResponse.json({
      success: false,
      error: "Invalid mode. Must be 'backfill', 'daily', or 'live'",
    }, { status: 400 });
  }

  console.log(`[sync-games] Received ${mode} sync request`, { sportKey, leagueId, season, date, force });

  try {
    // If sportKey is provided, sync only that league
    if (sportKey) {
      const enabledLeague = getEnabledLeague(sportKey);
      if (!enabledLeague) {
        return NextResponse.json({
          success: false,
          error: `League '${sportKey}' is not enabled. Enabled leagues: ${ENABLED_LEAGUES.map(l => l.sportKey).join(", ")}`,
        }, { status: 400 });
      }

      let result: SyncResult;

      switch (mode) {
        case "backfill":
          result = await backfillSeasonGames({
            sportKey: enabledLeague.sportKey,
            leagueId: leagueId ?? enabledLeague.leagueId,
            season: season ?? enabledLeague.season,
            force,
          });
          break;

        case "daily":
          result = await syncGamesByDateRange({
            sportKey: enabledLeague.sportKey,
            leagueId: leagueId ?? enabledLeague.leagueId,
            fromDate: date,
          });
          break;

        case "live":
          result = await syncLiveGames({
            sportKey: enabledLeague.sportKey,
            leagueId: leagueId ?? enabledLeague.leagueId,
          });
          break;
      }

      return NextResponse.json({
        success: result.success,
        mode,
        result,
      });
    }

    // No specific league - sync all enabled leagues
    const bulkResult = await syncAllLeagues({ mode, force });

    return NextResponse.json({
      success: bulkResult.success,
      mode,
      totalLeagues: ENABLED_LEAGUES.length,
      totalGames: bulkResult.totalGames,
      totalInserted: bulkResult.totalInserted,
      totalUpdated: bulkResult.totalUpdated,
      duration: bulkResult.duration,
      results: bulkResult.results,
      errors: bulkResult.errors.length > 0 ? bulkResult.errors : undefined,
    });

  } catch (error) {
    console.error("[sync-games] Sync error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// GET is not allowed - return method info
export async function GET() {
  return NextResponse.json({
    error: "Method not allowed. Use POST with body: { mode: 'backfill' | 'daily' | 'live' }",
    required_header: "x-internal-cron-secret",
  }, { status: 405 });
}
