/**
 * POST /api/admin/api-sports/soccer/teams/sync
 * 
 * Sync Soccer teams from API-Sports to Supabase with logo storage.
 * - Fetches teams from API-Sports (football/soccer API)
 * - Downloads logos and uploads to Supabase Storage (SPORTS bucket)
 * - Upserts team records in sports_teams table
 * - Preserves existing logos if new upload fails
 * 
 * Query Parameters:
 * - leagues: Comma-separated list of league IDs (default: 39 = Premier League)
 * - season: Season year (default: 2024)
 * - all: If "true", syncs all major leagues (EPL, La Liga, Serie A, Bundesliga, Ligue 1, MLS)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncSoccerTeams } from "@/lib/apiSports/teamSync";
import { SOCCER_LEAGUES } from "@/lib/apiSports/leagueConfig";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY;

// All major soccer leagues for "sync all" option
const ALL_MAJOR_LEAGUES = [
  SOCCER_LEAGUES.PREMIER_LEAGUE,  // 39 - English Premier League
  SOCCER_LEAGUES.LA_LIGA,          // 140 - Spanish La Liga
  SOCCER_LEAGUES.SERIE_A,          // 135 - Italian Serie A
  SOCCER_LEAGUES.BUNDESLIGA,       // 78 - German Bundesliga
  SOCCER_LEAGUES.LIGUE_1,          // 61 - French Ligue 1
  SOCCER_LEAGUES.MLS,              // 253 - US MLS
  SOCCER_LEAGUES.CHAMPIONS_LEAGUE, // 2 - UEFA Champions League
];

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  
  // Check cookie
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  
  // Check header
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  
  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const startTime = Date.now();

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const syncAll = searchParams.get("all") === "true";
    const leaguesParam = searchParams.get("leagues");
    const seasonParam = searchParams.get("season");
    
    // Determine which leagues to sync
    let leagueIds: number[];
    if (syncAll) {
      leagueIds = ALL_MAJOR_LEAGUES;
    } else if (leaguesParam) {
      leagueIds = leaguesParam.split(",").map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    } else {
      // Default to Premier League only
      leagueIds = [SOCCER_LEAGUES.PREMIER_LEAGUE];
    }
    
    const season = seasonParam ? parseInt(seasonParam, 10) : 2025;

    // Sync Soccer teams with logo storage
    const result = await syncSoccerTeams(adminClient, API_SPORTS_KEY, leagueIds, season);
    
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
      leagueIds,
      season,
      totalTeams: result.totalTeams,
      inserted: result.inserted,
      updated: result.updated,
      logosUploaded: result.logosUploaded,
      logosFailed: result.logosFailed,
      message: `Synced ${result.totalTeams} Soccer teams from ${leagueIds.length} league(s) (${result.inserted} new, ${result.updated} updated). Logos: ${result.logosUploaded} uploaded, ${result.logosFailed} failed.`,
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
