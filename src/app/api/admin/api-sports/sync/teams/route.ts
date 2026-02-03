/**
 * POST /api/admin/api-sports/sync/teams?sport=nfl|nba|mlb|nhl|soccer
 * 
 * FAST per-sport team sync - NO logo downloading.
 * Only fetches teams from API-Sports and stores in DB with logo URLs.
 * Designed to complete in < 5 seconds.
 * 
 * Response:
 * { success, sport, total, inserted, updated, error? }
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { apiSportsFetchSafe, buildApiSportsUrl } from "@/lib/apiSports/client";
import { getLeagueConfig, SOCCER_LEAGUES } from "@/lib/apiSports/leagueConfig";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY || process.env.APISPORTS_KEY || "";

const VALID_SPORTS = ["nfl", "nba", "mlb", "nhl", "soccer"] as const;
type ValidSport = typeof VALID_SPORTS[number];

// Base URLs for each sport
const SPORT_BASE_URLS: Record<ValidSport, string> = {
  nfl: "https://v1.american-football.api-sports.io",
  nba: "https://v1.basketball.api-sports.io",
  mlb: "https://v1.baseball.api-sports.io",
  nhl: "https://v1.hockey.api-sports.io",
  soccer: "https://v3.football.api-sports.io",
};

// League IDs for each sport
const SPORT_LEAGUE_IDS: Record<ValidSport, number[]> = {
  nfl: [1],
  nba: [12],
  mlb: [1],
  nhl: [57],
  soccer: [
    SOCCER_LEAGUES.PREMIER_LEAGUE,
    SOCCER_LEAGUES.LA_LIGA,
    SOCCER_LEAGUES.SERIE_A,
    SOCCER_LEAGUES.BUNDESLIGA,
    SOCCER_LEAGUES.LIGUE_1,
    SOCCER_LEAGUES.MLS,
    SOCCER_LEAGUES.CHAMPIONS_LEAGUE,
  ],
};

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  return false;
}

interface ApiTeam {
  id: number;
  name: string;
  code?: string | null;
  logo?: string | null;
  // Soccer wraps in team object
  team?: {
    id: number;
    name: string;
    code?: string | null;
    logo?: string | null;
  };
}

interface TeamsResponse {
  response: ApiTeam[];
  results?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    if (!isAuthorized(request)) {
      return NextResponse.json({ 
        success: false, 
        error: "Unauthorized" 
      }, { status: 401 });
    }

    // Get sport from query
    const url = new URL(request.url);
    const sport = url.searchParams.get("sport")?.toLowerCase() as ValidSport | null;

    if (!sport || !VALID_SPORTS.includes(sport)) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid sport. Use: ${VALID_SPORTS.join(", ")}` 
      }, { status: 400 });
    }

    // Check API key
    if (!API_SPORTS_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing APISPORTS_KEY env var" 
      }, { status: 500 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ 
        success: false, 
        error: "Database not configured" 
      }, { status: 500 });
    }

    console.log(`[sync/teams] Starting ${sport.toUpperCase()} sync...`);

    // Get current season
    const currentYear = new Date().getFullYear();
    const season = sport === "nfl" ? currentYear : currentYear;

    // Fetch teams from API-Sports
    const baseUrl = SPORT_BASE_URLS[sport];
    const leagueIds = SPORT_LEAGUE_IDS[sport];
    
    const allTeams: Array<{ id: number; name: string; logo: string | null; leagueId: number }> = [];

    for (const leagueId of leagueIds) {
      const endpoint = `/teams?league=${leagueId}&season=${season}`;
      const apiUrl = buildApiSportsUrl(baseUrl, endpoint);
      
      console.log(`[sync/teams] Fetching: ${apiUrl}`);
      
      const result = await apiSportsFetchSafe<TeamsResponse>(apiUrl, API_SPORTS_KEY);
      
      if (!result.ok) {
        console.error(`[sync/teams] API error for league ${leagueId}:`, result.message);
        continue; // Continue with other leagues
      }

      // Normalize teams
      for (const item of result.data.response || []) {
        const team = item.team || item;
        allTeams.push({
          id: team.id,
          name: team.name,
          logo: team.logo || null,
          leagueId,
        });
      }
    }

    console.log(`[sync/teams] ${sport.toUpperCase()}: Found ${allTeams.length} teams`);

    if (allTeams.length === 0) {
      return NextResponse.json({
        success: true,
        sport: sport.toUpperCase(),
        total: 0,
        inserted: 0,
        updated: 0,
        message: "No teams found from API",
      });
    }

    // Get existing teams to track inserted vs updated
    const teamIds = allTeams.map(t => t.id);
    const { data: existingTeams } = await adminClient
      .from("sports_teams")
      .select("api_team_id")
      .eq("league", sport.toUpperCase())
      .in("api_team_id", teamIds);
    
    const existingIds = new Set(existingTeams?.map(t => t.api_team_id) || []);

    // Prepare records for upsert - NO logo downloading, just store URL
    const records = allTeams.map(team => ({
      league: sport.toUpperCase(),
      api_team_id: team.id,
      name: team.name,
      logo_url_original: team.logo, // Store URL only
      league_id: team.leagueId,
      updated_at: new Date().toISOString(),
    }));

    // Batch upsert
    const { error: upsertError } = await adminClient
      .from("sports_teams")
      .upsert(records, {
        onConflict: "league,api_team_id",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error(`[sync/teams] Upsert error:`, upsertError.message);
      return NextResponse.json({
        success: false,
        sport: sport.toUpperCase(),
        error: `Database error: ${upsertError.message}`,
      }, { status: 500 });
    }

    // Count inserted vs updated
    let inserted = 0;
    let updated = 0;
    for (const team of allTeams) {
      if (existingIds.has(team.id)) {
        updated++;
      } else {
        inserted++;
      }
    }

    console.log(`[sync/teams] ${sport.toUpperCase()}: ${inserted} inserted, ${updated} updated`);

    return NextResponse.json({
      success: true,
      sport: sport.toUpperCase(),
      total: allTeams.length,
      inserted,
      updated,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[sync/teams] Error:", msg);
    return NextResponse.json({
      success: false,
      error: msg.substring(0, 200),
    }, { status: 500 });
  }
}
