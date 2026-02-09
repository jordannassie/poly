/**
 * POST /api/admin/api-sports-nfl/sync/games
 * Fetch NFL games from API-Sports for a date range and sync to Supabase
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { apiSportsFetch, buildApiSportsUrl } from "@/lib/apiSports/client";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY;
const API_SPORTS_BASE_URL = process.env.API_SPORTS_BASE_URL || "https://v1.american-football.api-sports.io";

/**
 * Calculate the correct NFL season for a given date.
 * NFL season runs Sep-Feb, so Jan/Feb games belong to prior year.
 * Example: Feb 2026 => season 2025
 */
function seasonForDate(d: Date): number {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1; // 1-12
  return m <= 2 ? y - 1 : y;
}

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  
  // Check cookie
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  
  // Check header
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  
  return false;
}

// API-Sports game response structure
interface ApiSportsGame {
  game: {
    id: number;
    date: {
      timezone: string;
      date: string;
      time: string;
      timestamp: string | number;
    };
    status: { short: string; long: string } | string;
  };
  league: { id: number; season: number };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  scores: {
    home: { total: number | string | null };
    away: { total: number | string | null };
  };
  // Allow additional fields
  id?: number;
  date?: {
    timezone: string;
    date: string;
    time: string;
    timestamp: string | number;
  };
  status?: { short: string; long: string } | string;
}

interface GamesResponse {
  response: ApiSportsGame[];
}

// Helper to safely convert timestamp to ISO string
function parseGameDate(dateObj: ApiSportsGame["game"]["date"] | undefined): string | null {
  if (!dateObj) return null;
  
  const ts = Number(dateObj.timestamp);
  if (Number.isFinite(ts)) {
    // API-Sports timestamp is in seconds, convert to milliseconds
    return new Date(ts * 1000).toISOString();
  }
  
  // Fallback: try to parse date + time string
  if (dateObj.date && dateObj.time) {
    try {
      return new Date(`${dateObj.date}T${dateObj.time}:00Z`).toISOString();
    } catch {
      return null;
    }
  }
  
  return null;
}

// Helper to safely parse score
function parseScore(score: number | string | null | undefined): number | null {
  if (score === null || score === undefined) return null;
  const num = Number(score);
  return Number.isFinite(num) ? num : null;
}

// Helper to get status string
function parseStatus(status: { short?: string; long?: string } | string | undefined): string | null {
  if (!status) return null;
  if (typeof status === "string") return status;
  return status.long ?? status.short ?? null;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!API_SPORTS_KEY) {
    return NextResponse.json({
      ok: false,
      error: "API_SPORTS_KEY not configured",
    }, { status: 500 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY not configured",
    }, { status: 500 });
  }

  const url = new URL(request.url);
  // Default to a known NFL week (2025-09-07 to 2025-09-15)
  const fromDate = url.searchParams.get("from") || "2025-09-07";
  const toDate = url.searchParams.get("to") || "2025-09-15";

  const startTime = Date.now();
  const allGames: ApiSportsGame[] = [];
  const fetchedDates: string[] = [];

  try {
    // Fetch games for each date in the range
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      fetchedDates.push(dateStr);
      
      // Calculate the correct NFL season for this date
      const season = seasonForDate(d);
      const gamesUrl = buildApiSportsUrl(API_SPORTS_BASE_URL, `/games?date=${dateStr}&league=1&season=${season}`);
      
      try {
        const data = await apiSportsFetch<GamesResponse>(gamesUrl, API_SPORTS_KEY);
        
        if (data.response && Array.isArray(data.response)) {
          allGames.push(...data.response);
          console.log(`[sync-games] league=nfl date=${dateStr} season=${season} apiResults=${data.response.length}`);
        }
      } catch (fetchErr) {
        console.warn(`[games sync] Failed to fetch ${dateStr}:`, fetchErr);
      }
    }

    if (allGames.length === 0) {
      const ms = Date.now() - startTime;
      return NextResponse.json({
        ok: true,
        ms,
        message: `No games found for date range ${fromDate} to ${toDate}`,
        inserted: 0,
        updated: 0,
        count: 0,
        dates: fetchedDates,
      });
    }

    // Get existing games to track inserted vs updated
    const gameIds = allGames.map(g => g.game?.id ?? g.id).filter(Boolean) as number[];
    const { data: existingGames } = await adminClient
      .from("api_sports_nfl_games")
      .select("game_id")
      .in("game_id", gameIds);
    
    const existingGameIds = new Set(existingGames?.map(g => g.game_id) || []);

    // Transform and upsert games with proper type handling
    const games = allGames.map((game) => {
      // Handle both nested and flat response structures
      const gameId = game.game?.id ?? game.id;
      const dateObj = game.game?.date ?? game.date;
      const statusObj = game.game?.status ?? game.status;
      
      return {
        game_id: gameId,
        game_date: parseGameDate(dateObj as ApiSportsGame["game"]["date"]),
        status: parseStatus(statusObj as { short?: string; long?: string } | string),
        league_id: game.league?.id ?? 1,
        season: game.league?.season ?? null,
        home_team_id: game.teams?.home?.id ?? null,
        away_team_id: game.teams?.away?.id ?? null,
        home_score: parseScore(game.scores?.home?.total),
        away_score: parseScore(game.scores?.away?.total),
        raw: game,
        updated_at: new Date().toISOString(),
      };
    }).filter(g => g.game_id != null);

    const { error: upsertError } = await adminClient
      .from("api_sports_nfl_games")
      .upsert(games, {
        onConflict: "game_id",
      });

    if (upsertError) {
      return NextResponse.json({
        ok: false,
        error: `Database error: ${upsertError.message}`,
      }, { status: 500 });
    }

    // Calculate inserted vs updated
    let inserted = 0;
    let updated = 0;
    for (const game of games) {
      if (existingGameIds.has(game.game_id)) {
        updated++;
      } else {
        inserted++;
      }
    }

    const ms = Date.now() - startTime;
    
    // Summary log
    console.log(`[sync-games] league=nfl totalGames=${games.length} inserted=${inserted} updated=${updated}`);

    return NextResponse.json({
      ok: true,
      ms,
      fromDate,
      toDate,
      dates: fetchedDates,
      inserted,
      updated,
      count: games.length,
      message: `Synced ${games.length} NFL games (${inserted} new, ${updated} updated)`,
    });
  } catch (error) {
    const ms = Date.now() - startTime;
    return NextResponse.json({
      ok: false,
      ms,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
