/**
 * GET /api/sports/featured
 * Returns the featured game for a league.
 * 
 * Logic:
 * - NFL: If a game name includes "Super Bowl", return that game. Otherwise return the next upcoming.
 * - Other leagues: Return the next upcoming game.
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
 * All leagues use cached Supabase data - no live API calls.
 */

import { NextRequest, NextResponse } from "next/server";
import { getFromCache, setInCache, getCacheKey } from "@/lib/sportsdataio/cache";
import { usesApiSportsCache, usesSportsGamesCache, isValidFrontendLeague, ALL_FRONTEND_LEAGUES } from "@/lib/sports/providers";
import { getNflGamesFromCache, getNflTeamMap, type CachedNflGame, type CachedNflTeam } from "@/lib/sports/nfl-cache";
import { getUpcomingGamesFromCache, getTeamMapFromCache, transformCachedGame } from "@/lib/sports/games-cache";

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

// Helper to create featured game from cached NFL data
function createCachedFeaturedGame(
  game: CachedNflGame,
  teamMap: Map<number, CachedNflTeam>
): FeaturedGame {
  const homeTeam = game.home_team_id ? teamMap.get(game.home_team_id) : undefined;
  const awayTeam = game.away_team_id ? teamMap.get(game.away_team_id) : undefined;
  const statusLower = (game.status || "").toLowerCase();
  const isOver = statusLower.includes("final") || statusLower.includes("finished");
  const isInProgress = statusLower.includes("progress") || statusLower.includes("live");

  return {
    gameId: String(game.game_id),
    name: "Regular Season", // API-Sports doesn't provide week/season type easily
    startTime: game.game_date || "",
    status: isOver ? "final" : isInProgress ? "in_progress" : "scheduled",
    homeTeam: {
      teamId: homeTeam?.team_id || 0,
      name: homeTeam?.name || "",
      city: homeTeam?.city || "",
      abbreviation: homeTeam?.code || "",
      fullName: homeTeam ? (homeTeam.city ? `${homeTeam.city} ${homeTeam.name}` : homeTeam.name) : "",
      logoUrl: homeTeam?.logo || null,
      primaryColor: null,
    },
    awayTeam: {
      teamId: awayTeam?.team_id || 0,
      name: awayTeam?.name || "",
      city: awayTeam?.city || "",
      abbreviation: awayTeam?.code || "",
      fullName: awayTeam ? (awayTeam.city ? `${awayTeam.city} ${awayTeam.name}` : awayTeam.name) : "",
      logoUrl: awayTeam?.logo || null,
      primaryColor: null,
    },
    homeScore: game.home_score,
    awayScore: game.away_score,
    venue: null,
    week: 0,
    channel: null,
    isChampionship: false,
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || "nfl";

    // Validate league (includes soccer)
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

    // NFL uses API-Sports cache from Supabase
    if (usesApiSportsCache(league)) {
      const dates = getDateRange(14);
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      const [cachedGames, teamMap] = await Promise.all([
        getNflGamesFromCache(startDate, endDate),
        getNflTeamMap(),
      ]);

      // Filter to upcoming/live games only
      const upcomingGames = cachedGames.filter((g) => {
        const statusLower = (g.status || "").toLowerCase();
        const isOver = statusLower.includes("final") || statusLower.includes("finished");
        return !isOver;
      });

      // Sort by start time
      upcomingGames.sort((a, b) => 
        new Date(a.game_date || 0).getTime() - new Date(b.game_date || 0).getTime()
      );

      let response: FeaturedResponse;

      if (upcomingGames.length > 0) {
        response = {
          featured: createCachedFeaturedGame(upcomingGames[0], teamMap),
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

      console.log(`[/api/sports/featured] ${league.toUpperCase()} (cache): ${response.reason}`);

      return NextResponse.json(response);
    }

    // All other leagues use sports_games cache
    if (usesSportsGamesCache(league)) {
      const [cachedGames, teamMap] = await Promise.all([
        getUpcomingGamesFromCache(league, 14),
        getTeamMapFromCache(league),
      ]);

      // Filter to upcoming/live games only
      const upcomingGames = cachedGames.filter((g) => {
        const statusLower = (g.status || "").toLowerCase();
        const isOver = statusLower.includes("final") || statusLower.includes("finished");
        return !isOver;
      });

      // Sort by start time
      upcomingGames.sort((a, b) => 
        new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime()
      );

      let response: FeaturedResponse;

      if (upcomingGames.length > 0) {
        const firstGame = transformCachedGame(upcomingGames[0], teamMap);
        response = {
          featured: {
            gameId: firstGame.GameKey,
            name: `${firstGame.AwayTeamData?.Name || "Away"} @ ${firstGame.HomeTeamData?.Name || "Home"}`,
            startTime: firstGame.DateTime,
            status: firstGame.IsOver ? "final" : firstGame.IsInProgress ? "in_progress" : "scheduled",
            homeTeam: {
              teamId: firstGame.HomeTeamData?.TeamID || 0,
              name: firstGame.HomeTeamData?.Name || "",
              city: "",
              abbreviation: firstGame.HomeTeam,
              fullName: firstGame.HomeTeamData?.FullName || "",
              logoUrl: firstGame.HomeTeamData?.WikipediaLogoUrl || null,
              primaryColor: null,
            },
            awayTeam: {
              teamId: firstGame.AwayTeamData?.TeamID || 0,
              name: firstGame.AwayTeamData?.Name || "",
              city: "",
              abbreviation: firstGame.AwayTeam,
              fullName: firstGame.AwayTeamData?.FullName || "",
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

      console.log(`[/api/sports/featured] ${league.toUpperCase()} (cache): ${response.reason}`);

      return NextResponse.json(response);
    }

    // Fallback: no data source
    const response: FeaturedResponse = {
      featured: null,
      reason: "no_games",
    };

    console.log(`[/api/sports/featured] ${league.toUpperCase()}: no data source`);

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
