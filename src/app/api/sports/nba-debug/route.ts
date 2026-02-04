/**
 * GET /api/sports/nba-debug
 * 
 * Public debug endpoint to check NBA API structure.
 * TEMPORARY - remove after debugging.
 */

import { NextResponse } from "next/server";
import { apiSportsFetchSafe, buildApiSportsUrl } from "@/lib/apiSports/client";

const API_SPORTS_KEY = process.env.API_SPORTS_KEY;

export async function GET() {
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
    firstGameKeys: firstGame ? Object.keys(firstGame) : null,
    firstGameRaw: firstGame || null,
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
