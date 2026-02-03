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
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[/api/admin/api-sports/leagues/sync-all] Error:`, message);
    
    return NextResponse.json({
      ok: false,
      error: message,
    }, { status: 500 });
  }
}
