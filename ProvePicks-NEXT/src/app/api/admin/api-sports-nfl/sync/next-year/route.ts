/**
 * POST /api/admin/api-sports-nfl/sync/next-year
 * Sync NFL games for the next 365 days in monthly chunks
 * 
 * This endpoint fetches games in ~30 day chunks to avoid rate limits
 * and timeouts, then upserts all into api_sports_nfl_games.
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
  
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  
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
    return new Date(ts * 1000).toISOString();
  }
  
  if (dateObj.date && dateObj.time) {
    try {
      return new Date(`${dateObj.date}T${dateObj.time}:00Z`).toISOString();
    } catch {
      return null;
    }
  }
  
  return null;
}

function parseScore(score: number | string | null | undefined): number | null {
  if (score === null || score === undefined) return null;
  const num = Number(score);
  return Number.isFinite(num) ? num : null;
}

function parseStatus(status: { short?: string; long?: string } | string | undefined): string | null {
  if (!status) return null;
  if (typeof status === "string") return status;
  return status.long ?? status.short ?? null;
}

// Generate monthly chunks for a date range
function getMonthlyChunks(startDate: Date, endDate: Date): Array<{ from: string; to: string }> {
  const chunks: Array<{ from: string; to: string }> = [];
  let currentStart = new Date(startDate);
  
  while (currentStart < endDate) {
    const chunkEnd = new Date(currentStart);
    chunkEnd.setDate(chunkEnd.getDate() + 30); // ~30 day chunks
    
    if (chunkEnd > endDate) {
      chunkEnd.setTime(endDate.getTime());
    }
    
    chunks.push({
      from: currentStart.toISOString().split("T")[0],
      to: chunkEnd.toISOString().split("T")[0],
    });
    
    // Move to next chunk
    currentStart = new Date(chunkEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }
  
  return chunks;
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

  const startTime = Date.now();
  
  // Calculate date range: today to today + 365 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 365);
  
  // Split into monthly chunks
  const chunks = getMonthlyChunks(today, endDate);
  
  const results: Array<{
    from: string;
    to: string;
    fetched: number;
    success: boolean;
    error?: string;
  }> = [];
  
  let totalFetched = 0;
  const allGames: ApiSportsGame[] = [];
  
  try {
    // Fetch each chunk with a small delay between to avoid rate limits
    for (const chunk of chunks) {
      try {
        // Fetch all dates in this chunk
        const chunkStart = new Date(chunk.from);
        const chunkEnd = new Date(chunk.to);
        let chunkGames: ApiSportsGame[] = [];
        
        for (let d = new Date(chunkStart); d <= chunkEnd; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split("T")[0];
          
          // Calculate the correct NFL season for this date
          const season = seasonForDate(d);
          
          try {
            const url = buildApiSportsUrl(API_SPORTS_BASE_URL, `/games?date=${dateStr}&league=1&season=${season}`);
            const data = await apiSportsFetch<GamesResponse>(url, API_SPORTS_KEY);
            
            if (data.response && Array.isArray(data.response)) {
              chunkGames.push(...data.response);
              console.log(`[sync-games] league=nfl date=${dateStr} season=${season} apiResults=${data.response.length}`);
            }
          } catch (fetchErr) {
            console.warn(`[next-year sync] Failed to fetch ${dateStr}:`, fetchErr);
          }
          
          // Small delay between requests to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        results.push({
          from: chunk.from,
          to: chunk.to,
          fetched: chunkGames.length,
          success: true,
        });
        
        totalFetched += chunkGames.length;
        allGames.push(...chunkGames);
        
      } catch (chunkErr) {
        results.push({
          from: chunk.from,
          to: chunk.to,
          fetched: 0,
          success: false,
          error: chunkErr instanceof Error ? chunkErr.message : "Unknown error",
        });
      }
    }
    
    if (allGames.length === 0) {
      const ms = Date.now() - startTime;
      return NextResponse.json({
        ok: true,
        ms,
        message: "No games found in the next 365 days",
        chunks: results.length,
        totalFetched: 0,
        inserted: 0,
        updated: 0,
      });
    }
    
    // Get existing games to track inserted vs updated
    const gameIds = allGames
      .map(g => g.game?.id ?? g.id)
      .filter(Boolean) as number[];
    
    const { data: existingGames } = await adminClient
      .from("api_sports_nfl_games")
      .select("game_id")
      .in("game_id", gameIds);
    
    const existingGameIds = new Set(existingGames?.map(g => g.game_id) || []);
    
    // Transform and upsert games
    const games = allGames.map((game) => {
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
    
    // Upsert in batches to avoid payload size limits
    const BATCH_SIZE = 100;
    let inserted = 0;
    let updated = 0;
    
    for (let i = 0; i < games.length; i += BATCH_SIZE) {
      const batch = games.slice(i, i + BATCH_SIZE);
      
      const { error: upsertError } = await adminClient
        .from("api_sports_nfl_games")
        .upsert(batch, {
          onConflict: "game_id",
        });
      
      if (upsertError) {
        console.error(`[next-year sync] Batch upsert error:`, upsertError.message);
      }
      
      // Count inserts vs updates for this batch
      for (const game of batch) {
        if (existingGameIds.has(game.game_id)) {
          updated++;
        } else {
          inserted++;
        }
      }
    }
    
    const ms = Date.now() - startTime;
    
    return NextResponse.json({
      ok: true,
      ms,
      chunks: results.length,
      chunkDetails: results,
      totalFetched,
      inserted,
      updated,
      message: `Synced ${games.length} games over ${results.length} chunks (${inserted} new, ${updated} updated)`,
    });
    
  } catch (error) {
    const ms = Date.now() - startTime;
    return NextResponse.json({
      ok: false,
      ms,
      error: error instanceof Error ? error.message : "Unknown error",
      chunks: results.length,
      chunkDetails: results,
    }, { status: 500 });
  }
}
