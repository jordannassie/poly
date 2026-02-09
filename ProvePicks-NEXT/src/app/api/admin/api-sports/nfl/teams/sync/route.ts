/**
 * POST /api/admin/api-sports/nfl/teams/sync
 * 
 * Sync NFL teams from API-Sports to Supabase with logo storage.
 * - Fetches teams from API-Sports
 * - Downloads logos and uploads to Supabase Storage (SPORTS bucket)
 * - Upserts team records in sports_teams table
 * - Preserves existing logos if new upload fails
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncNFLTeams } from "@/lib/apiSports/teamSync";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY;

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
    // Sync teams with logo storage
    const result = await syncNFLTeams(adminClient, API_SPORTS_KEY);
    
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
      totalTeams: result.totalTeams,
      inserted: result.inserted,
      updated: result.updated,
      logosUploaded: result.logosUploaded,
      logosFailed: result.logosFailed,
      message: `Synced ${result.totalTeams} NFL teams (${result.inserted} new, ${result.updated} updated). Logos: ${result.logosUploaded} uploaded, ${result.logosFailed} failed.`,
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
