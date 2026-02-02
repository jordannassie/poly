/**
 * GET /api/communities/teams
 * 
 * Returns all teams for the browse communities page.
 * 
 * Query params:
 * - league: Optional filter by league (nfl, nba, soccer, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllTeams, getTeamsByLeague, getTeamCountsByLeague } from "@/lib/teams/getAllTeams";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league");

    let teams;
    if (leagueParam) {
      teams = await getTeamsByLeague(leagueParam);
    } else {
      teams = await getAllTeams();
    }

    const counts = await getTeamCountsByLeague();

    return NextResponse.json({
      teams,
      count: teams.length,
      counts,
      league: leagueParam || "all",
    });
  } catch (error) {
    console.error("[/api/communities/teams] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams", teams: [], counts: {} },
      { status: 500 }
    );
  }
}
