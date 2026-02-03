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

    // Always lowercase the league param
    const league = leagueParam?.toLowerCase() || null;

    let teams;
    if (league) {
      teams = await getTeamsByLeague(league);
    } else {
      teams = await getAllTeams();
    }

    const counts = await getTeamCountsByLeague();

    // Debug log
    console.log("[teams]", { league: league || "all", count: teams?.length });

    return NextResponse.json({
      teams,
      count: teams.length,
      counts,
      league: league || "all",
    });
  } catch (error) {
    console.error("[/api/communities/teams] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams", teams: [], counts: {} },
      { status: 500 }
    );
  }
}
