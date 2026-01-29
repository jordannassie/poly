/**
 * POST /api/admin/api-sports-nfl/sync/games
 * Fetch NFL games from API-Sports for a date range and sync to Supabase
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY;
const API_SPORTS_BASE_URL = process.env.API_SPORTS_BASE_URL || "https://v1.american-football.api-sports.io";

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  
  return false;
}

interface ApiSportsGame {
  game: {
    id: number;
    date: string;
    status: { short: string; long: string };
  };
  league: { id: number; season: number };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  scores: {
    home: { total: number | null };
    away: { total: number | null };
  };
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
      error: "Supabase admin client not configured",
    }, { status: 500 });
  }

  const url = new URL(request.url);
  const fromDate = url.searchParams.get("from") || new Date().toISOString().split("T")[0];
  const toDate = url.searchParams.get("to") || fromDate;

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
      
      const endpoint = `${API_SPORTS_BASE_URL}/games?date=${dateStr}&league=1`;
      const res = await fetch(endpoint, {
        headers: { "x-apisports-key": API_SPORTS_KEY },
      });
      const data = await res.json();
      
      if (data.response && Array.isArray(data.response)) {
        allGames.push(...data.response);
      }
    }

    if (allGames.length === 0) {
      const ms = Date.now() - startTime;
      return NextResponse.json({
        ok: true,
        ms,
        message: `No games found for date range ${fromDate} to ${toDate}`,
        fetched: 0,
        synced: 0,
        dates: fetchedDates,
      });
    }

    // Transform and upsert games
    const games = allGames.map((game) => ({
      game_id: game.game.id,
      date: game.game.date,
      status: game.game.status?.short || null,
      league_id: game.league?.id || null,
      season: game.league?.season || null,
      home_team_id: game.teams?.home?.id || null,
      away_team_id: game.teams?.away?.id || null,
      home_score: game.scores?.home?.total ?? null,
      away_score: game.scores?.away?.total ?? null,
      raw: game,
      provider: "api-sports",
    }));

    const { data: upsertedData, error: upsertError } = await adminClient
      .from("api_sports_nfl_games")
      .upsert(games, {
        onConflict: "game_id",
      })
      .select();

    if (upsertError) {
      return NextResponse.json({
        ok: false,
        error: `Database error: ${upsertError.message}`,
      }, { status: 500 });
    }

    const ms = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      ms,
      fromDate,
      toDate,
      dates: fetchedDates,
      fetched: allGames.length,
      synced: upsertedData?.length || games.length,
      message: `Synced ${games.length} NFL games to database`,
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
