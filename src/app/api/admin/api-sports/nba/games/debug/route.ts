/**
 * GET /api/admin/api-sports/nba/games/debug
 * 
 * Debug endpoint to see raw NBA API response structure.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiSportsFetchSafe, buildApiSportsUrl } from "@/lib/apiSports/client";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY;

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!API_SPORTS_KEY) {
    return NextResponse.json({ error: "API_SPORTS_KEY not configured" }, { status: 500 });
  }

  const today = new Date().toISOString().split("T")[0];
  
  // Try the NBA Basketball API
  const baseUrl = "https://v1.basketball.api-sports.io";
  
  // Try current season format
  const season = "2025-2026"; // NBA season format
  const endpoint = `/games?date=${today}&league=12&season=${season}`;
  const url = buildApiSportsUrl(baseUrl, endpoint);
  
  console.log(`[nba-debug] Fetching: ${url}`);
  
  const result = await apiSportsFetchSafe<any>(url, API_SPORTS_KEY);
  
  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      error: result.message,
      url,
      season,
    });
  }
  
  const data = result.data;
  const games = data.response || [];
  
  // Get structure of first game
  const firstGame = games[0];
  
  return NextResponse.json({
    ok: true,
    url,
    season,
    totalGames: games.length,
    firstGameStructure: firstGame ? {
      // Show all top-level keys
      keys: Object.keys(firstGame),
      // Show specific fields we care about
      id: firstGame.id,
      date: firstGame.date,
      timestamp: firstGame.timestamp,
      status: firstGame.status,
      league: firstGame.league,
      teams: firstGame.teams,
      scores: firstGame.scores,
      // Show raw first game for full inspection
      raw: firstGame,
    } : null,
    // Show all games summary
    gamesSummary: games.slice(0, 5).map((g: any) => ({
      id: g.id,
      date: g.date,
      homeTeam: g.teams?.home?.name,
      awayTeam: g.teams?.away?.name,
      status: g.status?.long || g.status,
    })),
  });
}
