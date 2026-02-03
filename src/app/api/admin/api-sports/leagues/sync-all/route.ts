/**
 * POST /api/admin/api-sports/leagues/sync-all
 * 
 * Sync all leagues for all sports to sports_leagues table.
 * Syncs: NBA, MLB, NHL, Soccer (top-tier leagues only)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncAllLeagues } from "@/lib/apiSports/leagueSync";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY || process.env.APISPORTS_KEY || "";

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

  // Check API key - support both naming conventions
  if (!API_SPORTS_KEY) {
    console.error("[leagues/sync-all] Missing APISPORTS_KEY / API_SPORTS_KEY env var");
    return NextResponse.json({
      ok: false,
      error: "Missing APISPORTS_KEY env var - check environment configuration",
      results: [],
      totals: { totalLeagues: 0, inserted: 0, updated: 0 },
      message: "Configuration error",
    }, { status: 500 });
  }
  
  // Log that we have the key (without exposing it)
  console.log(`[leagues/sync-all] APISPORTS_KEY found (${API_SPORTS_KEY.length} chars)`);

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY not configured",
    }, { status: 500 });
  }

  try {
    const result = await syncAllLeagues(adminClient, API_SPORTS_KEY);

    return NextResponse.json({
      ok: result.success,
      results: result.results,
      totals: result.totals,
      message: result.success 
        ? `Synced ${result.totals.totalLeagues} leagues (${result.totals.inserted} new, ${result.totals.updated} updated)`
        : "Some leagues failed to sync",
    });
  } catch (error) {
    let message = error instanceof Error ? error.message : "Unknown error";
    
    // Check for HTML parsing errors
    if (message.includes("Unexpected token") || message.includes("<")) {
      message = "Received HTML instead of JSON - likely API auth error or rate limit";
    }
    
    console.error(`[/api/admin/api-sports/leagues/sync-all] Error:`, message);
    
    return NextResponse.json({
      ok: false,
      error: message,
      results: [],
      totals: { totalLeagues: 0, inserted: 0, updated: 0 },
      message: "Sync failed",
    }, { status: 500 });
  }
}
