/**
 * POST /api/admin/api-sports/[league]/scores/update
 * 
 * Update live scores and game status.
 * Fetches live games and today's games, updates scores in sports_games table.
 * 
 * Works for all leagues: nfl, nba, mlb, nhl, soccer
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncLiveGames } from "@/lib/apiSports/gameSync";
import { getLeagueConfigByString, SupportedLeague } from "@/lib/apiSports/leagueConfig";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { league: string } }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate league
  const leagueConfig = getLeagueConfigByString(params.league);
  if (!leagueConfig) {
    return NextResponse.json({
      ok: false,
      error: `Invalid league: ${params.league}. Supported: nfl, nba, mlb, nhl, soccer`,
    }, { status: 400 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY not configured",
    }, { status: 500 });
  }

  const startTime = Date.now();

  try {
    const result = await syncLiveGames(
      adminClient,
      leagueConfig.league as SupportedLeague
    );

    const ms = Date.now() - startTime;

    if (!result.success) {
      return NextResponse.json({
        ok: false,
        ms,
        error: result.error,
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      ms,
      league: result.league,
      totalGames: result.totalGames,
      inserted: result.inserted,
      updated: result.updated,
      message: result.totalGames > 0
        ? `Updated ${result.totalGames} ${result.league} games (${result.inserted} new, ${result.updated} updated)`
        : `No live ${result.league} games found at this time`,
    });
  } catch (error) {
    const ms = Date.now() - startTime;
    return NextResponse.json({
      ok: false,
      ms,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
