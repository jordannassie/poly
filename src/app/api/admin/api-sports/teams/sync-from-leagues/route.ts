/**
 * POST /api/admin/api-sports/teams/sync-from-leagues
 * 
 * League-driven team sync: queries active leagues from sports_leagues
 * and syncs teams for each league using league_id + season.
 * 
 * Query params:
 * - sport: optional, filter to specific sport (nba, mlb, nhl, soccer)
 * 
 * Teams are stored with league_id for proper linking.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncTeamsFromActiveLeagues, syncTeamsForSport } from "@/lib/apiSports/leagueDrivenTeamSync";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY || "";

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  
  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Parse optional sport filter
  const url = new URL(request.url);
  const sport = url.searchParams.get("sport")?.toLowerCase();

  try {
    const result = sport
      ? await syncTeamsForSport(adminClient, API_SPORTS_KEY, sport)
      : await syncTeamsFromActiveLeagues(adminClient, API_SPORTS_KEY);

    return NextResponse.json({
      ok: result.success,
      leaguesSynced: result.leaguesSynced,
      totalTeams: result.totalTeams,
      inserted: result.inserted,
      updated: result.updated,
      logosUploaded: result.logosUploaded,
      logosFailed: result.logosFailed,
      leagueResults: result.leagueResults,
      message: result.success 
        ? `Synced ${result.totalTeams} teams from ${result.leaguesSynced} leagues (${result.inserted} new, ${result.updated} updated)`
        : result.error,
      error: result.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/admin/api-sports/teams/sync-from-leagues] Error:", message);
    
    return NextResponse.json({
      ok: false,
      error: message,
    }, { status: 500 });
  }
}
