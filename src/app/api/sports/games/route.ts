/**
 * GET /api/sports/games
 * Returns games/scores for a league and date with team data joined.
 * 
 * Query params:
 * - league: "nfl" | "nba" | "mlb" | "nhl" | "soccer" (required)
 * - date: "YYYY-MM-DD" (optional, defaults to today)
 * 
 * Response includes team names and logos joined from Teams cache.
 * 
 * All leagues use cached Supabase data - no live API calls.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { usesApiSportsCache, usesSportsGamesCache, isValidFrontendLeague, ALL_FRONTEND_LEAGUES } from "@/lib/sports/providers";
import { getNflGamesByDateFromCache, getNflTeamMap, transformCachedGameToLegacyFormat } from "@/lib/sports/nfl-cache";
import { transformCachedGame, getTeamMapFromCache, CachedGame } from "@/lib/sports/games-cache";
import { PAST_DAYS, FUTURE_DAYS } from "@/lib/sports/window";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || "nfl";

    // Validate league (includes soccer)
    if (!isValidFrontendLeague(leagueParam)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${ALL_FRONTEND_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    const league = leagueParam;

    // NFL uses API-Sports cache (api_sports_nfl_games table)
    if (usesApiSportsCache(league)) {
      const [cachedGames, teamMap] = await Promise.all([
        getNflGamesByDateFromCache(new Date().toISOString().split("T")[0]),
        getNflTeamMap(),
      ]);

      const gamesWithTeams = cachedGames.map(game => 
        transformCachedGameToLegacyFormat(game, teamMap)
      );

      console.log(`[/api/sports/games] ${league.toUpperCase()} (nfl-cache windowed): ${gamesWithTeams.length} games`);

      return NextResponse.json({
        league,
        window: { pastDays: PAST_DAYS, futureDays: FUTURE_DAYS },
        source: "api-sports-cache",
        count: gamesWithTeams.length,
        games: gamesWithTeams,
      });
    }

    // All other leagues use sports_games cache
    if (usesSportsGamesCache(league)) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error("[/api/sports/games] Missing Supabase env vars");
        return NextResponse.json({
          league,
          source: "sports-games-cache",
          count: 0,
          games: [],
          message: "Supabase configuration missing.",
        }, { status: 500 });
      }

      const client = createClient(supabaseUrl, supabaseAnonKey);

      const now = new Date();
      const past = new Date(now.getTime() - PAST_DAYS * 24 * 60 * 60 * 1000);
      const future = new Date(now.getTime() + FUTURE_DAYS * 24 * 60 * 60 * 1000);

      const { data, error } = await client
        .from("sports_games")
        .select("*")
        .eq("league", league)
        .gte("starts_at", past.toISOString())
        .lt("starts_at", future.toISOString())
        .order("starts_at", { ascending: true })
        .limit(200);

      if (error) {
        console.error(`[/api/sports/games] ${league.toUpperCase()} query error:`, error.message);
        return NextResponse.json({
          league,
          source: "sports-games-cache",
          count: 0,
          games: [],
          message: "Games will appear once synced from Admin.",
        });
      }

      const teamMap = await getTeamMapFromCache(league);
      const gamesWithTeams = (data as CachedGame[] || []).map((game) =>
        transformCachedGame(game, teamMap)
      );

      console.log(
        `[/api/sports/games] ${league.toUpperCase()} window ${past.toISOString()} -> ${future.toISOString()}: ${gamesWithTeams.length} games`
      );

      return NextResponse.json({
        league,
        window: { pastDays: PAST_DAYS, futureDays: FUTURE_DAYS },
        source: "sports-games-cache",
        count: gamesWithTeams.length,
        games: gamesWithTeams,
        message:
          gamesWithTeams.length === 0
            ? "No games found in the last 7 days or next 30 days."
            : undefined,
      });
    }

    // Fallback: return empty array (no live API calls)
    console.log(`[/api/sports/games] ${league.toUpperCase()} - no data source configured`);
    
    return NextResponse.json({
      league,
      window: { pastDays: PAST_DAYS, futureDays: FUTURE_DAYS },
      source: "none",
      count: 0,
      games: [],
      message: "Games will appear once synced from Admin.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/games] Error:", message);
    
    // Return empty result instead of error for frontend
    return NextResponse.json({
      league: request.url.includes("league=") ? new URL(request.url).searchParams.get("league") : "unknown",
      window: { pastDays: PAST_DAYS, futureDays: FUTURE_DAYS },
      source: "error",
      count: 0,
      games: [],
      message: "Games will appear once synced from Admin.",
    });
  }
}
