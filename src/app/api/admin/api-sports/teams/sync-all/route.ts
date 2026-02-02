/**
 * POST /api/admin/api-sports/teams/sync-all
 * 
 * Sync teams + logos for ALL leagues in one request.
 * Loops through: nfl, nba, mlb, nhl, soccer
 * 
 * Response:
 * {
 *   ok: boolean,
 *   results: [{ league, totalTeams, inserted, updated, logosUploaded, logosFailed, error? }],
 *   totals: { totalTeams, inserted, updated, logosUploaded, logosFailed },
 *   message: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { 
  syncNFLTeams, 
  syncNBATeams, 
  syncSoccerTeams, 
  syncLeagueTeams,
  type SyncTeamsResult 
} from "@/lib/apiSports/teamSync";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY || "";

// Fixed order for syncing
const LEAGUE_ORDER = ["nfl", "nba", "mlb", "nhl", "soccer"] as const;

// Delay between leagues to be rate-limit friendly (ms)
const DELAY_BETWEEN_LEAGUES = 500;

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface LeagueResult {
  league: string;
  success: boolean;
  totalTeams: number;
  inserted: number;
  updated: number;
  logosUploaded: number;
  logosFailed: number;
  error?: string;
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

  const results: LeagueResult[] = [];
  const totals = {
    totalTeams: 0,
    inserted: 0,
    updated: 0,
    logosUploaded: 0,
    logosFailed: 0,
  };

  let hasErrors = false;

  for (let i = 0; i < LEAGUE_ORDER.length; i++) {
    const league = LEAGUE_ORDER[i];
    
    try {
      let syncResult: SyncTeamsResult;

      switch (league) {
        case "nfl":
          syncResult = await syncNFLTeams(adminClient, API_SPORTS_KEY);
          break;
        case "nba":
          syncResult = await syncNBATeams(adminClient, API_SPORTS_KEY);
          break;
        case "mlb":
          syncResult = await syncLeagueTeams(adminClient, API_SPORTS_KEY, "MLB");
          break;
        case "nhl":
          syncResult = await syncLeagueTeams(adminClient, API_SPORTS_KEY, "NHL");
          break;
        case "soccer":
          // Use default Premier League for soccer
          syncResult = await syncSoccerTeams(adminClient, API_SPORTS_KEY);
          break;
        default:
          continue;
      }

      const leagueResult: LeagueResult = {
        league: league.toUpperCase(),
        success: syncResult.success,
        totalTeams: syncResult.totalTeams,
        inserted: syncResult.inserted,
        updated: syncResult.updated,
        logosUploaded: syncResult.logosUploaded,
        logosFailed: syncResult.logosFailed,
      };

      if (!syncResult.success && syncResult.error) {
        leagueResult.error = syncResult.error;
        hasErrors = true;
      }

      results.push(leagueResult);

      // Aggregate totals
      totals.totalTeams += syncResult.totalTeams;
      totals.inserted += syncResult.inserted;
      totals.updated += syncResult.updated;
      totals.logosUploaded += syncResult.logosUploaded;
      totals.logosFailed += syncResult.logosFailed;

      console.log(`[sync-all] ${league.toUpperCase()}: ${syncResult.totalTeams} teams, ${syncResult.logosUploaded} logos`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[sync-all] ${league.toUpperCase()} failed:`, errorMessage);
      
      results.push({
        league: league.toUpperCase(),
        success: false,
        totalTeams: 0,
        inserted: 0,
        updated: 0,
        logosUploaded: 0,
        logosFailed: 0,
        error: errorMessage,
      });
      
      hasErrors = true;
    }

    // Add delay between leagues (except after the last one)
    if (i < LEAGUE_ORDER.length - 1) {
      await sleep(DELAY_BETWEEN_LEAGUES);
    }
  }

  const successCount = results.filter(r => r.success).length;
  const message = hasErrors
    ? `Synced ${successCount}/${LEAGUE_ORDER.length} leagues with some errors`
    : `Successfully synced all ${LEAGUE_ORDER.length} leagues`;

  return NextResponse.json({
    ok: !hasErrors || successCount > 0,
    results,
    totals,
    message,
  });
}
