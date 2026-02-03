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
import { getLeagueConfig } from "@/lib/apiSports/leagueConfig";

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

    // Get game counts by league using raw query
    const { data: allGames } = await adminClient
      .from("sports_games")
      .select("league, status");
    
    const leagueCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    
    if (allGames) {
      for (const row of allGames) {
        leagueCounts[row.league] = (leagueCounts[row.league] || 0) + 1;
        statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
      }
    }

    // Get next 10 upcoming games PER LEAGUE
    const now = new Date().toISOString();
    const upcomingByLeague: Record<string, any[]> = {};
    
    for (const league of ENABLED_LEAGUES) {
      const { data: upcoming } = await adminClient
        .from("sports_games")
        .select("id, league, home_team, away_team, starts_at, status, season")
        .eq("league", league.sportKey.toLowerCase())
        .gte("starts_at", now)
        .order("starts_at", { ascending: true })
        .limit(5);
      
      upcomingByLeague[league.sportKey] = upcoming || [];
    }

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

    // Build detailed league config info
    const leagueConfigs = ENABLED_LEAGUES.map(l => {
      const config = getLeagueConfig(l.sportKey);
      return {
        sportKey: l.sportKey,
        leagueId: l.leagueId,
        season: l.season,
        baseUrl: config.baseUrl,
        gamesEndpoint: config.gamesEndpoint,
        gamesInDb: leagueCounts[l.sportKey.toLowerCase()] || 0,
      };
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        totalGames: totalGames || 0,
        byLeague: Object.entries(leagueCounts).map(([league, count]) => ({ league, count })),
        byStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      },
      leagueConfigs,
      syncStates: syncStates || [],
      liveGames: liveGames || [],
      upcomingByLeague,
    });

  } catch (error) {
    console.error("[sync-test] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
