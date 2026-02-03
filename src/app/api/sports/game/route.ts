/**
 * GET /api/sports/game
 * Returns a single game by ID with team data.
 * 
 * Query params:
 * - league: "nfl" | "nba" | "mlb" | "nhl" | "soccer" (required)
 * - gameId: string (required) - The external game ID
 * 
 * Response:
 * {
 *   game: {
 *     gameId, name, startTime, status,
 *     homeTeam: { name, city, abbreviation, logoUrl, primaryColor },
 *     awayTeam: { name, city, abbreviation, logoUrl, primaryColor },
 *     homeScore, awayScore, venue, week, channel
 *   } | null
 * }
 * 
 * All leagues use sports_games table (v2 schema).
 */

import { NextRequest, NextResponse } from "next/server";
import { getFromCache, setInCache, getCacheKey } from "@/lib/sportsdataio/cache";
import { isValidFrontendLeague, ALL_FRONTEND_LEAGUES } from "@/lib/sports/providers";
import { getGameFromCache, getTeamMapFromCache } from "@/lib/sports/games-cache";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface GameTeam {
  teamId: number;
  name: string;
  city: string;
  abbreviation: string;
  fullName: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

interface GameDetails {
  gameId: string;
  name: string;
  startTime: string;
  status: "scheduled" | "in_progress" | "final" | "postponed" | "canceled";
  homeTeam: GameTeam;
  awayTeam: GameTeam;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  week: number;
  channel: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || "nfl";
    const gameId = url.searchParams.get("gameId");

    // Validate params
    if (!isValidFrontendLeague(leagueParam)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${ALL_FRONTEND_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!gameId) {
      return NextResponse.json(
        { error: "Missing required parameter: gameId" },
        { status: 400 }
      );
    }

    const league = leagueParam;

    // Check in-memory cache
    const cacheKey = getCacheKey(league, "game", gameId);
    const cached = getFromCache<{ game: GameDetails }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch game from sports_games table (gameId is now external_game_id as string)
    const [cachedGame, teamMap] = await Promise.all([
      getGameFromCache(league, gameId),
      getTeamMapFromCache(league),
    ]);

    if (!cachedGame) {
      return NextResponse.json(
        { game: null, message: "Game not found or not yet synced" },
        { status: 404 }
      );
    }

    // Look up team data by name
    const homeTeam = teamMap.get(cachedGame.home_team.toLowerCase());
    const awayTeam = teamMap.get(cachedGame.away_team.toLowerCase());

    const statusLower = (cachedGame.status || "").toLowerCase();
    const isOver = statusLower.includes("final") || statusLower.includes("finished");
    const isInProgress = statusLower.includes("progress") || statusLower.includes("live");
    const isCanceled = statusLower.includes("cancel") || statusLower.includes("postpone");

    const getAbbr = (name: string) => {
      if (!name) return "";
      const words = name.split(" ");
      if (words.length > 1) {
        return words[words.length - 1].slice(0, 3).toUpperCase();
      }
      return name.slice(0, 3).toUpperCase();
    };

    const gameDetails: GameDetails = {
      gameId: cachedGame.external_game_id,
      name: `${cachedGame.away_team} @ ${cachedGame.home_team}`,
      startTime: cachedGame.starts_at,
      status: isCanceled ? "canceled" : isOver ? "final" : isInProgress ? "in_progress" : "scheduled",
      homeTeam: {
        teamId: homeTeam?.id || 0,
        name: cachedGame.home_team,
        city: "",
        abbreviation: getAbbr(cachedGame.home_team),
        fullName: cachedGame.home_team,
        logoUrl: homeTeam?.logo || null,
        primaryColor: null,
      },
      awayTeam: {
        teamId: awayTeam?.id || 0,
        name: cachedGame.away_team,
        city: "",
        abbreviation: getAbbr(cachedGame.away_team),
        fullName: cachedGame.away_team,
        logoUrl: awayTeam?.logo || null,
        primaryColor: null,
      },
      homeScore: cachedGame.home_score,
      awayScore: cachedGame.away_score,
      venue: null,
      week: 0,
      channel: null,
    };

    const response = { game: gameDetails };
    setInCache(cacheKey, response, CACHE_TTL);

    console.log(`[/api/sports/game] ${league.toUpperCase()} game ${gameId} found`);

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/game] Error:", message);
    
    // Return null game instead of error for frontend
    return NextResponse.json({
      game: null,
      message: "Game data unavailable",
    });
  }
}
