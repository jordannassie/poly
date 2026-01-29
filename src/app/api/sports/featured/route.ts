/**
 * GET /api/sports/featured
 * Returns the featured game for a league.
 * 
 * Logic:
 * - NFL: If a game name includes "Super Bowl", return that game. Otherwise return the next upcoming.
 * - Other leagues: Return the next upcoming game.
 * 
 * Query params:
 * - league: "nfl" | "nba" | "mlb" | "nhl" (required)
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
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  getTeams, 
  getGamesByDate, 
  getTeamLogoUrl,
  getGameId,
  getGameStatus,
  getAwayScore,
  getHomeScore,
  getGameDate,
  SUPPORTED_LEAGUES,
  type Score, 
  type Team,
  type League,
} from "@/lib/sportsdataio/client";
import { getFromCache, setInCache, getCacheKey } from "@/lib/sportsdataio/cache";
import { usesApiSportsCache } from "@/lib/sports/providers";
import { getNflGamesFromCache, getNflTeamMap, type CachedNflGame, type CachedNflTeam } from "@/lib/sports/nfl-cache";

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

function isChampionshipGame(score: Score, league: string): boolean {
  // NFL: Super Bowl is SeasonType 3 and Week 4
  if (league === "nfl") {
    return (score.Week || 0) >= 4 && score.SeasonType === 3;
  }
  // Other leagues: no special championship detection for now
  return false;
}

function getGameName(score: Score, league: string, isChampionship: boolean): string {
  if (league === "nfl") {
    if (isChampionship) return "Super Bowl";
    if (score.SeasonType === 3) {
      switch (score.Week) {
        case 1: return "Wild Card";
        case 2: return "Divisional Round";
        case 3: return "Conference Championship";
        case 4: return "Super Bowl";
        default: return "Playoff Game";
      }
    }
    return `Week ${score.Week || 0}`;
  }
  
  // Generic naming for other leagues
  return score.Week ? `Week ${score.Week}` : "Regular Season";
}

function createFeaturedGame(score: Score, teamMap: Map<string, Team>, league: string): FeaturedGame {
  const isChampionship = isChampionshipGame(score, league);
  return {
    gameId: getGameId(score),
    name: getGameName(score, league, isChampionship),
    startTime: getGameDate(score),
    status: getGameStatus(score),
    homeTeam: normalizeTeam(teamMap.get(score.HomeTeam), score.HomeTeam),
    awayTeam: normalizeTeam(teamMap.get(score.AwayTeam), score.AwayTeam),
    homeScore: getHomeScore(score),
    awayScore: getAwayScore(score),
    venue: null,
    week: score.Week || 0,
    channel: score.Channel || null,
    isChampionship,
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

    // Validate league
    if (!SUPPORTED_LEAGUES.includes(leagueParam as League)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${SUPPORTED_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    const league = leagueParam as League;

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

    // Other leagues use SportsDataIO
    // Fetch teams for joining
    const teams = await getTeams(league);
    const teamMap = new Map<string, Team>();
    for (const team of teams) {
      teamMap.set(team.Key, team);
    }

    // Fetch next 14 days of games
    const dates = getDateRange(14);
    const allScores: Score[] = [];

    for (const date of dates) {
      try {
        const scores = await getGamesByDate(league, date);
        allScores.push(...scores);
      } catch {
        // Continue if a date fails
      }
    }

    // Filter to upcoming/live games only
    const upcomingGames = allScores.filter((s) => {
      const status = getGameStatus(s);
      return status === "scheduled" || status === "in_progress";
    });

    // Sort by start time
    upcomingGames.sort((a, b) => 
      new Date(getGameDate(a)).getTime() - new Date(getGameDate(b)).getTime()
    );

    let response: FeaturedResponse;

    // Look for championship game first (NFL only for now)
    const championshipGame = upcomingGames.find((s) => isChampionshipGame(s, league));
    
    if (championshipGame) {
      response = {
        featured: createFeaturedGame(championshipGame, teamMap, league),
        reason: "championship",
      };
    } else if (upcomingGames.length > 0) {
      // Return next upcoming game
      response = {
        featured: createFeaturedGame(upcomingGames[0], teamMap, league),
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

    console.log(`[/api/sports/featured] ${league.toUpperCase()}: ${response.reason}`);

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
