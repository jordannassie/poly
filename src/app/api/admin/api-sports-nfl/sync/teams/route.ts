/**
 * POST /api/admin/api-sports-nfl/sync/teams
 * Fetch NFL teams from API-Sports and sync to Supabase
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY;
const API_SPORTS_BASE_URL = process.env.API_SPORTS_BASE_URL || "https://v1.american-football.api-sports.io";

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
      error: "Supabase admin client not configured",
    }, { status: 500 });
  }

  const startTime = Date.now();

  try {
    // Fetch teams from API-Sports (try without season first, then fallback to 2025)
    let teamsData: { response: Array<{ id: number; name: string; code: string; city: string; logo: string }> } | null = null;
    let endpoint = `${API_SPORTS_BASE_URL}/teams?league=1`;
    
    const res1 = await fetch(endpoint, {
      headers: { "x-apisports-key": API_SPORTS_KEY },
    });
    const data1 = await res1.json();
    
    if (data1.results && data1.results > 0) {
      teamsData = data1;
    } else {
      // Fallback to season=2025
      endpoint = `${API_SPORTS_BASE_URL}/teams?league=1&season=2025`;
      const res2 = await fetch(endpoint, {
        headers: { "x-apisports-key": API_SPORTS_KEY },
      });
      teamsData = await res2.json();
    }

    if (!teamsData?.response || teamsData.response.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "No teams returned from API-Sports",
        endpoint,
      }, { status: 500 });
    }

    // Transform and upsert teams
    const teams = teamsData.response.map((team) => ({
      team_id: team.id,
      name: team.name,
      code: team.code || null,
      city: team.city || null,
      logo: team.logo || null,
      provider: "api-sports",
    }));

    const { data: upsertedData, error: upsertError } = await adminClient
      .from("api_sports_nfl_teams")
      .upsert(teams, {
        onConflict: "team_id",
      })
      .select();

    if (upsertError) {
      return NextResponse.json({
        ok: false,
        error: `Database error: ${upsertError.message}`,
      }, { status: 500 });
    }

    const ms = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      ms,
      endpoint,
      fetched: teamsData.response.length,
      synced: upsertedData?.length || teams.length,
      message: `Synced ${teams.length} NFL teams to database`,
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
