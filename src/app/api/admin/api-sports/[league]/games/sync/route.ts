/**
 * POST /api/admin/api-sports/[league]/games/sync
 * 
 * Sync games for a date range to sports_games table.
 * Works for all leagues: nfl, nba, mlb, nhl, soccer
 * 
 * Query params:
 * - from: Start date (YYYY-MM-DD), default: today
 * - to: End date (YYYY-MM-DD), default: today + 7 days
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncGamesForDateRange } from "@/lib/apiSports/gameSync";
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

  // Parse date range from query params
  const url = new URL(request.url);
  const today = new Date();
  const defaultEnd = new Date(today);
  
  // NFL defaults to 90 days, others to 7 days
  const defaultDays = params.league.toLowerCase() === "nfl" ? 90 : 7;
  defaultEnd.setDate(defaultEnd.getDate() + defaultDays);
  
  const fromDate = url.searchParams.get("from") || today.toISOString().split("T")[0];
  const toDate = url.searchParams.get("to") || defaultEnd.toISOString().split("T")[0];

  const startTime = Date.now();

  try {
    const result = await syncGamesForDateRange(
      adminClient,
      leagueConfig.league as SupportedLeague,
      fromDate,
      toDate
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
      fromDate,
      toDate,
      dates: result.dates,
      totalGames: result.totalGames,
      inserted: result.inserted,
      updated: result.updated,
      message: `Synced ${result.totalGames} ${result.league} games (${result.inserted} new, ${result.updated} updated)`,
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
