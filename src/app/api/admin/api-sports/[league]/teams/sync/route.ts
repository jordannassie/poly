/**
 * POST /api/admin/api-sports/[league]/teams/sync
 * 
 * Sync teams for any league to sports_teams table.
 * Works for: nfl, nba, mlb, nhl, soccer
 * 
 * Query params:
 * - season: year (optional, will try current year and previous years if empty)
 * - leagues: comma-separated league IDs (for soccer only)
 * 
 * Implements retry logic:
 * - Tries providedSeason (or currentYear) first
 * - If empty, tries previousYear, then previousYear-1
 * - Returns which season was used
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncTeamsWithSeason, syncSoccerTeams } from "@/lib/apiSports/teamSync";

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

  // Parse query params
  const url = new URL(request.url);
  const seasonParam = url.searchParams.get("season");
  const providedSeason = seasonParam ? parseInt(seasonParam, 10) : null;

  try {
    // Soccer uses different sync logic
    if (league === "soccer") {
      const leaguesParam = url.searchParams.get("leagues");
      const season = providedSeason || 2024;
      
      const leagueIds = leaguesParam 
        ? leaguesParam.split(",").map(l => parseInt(l.trim(), 10)).filter(n => !isNaN(n))
        : undefined;

      const result = await syncSoccerTeams(adminClient, API_SPORTS_KEY, leagueIds, season);

      return NextResponse.json({
        ok: result.success,
        league: result.league,
        seasonUsed: season,
        seasonsTried: [season],
        totalTeams: result.totalTeams,
        inserted: result.inserted,
        updated: result.updated,
        logosUploaded: result.logosUploaded,
        logosFailed: result.logosFailed,
        message: result.success 
          ? `Synced ${result.totalTeams} ${league.toUpperCase()} teams (season ${season})`
          : result.error,
      });
    }

    // For NFL, NBA, MLB, NHL - use season retry logic
    const result = await syncTeamsWithSeason(
      adminClient,
      API_SPORTS_KEY,
      league.toUpperCase() as "NFL" | "NBA" | "MLB" | "NHL",
      providedSeason
    );

    return NextResponse.json({
      ok: result.success,
      league: result.league,
      seasonUsed: result.seasonUsed,
      seasonsTried: result.seasonsTried,
      endpoint: result.endpoint,
      totalTeams: result.totalTeams,
      inserted: result.inserted,
      updated: result.updated,
      logosUploaded: result.logosUploaded,
      logosFailed: result.logosFailed,
      message: result.success 
        ? `Synced ${result.totalTeams} ${league.toUpperCase()} teams (season ${result.seasonUsed})`
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
