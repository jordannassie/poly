/**
 * GET /api/sports/game
 * Returns a single game by ID with team data.
 * 
 * Query params:
 * - league: "nfl" (required)
 * - gameId: string (required) - The GameKey from SportsDataIO
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
 */

import { NextRequest, NextResponse } from "next/server";
import { getNflTeams, getNflScoresByDate, getTeamLogoUrl, type Score, type Team } from "@/lib/sportsdataio/client";
import { getFromCache, setInCache, getCacheKey } from "@/lib/sportsdataio/cache";

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

function getGameStatus(score: Score): GameDetails["status"] {
  if (score.Canceled) return "canceled";
  if (score.IsOver) return "final";
  if (score.IsInProgress) return "in_progress";
  return "scheduled";
}

function getGameName(score: Score): string {
  if (score.SeasonType === 3) {
    switch (score.Week) {
      case 1: return "Wild Card Round";
      case 2: return "Divisional Round";
      case 3: return "Conference Championship";
      case 4: return "Super Bowl";
      default: return "Playoff Game";
    }
  }
  return `Week ${score.Week}`;
}

function createGameDetails(score: Score, teamMap: Map<string, Team>): GameDetails {
  return {
    gameId: score.GameKey,
    name: getGameName(score),
    startTime: score.Date,
    status: getGameStatus(score),
    homeTeam: normalizeTeam(teamMap.get(score.HomeTeam), score.HomeTeam),
    awayTeam: normalizeTeam(teamMap.get(score.AwayTeam), score.AwayTeam),
    homeScore: score.HomeScore,
    awayScore: score.AwayScore,
    venue: null,
    week: score.Week,
    channel: score.Channel,
    quarter: score.Quarter,
    timeRemaining: score.TimeRemaining,
    possession: score.Possession,
    isPlayoffs: score.SeasonType === 3,
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const league = url.searchParams.get("league")?.toLowerCase();
    const gameId = url.searchParams.get("gameId");

    // Validate params
    if (!league) {
      return NextResponse.json(
        { error: "Missing required parameter: league" },
        { status: 400 }
      );
    }

    if (!gameId) {
      return NextResponse.json(
        { error: "Missing required parameter: gameId" },
        { status: 400 }
      );
    }

    if (league !== "nfl") {
      return NextResponse.json(
        { error: `League ${league} not yet implemented` },
        { status: 501 }
      );
    }

    // Check cache
    const cacheKey = getCacheKey("nfl", "game", gameId);
    const cached = getFromCache<{ game: GameDetails }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Parse gameId to extract date (format: YYYYMMDDAWAYATHOME or similar)
    // GameKey format varies, but we can try to search recent dates
    const teams = await getNflTeams();
    const teamMap = new Map<string, Team>();
    for (const team of teams) {
      teamMap.set(team.Key, team);
    }

    // Search last 7 days and next 14 days for the game
    const today = new Date();
    const dates: string[] = [];
    
    for (let i = -7; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split("T")[0]);
    }

    let foundGame: Score | null = null;

    // Search for the game
    for (const date of dates) {
      try {
        const scores = await getNflScoresByDate(date);
        const match = scores.find((s) => s.GameKey === gameId);
        if (match) {
          foundGame = match;
          break;
        }
      } catch {
        // Continue searching
      }
    }

    if (!foundGame) {
      return NextResponse.json(
        { game: null, error: "Game not found" },
        { status: 404 }
      );
    }

    const gameDetails = createGameDetails(foundGame, teamMap);
    const response = { game: gameDetails };

    // Cache the result
    setInCache(cacheKey, response, CACHE_TTL);

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/game] Error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
