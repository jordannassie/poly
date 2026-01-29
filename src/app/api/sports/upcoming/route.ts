/**
 * GET /api/sports/upcoming
 * Returns upcoming games for the next N days.
 * 
 * Query params:
 * - league: "nfl" | "nba" | "mlb" | "nhl" (required)
 * - days: number of days to look ahead (default: 7, max: 14)
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
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  getTeams, 
  getGamesByDate, 
  getTeamLogoUrl,
  getGameId,
  SUPPORTED_LEAGUES,
  type Score, 
  type Team,
  type League,
} from "@/lib/sportsdataio/client";
import { getFromCache, setInCache, getCacheKey } from "@/lib/sportsdataio/cache";

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
}

function normalizeTeam(team: Team | undefined, abbr: string): NormalizedTeam {
  if (!team) {
    return {
      teamId: 0,
      abbreviation: abbr,
      name: abbr,
      city: "",
      fullName: abbr,
      logoUrl: null,
      primaryColor: null,
    };
  }
  return {
    teamId: team.TeamID,
    abbreviation: team.Key,
    name: team.Name,
    city: team.City,
    fullName: team.FullName || `${team.City} ${team.Name}`,
    logoUrl: getTeamLogoUrl(team),
    primaryColor: team.PrimaryColor ? `#${team.PrimaryColor}` : null,
  };
}

function normalizeGameStatus(score: Score): NormalizedGame["status"] {
  if (score.Canceled) return "canceled";
  if (score.IsOver) return "final";
  if (score.IsInProgress) return "in_progress";
  return "scheduled";
}

function normalizeGame(score: Score, teamMap: Map<string, Team>): NormalizedGame {
  return {
    gameId: getGameId(score),
    status: normalizeGameStatus(score),
    startTime: score.Date,
    homeTeam: normalizeTeam(teamMap.get(score.HomeTeam), score.HomeTeam),
    awayTeam: normalizeTeam(teamMap.get(score.AwayTeam), score.AwayTeam),
    homeScore: score.HomeScore,
    awayScore: score.AwayScore,
    venue: null, // Could be fetched from Stadium endpoint if needed
    channel: score.Channel,
    week: score.Week || 0,
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
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || "nfl";
    const daysParam = url.searchParams.get("days");
    const days = Math.min(Math.max(parseInt(daysParam || "7", 10) || 7, 1), 14);

    // Validate league
    if (!SUPPORTED_LEAGUES.includes(leagueParam as League)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${SUPPORTED_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    const league = leagueParam as League;

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

    // Fetch teams first for joining
    const teams = await getTeams(league);
    const teamMap = new Map<string, Team>();
    for (const team of teams) {
      teamMap.set(team.Key, team);
    }

    // Fetch scores for each date in parallel
    const scoresPromises = dates.map((date) => 
      getGamesByDate(league, date).catch(() => [] as Score[])
    );
    const scoresArrays = await Promise.all(scoresPromises);

    // Combine and normalize all games
    const allGames: NormalizedGame[] = [];
    for (const scores of scoresArrays) {
      for (const score of scores) {
        allGames.push(normalizeGame(score, teamMap));
      }
    }

    // Sort by start time
    allGames.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const response: UpcomingResponse = {
      range: { startDate, endDate },
      count: allGames.length,
      games: allGames,
    };

    // Cache the result
    const cacheTtl = allGames.length > 0 ? CACHE_TTL_WITH_GAMES : CACHE_TTL_NO_GAMES;
    setInCache(cacheKey, response, cacheTtl);

    console.log(`[/api/sports/upcoming] ${league.toUpperCase()}: ${allGames.length} games in next ${days} days`);

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/upcoming] Error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
