/**
 * POST /api/admin/api-sports/[league]/teams/sync
 * 
 * Sync teams for any league to sports_teams table.
 * Works for: nfl, nba, mlb, nhl, soccer
 * 
 * Query params (for soccer):
 * - leagues: comma-separated league IDs (default: 39 for Premier League)
 * - season: year (default: 2024)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncNFLTeams, syncNBATeams, syncSoccerTeams, syncLeagueTeams } from "@/lib/apiSports/teamSync";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY || "";

// Supported leagues for team sync
const SUPPORTED_LEAGUES = ["nfl", "nba", "mlb", "nhl", "soccer"];

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

  const league = params.league.toLowerCase();

  // Validate league
  if (!SUPPORTED_LEAGUES.includes(league)) {
    return NextResponse.json({
      ok: false,
      error: `Invalid league: ${params.league}. Supported: ${SUPPORTED_LEAGUES.join(", ")}`,
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
    let result;

    switch (league) {
      case "nfl":
        result = await syncNFLTeams(adminClient, API_SPORTS_KEY);
        break;

      case "nba":
        result = await syncNBATeams(adminClient, API_SPORTS_KEY);
        break;

      case "mlb":
        result = await syncLeagueTeams(adminClient, API_SPORTS_KEY, "MLB");
        break;

      case "nhl":
        result = await syncLeagueTeams(adminClient, API_SPORTS_KEY, "NHL");
        break;

      case "soccer": {
        // Parse query params for soccer
        const url = new URL(request.url);
        const leaguesParam = url.searchParams.get("leagues");
        const season = parseInt(url.searchParams.get("season") || "2024", 10);
        
        const leagueIds = leaguesParam 
          ? leaguesParam.split(",").map(l => parseInt(l.trim(), 10)).filter(n => !isNaN(n))
          : undefined;

        result = await syncSoccerTeams(adminClient, API_SPORTS_KEY, leagueIds, season);
        break;
      }

      default:
        return NextResponse.json({
          ok: false,
          error: `League ${league} not yet implemented`,
        }, { status: 400 });
    }

    return NextResponse.json({
      ok: result.success,
      league: result.league,
      totalTeams: result.totalTeams,
      inserted: result.inserted,
      updated: result.updated,
      logosUploaded: result.logosUploaded,
      logosFailed: result.logosFailed,
      message: result.success 
        ? `Synced ${result.totalTeams} ${league.toUpperCase()} teams`
        : result.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[/api/admin/api-sports/${league}/teams/sync] Error:`, message);
    
    return NextResponse.json({
      ok: false,
      error: message,
    }, { status: 500 });
  }
}
