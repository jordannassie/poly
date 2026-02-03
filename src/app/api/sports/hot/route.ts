/**
 * GET /api/sports/hot
 * Returns hot/live games from all leagues.
 * 
 * All leagues use sports_games table (v2 schema).
 */

import { NextResponse } from "next/server";
import { ALL_FRONTEND_LEAGUES } from "@/lib/sports/providers";
import { getGamesFromCache, getTeamMapFromCache } from "@/lib/sports/games-cache";

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

export async function GET() {
  try {
    const allGames: HotGame[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Fetch games from all leagues using unified sports_games table
    for (const league of ALL_FRONTEND_LEAGUES) {
      try {
        const [cachedGames, teamMap] = await Promise.all([
          getGamesFromCache(league, todayStr),
          getTeamMapFromCache(league),
        ]);

        for (const game of cachedGames) {
          const statusLower = (game.status || "").toLowerCase();
          const isOver = statusLower.includes("final") || statusLower.includes("finished");
          const isCanceled = statusLower.includes("cancel") || statusLower.includes("postpone");
          
          // Skip completed/canceled games
          if (isOver || isCanceled) continue;

          // Look up team data by name
          const homeTeam = teamMap.get(game.home_team.toLowerCase());
          const awayTeam = teamMap.get(game.away_team.toLowerCase());

          const isLive = statusLower.includes("progress") || statusLower.includes("live") ||
                        statusLower.includes("1h") || statusLower.includes("2h") ||
                        statusLower.includes("q1") || statusLower.includes("q2") ||
                        statusLower.includes("q3") || statusLower.includes("q4");

          const [team1Odds, team2Odds] = generateOdds();
          const activity = generateMockActivity();

          allGames.push({
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
          });
        }
      } catch (error) {
        console.error(`Failed to fetch ${league} games:`, error);
        // Continue with other leagues
      }
    }

    // Sort: Live games first, then by start time
    allGames.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    // Return top 12 games
    return NextResponse.json({
      games: allGames.slice(0, 12),
      count: allGames.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Hot games API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hot games", games: [] },
      { status: 500 }
    );
  }
}
