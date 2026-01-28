/**
 * GET /api/sports/teams
 * Returns teams for a league with logo URLs.
 * 
 * Query params:
 * - league: "nfl" (required)
 * 
 * Response: { league, count, teams: [{teamId, name, city, abbreviation, logoUrl, primaryColor, secondaryColor}] }
 */

import { NextRequest, NextResponse } from "next/server";
import { getNflTeams, SUPPORTED_LEAGUES, type League } from "@/lib/sportsdataio/client";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const league = url.searchParams.get("league")?.toLowerCase();

    // Validate league
    if (!league) {
      return NextResponse.json(
        { error: "Missing required parameter: league" },
        { status: 400 }
      );
    }

    if (!SUPPORTED_LEAGUES.includes(league as League)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${SUPPORTED_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    // Currently only NFL is fully implemented
    if (league !== "nfl") {
      return NextResponse.json(
        { error: `League ${league} not yet implemented` },
        { status: 501 }
      );
    }

    const teams = await getNflTeams();

    // Transform to simplified format for frontend
    const simplifiedTeams = teams.map((team) => ({
      teamId: team.TeamID,
      name: team.Name,
      city: team.City,
      fullName: team.FullName || `${team.City} ${team.Name}`,
      abbreviation: team.Key,
      logoUrl: team.WikipediaLogoUrl || null,
      primaryColor: team.PrimaryColor ? `#${team.PrimaryColor}` : null,
      secondaryColor: team.SecondaryColor ? `#${team.SecondaryColor}` : null,
      conference: team.Conference,
      division: team.Division,
    }));

    return NextResponse.json({
      league,
      count: simplifiedTeams.length,
      teams: simplifiedTeams,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/teams] Error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
