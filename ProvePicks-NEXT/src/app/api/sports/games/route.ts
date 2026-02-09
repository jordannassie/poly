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
import { getTodayIso } from "@/lib/sportsdataio/nflDate";
import { usesApiSportsCache, usesSportsGamesCache, isValidFrontendLeague, ALL_FRONTEND_LEAGUES } from "@/lib/sports/providers";
import { getNflGamesByDateFromCache, getNflTeamMap, transformCachedGameToLegacyFormat } from "@/lib/sports/nfl-cache";
import { getGamesWithTeamsFromCache } from "@/lib/sports/games-cache";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || "nfl";
    const date = url.searchParams.get("date") || getTodayIso();

    // Validate league (includes soccer)
    if (!isValidFrontendLeague(leagueParam)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${ALL_FRONTEND_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    const league = leagueParam;

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Expected: YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // NFL uses API-Sports cache (api_sports_nfl_games table)
    if (usesApiSportsCache(league)) {
      const [cachedGames, teamMap] = await Promise.all([
        getNflGamesByDateFromCache(date),
        getNflTeamMap(),
      ]);

      const gamesWithTeams = cachedGames.map(game => 
        transformCachedGameToLegacyFormat(game, teamMap)
      );

      console.log(`[/api/sports/games] ${league.toUpperCase()} ${date} (nfl-cache): ${gamesWithTeams.length} games`);

      return NextResponse.json({
        league,
        date,
        source: "api-sports-cache",
        count: gamesWithTeams.length,
        games: gamesWithTeams,
      });
    }

    // All other leagues use sports_games cache
    if (usesSportsGamesCache(league)) {
      const gamesWithTeams = await getGamesWithTeamsFromCache(league, date);

      console.log(`[/api/sports/games] ${league.toUpperCase()} ${date} (sports-games-cache): ${gamesWithTeams.length} games`);

      return NextResponse.json({
        league,
        date,
        source: "sports-games-cache",
        count: gamesWithTeams.length,
        games: gamesWithTeams,
        // Friendly message if no games (not an error)
        message: gamesWithTeams.length === 0 
          ? "No games scheduled for this date. Games appear once synced from Admin."
          : undefined,
      });
    }

    // Fallback: return empty array (no live API calls)
    console.log(`[/api/sports/games] ${league.toUpperCase()} - no data source configured`);
    
    return NextResponse.json({
      league,
      date,
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
      date: getTodayIso(),
      source: "error",
      count: 0,
      games: [],
      message: "Games will appear once synced from Admin.",
    });
  }
}
