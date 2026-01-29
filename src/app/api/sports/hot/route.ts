import { NextResponse } from "next/server";
import {
  getTeams,
  getGamesByDate,
  getTeamLogoUrl,
  getGameId,
  getGameStatus,
  getGameDate,
  SUPPORTED_LEAGUES,
  type Team,
  type League,
} from "@/lib/sportsdataio/client";
import { usesApiSportsCache } from "@/lib/sports/providers";
import { getNflGamesByDateFromCache, getNflTeamMap } from "@/lib/sports/nfl-cache";

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

export async function GET() {
  try {
    const allGames: HotGame[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Fetch games from all enabled leagues
    for (const league of SUPPORTED_LEAGUES) {
      try {
        // NFL uses API-Sports cache from Supabase
        if (usesApiSportsCache(league)) {
          const [cachedGames, teamMap] = await Promise.all([
            getNflGamesByDateFromCache(todayStr),
            getNflTeamMap(),
          ]);

          for (const game of cachedGames) {
            const statusLower = (game.status || "").toLowerCase();
            const isOver = statusLower.includes("final") || statusLower.includes("finished");
            const isCanceled = statusLower.includes("cancel") || statusLower.includes("postpone");
            
            // Skip completed/canceled games
            if (isOver || isCanceled) continue;

            const awayTeam = game.away_team_id ? teamMap.get(game.away_team_id) : undefined;
            const homeTeam = game.home_team_id ? teamMap.get(game.home_team_id) : undefined;
            const isLive = statusLower.includes("progress") || statusLower.includes("live");

            const [team1Odds, team2Odds] = generateOdds();
            const activity = generateMockActivity();

            allGames.push({
              id: String(game.game_id),
              title: `${awayTeam?.name || "Away"} vs ${homeTeam?.name || "Home"}`,
              league: "NFL",
              team1: {
                abbr: awayTeam?.code || "",
                name: awayTeam?.name || "",
                odds: team1Odds,
                color: "#6366f1",
                logoUrl: awayTeam?.logo || null,
              },
              team2: {
                abbr: homeTeam?.code || "",
                name: homeTeam?.name || "",
                odds: team2Odds,
                color: "#6366f1",
                logoUrl: homeTeam?.logo || null,
              },
              startTime: game.game_date || "",
              status: isLive ? "in_progress" : "scheduled",
              isLive,
              ...activity,
            });
          }
          continue; // Skip SportsDataIO for this league
        }

        // Other leagues use SportsDataIO
        // Get teams for logo lookup
        const teams = await getTeams(league);
        const teamMap = new Map<string, Team>();
        teams.forEach((t) => teamMap.set(t.Key, t));

        // Get today's games
        const games = await getGamesByDate(league, todayStr);

        // Convert to HotGame format
        for (const game of games) {
          const status = getGameStatus(game);
          
          // Skip completed/canceled games
          if (status === "final" || status === "canceled") continue;

          const awayTeam = teamMap.get(game.AwayTeam);
          const homeTeam = teamMap.get(game.HomeTeam);

          const [team1Odds, team2Odds] = generateOdds();
          const activity = generateMockActivity();

          allGames.push({
            id: getGameId(game),
            title: `${awayTeam?.Name || game.AwayTeam} vs ${homeTeam?.Name || game.HomeTeam}`,
            league: league.toUpperCase(),
            team1: {
              abbr: game.AwayTeam,
              name: awayTeam?.Name || game.AwayTeam,
              odds: team1Odds,
              color: awayTeam?.PrimaryColor ? `#${awayTeam.PrimaryColor}` : "#6366f1",
              logoUrl: awayTeam ? getTeamLogoUrl(awayTeam) : null,
            },
            team2: {
              abbr: game.HomeTeam,
              name: homeTeam?.Name || game.HomeTeam,
              odds: team2Odds,
              color: homeTeam?.PrimaryColor ? `#${homeTeam.PrimaryColor}` : "#6366f1",
              logoUrl: homeTeam ? getTeamLogoUrl(homeTeam) : null,
            },
            startTime: getGameDate(game),
            status,
            isLive: status === "in_progress",
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
