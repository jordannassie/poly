/**
 * POST /api/admin/api-sports/[league]/teams/sync
 * 
 * Sync teams for any league to sports_teams table.
 * Works for: nfl, nba, mlb, nhl, soccer
 * 
 * NEW: League-driven sync (preferred)
 * - Checks sports_leagues table for active leagues
 * - If found, syncs teams from each league (using league_id + season)
 * - Teams are stored with league_id for proper linking
 * 
 * FALLBACK: Season retry logic (if no leagues in DB)
 * - Tries current year, previous year, etc.
 * 
 * Query params:
 * - season: year (optional, for fallback mode)
 * - leagues: comma-separated league IDs (for soccer fallback only)
 * - mode: "league-driven" | "legacy" (optional, default auto-detects)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncTeamsWithSeason, syncSoccerTeams, syncNFLTeams } from "@/lib/apiSports/teamSync";
import { syncTeamsForSport, type LeagueDrivenSyncResult } from "@/lib/apiSports/leagueDrivenTeamSync";

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

/**
 * Check if there are leagues for this sport in the database
 * Note: New schema doesn't have 'active' column - presence means active
 */
async function hasActiveLeagues(adminClient: ReturnType<typeof getAdminClient>, sport: string): Promise<boolean> {
  if (!adminClient) return false;
  
  const { data, error } = await adminClient
    .from("sports_leagues")
    .select("id")
    .eq("sport", sport.toLowerCase())
    .limit(1);
  
  if (error) {
    console.warn(`[hasActiveLeagues] Error checking leagues for ${sport}:`, error.message);
    return false;
  }
  
  return (data?.length || 0) > 0;
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
  const modeParam = url.searchParams.get("mode");

  try {
    // Determine sync mode
    // - NFL always uses legacy mode (single league, no sports_leagues entry needed)
    // - Other sports prefer league-driven if leagues exist
    let useLeagueDriven = false;
    
    if (league !== "nfl" && modeParam !== "legacy") {
      useLeagueDriven = await hasActiveLeagues(adminClient, league);
      console.log(`[teams/sync] ${league}: useLeagueDriven=${useLeagueDriven}`);
    }

    // ==========================================
    // LEAGUE-DRIVEN SYNC (preferred for non-NFL)
    // ==========================================
    if (useLeagueDriven) {
      const result: LeagueDrivenSyncResult = await syncTeamsForSport(adminClient, API_SPORTS_KEY, league);
      
      return NextResponse.json({
        ok: result.success,
        mode: "league-driven",
        league: league.toUpperCase(),
        leaguesSynced: result.leaguesSynced,
        totalTeams: result.totalTeams,
        inserted: result.inserted,
        updated: result.updated,
        logosUploaded: result.logosUploaded,
        logosFailed: result.logosFailed,
        leagueResults: result.leagueResults,
        message: result.success 
          ? `Synced ${result.totalTeams} teams from ${result.leaguesSynced} ${league.toUpperCase()} leagues`
          : result.error,
        error: result.error,
      });
    }

    // ==========================================
    // LEGACY SYNC (fallback / NFL)
    // ==========================================
    
    // NFL uses its own sync function
    if (league === "nfl") {
      const result = await syncNFLTeams(adminClient, API_SPORTS_KEY);
      
      return NextResponse.json({
        ok: result.success,
        mode: "legacy",
        league: result.league,
        totalTeams: result.totalTeams,
        inserted: result.inserted,
        updated: result.updated,
        logosUploaded: result.logosUploaded,
        logosFailed: result.logosFailed,
        message: result.success 
          ? `Synced ${result.totalTeams} NFL teams`
          : result.error,
      });
    }

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
        mode: "legacy",
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

    // For NBA, MLB, NHL - use season retry logic
    const result = await syncTeamsWithSeason(
      adminClient,
      API_SPORTS_KEY,
      league.toUpperCase() as "NBA" | "MLB" | "NHL",
      providedSeason
    );

    return NextResponse.json({
      ok: result.success,
      mode: "legacy",
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
