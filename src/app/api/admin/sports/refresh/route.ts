/**
 * POST /api/admin/sports/refresh
 * Triggers cache refresh or flush operations.
 * Protected by ADMIN_TOKEN.
 * 
 * Body:
 * {
 *   action: "teams" | "games" | "flush" | "warm",
 *   league: "nfl" | "nba" | "mlb" | "nhl",
 *   date?: "YYYY-MM-DD" (required for "games" action)
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  refreshTeams, 
  refreshGamesByDate, 
  warmCache,
  areGamesInProgress,
  SUPPORTED_LEAGUES,
  type League 
} from "@/lib/sportsdataio/client";
import { getTodayIso } from "@/lib/sportsdataio/nflDate";
import { flushSportsDataCache, flushLeagueCache } from "@/lib/sportsdataio/cache";
import { setGamesInProgress } from "@/lib/sportsdataio/status";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) {
    return false;
  }

  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) {
    return true;
  }

  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  if (queryToken === ADMIN_TOKEN) {
    return true;
  }

  return false;
}

type RefreshAction = "teams" | "games" | "flush" | "warm";

interface RefreshBody {
  action: RefreshAction;
  league: string;
  date?: string;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body: RefreshBody = await request.json();
    const { action, league, date } = body;

    // Validate action
    if (!["teams", "games", "flush", "warm"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be: teams, games, flush, or warm" },
        { status: 400 }
      );
    }

    // Validate league
    if (!SUPPORTED_LEAGUES.includes(league.toLowerCase() as League)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${SUPPORTED_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    const normalizedLeague = league.toLowerCase() as League;

    switch (action) {
      case "teams": {
        const teams = await refreshTeams(normalizedLeague);
        return NextResponse.json({
          success: true,
          action: "teams",
          league: normalizedLeague,
          count: teams.length,
          message: `Refreshed ${teams.length} teams for ${normalizedLeague.toUpperCase()}`,
        });
      }

      case "games": {
        // First check if games are in progress
        const inProgress = await areGamesInProgress(normalizedLeague);
        setGamesInProgress(inProgress);

        const gameDate = date || getTodayIso();
        const games = await refreshGamesByDate(normalizedLeague, gameDate);
        return NextResponse.json({
          success: true,
          action: "games",
          league: normalizedLeague,
          date: gameDate,
          count: games.length,
          gamesInProgress: inProgress,
          message: `Refreshed ${games.length} games for ${normalizedLeague.toUpperCase()} on ${gameDate}${inProgress ? " (LIVE)" : ""}`,
        });
      }

      case "flush": {
        // If league is specified, flush only that league; otherwise flush all
        const count = league === "all" 
          ? flushSportsDataCache() 
          : flushLeagueCache(normalizedLeague);
        return NextResponse.json({
          success: true,
          action: "flush",
          league: normalizedLeague,
          count,
          message: `Flushed ${count} cache entries for ${normalizedLeague.toUpperCase()}`,
        });
      }

      case "warm": {
        const result = await warmCache(normalizedLeague);
        
        // Update games in progress flag
        if (result.gamesInProgress !== undefined) {
          setGamesInProgress(result.gamesInProgress);
        }

        return NextResponse.json({
          success: true,
          action: "warm",
          league: normalizedLeague,
          result,
          message: `Warmed cache: ${result.teamsCount} teams, ${result.todayGamesCount} today's games, ${result.tomorrowGamesCount} tomorrow's games${result.gamesInProgress ? " (LIVE)" : ""}`,
        });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/admin/sports/refresh] Error:", message);
    return NextResponse.json(
      { error: message, success: false },
      { status: 500 }
    );
  }
}
