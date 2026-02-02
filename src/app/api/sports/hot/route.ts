import { NextResponse } from "next/server";
import {
  getTeamLogoUrl,
  type Team,
} from "@/lib/sportsdataio/client";
import { usesApiSportsCache, usesSportsGamesCache, ALL_FRONTEND_LEAGUES } from "@/lib/sports/providers";
import { getNflGamesByDateFromCache, getNflTeamMap } from "@/lib/sports/nfl-cache";
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

export async function GET() {
  try {
    const allGames: HotGame[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Fetch games from all enabled leagues
    for (const league of ALL_FRONTEND_LEAGUES) {
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

        // Other leagues use sports_games cache
        if (usesSportsGamesCache(league)) {
          const [cachedGames, teamMap] = await Promise.all([
            getGamesFromCache(league, todayStr),
            getTeamMapFromCache(league),
          ]);

          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const getLogoUrl = (team: { logo_path: string | null; logo_url_original: string | null } | undefined) => {
            if (!team) return null;
            if (team.logo_path) {
              return `${supabaseUrl}/storage/v1/object/public/SPORTS/${team.logo_path}`;
            }
            return team.logo_url_original || null;
          };

          const getAbbr = (name: string | undefined) => {
            if (!name) return "";
            return name.split(" ").map(w => w.charAt(0)).join("").slice(0, 3).toUpperCase();
          };

          for (const game of cachedGames) {
            const statusLower = (game.status || "").toLowerCase();
            const isOver = statusLower.includes("final") || statusLower.includes("finished");
            const isCanceled = statusLower.includes("cancel") || statusLower.includes("postpone");
            
            // Skip completed/canceled games
            if (isOver || isCanceled) continue;

            const homeTeam = game.home_team_id ? teamMap.get(game.home_team_id) : undefined;
            const awayTeam = game.away_team_id ? teamMap.get(game.away_team_id) : undefined;

            const isLive = statusLower.includes("progress") || statusLower.includes("live") ||
                          statusLower.includes("1h") || statusLower.includes("2h");

            const [team1Odds, team2Odds] = generateOdds();
            const activity = generateMockActivity();

            allGames.push({
              id: String(game.api_game_id),
              title: `${awayTeam?.name || "Away"} vs ${homeTeam?.name || "Home"}`,
              league: league.toUpperCase(),
              team1: {
                abbr: getAbbr(awayTeam?.name),
                name: awayTeam?.name || "",
                odds: team1Odds,
                color: "#6366f1",
                logoUrl: getLogoUrl(awayTeam),
              },
              team2: {
                abbr: getAbbr(homeTeam?.name),
                name: homeTeam?.name || "",
                odds: team2Odds,
                color: "#6366f1",
                logoUrl: getLogoUrl(homeTeam),
              },
              startTime: game.start_time || "",
              status: isLive ? "in_progress" : "scheduled",
              isLive,
              ...activity,
            });
          }
          continue; // Skip to next league
        }

        // Fallback: no games for this league (no live API calls)
        console.log(`[/api/sports/hot] No cache source for ${league}, skipping`);
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
