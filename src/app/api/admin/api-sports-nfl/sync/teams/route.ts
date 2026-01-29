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
  
  // Check cookie
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  
  // Check header
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  
  return false;
}

interface ApiSportsTeam {
  id: number;
  name: string;
  code: string | null;
  city: string | null;
  logo: string | null;
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
    // Try /teams?league=1 first
    let teamsData: { response: ApiSportsTeam[]; results: number } | null = null;
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

    // Get existing teams to track inserted vs updated
    const { data: existingTeams } = await adminClient
      .from("api_sports_nfl_teams")
      .select("team_id");
    
    const existingTeamIds = new Set(existingTeams?.map(t => t.team_id) || []);

    // Transform and upsert teams
    const teams = teamsData.response.map((team) => ({
      team_id: team.id,
      name: team.name,
      code: team.code || null,
      city: team.city || null,
      logo: team.logo || null,
      raw: team,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await adminClient
      .from("api_sports_nfl_teams")
      .upsert(teams, {
        onConflict: "team_id",
      });

    if (upsertError) {
      return NextResponse.json({
        ok: false,
        error: `Database error: ${upsertError.message}`,
      }, { status: 500 });
    }

    // Calculate inserted vs updated
    let inserted = 0;
    let updated = 0;
    for (const team of teams) {
      if (existingTeamIds.has(team.team_id)) {
        updated++;
      } else {
        inserted++;
      }
    }

    const ms = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      ms,
      endpoint,
      inserted,
      updated,
      count: teams.length,
      message: `Synced ${teams.length} NFL teams (${inserted} new, ${updated} updated)`,
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
