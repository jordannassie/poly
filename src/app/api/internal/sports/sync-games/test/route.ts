/**
 * Internal Sports Games Sync Test/Verification Route
 * 
 * GET /api/internal/sports/sync-games/test
 * 
 * Returns statistics about games in the database for verification.
 * Protected by INTERNAL_CRON_SECRET header.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { ENABLED_LEAGUES } from "@/lib/sports/enabledLeagues";

const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET;

function isAuthorized(request: NextRequest): boolean {
  if (!INTERNAL_CRON_SECRET) {
    console.warn("[sync-test] INTERNAL_CRON_SECRET not configured");
    return false;
  }
  
  const headerSecret = request.headers.get("x-internal-cron-secret");
  return headerSecret === INTERNAL_CRON_SECRET;
}

export async function GET(request: NextRequest) {
  // Validate authorization
  if (!isAuthorized(request)) {
    return NextResponse.json({
      success: false,
      error: "Unauthorized",
    }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({
      success: false,
      error: "Admin client not available",
    }, { status: 500 });
  }

  try {
    // Get total game count
    const { count: totalGames } = await adminClient
      .from("sports_games")
      .select("*", { count: "exact", head: true });

    // Get game counts by league
    const { data: leagueCounts } = await adminClient
      .from("sports_games")
      .select("league")
      .then(async ({ data }) => {
        if (!data) return { data: [] };
        
        const counts: Record<string, number> = {};
        for (const row of data) {
          counts[row.league] = (counts[row.league] || 0) + 1;
        }
        return { data: Object.entries(counts).map(([league, count]) => ({ league, count })) };
      });

    // Get game counts by status
    const { data: statusCounts } = await adminClient
      .from("sports_games")
      .select("status")
      .then(async ({ data }) => {
        if (!data) return { data: [] };
        
        const counts: Record<string, number> = {};
        for (const row of data) {
          counts[row.status] = (counts[row.status] || 0) + 1;
        }
        return { data: Object.entries(counts).map(([status, count]) => ({ status, count })) };
      });

    // Get next 10 upcoming games
    const now = new Date().toISOString();
    const { data: upcomingGames } = await adminClient
      .from("sports_games")
      .select("id, league, home_team, away_team, starts_at, status")
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(10);

    // Get sync state for enabled leagues
    const { data: syncStates } = await adminClient
      .from("sports_sync_state")
      .select("*")
      .order("sport_key");

    // Get live games
    const { data: liveGames } = await adminClient
      .from("sports_games")
      .select("id, league, home_team, away_team, home_score, away_score, starts_at, status")
      .in("status", ["In Progress", "In Play", "1H", "2H", "HT", "Live", "Q1", "Q2", "Q3", "Q4", "OT"])
      .order("starts_at", { ascending: true })
      .limit(10);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        totalGames: totalGames || 0,
        byLeague: leagueCounts || [],
        byStatus: statusCounts || [],
      },
      enabledLeagues: ENABLED_LEAGUES.map(l => ({
        sportKey: l.sportKey,
        leagueId: l.leagueId,
        season: l.season,
      })),
      syncStates: syncStates || [],
      liveGames: liveGames || [],
      upcomingGames: upcomingGames || [],
    });

  } catch (error) {
    console.error("[sync-test] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
