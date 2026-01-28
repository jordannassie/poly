/**
 * GET /api/sports/games
 * Returns games/scores for a league and date with team data joined.
 * 
 * Query params:
 * - league: "nfl" (required)
 * - date: "YYYY-MM-DD" (optional, defaults to today)
 * 
 * Response includes team names and logos joined from Teams cache.
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  getNflGamesWithTeams, 
  SUPPORTED_LEAGUES,
  type League 
} from "@/lib/sportsdataio/client";
import { getTodayIso } from "@/lib/sportsdataio/nflDate";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const league = url.searchParams.get("league")?.toLowerCase();
    const date = url.searchParams.get("date") || getTodayIso();

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

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Expected: YYYY-MM-DD" },
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

    const games = await getNflGamesWithTeams(date);

    return NextResponse.json({
      league,
      date,
      count: games.length,
      games,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/games] Error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
