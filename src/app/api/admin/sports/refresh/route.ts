/**
 * POST /api/admin/sports/refresh
 * Triggers cache refresh or flush operations.
 * Protected by ADMIN_TOKEN.
 * 
 * Body:
 * {
 *   action: "teams" | "games" | "flush" | "warm",
 *   league: "nfl" | "nba" | "mlb" | "all" (all enabled leagues),
 *   date?: "YYYY-MM-DD" (required for "games" action)
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
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
import { getEnabledLeagueKeys, isLeagueEnabled, LEAGUES } from "@/config/leagues";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) {
    return false;
  }

  // Check cookie first (set by /admin/login)
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) {
    return true;
  }

  // Check header
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) {
    return true;
  }

  // Check query param (backward compatibility)
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
  league: string; // Single league key or "all" for all enabled
  date?: string;
}

interface LeagueResult {
  league: string;
  success: boolean;
  count?: number;
  error?: string;
  gamesInProgress?: boolean;
}

// Process a single league action
async function processLeagueAction(
  action: RefreshAction,
  leagueKey: string,
  date?: string
): Promise<LeagueResult> {
  const normalizedLeague = leagueKey.toLowerCase() as League;
  
  // Check if league is enabled
  if (!isLeagueEnabled(leagueKey)) {
    return {
      league: leagueKey,
      success: false,
      error: "League is disabled",
    };
  }

  // Check if league is supported by the client
  if (!SUPPORTED_LEAGUES.includes(normalizedLeague)) {
    return {
      league: leagueKey,
      success: false,
      error: `League ${leagueKey} not yet implemented in API client`,
    };
  }

  try {
    switch (action) {
      case "teams": {
        const teams = await refreshTeams(normalizedLeague);
        return {
          league: leagueKey,
          success: true,
          count: teams.length,
        };
      }

      case "games": {
        const inProgress = await areGamesInProgress(normalizedLeague);
        const gameDate = date || getTodayIso();
        const games = await refreshGamesByDate(normalizedLeague, gameDate);
        return {
          league: leagueKey,
          success: true,
          count: games.length,
          gamesInProgress: inProgress,
        };
      }

      case "warm": {
        const result = await warmCache(normalizedLeague);
        return {
          league: leagueKey,
          success: true,
          count: (result.teamsCount || 0) + (result.todayGamesCount || 0) + (result.tomorrowGamesCount || 0),
          gamesInProgress: result.gamesInProgress,
        };
      }

      case "flush": {
        const count = flushLeagueCache(normalizedLeague);
        return {
          league: leagueKey,
          success: true,
          count,
        };
      }

      default:
        return {
          league: leagueKey,
          success: false,
          error: "Unknown action",
        };
    }
  } catch (error) {
    return {
      league: leagueKey,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
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

    // Handle "all" - process all enabled leagues
    if (league === "all") {
      const enabledLeagues = getEnabledLeagueKeys();
      const results: LeagueResult[] = [];
      let anyGamesInProgress = false;

      // Process enabled leagues in parallel
      const promises = enabledLeagues.map(leagueKey => 
        processLeagueAction(action, leagueKey, date)
      );
      
      const leagueResults = await Promise.all(promises);
      
      for (const result of leagueResults) {
        results.push(result);
        if (result.gamesInProgress) {
          anyGamesInProgress = true;
        }
      }

      // Update global games in progress flag
      setGamesInProgress(anyGamesInProgress);

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.reduce((sum, r) => sum + (r.count || 0), 0);

      return NextResponse.json({
        success: successCount === results.length,
        action,
        league: "all",
        results,
        totalCount,
        gamesInProgress: anyGamesInProgress,
        message: `${action} completed for ${successCount}/${results.length} enabled leagues (${totalCount} items)`,
      });
    }

    // Single league action
    // Validate league exists in config
    if (!LEAGUES[league.toLowerCase()]) {
      return NextResponse.json(
        { error: `Unknown league: ${league}. Available: ${Object.keys(LEAGUES).join(", ")}` },
        { status: 400 }
      );
    }

    const result = await processLeagueAction(action, league, date);
    
    if (result.gamesInProgress !== undefined) {
      setGamesInProgress(result.gamesInProgress);
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        action,
        league,
        error: result.error,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      league,
      count: result.count,
      gamesInProgress: result.gamesInProgress,
      message: `${action} completed for ${league.toUpperCase()}: ${result.count} items`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/admin/sports/refresh] Error:", message);
    return NextResponse.json(
      { error: message, success: false },
      { status: 500 }
    );
  }
}
