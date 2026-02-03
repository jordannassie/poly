/**
 * API-Sports Game Sync Utility
 * 
 * Generic game sync functions that work across all leagues.
 * Normalizes game data into a unified schema for sports_games table.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { getLeagueConfig, SupportedLeague } from "./leagueConfig";
import { apiSportsFetch, buildApiSportsUrl } from "./client";

const API_SPORTS_KEY = process.env.API_SPORTS_KEY;

// ============================================================================
// SEASON CALCULATION
// ============================================================================

/**
 * Calculate the correct season year for a given date and league.
 * 
 * NFL: Games in Jan/Feb belong to the prior year's season (e.g., Feb 2026 => season 2025)
 * NBA/NHL: Games Jan-Jun belong to the prior year's season (e.g., Mar 2026 => season 2025)
 * MLB: Season matches calendar year
 * Soccer: Season matches calendar year (Aug-May format handled by API)
 */
export function seasonForDate(league: string, d: Date): number {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1; // 1-12
  
  const leagueUpper = league.toUpperCase();
  
  if (leagueUpper === "NFL") {
    // NFL season runs Sep-Feb, so Jan/Feb games belong to prior year
    return m <= 2 ? y - 1 : y;
  }
  
  if (leagueUpper === "NBA" || leagueUpper === "NHL") {
    // NBA/NHL season runs Oct-Jun, so Jan-Jun games belong to prior year
    return m <= 6 ? y - 1 : y;
  }
  
  if (leagueUpper === "MLB") {
    // MLB runs Apr-Oct, matches calendar year
    return y;
  }
  
  // Soccer and default: use calendar year
  return y;
}

// Unified game record for database
export interface GameRecord {
  league: string;
  api_game_id: number;
  home_team_id: number | null;
  away_team_id: number | null;
  start_time: string | null;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  season: number | null;
  raw: any;
  updated_at: string;
}

export interface GameSyncResult {
  success: boolean;
  league: string;
  totalGames: number;
  inserted: number;
  updated: number;
  error?: string;
  dates?: string[];
}

// ============================================================================
// GAME PARSING HELPERS (Normalize different API structures)
// ============================================================================

/**
 * Parse game date from various API-Sports formats
 */
function parseGameDate(dateData: any): string | null {
  if (!dateData) return null;
  
  // Direct timestamp (seconds)
  if (dateData.timestamp) {
    const ts = Number(dateData.timestamp);
    if (Number.isFinite(ts)) {
      return new Date(ts * 1000).toISOString();
    }
  }
  
  // Date + time string
  if (dateData.date && dateData.time) {
    try {
      return new Date(`${dateData.date}T${dateData.time}:00Z`).toISOString();
    } catch {
      return null;
    }
  }
  
  // Just date string
  if (typeof dateData === "string") {
    try {
      return new Date(dateData).toISOString();
    } catch {
      return null;
    }
  }
  
  // Soccer format: fixture.date is ISO string
  if (dateData.date && typeof dateData.date === "string") {
    try {
      return new Date(dateData.date).toISOString();
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Parse score value
 */
function parseScore(score: any): number | null {
  if (score === null || score === undefined) return null;
  const num = Number(score);
  return Number.isFinite(num) ? num : null;
}

/**
 * Parse status from various formats
 */
function parseStatus(status: any): string | null {
  if (!status) return null;
  if (typeof status === "string") return status;
  if (status.long) return status.long;
  if (status.short) return status.short;
  return null;
}

/**
 * Normalize game from NFL/NBA/MLB/NHL API format
 */
function normalizeAmericanSportsGame(game: any, league: SupportedLeague): GameRecord | null {
  // Handle nested structure (game.game.id) or flat (game.id)
  const gameId = game.game?.id ?? game.id;
  if (!gameId) return null;
  
  const dateObj = game.game?.date ?? game.date;
  const statusObj = game.game?.status ?? game.status;
  
  return {
    league,
    api_game_id: gameId,
    home_team_id: game.teams?.home?.id ?? null,
    away_team_id: game.teams?.away?.id ?? null,
    start_time: parseGameDate(dateObj),
    status: parseStatus(statusObj),
    home_score: parseScore(game.scores?.home?.total ?? game.scores?.home),
    away_score: parseScore(game.scores?.away?.total ?? game.scores?.away),
    season: game.league?.season ?? game.season ?? null,
    raw: game,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Normalize game from Soccer (football) API format
 */
function normalizeSoccerGame(game: any): GameRecord | null {
  // Soccer uses fixture.id
  const gameId = game.fixture?.id ?? game.id;
  if (!gameId) return null;
  
  return {
    league: "SOCCER",
    api_game_id: gameId,
    home_team_id: game.teams?.home?.id ?? null,
    away_team_id: game.teams?.away?.id ?? null,
    start_time: parseGameDate(game.fixture),
    status: parseStatus(game.fixture?.status),
    home_score: parseScore(game.goals?.home ?? game.score?.fulltime?.home),
    away_score: parseScore(game.goals?.away ?? game.score?.fulltime?.away),
    season: game.league?.season ?? null,
    raw: game,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Normalize game based on league
 */
function normalizeGame(game: any, league: SupportedLeague): GameRecord | null {
  if (league === "SOCCER") {
    return normalizeSoccerGame(game);
  }
  return normalizeAmericanSportsGame(game, league);
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

/**
 * Fetch games for a single date
 */
export async function fetchGamesForDate(
  league: SupportedLeague,
  date: string
): Promise<any[]> {
  if (!API_SPORTS_KEY) {
    throw new Error("API_SPORTS_KEY not configured");
  }
  
  const config = getLeagueConfig(league);
  
  // Calculate the correct season for this specific date
  const dateObj = new Date(date + "T12:00:00Z");
  const season = seasonForDate(league, dateObj);
  
  let endpoint: string;
  if (league === "SOCCER") {
    // Soccer uses /fixtures?date=YYYY-MM-DD&league=39&season=YYYY
    endpoint = `/fixtures?date=${date}&league=${config.leagueId}&season=${season}`;
  } else if (league === "NFL") {
    // NFL: /games?date=YYYY-MM-DD&league=1&season=YYYY
    endpoint = `/games?date=${date}&league=${config.leagueId}&season=${season}`;
  } else if (league === "NBA" || league === "NHL") {
    // NBA/NHL: /games?date=YYYY-MM-DD&league=X&season=YYYY
    endpoint = `/games?date=${date}&league=${config.leagueId}&season=${season}`;
  } else {
    // MLB and others: /games?date=YYYY-MM-DD&league=X&season=YYYY
    endpoint = `/games?date=${date}&league=${config.leagueId}&season=${season}`;
  }
  
  const url = buildApiSportsUrl(config.baseUrl, endpoint);
  const data = await apiSportsFetch<{ response: unknown[] }>(url, API_SPORTS_KEY);
  const games = config.gameExtractor(data);
  
  // Log for debugging
  console.log(`[sync-games] league=${league} date=${date} season=${season} apiResults=${games.length}`);
  
  return games;
}

/**
 * Fetch live games
 */
export async function fetchLiveGames(league: SupportedLeague): Promise<any[]> {
  if (!API_SPORTS_KEY) {
    throw new Error("API_SPORTS_KEY not configured");
  }
  
  const config = getLeagueConfig(league);
  
  const url = buildApiSportsUrl(config.baseUrl, config.liveEndpoint);
  const data = await apiSportsFetch<{ response: unknown[] }>(url, API_SPORTS_KEY);
  return config.gameExtractor(data);
}

/**
 * Fetch games for a date range
 */
export async function fetchGamesForDateRange(
  league: SupportedLeague,
  fromDate: string,
  toDate: string
): Promise<{ games: any[]; dates: string[] }> {
  const allGames: any[] = [];
  const fetchedDates: string[] = [];
  
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    fetchedDates.push(dateStr);
    
    try {
      const games = await fetchGamesForDate(league, dateStr);
      allGames.push(...games);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      console.warn(`[gameSync] Failed to fetch ${league} games for ${dateStr}:`, err);
    }
  }
  
  return { games: allGames, dates: fetchedDates };
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

/**
 * Sync games for a date range to sports_games table
 */
export async function syncGamesForDateRange(
  adminClient: SupabaseClient,
  league: SupportedLeague,
  fromDate: string,
  toDate: string
): Promise<GameSyncResult> {
  try {
    const { games, dates } = await fetchGamesForDateRange(league, fromDate, toDate);
    
    if (games.length === 0) {
      return {
        success: true,
        league,
        totalGames: 0,
        inserted: 0,
        updated: 0,
        dates,
      };
    }
    
    // Normalize all games
    const normalizedGames = games
      .map(g => normalizeGame(g, league))
      .filter((g): g is GameRecord => g !== null);
    
    // Get existing games to track inserted vs updated
    const gameIds = normalizedGames.map(g => g.api_game_id);
    const { data: existingGames } = await adminClient
      .from("sports_games")
      .select("api_game_id")
      .eq("league", league)
      .in("api_game_id", gameIds);
    
    const existingGameIds = new Set(existingGames?.map(g => g.api_game_id) || []);
    
    // Upsert games in batches
    const BATCH_SIZE = 100;
    let inserted = 0;
    let updated = 0;
    
    for (let i = 0; i < normalizedGames.length; i += BATCH_SIZE) {
      const batch = normalizedGames.slice(i, i + BATCH_SIZE);
      
      const { error } = await adminClient
        .from("sports_games")
        .upsert(batch, {
          onConflict: "league,api_game_id",
        });
      
      if (error) {
        console.error(`[gameSync] Batch upsert error:`, error.message);
      }
      
      for (const game of batch) {
        if (existingGameIds.has(game.api_game_id)) {
          updated++;
        } else {
          inserted++;
        }
      }
    }
    
    // Summary log
    console.log(`[sync-games] league=${league} totalGames=${normalizedGames.length} inserted=${inserted} updated=${updated}`);
    
    return {
      success: true,
      league,
      totalGames: normalizedGames.length,
      inserted,
      updated,
      dates,
    };
  } catch (err) {
    return {
      success: false,
      league,
      totalGames: 0,
      inserted: 0,
      updated: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Sync games for the next 365 days
 */
export async function syncGamesNextYear(
  adminClient: SupabaseClient,
  league: SupportedLeague
): Promise<GameSyncResult & { chunks?: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 365);
  
  const fromDate = today.toISOString().split("T")[0];
  const toDate = endDate.toISOString().split("T")[0];
  
  const result = await syncGamesForDateRange(adminClient, league, fromDate, toDate);
  
  return {
    ...result,
    chunks: Math.ceil(365 / 30),
  };
}

/**
 * Sync live games (update scores and status)
 */
export async function syncLiveGames(
  adminClient: SupabaseClient,
  league: SupportedLeague
): Promise<GameSyncResult> {
  try {
    // Fetch live games
    const liveGames = await fetchLiveGames(league);
    
    // Also fetch today's games as fallback
    const today = new Date().toISOString().split("T")[0];
    const todayGames = await fetchGamesForDate(league, today);
    
    // Combine and deduplicate
    const allGames = [...liveGames];
    const liveIds = new Set(liveGames.map(g => 
      league === "SOCCER" ? g.fixture?.id : (g.game?.id ?? g.id)
    ));
    
    for (const game of todayGames) {
      const gameId = league === "SOCCER" ? game.fixture?.id : (game.game?.id ?? game.id);
      if (!liveIds.has(gameId)) {
        allGames.push(game);
      }
    }
    
    if (allGames.length === 0) {
      return {
        success: true,
        league,
        totalGames: 0,
        inserted: 0,
        updated: 0,
      };
    }
    
    // Normalize games
    const normalizedGames = allGames
      .map(g => normalizeGame(g, league))
      .filter((g): g is GameRecord => g !== null);
    
    // Get existing games
    const gameIds = normalizedGames.map(g => g.api_game_id);
    const { data: existingGames } = await adminClient
      .from("sports_games")
      .select("api_game_id")
      .eq("league", league)
      .in("api_game_id", gameIds);
    
    const existingGameIds = new Set(existingGames?.map(g => g.api_game_id) || []);
    
    // Upsert
    const { error } = await adminClient
      .from("sports_games")
      .upsert(normalizedGames, {
        onConflict: "league,api_game_id",
      });
    
    if (error) {
      return {
        success: false,
        league,
        totalGames: 0,
        inserted: 0,
        updated: 0,
        error: error.message,
      };
    }
    
    let inserted = 0;
    let updated = 0;
    for (const game of normalizedGames) {
      if (existingGameIds.has(game.api_game_id)) {
        updated++;
      } else {
        inserted++;
      }
    }
    
    return {
      success: true,
      league,
      totalGames: normalizedGames.length,
      inserted,
      updated,
    };
  } catch (err) {
    return {
      success: false,
      league,
      totalGames: 0,
      inserted: 0,
      updated: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
