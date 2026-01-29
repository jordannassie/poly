/**
 * POST /api/admin/markets/import-today
 * 
 * Imports today's games from cache into public.markets table.
 * Does NOT make new SportsDataIO API calls - reads from existing cache only.
 * 
 * Cache priority:
 * 1. Try in-memory cache (fast but lost on serverless cold start)
 * 2. Fallback to Supabase persistent cache (reliable on serverless)
 * 
 * Query params:
 * - league: NFL|NBA|MLB|NHL (required)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient, logSystemEvent } from "@/lib/supabase/admin";
import { getFromCache, getCacheKey } from "@/lib/sportsdataio/cache";
import { getFromPersistentCache } from "@/lib/sportsdataio/persistCache";
import { getTodayIso } from "@/lib/sportsdataio/nflDate";
import type { Score } from "@/lib/sportsdataio/client";
import { getGameStatus, getGameId, getGameDate } from "@/lib/sportsdataio/client";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";

function isAuthorized(): boolean {
  if (!ADMIN_TOKEN) return false;
  
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  return adminCookie?.value === ADMIN_TOKEN;
}

// Generate a stable slug for a game
function generateSlug(league: string, awayTeam: string, homeTeam: string, dateStr: string): string {
  const date = new Date(dateStr);
  const dateOnly = date.toISOString().split("T")[0];
  return `${league.toLowerCase()}-${awayTeam.toLowerCase()}-${homeTeam.toLowerCase()}-${dateOnly}`;
}

// Map cache game status to our market game_status
function mapGameStatus(score: Score): "scheduled" | "live" | "final" {
  const status = getGameStatus(score);
  if (status === "in_progress") return "live";
  if (status === "final") return "final";
  return "scheduled";
}

// Map cache game status to market_status
function mapMarketStatus(score: Score): "open" | "settled" {
  const status = getGameStatus(score);
  if (status === "final" || status === "canceled" || status === "postponed") return "settled";
  return "open";
}

// Determine final outcome from score
function getFinalOutcome(score: Score): string | null {
  const status = getGameStatus(score);
  if (status !== "final") return null;
  
  const homeScore = score.HomeScore ?? score.HomeTeamScore ?? 0;
  const awayScore = score.AwayScore ?? score.AwayTeamScore ?? 0;
  
  if (homeScore > awayScore) return "HOME";
  if (awayScore > homeScore) return "AWAY";
  return "DRAW";
}

export async function POST(request: NextRequest) {
  // Check admin auth
  if (!isAuthorized()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check service role key
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Admin service key not configured" },
      { status: 500 }
    );
  }

  const client = getAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: "Failed to initialize admin client" },
      { status: 500 }
    );
  }

  // Get league from query params
  const { searchParams } = request.nextUrl;
  const league = searchParams.get("league")?.toUpperCase();

  if (!league || !["NFL", "NBA", "MLB", "NHL"].includes(league)) {
    return NextResponse.json(
      { error: "Invalid or missing league. Use: NFL, NBA, MLB, NHL" },
      { status: 400 }
    );
  }

  try {
    const todayIso = getTodayIso();
    let games: Score[] | null = null;
    let cacheSource: "memory" | "supabase" = "memory";
    
    // 1. Try in-memory cache first
    const memoryCacheKey = getCacheKey(league.toLowerCase(), "scores", todayIso);
    const cachedGames = getFromCache<Score[]>(memoryCacheKey);
    
    if (cachedGames && cachedGames.length > 0) {
      games = cachedGames;
      cacheSource = "memory";
    } else {
      // 2. Fallback to Supabase persistent cache
      const persistentResult = await getFromPersistentCache<Score[]>({
        league: league.toLowerCase(),
        endpoint: "scores",
        date: todayIso,
      });
      
      if (persistentResult.data && persistentResult.data.length > 0) {
        games = persistentResult.data;
        cacheSource = "supabase";
      }
    }

    // No games found in any cache
    if (!games || games.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No cached games found for ${league} on ${todayIso}. Please warm the cache first via SportsDataIO Admin.`,
        league,
        date: todayIso,
        imported: 0,
        cacheSource: null,
      }, { status: 404 });
    }

    // Prepare market records for upsert
    const markets = games.map((game) => {
      const gameIdRaw = getGameId(game);
      const sportsdataGameId = /^\d+$/.test(gameIdRaw) 
        ? parseInt(gameIdRaw, 10)
        : Math.abs(gameIdRaw.split("").reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0));
      
      const gameDate = getGameDate(game);
      
      return {
        league: league.toUpperCase(),
        sportsdata_game_id: sportsdataGameId,
        slug: generateSlug(league, game.AwayTeam, game.HomeTeam, gameDate),
        home_team: game.HomeTeam,
        away_team: game.AwayTeam,
        start_time: gameDate,
        game_status: mapGameStatus(game),
        market_status: mapMarketStatus(game),
        final_outcome: getFinalOutcome(game),
      };
    });

    // Upsert into markets table
    const { data: upsertedMarkets, error: upsertError } = await client
      .from("markets")
      .upsert(markets, {
        onConflict: "league,sportsdata_game_id",
        ignoreDuplicates: false,
      })
      .select();

    if (upsertError) {
      console.error("Markets upsert error:", upsertError);
      return NextResponse.json({
        success: false,
        error: upsertError.message,
        league,
      }, { status: 500 });
    }

    const importedCount = upsertedMarkets?.length || markets.length;

    // Log system event
    await logSystemEvent({
      eventType: "MARKETS_IMPORTED",
      severity: "info",
      entityType: "market",
      payload: {
        league,
        date: todayIso,
        imported_count: importedCount,
        cache_source: cacheSource,
      },
    });

    return NextResponse.json({
      success: true,
      league,
      date: todayIso,
      imported: importedCount,
      cacheSource,
      message: `Successfully imported ${importedCount} ${league} games for ${todayIso}`,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
