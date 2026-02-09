/**
 * POST /api/admin/api-sports/nba/games/backfill
 * 
 * Backfill NBA games for today-2 through today+30 days.
 * Returns detailed counts of what was fetched and upserted.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncGamesForDateRange } from "@/lib/apiSports/gameSync";
import { SupportedLeague } from "@/lib/apiSports/leagueConfig";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  
  // Also allow internal cron secret
  const cronSecret = process.env.INTERNAL_CRON_SECRET;
  const cronHeader = request.headers.get("x-internal-cron-secret");
  if (cronSecret && cronHeader === cronSecret) return true;
  
  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY not configured",
    }, { status: 500 });
  }

  const startTime = Date.now();

  // Calculate date range: today-2 to today+30
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 2);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);

  const fromDate = startDate.toISOString().split("T")[0];
  const toDate = endDate.toISOString().split("T")[0];

  console.log(`[nba-backfill] Starting backfill from=${fromDate} to=${toDate}`);

  try {
    const result = await syncGamesForDateRange(
      adminClient,
      "NBA" as SupportedLeague,
      fromDate,
      toDate
    );

    const ms = Date.now() - startTime;

    // Verify count in database
    const { count } = await adminClient
      .from("sports_games")
      .select("id", { count: "exact", head: true })
      .eq("league", "nba");

    console.log(`[nba-backfill] Complete: fetched=${result.totalGames} inserted=${result.inserted} updated=${result.updated} dbCount=${count} ms=${ms}`);

    return NextResponse.json({
      ok: result.success,
      league: "nba",
      start: fromDate,
      end: toDate,
      fetched: result.totalGames,
      upserted: result.inserted + result.updated,
      inserted: result.inserted,
      updated: result.updated,
      dbCount: count,
      ms,
      error: result.error,
    });
  } catch (error) {
    const ms = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[nba-backfill] Error: ${errorMsg}`);
    
    return NextResponse.json({
      ok: false,
      league: "nba",
      start: fromDate,
      end: toDate,
      fetched: 0,
      upserted: 0,
      ms,
      error: errorMsg,
    }, { status: 500 });
  }
}

// Also support GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request);
}
