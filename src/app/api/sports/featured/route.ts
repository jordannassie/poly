/**
 * GET /api/sports/featured
 * Returns the featured game for a league.
 * 
 * Logic:
 * - Returns the next upcoming game for the league.
 * 
 * Query params:
 * - league: "nfl" | "nba" | "mlb" | "nhl" | "soccer" (required)
 * 
 * Response:
 * {
 *   featured: {
 *     gameId, name, startTime, status,
 *     homeTeam: { name, city, abbreviation, logoUrl, primaryColor },
 *     awayTeam: { name, city, abbreviation, logoUrl, primaryColor },
 *     venue, week, channel
 *   } | null,
 *   reason: "championship" | "next_game" | "no_games"
 * }
 * 
 * All leagues use sports_games table (v2 schema).
 */

import { NextRequest, NextResponse } from "next/server";
import { getFromCache, setInCache, getCacheKey } from "@/lib/sportsdataio/cache";
import { isValidFrontendLeague, ALL_FRONTEND_LEAGUES } from "@/lib/sports/providers";
import { getUpcomingGamesWithTeamsFromCache } from "@/lib/sports/games-cache";

// Cache TTL
const CACHE_TTL_LIVE = 5 * 60 * 1000;       // 5 minutes for live/upcoming
const CACHE_TTL_NO_GAMES = 30 * 60 * 1000;  // 30 minutes when no games

interface FeaturedTeam {
  teamId: number;
  name: string;
  city: string;
  abbreviation: string;
  fullName: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

interface FeaturedGame {
  gameId: string;
  name: string;
  startTime: string;
  status: "scheduled" | "in_progress" | "final" | "postponed" | "canceled";
  homeTeam: FeaturedTeam;
  awayTeam: FeaturedTeam;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  week: number;
  channel: string | null;
  isChampionship: boolean;
}

interface FeaturedResponse {
  featured: FeaturedGame | null;
  reason: "championship" | "next_game" | "no_games";
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || "nfl";

    // Validate league
    if (!isValidFrontendLeague(leagueParam)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${ALL_FRONTEND_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    const league = leagueParam;

    // Check cache
    const cacheKey = getCacheKey(league, "featured", "main");
    const cached = getFromCache<FeaturedResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Get upcoming games from sports_games table
    const cachedGames = await getUpcomingGamesWithTeamsFromCache(league, 14);

    // Filter to upcoming/live games only
    const upcomingGames = cachedGames.filter((g) => !g.IsOver);

    let response: FeaturedResponse;

    if (upcomingGames.length > 0) {
      const firstGame = upcomingGames[0];
      response = {
        featured: {
          gameId: firstGame.GameKey,
          name: `${firstGame.AwayTeamData?.Name || "Away"} @ ${firstGame.HomeTeamData?.Name || "Home"}`,
          startTime: firstGame.DateTime,
          status: firstGame.IsOver ? "final" : firstGame.IsInProgress ? "in_progress" : "scheduled",
          homeTeam: {
            teamId: firstGame.HomeTeamData?.TeamID || 0,
            name: firstGame.HomeTeamData?.Name || firstGame.HomeTeam,
            city: "",
            abbreviation: firstGame.HomeTeam,
            fullName: firstGame.HomeTeamData?.FullName || firstGame.HomeTeam,
            logoUrl: firstGame.HomeTeamData?.WikipediaLogoUrl || null,
            primaryColor: null,
          },
          awayTeam: {
            teamId: firstGame.AwayTeamData?.TeamID || 0,
            name: firstGame.AwayTeamData?.Name || firstGame.AwayTeam,
            city: "",
            abbreviation: firstGame.AwayTeam,
            fullName: firstGame.AwayTeamData?.FullName || firstGame.AwayTeam,
            logoUrl: firstGame.AwayTeamData?.WikipediaLogoUrl || null,
            primaryColor: null,
          },
          homeScore: firstGame.HomeScore,
          awayScore: firstGame.AwayScore,
          venue: null,
          week: 0,
          channel: null,
          isChampionship: false,
        },
        reason: "next_game",
      };
    } else {
      response = {
        featured: null,
        reason: "no_games",
      };
    }

    const hasUpcoming = response.featured && response.featured.status !== "final";
    const cacheTtl = hasUpcoming ? CACHE_TTL_LIVE : CACHE_TTL_NO_GAMES;
    setInCache(cacheKey, response, cacheTtl);

    console.log(`[/api/sports/featured] ${league.toUpperCase()} (sports_games): ${response.reason}`);

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/featured] Error:", message);
    
    // Return no_games instead of error for frontend
    return NextResponse.json({
      featured: null,
      reason: "no_games",
    });
  }
}
