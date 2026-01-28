/**
 * GET /api/sports/featured
 * Returns the featured game for a league.
 * 
 * Logic:
 * - If a game name includes "Super Bowl", return that game.
 * - Otherwise return the next upcoming game.
 * 
 * Query params:
 * - league: "nfl" (required)
 * 
 * Response:
 * {
 *   featured: {
 *     gameId, name, startTime, status,
 *     homeTeam: { name, city, abbreviation, logoUrl, primaryColor },
 *     awayTeam: { name, city, abbreviation, logoUrl, primaryColor },
 *     venue, week, channel
 *   } | null,
 *   reason: "super_bowl" | "next_game" | "no_games"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getNflTeams, getNflScoresByDate, getTeamLogoUrl, type Score, type Team } from "@/lib/sportsdataio/client";
import { getFromCache, setInCache, getCacheKey } from "@/lib/sportsdataio/cache";

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
  isSuperBowl: boolean;
}

interface FeaturedResponse {
  featured: FeaturedGame | null;
  reason: "super_bowl" | "next_game" | "no_games";
}

function normalizeTeam(team: Team | undefined, abbr: string): FeaturedTeam {
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

function getGameStatus(score: Score): FeaturedGame["status"] {
  if (score.Canceled) return "canceled";
  if (score.IsOver) return "final";
  if (score.IsInProgress) return "in_progress";
  return "scheduled";
}

function isSuperBowlGame(score: Score): boolean {
  // Super Bowl is typically SeasonType 3 (Postseason) and Week 4 (Super Bowl week)
  // Also check if it's in February and is a championship game
  const isFinalWeek = score.Week >= 4 && score.SeasonType === 3;
  return isFinalWeek;
}

function getGameName(score: Score, isSuperBowl: boolean): string {
  if (isSuperBowl) {
    return "Super Bowl";
  }
  
  // Playoff games
  if (score.SeasonType === 3) {
    switch (score.Week) {
      case 1: return "Wild Card";
      case 2: return "Divisional Round";
      case 3: return "Conference Championship";
      case 4: return "Super Bowl";
      default: return "Playoff Game";
    }
  }
  
  return `Week ${score.Week}`;
}

function createFeaturedGame(score: Score, teamMap: Map<string, Team>): FeaturedGame {
  const isSuperBowl = isSuperBowlGame(score);
  return {
    gameId: score.GameKey,
    name: getGameName(score, isSuperBowl),
    startTime: score.Date,
    status: getGameStatus(score),
    homeTeam: normalizeTeam(teamMap.get(score.HomeTeam), score.HomeTeam),
    awayTeam: normalizeTeam(teamMap.get(score.AwayTeam), score.AwayTeam),
    homeScore: score.HomeScore,
    awayScore: score.AwayScore,
    venue: null,
    week: score.Week,
    channel: score.Channel,
    isSuperBowl,
  };
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
    const league = url.searchParams.get("league")?.toLowerCase();

    // Validate league
    if (!league) {
      return NextResponse.json(
        { error: "Missing required parameter: league" },
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
    const cacheKey = getCacheKey("nfl", "featured", "main");
    const cached = getFromCache<FeaturedResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch teams for joining
    const teams = await getNflTeams();
    const teamMap = new Map<string, Team>();
    for (const team of teams) {
      teamMap.set(team.Key, team);
    }

    // Fetch next 14 days of games
    const dates = getDateRange(14);
    const allScores: Score[] = [];

    for (const date of dates) {
      try {
        const scores = await getNflScoresByDate(date);
        allScores.push(...scores);
      } catch {
        // Continue if a date fails
      }
    }

    // Filter to upcoming/live games only
    const upcomingGames = allScores.filter(
      (s) => !s.IsOver && !s.Canceled
    );

    // Sort by start time
    upcomingGames.sort((a, b) => 
      new Date(a.Date).getTime() - new Date(b.Date).getTime()
    );

    let response: FeaturedResponse;

    // Look for Super Bowl first
    const superBowlGame = upcomingGames.find((s) => isSuperBowlGame(s));
    
    if (superBowlGame) {
      response = {
        featured: createFeaturedGame(superBowlGame, teamMap),
        reason: "super_bowl",
      };
    } else if (upcomingGames.length > 0) {
      // Return next upcoming game
      response = {
        featured: createFeaturedGame(upcomingGames[0], teamMap),
        reason: "next_game",
      };
    } else {
      // No games found
      response = {
        featured: null,
        reason: "no_games",
      };
    }

    // Cache the result
    const hasUpcoming = response.featured && response.featured.status !== "final";
    const cacheTtl = hasUpcoming ? CACHE_TTL_LIVE : CACHE_TTL_NO_GAMES;
    setInCache(cacheKey, response, cacheTtl);

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/featured] Error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
