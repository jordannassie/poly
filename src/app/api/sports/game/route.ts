/**
 * GET /api/sports/game
 * Returns a single game by ID with team data.
 * 
 * Query params:
 * - league: "nfl" | "nba" | "mlb" | "nhl" | "soccer" (required)
 * - gameId: string (required) - The game ID
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
 * All leagues use cached Supabase data - no live API calls.
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  getTeamLogoUrl,
  type Team,
} from "@/lib/sportsdataio/client";
import { getFromCache, setInCache, getCacheKey } from "@/lib/sportsdataio/cache";
import { isValidFrontendLeague, ALL_FRONTEND_LEAGUES, usesApiSportsCache, usesSportsGamesCache } from "@/lib/sports/providers";
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
  quarter: string | null;
  timeRemaining: string | null;
  possession: string | null;
  isPlayoffs: boolean;
}

function normalizeTeam(team: Team | undefined, abbr: string): GameTeam {
  if (!team) {
    return {
      teamId: 0,
      name: abbr,
      city: "",
      abbreviation: abbr,
      fullName: abbr,
      logoUrl: null,
      primaryColor: null,
    };
  }
  return {
    teamId: team.TeamID,
    name: team.Name,
    city: team.City,
    abbreviation: team.Key,
    fullName: team.FullName || `${team.City} ${team.Name}`,
    logoUrl: getTeamLogoUrl(team),
    primaryColor: team.PrimaryColor ? `#${team.PrimaryColor}` : null,
  };
}

function getGameName(score: Score, league: string): string {
  // NFL-specific playoff naming
  if (league === "nfl" && score.SeasonType === 3) {
    switch (score.Week) {
      case 1: return "Wild Card Round";
      case 2: return "Divisional Round";
      case 3: return "Conference Championship";
      case 4: return "Super Bowl";
      default: return "Playoff Game";
    }
  }
  
  // Generic week/game naming
  if (score.Week) {
    return `Week ${score.Week}`;
  }
  
  return "Regular Season";
}

function createGameDetails(score: Score, teamMap: Map<string, Team>, league: string): GameDetails {
  return {
    gameId: getGameId(score),
    name: getGameName(score, league),
    startTime: getGameDate(score),
    status: getGameStatus(score),
    homeTeam: normalizeTeam(teamMap.get(score.HomeTeam), score.HomeTeam),
    awayTeam: normalizeTeam(teamMap.get(score.AwayTeam), score.AwayTeam),
    homeScore: getHomeScore(score),
    awayScore: getAwayScore(score),
    venue: null,
    week: score.Week || 0,
    channel: score.Channel || null,
    quarter: score.Quarter || null,
    timeRemaining: score.TimeRemaining || null,
    possession: score.Possession || null,
    isPlayoffs: score.SeasonType === 3,
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || "nfl";
    const gameId = url.searchParams.get("gameId");

    // Validate params (includes soccer)
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

    // Use sports_games cache for all leagues (except NFL which uses api_sports_nfl_games)
    if (usesSportsGamesCache(league) || usesApiSportsCache(league)) {
      const numericGameId = parseInt(gameId, 10);
      
      if (isNaN(numericGameId)) {
        return NextResponse.json(
          { game: null, error: "Invalid game ID" },
          { status: 400 }
        );
      }

      const [cachedGame, teamMap] = await Promise.all([
        getGameFromCache(league, numericGameId),
        getTeamMapFromCache(league),
      ]);

      if (!cachedGame) {
        return NextResponse.json(
          { game: null, message: "Game not found or not yet synced" },
          { status: 404 }
        );
      }

      const homeTeam = cachedGame.home_team_id ? teamMap.get(cachedGame.home_team_id) : null;
      const awayTeam = cachedGame.away_team_id ? teamMap.get(cachedGame.away_team_id) : null;

      const statusLower = (cachedGame.status || "").toLowerCase();
      const isOver = statusLower.includes("final") || statusLower.includes("finished");
      const isInProgress = statusLower.includes("progress") || statusLower.includes("live");
      const isCanceled = statusLower.includes("cancel") || statusLower.includes("postpone");

      const getAbbr = (name: string | undefined) => {
        if (!name) return "";
        return name.split(" ").map(w => w.charAt(0)).join("").slice(0, 3).toUpperCase();
      };

      const getLogoUrl = (team: { logo_path: string | null; logo_url_original: string | null } | null) => {
        if (!team) return null;
        if (team.logo_path) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          return `${supabaseUrl}/storage/v1/object/public/SPORTS/${team.logo_path}`;
        }
        return team.logo_url_original || null;
      };

      const gameDetails: GameDetails = {
        gameId: String(cachedGame.api_game_id),
        name: `${awayTeam?.name || "Away"} @ ${homeTeam?.name || "Home"}`,
        startTime: cachedGame.start_time || "",
        status: isCanceled ? "canceled" : isOver ? "final" : isInProgress ? "in_progress" : "scheduled",
        homeTeam: {
          teamId: cachedGame.home_team_id || 0,
          name: homeTeam?.name || "",
          city: "",
          abbreviation: getAbbr(homeTeam?.name),
          fullName: homeTeam?.name || "",
          logoUrl: getLogoUrl(homeTeam),
          primaryColor: null,
        },
        awayTeam: {
          teamId: cachedGame.away_team_id || 0,
          name: awayTeam?.name || "",
          city: "",
          abbreviation: getAbbr(awayTeam?.name),
          fullName: awayTeam?.name || "",
          logoUrl: getLogoUrl(awayTeam),
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

      console.log(`[/api/sports/game] ${league.toUpperCase()} game ${gameId} found (cache)`);

      return NextResponse.json(response);
    }

    // Fallback: game not found
    return NextResponse.json(
      { game: null, message: "Game not found or league not configured" },
      { status: 404 }
    );
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
