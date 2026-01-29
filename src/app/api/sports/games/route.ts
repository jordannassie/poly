/**
 * GET /api/sports/games
 * Returns games/scores for a league and date with team data joined.
 * 
 * Query params:
 * - league: "nfl" | "nba" | "mlb" | "nhl" (required)
 * - date: "YYYY-MM-DD" (optional, defaults to today)
 * 
 * Response includes team names and logos joined from Teams cache.
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  getTeams,
  getGamesByDate,
  getTeamLogoUrl,
  getGameId,
  getGameStatus,
  getAwayScore,
  getHomeScore,
  getGameDate,
  SUPPORTED_LEAGUES,
  type League,
  type Team,
  type Score,
} from "@/lib/sportsdataio/client";
import { getTodayIso } from "@/lib/sportsdataio/nflDate";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || "nfl";
    const date = url.searchParams.get("date") || getTodayIso();

    // Validate league
    if (!SUPPORTED_LEAGUES.includes(leagueParam as League)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${SUPPORTED_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    const league = leagueParam as League;

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Expected: YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Fetch teams and games in parallel
    const [teams, scores] = await Promise.all([
      getTeams(league),
      getGamesByDate(league, date),
    ]);

    // Create team lookup map
    const teamMap = new Map<string, Team>();
    for (const team of teams) {
      teamMap.set(team.Key, team);
    }

    // Join team data to games and normalize fields for frontend
    const gamesWithTeams = scores.map((score: Score) => {
      const status = getGameStatus(score);
      return {
        ...score,
        // Normalize GameKey for all leagues
        GameKey: getGameId(score),
        // Normalize date
        Date: getGameDate(score),
        // Normalize scores
        AwayScore: getAwayScore(score),
        HomeScore: getHomeScore(score),
        // Provide consistent status booleans for frontend
        Week: score.Week || 0,
        HasStarted: status === "in_progress" || status === "final",
        IsInProgress: status === "in_progress",
        IsOver: status === "final",
        Canceled: status === "canceled",
        AwayTeamData: teamMap.get(score.AwayTeam) ? {
          ...teamMap.get(score.AwayTeam),
          WikipediaLogoUrl: getTeamLogoUrl(teamMap.get(score.AwayTeam)!),
        } : undefined,
        HomeTeamData: teamMap.get(score.HomeTeam) ? {
          ...teamMap.get(score.HomeTeam),
          WikipediaLogoUrl: getTeamLogoUrl(teamMap.get(score.HomeTeam)!),
        } : undefined,
      };
    });

    console.log(`[/api/sports/games] ${league.toUpperCase()} ${date}: ${gamesWithTeams.length} games`);

    return NextResponse.json({
      league,
      date,
      count: gamesWithTeams.length,
      games: gamesWithTeams,
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
