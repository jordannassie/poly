/**
 * POST /api/admin/api-sports/[league]/leagues/sync
 * 
 * Sync leagues for a specific sport to sports_leagues table.
 * Only syncs selected leagues per sport (not all worldwide).
 * 
 * Works for: nba, mlb, nhl, soccer
 * (NFL doesn't need this - it only has one league)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncLeaguesForSport } from "@/lib/apiSports/leagueSync";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY || "";

// Sports that support league sync
const SUPPORTED_SPORTS = ["nba", "mlb", "nhl", "soccer"];

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

  const sport = params.league.toLowerCase();

  // Validate sport
  if (!SUPPORTED_SPORTS.includes(sport)) {
    return NextResponse.json({
      ok: false,
      error: `Invalid sport for league sync: ${params.league}. Supported: ${SUPPORTED_SPORTS.join(", ")}`,
      note: "NFL doesn't need league sync - it only has one league",
    }, { status: 400 });
  }

  // Check API key
  if (!API_SPORTS_KEY) {
    return NextResponse.json({
      ok: false,
      error: "API_SPORTS_KEY not configured",
    }, { status: 500 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY not configured",
    }, { status: 500 });
  }

  try {
    // Convert to uppercase for the sync function
    const sportUpper = sport.toUpperCase() as "NBA" | "MLB" | "NHL" | "SOCCER";
    
    const result = await syncLeaguesForSport(adminClient, API_SPORTS_KEY, sportUpper);

    return NextResponse.json({
      ok: result.success,
      sport: result.sport,
      totalLeagues: result.totalLeagues,
      inserted: result.inserted,
      updated: result.updated,
      leagues: result.leagues,
      message: result.success 
        ? `Synced ${result.totalLeagues} ${sport.toUpperCase()} leagues (${result.inserted} new, ${result.updated} updated)`
        : result.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[/api/admin/api-sports/${sport}/leagues/sync] Error:`, message);
    
    return NextResponse.json({
      ok: false,
      error: message,
    }, { status: 500 });
  }
}
