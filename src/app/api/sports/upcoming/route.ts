/**
 * GET /api/sports/upcoming
 * Returns upcoming games for the next N days.
 * 
 * Query params:
 * - league: "nfl" | "nba" | "mlb" | "nhl" | "soccer" (required)
 * - days: number of days to look ahead (default: 90 for NFL, 30 for others)
 * 
 * Response:
 * {
 *   range: { startDate, endDate },
 *   count: number,
 *   games: [{
 *     gameId, status, startTime,
 *     homeTeam: { teamId, abbreviation, name, logoUrl, primaryColor },
 *     awayTeam: { teamId, abbreviation, name, logoUrl, primaryColor },
 *     homeScore, awayScore, venue
 *   }]
 * }
 * 
 * All leagues use sports_games table (v2 schema).
 */

import { NextRequest, NextResponse } from "next/server";
import { getFromCache, setInCache, getCacheKey } from "@/lib/sportsdataio/cache";
import { isValidFrontendLeague, ALL_FRONTEND_LEAGUES } from "@/lib/sports/providers";
import { getUpcomingGamesWithTeamsFromCache } from "@/lib/sports/games-cache";
import { getLogoUrl } from "@/lib/images/getLogoUrl";

// Cache TTL
const CACHE_TTL_WITH_GAMES = 30 * 60 * 1000; // 30 minutes
const CACHE_TTL_NO_GAMES = 60 * 60 * 1000;   // 60 minutes

interface NormalizedTeam {
  teamId: number;
  abbreviation: string;
  name: string;
  city: string;
  fullName: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

interface NormalizedGame {
  gameId: string;
  status: "scheduled" | "in_progress" | "final" | "postponed" | "canceled";
  startTime: string;
  homeTeam: NormalizedTeam;
  awayTeam: NormalizedTeam;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  channel: string | null;
  week: number;
}

interface UpcomingResponse {
  range: { startDate: string; endDate: string };
  count: number;
  games: NormalizedGame[];
  message?: string;
}

function getDateRange(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }
  
  return dates;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || "nfl";
    const daysParam = url.searchParams.get("days");
    
    // All leagues default to 30 days for faster queries
    // Max 365 days allowed, capped to 200 games for performance
    const defaultDays = 30;
    const maxDays = 365;
    const days = Math.min(Math.max(parseInt(daysParam || String(defaultDays), 10) || defaultDays, 1), maxDays);

    // Validate league
    if (!isValidFrontendLeague(leagueParam)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${ALL_FRONTEND_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    const league = leagueParam;

    // Check cache
    const cacheKey = getCacheKey(league, "upcoming", `${days}`);
    const cached = getFromCache<UpcomingResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Get date range
    const dates = getDateRange(days);
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    // All leagues use unified sports_games cache
    const cachedGames = await getUpcomingGamesWithTeamsFromCache(league, days);

    // Transform to normalized format - use status from games-cache (already derived from status_norm)
    const allGames: NormalizedGame[] = cachedGames.map((game) => ({
      gameId: game.GameKey,
      status: game.Canceled ? "canceled" : game.IsOver ? "final" : game.IsInProgress ? "in_progress" : "scheduled",
      startTime: game.DateTime,
      homeTeam: {
        teamId: game.HomeTeamData?.TeamID || 0,
        abbreviation: game.HomeTeam,
        name: game.HomeTeamData?.Name || game.HomeTeam,
        city: "",
        fullName: game.HomeTeamData?.FullName || game.HomeTeam,
        logoUrl: getLogoUrl(game.HomeTeamData?.WikipediaLogoUrl),
        primaryColor: null,
      },
      awayTeam: {
        teamId: game.AwayTeamData?.TeamID || 0,
        abbreviation: game.AwayTeam,
        name: game.AwayTeamData?.Name || game.AwayTeam,
        city: "",
        fullName: game.AwayTeamData?.FullName || game.AwayTeam,
        logoUrl: getLogoUrl(game.AwayTeamData?.WikipediaLogoUrl),
        primaryColor: null,
      },
      homeScore: game.HomeScore,
      awayScore: game.AwayScore,
      venue: null,
      channel: null,
      week: 0,
    }));

    const response: UpcomingResponse = {
      range: { startDate, endDate },
      count: allGames.length,
      games: allGames,
    };

    const cacheTtl = allGames.length > 0 ? CACHE_TTL_WITH_GAMES : CACHE_TTL_NO_GAMES;
    setInCache(cacheKey, response, cacheTtl);

    console.log(`[/api/sports/upcoming] ${league.toUpperCase()} (sports_games): ${allGames.length} games in next ${days} days`);

    if (allGames.length === 0) {
      return NextResponse.json({
        ...response,
        message: `No upcoming ${league.toUpperCase()} games found. Sync games from Admin panel.`,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/upcoming] Error:", message);
    
    // Return empty response instead of error for frontend
    return NextResponse.json({
      range: { startDate: "", endDate: "" },
      count: 0,
      games: [],
      message: "Games will appear once synced from Admin.",
    });
  }
}
