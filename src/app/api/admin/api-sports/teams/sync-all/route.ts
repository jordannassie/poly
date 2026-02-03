/**
 * POST /api/admin/api-sports/teams/sync-all
 * 
 * Sync teams + logos for ALL leagues in one request.
 * 
 * NEW: League-driven sync (preferred)
 * - For non-NFL sports, checks sports_leagues table for active leagues
 * - If found, syncs teams from each league (using league_id + season)
 * - Teams are stored with league_id for proper linking
 * 
 * FALLBACK: Legacy sync
 * - NFL always uses legacy (single league)
 * - Other sports fall back if no leagues in DB
 * 
 * Response:
 * {
 *   ok: boolean,
 *   results: [{ league, totalTeams, inserted, updated, logosUploaded, logosFailed, error?, mode? }],
 *   totals: { totalTeams, inserted, updated, logosUploaded, logosFailed },
 *   message: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { 
  syncNFLTeams, 
  syncSoccerTeams, 
  syncTeamsWithSeason,
  type SyncTeamsResult 
} from "@/lib/apiSports/teamSync";
import { syncTeamsForSport, type LeagueDrivenSyncResult } from "@/lib/apiSports/leagueDrivenTeamSync";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY || process.env.APISPORTS_KEY || "";

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
  mode?: "league-driven" | "legacy";
  leaguesSynced?: number;
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

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check API key - support both naming conventions
  if (!API_SPORTS_KEY) {
    console.error("[sync-all] Missing APISPORTS_KEY / API_SPORTS_KEY env var");
    return NextResponse.json({
      ok: false,
      error: "Missing APISPORTS_KEY env var - check environment configuration",
      results: [],
      totals: { totalTeams: 0, inserted: 0, updated: 0, logosUploaded: 0, logosFailed: 0 },
      message: "Configuration error",
    }, { status: 500 });
  }
  
  // Log that we have the key (without exposing it)
  console.log(`[sync-all] APISPORTS_KEY found (${API_SPORTS_KEY.length} chars)`);


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
      // Determine sync mode
      // NFL always uses legacy, others prefer league-driven if available
      let useLeagueDriven = false;
      if (league !== "nfl") {
        useLeagueDriven = await hasActiveLeagues(adminClient, league);
      }
      
      console.log(`[sync-all] ${league.toUpperCase()}: mode=${useLeagueDriven ? "league-driven" : "legacy"}`);
      
      let leagueResult: LeagueResult;

      if (useLeagueDriven) {
        // League-driven sync
        const result: LeagueDrivenSyncResult = await syncTeamsForSport(adminClient, API_SPORTS_KEY, league);
        
        leagueResult = {
          league: league.toUpperCase(),
          success: result.success,
          totalTeams: result.totalTeams,
          inserted: result.inserted,
          updated: result.updated,
          logosUploaded: result.logosUploaded,
          logosFailed: result.logosFailed,
          mode: "league-driven",
          leaguesSynced: result.leaguesSynced,
        };
        
        if (!result.success && result.error) {
          leagueResult.error = result.error;
          hasErrors = true;
        }
      } else {
        // Legacy sync
        let syncResult: SyncTeamsResult;

        switch (league) {
          case "nfl":
            syncResult = await syncNFLTeams(adminClient, API_SPORTS_KEY);
            break;
          case "nba":
            syncResult = await syncTeamsWithSeason(adminClient, API_SPORTS_KEY, "NBA");
            break;
          case "mlb":
            syncResult = await syncTeamsWithSeason(adminClient, API_SPORTS_KEY, "MLB");
            break;
          case "nhl":
            syncResult = await syncTeamsWithSeason(adminClient, API_SPORTS_KEY, "NHL");
            break;
          case "soccer":
            syncResult = await syncSoccerTeams(adminClient, API_SPORTS_KEY);
            break;
          default:
            continue;
        }

        leagueResult = {
          league: league.toUpperCase(),
          success: syncResult.success,
          totalTeams: syncResult.totalTeams,
          inserted: syncResult.inserted,
          updated: syncResult.updated,
          logosUploaded: syncResult.logosUploaded,
          logosFailed: syncResult.logosFailed,
          mode: "legacy",
        };

        if (!syncResult.success && syncResult.error) {
          leagueResult.error = syncResult.error;
          hasErrors = true;
        }
      }

      results.push(leagueResult);

      // Aggregate totals
      totals.totalTeams += leagueResult.totalTeams;
      totals.inserted += leagueResult.inserted;
      totals.updated += leagueResult.updated;
      totals.logosUploaded += leagueResult.logosUploaded;
      totals.logosFailed += leagueResult.logosFailed;

      console.log(`[sync-all] ${league.toUpperCase()}: ${leagueResult.totalTeams} teams, ${leagueResult.logosUploaded} logos`);

    } catch (error) {
      // Extract detailed error information
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        errorMessage = error.message;
        // Check for HTML parsing errors (common when API returns error page)
        if (errorMessage.includes("Unexpected token") || errorMessage.includes("<")) {
          errorMessage = "Received HTML instead of JSON - likely API auth error or rate limit";
        }
      }
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
  const leagueDrivenCount = results.filter(r => r.mode === "league-driven").length;
  const message = hasErrors
    ? `Synced ${successCount}/${LEAGUE_ORDER.length} leagues with some errors`
    : `Successfully synced all ${LEAGUE_ORDER.length} leagues (${leagueDrivenCount} league-driven)`;

  return NextResponse.json({
    ok: !hasErrors || successCount > 0,
    results,
    totals,
    message,
  });
}
