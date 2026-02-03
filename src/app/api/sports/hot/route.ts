/**
 * GET /api/sports/hot
 * Returns games for homepage sections:
 * - Hot Right Now: starts_at between now() and now()+24h
 * - Starting Soon: starts_at between now() and now()+7d  
 * - Live: status indicates in-progress
 * 
 * Query params:
 * - view: "hot" | "starting-soon" | "live" (default: "hot")
 * 
 * All data from sports_games table - no external API calls.
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  getHotGamesFromCache, 
  getStartingSoonGamesFromCache, 
  getLiveGamesFromCache,
  getAllTeamMapsFromCache,
  CachedGame
} from "@/lib/sports/games-cache";

export const dynamic = "force-dynamic";

interface HotGame {
  id: string;
  title: string;
  league: string;
  team1: {
    abbr: string;
    name: string;
    odds: number;
    color: string;
    logoUrl: string | null;
  };
  team2: {
    abbr: string;
    name: string;
    odds: number;
    color: string;
    logoUrl: string | null;
  };
  startTime: string;
  status: string;
  isLive: boolean;
  volumeToday: number;
  volume10m: number;
  activeBettors: number;
}

// Generate mock volume/activity data for now
function generateMockActivity() {
  return {
    volumeToday: Math.floor(Math.random() * 5000000) + 500000,
    volume10m: Math.floor(Math.random() * 100000) + 10000,
    activeBettors: Math.floor(Math.random() * 500) + 50,
  };
}

// Generate simulated odds (50/50 with some variance)
function generateOdds(): [number, number] {
  const team1Odds = Math.floor(Math.random() * 40) + 30; // 30-70%
  return [team1Odds, 100 - team1Odds];
}

// Generate abbreviation from team name
function getAbbr(name: string): string {
  if (!name) return "";
  const words = name.split(" ");
  if (words.length > 1) {
    return words[words.length - 1].slice(0, 3).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

// Check if a game is live based on status
function isGameLive(status: string): boolean {
  const statusLower = (status || "").toLowerCase();
  const livePatterns = [
    "in progress", "inprogress", "live",
    "1h", "2h", "ht",
    "q1", "q2", "q3", "q4", "ot",
    "p1", "p2", "p3",
  ];
  return livePatterns.some(pattern => statusLower.includes(pattern));
}

// Transform CachedGame to HotGame
function transformGame(
  game: CachedGame, 
  teamMap: Map<string, { id: number; name: string; logo: string | null; slug: string }>
): HotGame {
  const league = game.league.toLowerCase();
  const homeTeamKey = `${league}:${game.home_team.toLowerCase()}`;
  const awayTeamKey = `${league}:${game.away_team.toLowerCase()}`;
  
  const homeTeam = teamMap.get(homeTeamKey);
  const awayTeam = teamMap.get(awayTeamKey);
  
  const isLive = isGameLive(game.status);
  const [team1Odds, team2Odds] = generateOdds();
  const activity = generateMockActivity();

  return {
    id: game.external_game_id,
    title: `${game.away_team} vs ${game.home_team}`,
    league: league.toUpperCase(),
    team1: {
      abbr: getAbbr(game.away_team),
      name: game.away_team,
      odds: team1Odds,
      color: "#6366f1",
      logoUrl: awayTeam?.logo || null,
    },
    team2: {
      abbr: getAbbr(game.home_team),
      name: game.home_team,
      odds: team2Odds,
      color: "#6366f1",
      logoUrl: homeTeam?.logo || null,
    },
    startTime: game.starts_at,
    status: isLive ? "in_progress" : "scheduled",
    isLive,
    ...activity,
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const view = url.searchParams.get("view") || "hot";

    // Fetch games based on view
    let rawGames: CachedGame[];
    
    switch (view) {
      case "live":
        rawGames = await getLiveGamesFromCache();
        break;
      case "starting-soon":
        rawGames = await getStartingSoonGamesFromCache();
        break;
      case "hot":
      default:
        rawGames = await getHotGamesFromCache();
        break;
    }

    // Get team data for logos
    const teamMap = await getAllTeamMapsFromCache();

    // Filter out completed/canceled games
    const filteredGames = rawGames.filter(game => {
      const statusLower = (game.status || "").toLowerCase();
      const isOver = statusLower.includes("final") || statusLower.includes("finished") || statusLower === "ft";
      const isCanceled = statusLower.includes("cancel") || statusLower.includes("postpone");
      return !isOver && !isCanceled;
    });

    // Transform to HotGame format
    const games: HotGame[] = filteredGames.map(game => transformGame(game, teamMap));

    // Sort: Live games first, then by start time
    games.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    // Limit results
    const limit = view === "live" ? 20 : 12;
    const limitedGames = games.slice(0, limit);

    console.log(`[/api/sports/hot] view=${view} total=${rawGames.length} filtered=${games.length} returned=${limitedGames.length}`);

    return NextResponse.json({
      games: limitedGames,
      count: games.length,
      view,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Hot games API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hot games", games: [], count: 0 },
      { status: 500 }
    );
  }
}
