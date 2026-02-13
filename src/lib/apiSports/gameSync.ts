/**
 * API-Sports Game Sync Utility
 * 
 * Generic game sync functions that work across all leagues.
 * Normalizes game data into a unified schema for sports_games table.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { getLeagueConfig, SupportedLeague } from "./leagueConfig";
import { apiSportsFetch, buildApiSportsUrl } from "./client";
import { isRealGame } from "@/lib/sports/placeholderTeams";

const API_SPORTS_KEY = process.env.API_SPORTS_KEY;

// ============================================================================
// SEASON CALCULATION
// ============================================================================

/**
 * Calculate the correct season year for a given date and league.
 * Works for 2026-2030 and beyond.
 * 
 * NFL: Season runs Sep-Feb. Jan/Feb games belong to prior year's season.
 *   Example: Feb 2026 → season 2025, Sep 2026 → season 2026
 * 
 * NBA/NHL: Season runs Oct-Jun. Jan-Jun games belong to prior year's season.
 *   Example: Feb 2026 → season 2025 (2025-26), Oct 2026 → season 2026 (2026-27)
 * 
 * MLB: Season runs Apr-Oct, matches calendar year.
 *   Example: Apr 2026 → season 2026
 * 
 * Soccer: Season runs Aug-May spanning two years. Jan-Jul games belong to prior year.
 *   Example: Feb 2026 → season 2025 (2025-26), Aug 2026 → season 2026 (2026-27)
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
  
  if (leagueUpper === "SOCCER" || leagueUpper === "FOOTBALL") {
    // Soccer season runs Aug-May, so Jan-Jul games belong to prior year
    return m <= 7 ? y - 1 : y;
  }
  
  // Default: use calendar year
  return y;
}

// Unified game record for database (matches sports_games v2 schema)
export interface GameRecord {
  league: string;
  external_game_id: string;  // TEXT, from API provider
  provider: string;          // 'api-sports'
  season: number;
  starts_at: string;         // TIMESTAMPTZ
  status: string;            // Default 'scheduled'
  home_team: string;         // Team name (no FK)
  away_team: string;         // Team name (no FK)
  home_score: number | null;
  away_score: number | null;
  league_id?: number | null; // API-Sports league ID (for filtering by enabled leagues)
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
function normalizeAmericanSportsGame(game: any, league: SupportedLeague, dateSeason: number): GameRecord | null {
  // Handle nested structure (game.game.id) or flat (game.id)
  const gameId = game.game?.id ?? game.id;
  if (!gameId) return null;
  
  const dateObj = game.game?.date ?? game.date;
  const statusObj = game.game?.status ?? game.status;
  const startTime = parseGameDate(dateObj);
  
  // Require valid start time
  if (!startTime) return null;
  
  // Get team names
  const homeTeamName = game.teams?.home?.name ?? `Team ${game.teams?.home?.id ?? 'Unknown'}`;
  const awayTeamName = game.teams?.away?.name ?? `Team ${game.teams?.away?.id ?? 'Unknown'}`;
  
  // Use season from API or fallback to date-based calculation
  const season = game.league?.season ?? game.season ?? dateSeason;
  
  // Extract league ID from API response
  const leagueId = game.league?.id ?? null;
  
  return {
    league: league.toLowerCase(),
    external_game_id: String(gameId),
    provider: "api-sports",
    season,
    starts_at: startTime,
    status: parseStatus(statusObj) ?? "scheduled",
    home_team: homeTeamName,
    away_team: awayTeamName,
    home_score: parseScore(game.scores?.home?.total ?? game.scores?.home),
    away_score: parseScore(game.scores?.away?.total ?? game.scores?.away),
    league_id: leagueId,
  };
}

/**
 * Normalize game from Soccer (football) API format
 */
function normalizeSoccerGame(game: any, dateSeason: number): GameRecord | null {
  // Soccer uses fixture.id
  const gameId = game.fixture?.id ?? game.id;
  if (!gameId) return null;
  
  const startTime = parseGameDate(game.fixture);
  
  // Require valid start time
  if (!startTime) return null;
  
  // Get team names
  const homeTeamName = game.teams?.home?.name ?? `Team ${game.teams?.home?.id ?? 'Unknown'}`;
  const awayTeamName = game.teams?.away?.name ?? `Team ${game.teams?.away?.id ?? 'Unknown'}`;
  
  // Use season from API or fallback to date-based calculation
  const season = game.league?.season ?? dateSeason;
  
  // Extract league ID from API response (for filtering by enabled leagues)
  const leagueId = game.league?.id ?? null;
  
  return {
    league: "soccer",
    external_game_id: String(gameId),
    provider: "api-sports",
    season,
    starts_at: startTime,
    status: parseStatus(game.fixture?.status) ?? "scheduled",
    home_team: homeTeamName,
    away_team: awayTeamName,
    home_score: parseScore(game.goals?.home ?? game.score?.fulltime?.home),
    away_score: parseScore(game.goals?.away ?? game.score?.fulltime?.away),
    league_id: leagueId,
  };
}

/**
 * Normalize game based on league
 */
function normalizeGame(game: any, league: SupportedLeague, dateSeason: number): GameRecord | null {
  if (league === "SOCCER") {
    return normalizeSoccerGame(game, dateSeason);
  }
  return normalizeAmericanSportsGame(game, league, dateSeason);
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
  
  // Log config being used
  console.log(`[games-sync] CONFIG sport=${league} baseUrl=${config.baseUrl} leagueId=${config.leagueId} currentSeason=${config.currentSeason}`);
  
  // Calculate the correct season for this specific date
  const dateObj = new Date(date + "T12:00:00Z");
  const primarySeason = seasonForDate(league, dateObj);
  
  // For NFL, also try current year and current year - 1 if primary fails
  // For other sports, also try fallback seasons
  const currentYear = dateObj.getUTCFullYear();
  const seasonsToTry = [primarySeason, currentYear, currentYear - 1].filter((v, i, a) => a.indexOf(v) === i);
  
  for (const season of seasonsToTry) {
    let endpoint: string;
    if (league === "SOCCER") {
      // Soccer uses /fixtures?date=YYYY-MM-DD&league=39&season=YYYY
      endpoint = `/fixtures?date=${date}&league=${config.leagueId}&season=${season}`;
    } else if (league === "NBA") {
      // NBA Basketball API requires season format: "2024-2025" for 2024-25 season
      const seasonFormatted = `${season}-${season + 1}`;
      endpoint = `/games?date=${date}&league=${config.leagueId}&season=${seasonFormatted}`;
    } else {
      // NFL/NHL/MLB: /games?date=YYYY-MM-DD&league=X&season=YYYY
      endpoint = `/games?date=${date}&league=${config.leagueId}&season=${season}`;
    }
    
    const fullUrl = buildApiSportsUrl(config.baseUrl, endpoint);
    
    // Log the full request URL (without API key)
    console.log(`[games-sync] FETCH sport=${league} date=${date} season=${season} url=${fullUrl}`);
    
    try {
      const data = await apiSportsFetch<{ response: unknown[] }>(fullUrl, API_SPORTS_KEY);
      const games = config.gameExtractor(data);
      
      // Log results
      console.log(`[games-sync] RESULT sport=${league} date=${date} season=${season} fetched=${games.length}`);
      
      // If we got games, return them
      if (games.length > 0) {
        return games;
      }
    } catch (err) {
      console.error(`[games-sync] ERROR sport=${league} date=${date} season=${season} error=${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }
  
  // No games found for any season
  console.log(`[games-sync] NO_GAMES sport=${league} date=${date} triedSeasons=${seasonsToTry.join(',')}`);
  return [];
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
  const leagueNormalized = league.toLowerCase(); // ALWAYS normalize to lowercase
  const config = getLeagueConfig(league);
  
  console.log(`[games-sync] START league=${leagueNormalized} from=${fromDate} to=${toDate} provider=${config.baseUrl}`);
  
  try {
    const { games, dates } = await fetchGamesForDateRange(league, fromDate, toDate);
    
    console.log(`[games-sync] FETCH league=${leagueNormalized} rawGames=${games.length} dates=${dates.length}`);
    
    if (games.length === 0) {
      console.warn(`[games-sync] WARNING league=${leagueNormalized} fetched=0 games from provider`);
      return {
        success: true,
        league,
        totalGames: 0,
        inserted: 0,
        updated: 0,
        dates,
      };
    }
    
    // Normalize all games, calculating season from game's start time
    let skippedPlaceholders = 0;
    let skippedNullNormalize = 0;
    
    const normalizedGames: GameRecord[] = [];
    
    for (const g of games) {
      // Extract date from game data for season calculation
      const dateObj = league === "SOCCER" 
        ? g.fixture 
        : (g.game?.date ?? g.date);
      
      let gameDate: Date;
      if (dateObj?.timestamp) {
        gameDate = new Date(Number(dateObj.timestamp) * 1000);
      } else if (typeof dateObj === "string") {
        gameDate = new Date(dateObj);
      } else if (dateObj?.date) {
        gameDate = new Date(dateObj.date);
      } else {
        gameDate = new Date();
      }
      
      const dateSeason = seasonForDate(league, gameDate);
      const normalized = normalizeGame(g, league, dateSeason);
      
      if (normalized === null) {
        skippedNullNormalize++;
        continue;
      }
      
      // CRITICAL: Force league to lowercase
      normalized.league = leagueNormalized;
      
      // Filter out placeholder games (NFC vs AFC, All-Stars, TBD, etc.)
      if (!isRealGame(normalized.home_team, normalized.away_team)) {
        skippedPlaceholders++;
        continue;
      }
      
      normalizedGames.push(normalized);
    }
    
    console.log(`[games-sync] NORMALIZE league=${leagueNormalized} valid=${normalizedGames.length} skippedNull=${skippedNullNormalize} skippedPlaceholders=${skippedPlaceholders}`);
    
    if (normalizedGames.length === 0) {
      console.warn(`[games-sync] WARNING league=${leagueNormalized} all games filtered out!`);
      return {
        success: true,
        league,
        totalGames: 0,
        inserted: 0,
        updated: 0,
        dates,
      };
    }
    
    // Log how many payload rows include a starts_at value
    const startsAtCount = normalizedGames.filter(g => !!g.starts_at).length;
    console.log(`[games-sync] payload starts_at count: ${startsAtCount} / ${normalizedGames.length} league=${leagueNormalized}`);

    // Get existing games to track inserted vs updated
    const gameIds = normalizedGames.map(g => g.external_game_id);
    const { data: existingGames } = await adminClient
      .from("sports_games")
      .select("external_game_id")
      .eq("league", leagueNormalized)
      .in("external_game_id", gameIds);
    
    const existingGameIds = new Set(existingGames?.map(g => g.external_game_id) || []);
    
    // Upsert games in batches with detailed error tracking
    const BATCH_SIZE = 50; // Smaller batches for better error isolation
    let inserted = 0;
    let updated = 0;
    let upsertErrors = 0;
    
    for (let i = 0; i < normalizedGames.length; i += BATCH_SIZE) {
      const batch = normalizedGames.slice(i, i + BATCH_SIZE);
      
      const { data: upsertData, error } = await adminClient
        .from("sports_games")
        .upsert(batch, {
          onConflict: "league,external_game_id",
        })
        .select("id");
      
      if (error) {
        const details = error.details ? ` details=${error.details}` : "";
        const hint = error.hint ? ` hint=${error.hint}` : "";
        const status = 'status' in error && error.status ? ` status=${error.status}` : "";
        console.error(
          `[games-sync] UPSERT_ERROR table=sports_games league=${leagueNormalized} batch=${i/BATCH_SIZE + 1} message="${error.message}" code=${error.code}${status}${details}${hint}`
        );
        upsertErrors += batch.length;
      } else {
        // Count based on what was actually returned
        const actualUpserted = upsertData?.length || 0;
        for (const game of batch) {
          if (existingGameIds.has(game.external_game_id)) {
            updated++;
          } else {
            inserted++;
          }
        }
        console.log(`[games-sync] BATCH league=${leagueNormalized} batch=${i/BATCH_SIZE + 1} rows=${actualUpserted}`);
      }
    }
    
    // Summary log
    console.log(`[games-sync] COMPLETE league=${leagueNormalized} total=${normalizedGames.length} inserted=${inserted} updated=${updated} errors=${upsertErrors}`);
    
    return {
      success: upsertErrors === 0,
      league,
      totalGames: normalizedGames.length,
      inserted,
      updated,
      dates,
      error: upsertErrors > 0 ? `${upsertErrors} rows failed to upsert` : undefined,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[games-sync] EXCEPTION league=${leagueNormalized} error="${errorMsg}"`);
    return {
      success: false,
      league,
      totalGames: 0,
      inserted: 0,
      updated: 0,
      error: errorMsg,
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
    
    // Calculate season for today's date
    const todayDate = new Date();
    const dateSeason = seasonForDate(league, todayDate);
    
    // Normalize games and filter out placeholders
    let skippedPlaceholders = 0;
    const normalizedGames = allGames
      .map(g => normalizeGame(g, league, dateSeason))
      .filter((g): g is GameRecord => {
        if (g === null) return false;
        // Filter out placeholder games (NFC vs AFC, All-Stars, TBD, etc.)
        if (!isRealGame(g.home_team, g.away_team)) {
          skippedPlaceholders++;
          return false;
        }
        return true;
      });
    
    if (skippedPlaceholders > 0) {
      console.log(`[games-sync] live skippedPlaceholders=${skippedPlaceholders} league=${league}`);
    }
    
    // Get existing games
    const gameIds = normalizedGames.map(g => g.external_game_id);
    const { data: existingGames } = await adminClient
      .from("sports_games")
      .select("external_game_id")
      .eq("league", league.toLowerCase())
      .in("external_game_id", gameIds);
    
    const existingGameIds = new Set(existingGames?.map(g => g.external_game_id) || []);
    
    // Upsert
    const { error } = await adminClient
      .from("sports_games")
      .upsert(normalizedGames, {
        onConflict: "league,external_game_id",
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
      if (existingGameIds.has(game.external_game_id)) {
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
