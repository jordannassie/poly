/**
 * Internal Debug Route for Games Data
 * 
 * GET /api/internal/sports/games-debug
 * 
 * Returns raw database statistics to diagnose why games might not be visible.
 * Uses admin/service role to bypass RLS.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET;

function isAuthorized(request: NextRequest): boolean {
  if (!INTERNAL_CRON_SECRET) {
    return false;
  }
  const headerSecret = request.headers.get("x-internal-cron-secret");
  return headerSecret === INTERNAL_CRON_SECRET;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Admin client not available" }, { status: 500 });
  }

  try {
    // 1. Get total row count
    const { count: totalRows, error: countError } = await adminClient
      .from("sports_games")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return NextResponse.json({
        error: "Failed to count rows",
        details: countError.message,
        hint: countError.hint,
        code: countError.code,
      }, { status: 500 });
    }

    // 2. Get all rows to analyze (limit to reasonable amount)
    const { data: allGames, error: fetchError } = await adminClient
      .from("sports_games")
      .select("league, status, starts_at, season")
      .limit(10000);

    if (fetchError) {
      return NextResponse.json({
        error: "Failed to fetch games",
        details: fetchError.message,
      }, { status: 500 });
    }

    // 3. Group by league (sport_key)
    const leagueCounts: Record<string, number> = {};
    const leagueDateRanges: Record<string, { min: string | null; max: string | null }> = {};
    const statusCounts: Record<string, number> = {};

    for (const game of allGames || []) {
      const league = game.league || "unknown";
      leagueCounts[league] = (leagueCounts[league] || 0) + 1;
      
      // Track min/max dates per league
      if (!leagueDateRanges[league]) {
        leagueDateRanges[league] = { min: null, max: null };
      }
      if (game.starts_at) {
        if (!leagueDateRanges[league].min || game.starts_at < leagueDateRanges[league].min!) {
          leagueDateRanges[league].min = game.starts_at;
        }
        if (!leagueDateRanges[league].max || game.starts_at > leagueDateRanges[league].max!) {
          leagueDateRanges[league].max = game.starts_at;
        }
      }

      // Status counts
      const status = game.status || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    // 4. Get sample MLB games
    const { data: mlbSamples } = await adminClient
      .from("sports_games")
      .select("external_game_id, league, season, starts_at, status, home_team, away_team")
      .eq("league", "mlb")
      .order("starts_at", { ascending: true })
      .limit(5);

    // 5. Get sample NFL games
    const { data: nflSamples } = await adminClient
      .from("sports_games")
      .select("external_game_id, league, season, starts_at, status, home_team, away_team")
      .eq("league", "nfl")
      .order("starts_at", { ascending: true })
      .limit(5);

    // 6. Get sample NBA games
    const { data: nbaSamples } = await adminClient
      .from("sports_games")
      .select("external_game_id, league, season, starts_at, status, home_team, away_team")
      .eq("league", "nba")
      .order("starts_at", { ascending: true })
      .limit(5);

    // 7. Check what the website query would see (using anon client)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    let anonQueryResult: any = null;
    if (supabaseUrl && supabaseAnonKey) {
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const { data: anonData, error: anonError, count: anonCount } = await anonClient
        .from("sports_games")
        .select("*", { count: "exact" })
        .gte("starts_at", now.toISOString())
        .lte("starts_at", sevenDaysLater.toISOString())
        .limit(5);

      anonQueryResult = {
        count: anonCount,
        error: anonError?.message || null,
        code: anonError?.code || null,
        hint: anonError?.hint || null,
        sampleCount: anonData?.length || 0,
      };
    }

    // 8. Get upcoming games (next 7 days) using admin
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const { data: upcomingGames, count: upcomingCount } = await adminClient
      .from("sports_games")
      .select("*", { count: "exact" })
      .gte("starts_at", now.toISOString())
      .lte("starts_at", sevenDaysLater.toISOString())
      .order("starts_at", { ascending: true })
      .limit(10);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      database: {
        totalRows: totalRows || 0,
        byLeague: leagueCounts,
        byStatus: statusCounts,
        dateRangesByLeague: leagueDateRanges,
      },
      upcoming: {
        windowStart: now.toISOString(),
        windowEnd: sevenDaysLater.toISOString(),
        count: upcomingCount || 0,
        samples: upcomingGames?.slice(0, 5).map(g => ({
          league: g.league,
          home: g.home_team,
          away: g.away_team,
          starts_at: g.starts_at,
          status: g.status,
        })) || [],
      },
      samples: {
        mlb: mlbSamples || [],
        nfl: nflSamples || [],
        nba: nbaSamples || [],
      },
      anonClientTest: anonQueryResult,
      diagnosis: {
        hasData: (totalRows || 0) > 0,
        hasUpcoming: (upcomingCount || 0) > 0,
        anonBlocked: anonQueryResult?.error ? true : (anonQueryResult?.count === 0 && (totalRows || 0) > 0),
        possibleIssues: [] as string[],
      },
    });

  } catch (error) {
    return NextResponse.json({
      error: "Unexpected error",
      details: error instanceof Error ? error.message : "Unknown",
    }, { status: 500 });
  }
}
