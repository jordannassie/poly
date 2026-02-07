/**
 * Game Lifecycle Jobs
 * 
 * Production-grade job handlers for the game lifecycle:
 * - discoverGamesRollingWindow: Ingest games for rolling 72h window
 * - syncLiveAndWindowGames: Update scores/status for active games
 * - finalizeAndEnqueueSettlements: Mark games FINAL and enqueue settlements
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { normalizeStatus, determineWinner, needsSettlement, StatusNorm } from "./statusNorm";
import { fetchGamesForDate, fetchLiveGames, seasonForDate, GameRecord } from "@/lib/apiSports/gameSync";
import { getLeagueConfig, SupportedLeague } from "@/lib/apiSports/leagueConfig";
import { isRealGame } from "@/lib/sports/placeholderTeams";

// Enabled leagues for lifecycle processing
const ENABLED_LEAGUES: SupportedLeague[] = ['NFL', 'NBA', 'NHL', 'MLB', 'SOCCER'];

export interface JobResult {
  success: boolean;
  league?: string;
  fetched: number;
  upserted: number;
  finalized: number;
  enqueued: number;
  errors: string[];
  duration: number;
  // New: track first error details for UI display
  firstError?: {
    message: string;
    code?: string;
    details?: string;
  };
}

export interface MultiLeagueJobResult {
  success: boolean;
  results: JobResult[];
  totalFetched: number;
  totalUpserted: number;
  totalFinalized: number;
  totalEnqueued: number;
  duration: number;
  // New: aggregate first error for UI display
  firstError?: {
    message: string;
    code?: string;
    details?: string;
    league?: string;
  };
}

// Schema detection cache (per-request)
interface SchemaInfo {
  columns: Set<string>;
  uniqueKey: string[];
  hasExternalGameId: boolean;
  hasApiGameId: boolean;
  hasStartsAt: boolean;
  hasStartTime: boolean;
  hasHomeTeam: boolean;
  hasHomeTeamId: boolean;
}

// ============================================================================
// DISCOVERY JOB
// ============================================================================

/**
 * Detect sports_games table schema by querying information_schema
 */
async function detectTableSchema(adminClient: SupabaseClient): Promise<SchemaInfo> {
  console.log('[lifecycle] Detecting sports_games table schema...');
  
  // Query information_schema for column names
  const { data: columnData, error: columnError } = await adminClient
    .rpc('get_table_columns', { p_table_name: 'sports_games' })
    .select('*');
  
  // Fallback: query the table directly if RPC doesn't exist
  let columns: Set<string>;
  
  if (columnError || !columnData) {
    console.log('[lifecycle] RPC not available, detecting columns from table query...');
    
    const { data: sampleRow, error: sampleError } = await adminClient
      .from('sports_games')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error(`[lifecycle] SCHEMA_DETECT_ERROR: ${sampleError.message}`);
      // Return defaults based on v2 schema
      columns = new Set([
        'id', 'league', 'external_game_id', 'provider', 'season', 
        'starts_at', 'status', 'home_team', 'away_team', 
        'home_score', 'away_score', 'created_at'
      ]);
    } else if (sampleRow && sampleRow.length > 0) {
      columns = new Set(Object.keys(sampleRow[0]));
    } else {
      // Empty table - try to detect from constraint
      console.log('[lifecycle] Table is empty, using default v2 schema');
      columns = new Set([
        'id', 'league', 'external_game_id', 'provider', 'season', 
        'starts_at', 'status', 'home_team', 'away_team', 
        'home_score', 'away_score', 'created_at', 'status_raw', 
        'status_norm', 'winner_side', 'finalized_at', 'settled_at', 
        'last_synced_at', 'updated_at'
      ]);
    }
  } else {
    columns = new Set(columnData.map((c: any) => c.column_name));
  }
  
  console.log(`[lifecycle] sports_games columns: ${Array.from(columns).join(', ')}`);
  
  // Determine unique key
  const hasExternalGameId = columns.has('external_game_id');
  const hasApiGameId = columns.has('api_game_id');
  const hasProvider = columns.has('provider');
  
  let uniqueKey: string[];
  if (hasExternalGameId) {
    uniqueKey = ['league', 'external_game_id'];
  } else if (hasApiGameId) {
    uniqueKey = ['league', 'api_game_id'];
  } else {
    // Fallback
    uniqueKey = ['league', 'external_game_id'];
  }
  
  const schemaInfo: SchemaInfo = {
    columns,
    uniqueKey,
    hasExternalGameId,
    hasApiGameId,
    hasStartsAt: columns.has('starts_at'),
    hasStartTime: columns.has('start_time'),
    hasHomeTeam: columns.has('home_team'),
    hasHomeTeamId: columns.has('home_team_id'),
  };
  
  console.log(`[lifecycle] Detected uniqueKey: ${uniqueKey.join(',')}, hasExternalGameId=${hasExternalGameId}, hasStartsAt=${schemaInfo.hasStartsAt}`);
  
  return schemaInfo;
}

/**
 * Build upsert payload based on detected schema
 */
function buildGamePayload(
  game: GameRecord & { status_norm: string; status_raw?: string },
  schema: SchemaInfo
): Record<string, any> {
  const payload: Record<string, any> = {};
  const cols = schema.columns;
  
  // Required fields
  if (cols.has('league')) payload.league = game.league;
  if (cols.has('season')) payload.season = game.season;
  
  // Game ID field - use external_game_id if available, else api_game_id
  if (schema.hasExternalGameId) {
    payload.external_game_id = game.external_game_id;
  } else if (schema.hasApiGameId) {
    // Convert to int if using old schema
    payload.api_game_id = parseInt(game.external_game_id, 10) || game.external_game_id;
  }
  
  // Provider field
  if (cols.has('provider')) {
    payload.provider = game.provider || 'api-sports';
  }
  
  // Start time - use whichever column exists
  if (schema.hasStartsAt) {
    payload.starts_at = game.starts_at;
  } else if (schema.hasStartTime) {
    payload.start_time = game.starts_at;
  }
  
  // Team fields - use names or IDs depending on schema
  if (schema.hasHomeTeam) {
    payload.home_team = game.home_team;
    payload.away_team = game.away_team;
  } else if (schema.hasHomeTeamId) {
    // Old schema with team IDs - we don't have IDs, so skip or use null
    // This is a schema mismatch case
    console.warn('[lifecycle] Warning: Schema expects team IDs but we have team names');
  }
  
  // Score fields - detect which exist
  if (cols.has('home_score')) payload.home_score = game.home_score;
  if (cols.has('away_score')) payload.away_score = game.away_score;
  if (cols.has('score_home')) payload.score_home = game.home_score;
  if (cols.has('score_away')) payload.score_away = game.away_score;
  
  // Status fields
  if (cols.has('status')) payload.status = game.status || game.status_raw || 'scheduled';
  if (cols.has('status_raw')) payload.status_raw = game.status_raw || game.status;
  if (cols.has('status_norm')) payload.status_norm = game.status_norm;
  
  // Timestamps
  if (cols.has('last_synced_at')) payload.last_synced_at = new Date().toISOString();
  if (cols.has('updated_at')) payload.updated_at = new Date().toISOString();
  
  return payload;
}

/**
 * Discover games in a rolling window: now-36h to now+36h
 * Upserts all games with normalized status
 * 
 * Uses dynamic schema detection to match production table structure.
 */
export async function discoverGamesRollingWindow(
  adminClient: SupabaseClient,
  options?: { 
    leagues?: SupportedLeague[];
    hoursBack?: number;
    hoursForward?: number;
    maxGamesPerLeague?: number; // Batch limit
  }
): Promise<MultiLeagueJobResult> {
  const startTime = Date.now();
  const leagues = options?.leagues || ENABLED_LEAGUES;
  const hoursBack = options?.hoursBack ?? 36;
  const hoursForward = options?.hoursForward ?? 36;
  const maxGamesPerLeague = options?.maxGamesPerLeague ?? 500; // Default high limit
  
  const now = new Date();
  const fromDate = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
  const toDate = new Date(now.getTime() + hoursForward * 60 * 60 * 1000);
  
  console.log(`[lifecycle:discover] START window=${fromDate.toISOString()} to ${toDate.toISOString()} leagues=${leagues.join(',')}`);
  
  // Detect schema once at the start
  const schema = await detectTableSchema(adminClient);
  
  const results: JobResult[] = [];
  let totalFetched = 0;
  let totalUpserted = 0;
  let firstError: MultiLeagueJobResult['firstError'] = undefined;
  
  // Track skip reasons globally
  const globalSkipStats = {
    rawFromApi: 0,
    skippedNormalizeFailed: 0,
    skippedNoGameId: 0,
    skippedPlaceholderTeam: 0,
    skippedNoStartTime: 0,
    validGames: 0,
    upsertErrors: 0,
    upsertSuccess: 0,
  };
  
  for (const league of leagues) {
    const leagueStart = Date.now();
    const errors: string[] = [];
    let fetched = 0;
    let upserted = 0;
    let leagueFirstError: JobResult['firstError'] = undefined;
    
    // Per-league skip tracking
    const skipStats = {
      rawFromApi: 0,
      skippedNormalizeFailed: 0,
      skippedNoGameId: 0,
      skippedPlaceholderTeam: 0,
      skippedNoStartTime: 0,
    };
    
    try {
      // Generate date range
      const dates: string[] = [];
      for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }
      
      console.log(`[lifecycle:discover] ${league} checking ${dates.length} dates`);
      
      // Fetch games for each date
      const allGames: (GameRecord & { status_norm: string; status_raw?: string })[] = [];
      
      for (const date of dates) {
        try {
          const rawGames = await fetchGamesForDate(league, date);
          skipStats.rawFromApi += rawGames.length;
          globalSkipStats.rawFromApi += rawGames.length;
          
          if (rawGames.length > 0) {
            console.log(`[lifecycle:discover] ${league} date=${date} rawGames=${rawGames.length}`);
          }
          
          const dateSeason = seasonForDate(league, new Date(date));
          
          // Normalize games with detailed logging
          for (const game of rawGames) {
            const normalized = normalizeGameWithStatusDebug(game, league, dateSeason, skipStats);
            
            if (!normalized) {
              continue;
            }
            
            // Log placeholder teams but still include them
            const isPlaceholder = !isRealGame(normalized.home_team, normalized.away_team);
            if (isPlaceholder) {
              skipStats.skippedPlaceholderTeam++;
              globalSkipStats.skippedPlaceholderTeam++;
              // Include anyway for now
            }
            
            allGames.push(normalized);
          }
          
          // Small delay to avoid rate limits
          await sleep(50);
        } catch (err) {
          const errMsg = `${date}: ${err instanceof Error ? err.message : 'Unknown error'}`;
          errors.push(errMsg);
          console.error(`[lifecycle:discover] ${league} ERROR ${errMsg}`);
        }
      }
      
      fetched = allGames.length;
      globalSkipStats.validGames += fetched;
      
      console.log(`[lifecycle:discover] ${league} FILTER_STATS raw=${skipStats.rawFromApi} valid=${allGames.length}`);
      
      // Log sample games for debugging
      if (allGames.length > 0) {
        const sample = allGames.slice(0, 2);
        for (const g of sample) {
          console.log(`[lifecycle:discover] ${league} SAMPLE gameId=${g.external_game_id} starts=${g.starts_at} status=${g.status_norm}`);
        }
      }
      
      // Upsert games in batches with schema-aware payloads
      if (allGames.length > 0) {
        const BATCH_SIZE = 50;
        const onConflictKey = schema.uniqueKey.join(',');
        
        for (let i = 0; i < allGames.length; i += BATCH_SIZE) {
          const batch = allGames.slice(i, i + BATCH_SIZE);
          
          // Build payloads using detected schema
          const payloads = batch.map(g => buildGamePayload(g, schema));
          
          // Log first batch structure
          if (i === 0 && payloads.length > 0) {
            console.log(`[lifecycle:discover] ${league} UPSERT_PAYLOAD keys=${Object.keys(payloads[0]).join(',')} onConflict=${onConflictKey}`);
          }
          
          // Perform upsert
          const { data, error } = await adminClient
            .from('sports_games')
            .upsert(payloads, { 
              onConflict: onConflictKey,
              ignoreDuplicates: false
            })
            .select('id, external_game_id');
          
          if (error) {
            const errMsg = `Upsert batch ${Math.floor(i/BATCH_SIZE) + 1}: ${error.message}`;
            errors.push(errMsg);
            console.error(`[lifecycle:discover] ${league} UPSERT_ERROR ${error.message} code=${error.code}`);
            globalSkipStats.upsertErrors += batch.length;
            
            // Capture first error for UI
            if (!leagueFirstError) {
              leagueFirstError = {
                message: error.message,
                code: error.code,
                details: JSON.stringify(error.details || error.hint || ''),
              };
            }
            
            // Try single-row inserts for small batches to diagnose
            if (batch.length <= 3) {
              for (let j = 0; j < batch.length; j++) {
                const { error: singleErr } = await adminClient
                  .from('sports_games')
                  .upsert(payloads[j], { onConflict: onConflictKey });
                
                if (singleErr) {
                  console.error(`[lifecycle:discover] ${league} SINGLE_FAIL id=${batch[j].external_game_id} error=${singleErr.message}`);
                } else {
                  upserted++;
                  globalSkipStats.upsertSuccess++;
                }
              }
            }
          } else {
            upserted += data?.length || batch.length;
            globalSkipStats.upsertSuccess += data?.length || batch.length;
            console.log(`[lifecycle:discover] ${league} UPSERT_OK batch=${Math.floor(i/BATCH_SIZE) + 1} rows=${data?.length || batch.length}`);
          }
        }
      } else {
        console.log(`[lifecycle:discover] ${league} SKIP_UPSERT no valid games to insert`);
      }
      
      totalFetched += fetched;
      totalUpserted += upserted;
      
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(errMsg);
      console.error(`[lifecycle:discover] ${league} FATAL ${errMsg}`);
      
      if (!leagueFirstError) {
        leagueFirstError = { message: errMsg };
      }
    }
    
    // Capture first error across all leagues
    if (leagueFirstError && !firstError) {
      firstError = { ...leagueFirstError, league };
    }
    
    results.push({
      success: errors.length === 0,
      league,
      fetched,
      upserted,
      finalized: 0,
      enqueued: 0,
      errors,
      duration: Date.now() - leagueStart,
      firstError: leagueFirstError,
    });
    
    console.log(`[lifecycle:discover] ${league} DONE fetched=${fetched} upserted=${upserted} errors=${errors.length} duration=${Date.now() - leagueStart}ms`);
  }
  
  const duration = Date.now() - startTime;
  console.log(`[lifecycle:discover] COMPLETE total_fetched=${totalFetched} total_upserted=${totalUpserted} duration=${duration}ms`);
  console.log(`[lifecycle:discover] GLOBAL_STATS raw=${globalSkipStats.rawFromApi} valid=${globalSkipStats.validGames} upsertOK=${globalSkipStats.upsertSuccess} upsertErr=${globalSkipStats.upsertErrors}`);
  
  return {
    success: results.every(r => r.success),
    results,
    totalFetched,
    totalUpserted,
    totalFinalized: 0,
    totalEnqueued: 0,
    duration,
    firstError,
  };
}

/**
 * Normalize game data with status_norm - DEBUG VERSION with detailed skip logging
 */
function normalizeGameWithStatusDebug(
  game: any, 
  league: SupportedLeague, 
  dateSeason: number,
  skipStats: { skippedNoGameId: number; skippedNoStartTime: number; skippedNormalizeFailed: number }
): (GameRecord & { status_norm: string; status_raw?: string }) | null {
  const leagueNormalized = league.toLowerCase();
  
  // Handle different API structures
  let gameId: string;
  let startTime: string | null;
  let homeTeam: string;
  let awayTeam: string;
  let homeScore: number | null = null;
  let awayScore: number | null = null;
  let rawStatus: string;
  
  try {
    if (league === 'SOCCER') {
      // Soccer uses fixture structure
      gameId = String(game.fixture?.id ?? game.id ?? '');
      startTime = parseDate(game.fixture);
      homeTeam = game.teams?.home?.name ?? 'Unknown';
      awayTeam = game.teams?.away?.name ?? 'Unknown';
      homeScore = parseScore(game.goals?.home ?? game.score?.fulltime?.home);
      awayScore = parseScore(game.goals?.away ?? game.score?.fulltime?.away);
      rawStatus = game.fixture?.status?.short ?? game.fixture?.status?.long ?? 'NS';
    } else {
      // American sports structure
      gameId = String(game.game?.id ?? game.id ?? '');
      const dateObj = game.game?.date ?? game.date;
      startTime = parseDate(dateObj);
      homeTeam = game.teams?.home?.name ?? 'Unknown';
      awayTeam = game.teams?.away?.name ?? 'Unknown';
      homeScore = parseScore(game.scores?.home?.total ?? game.scores?.home);
      awayScore = parseScore(game.scores?.away?.total ?? game.scores?.away);
      rawStatus = game.game?.status?.short ?? game.game?.status?.long ?? game.status?.short ?? 'NS';
    }
    
    // Check for missing game ID
    if (!gameId || gameId === 'undefined' || gameId === '' || gameId === 'null') {
      console.log(`[lifecycle:discover] SKIP no_game_id league=${league} raw_id=${game.game?.id ?? game.fixture?.id ?? game.id}`);
      skipStats.skippedNoGameId++;
      return null;
    }
    
    // RELAXED: If no start time, use current time as fallback
    if (!startTime) {
      console.log(`[lifecycle:discover] WARN no_start_time gameId=${gameId} league=${league} - using now()`);
      skipStats.skippedNoStartTime++;
      startTime = new Date().toISOString();
      // RELAXED: Don't skip, just log warning
      // return null;
    }
    
    // Normalize status
    const statusNorm = normalizeStatus('api-sports', rawStatus, {
      homeScore,
      awayScore,
      startTime,
    });
    
    return {
      league: leagueNormalized,
      external_game_id: gameId,
      provider: 'api-sports',
      season: dateSeason,
      starts_at: startTime,
      status: rawStatus,
      status_raw: rawStatus,
      status_norm: statusNorm,
      home_team: homeTeam,
      away_team: awayTeam,
      home_score: homeScore,
      away_score: awayScore,
    };
    
  } catch (err) {
    console.log(`[lifecycle:discover] SKIP normalize_error league=${league} error=${err instanceof Error ? err.message : 'Unknown'}`);
    skipStats.skippedNormalizeFailed++;
    return null;
  }
}

// ============================================================================
// SYNC JOB
// ============================================================================

/**
 * Helper: Perform upsert with schema-cache retry logic
 * If upsert fails due to schema cache issue with last_synced_at, retry without it
 */
async function upsertWithSchemaCacheRetry(
  adminClient: SupabaseClient,
  payload: Record<string, any>,
  schema: SchemaInfo,
  onConflictKey: string
): Promise<{ success: boolean; error?: string }> {
  // First attempt with full payload
  const { error: firstError } = await adminClient
    .from('sports_games')
    .upsert(payload, { onConflict: onConflictKey });
  
  if (!firstError) {
    return { success: true };
  }
  
  // Check if this is a schema cache error for last_synced_at
  const errorMsg = firstError.message || '';
  const isSchemaCache = errorMsg.toLowerCase().includes('schema cache');
  const isLastSyncedAt = errorMsg.includes('last_synced_at');
  
  if (isSchemaCache && isLastSyncedAt) {
    console.log('[lifecycle:sync] retry_without_last_synced_at due_to_schema_cache');
    
    // Retry without last_synced_at
    const retryPayload = { ...payload };
    delete retryPayload.last_synced_at;
    
    const { error: retryError } = await adminClient
      .from('sports_games')
      .upsert(retryPayload, { onConflict: onConflictKey });
    
    if (!retryError) {
      return { success: true };
    }
    
    return { 
      success: false, 
      error: `Retry failed: ${retryError.message} (original: schema cache issue)` 
    };
  }
  
  // Other schema cache issues - try without the problematic column
  if (isSchemaCache) {
    // Extract column name from error message
    const columnMatch = errorMsg.match(/'([^']+)' column/);
    if (columnMatch) {
      const problemColumn = columnMatch[1];
      console.log(`[lifecycle:sync] retry_without_${problemColumn} due_to_schema_cache`);
      
      const retryPayload = { ...payload };
      delete retryPayload[problemColumn];
      
      const { error: retryError } = await adminClient
        .from('sports_games')
        .upsert(retryPayload, { onConflict: onConflictKey });
      
      if (!retryError) {
        return { success: true };
      }
    }
  }
  
  return { 
    success: false, 
    error: `${firstError.message} (hint: notify pgrst, 'reload schema')` 
  };
}

/**
 * Sync live games and games within the window
 * Updates scores and status for active games
 * 
 * Uses schema detection to avoid schema cache errors.
 */
export async function syncLiveAndWindowGames(
  adminClient: SupabaseClient,
  options?: {
    leagues?: SupportedLeague[];
    maxGames?: number; // Batch limit
  }
): Promise<MultiLeagueJobResult> {
  const startTime = Date.now();
  const leagues = options?.leagues || ENABLED_LEAGUES;
  const maxGames = options?.maxGames ?? 200; // Default limit
  
  console.log(`[lifecycle:sync] START leagues=${leagues.join(',')}`);
  
  // Detect schema once at the start
  const schema = await detectTableSchema(adminClient);
  const hasLastSyncedAt = schema.columns.has('last_synced_at');
  const onConflictKey = schema.uniqueKey.join(',');
  
  console.log(`[lifecycle:sync] schema has_last_synced_at=${hasLastSyncedAt} onConflict=${onConflictKey}`);
  
  const results: JobResult[] = [];
  let totalFetched = 0;
  let totalUpserted = 0;
  let totalFinalized = 0;
  let totalEnqueued = 0;
  let firstError: MultiLeagueJobResult['firstError'] = undefined;
  
  for (const league of leagues) {
    const leagueStart = Date.now();
    const errors: string[] = [];
    let fetched = 0;
    let upserted = 0;
    let finalized = 0;
    let enqueued = 0;
    let leagueFirstError: JobResult['firstError'] = undefined;
    
    try {
      // Fetch live games from provider
      const liveGames = await fetchLiveGames(league);
      
      // Also fetch today's games to catch transitions
      const today = new Date().toISOString().split('T')[0];
      const todayGames = await fetchGamesForDate(league, today);
      
      // Combine and deduplicate
      const allGames = [...liveGames];
      const liveIds = new Set(liveGames.map(g => extractGameId(g, league)));
      
      for (const game of todayGames) {
        const gameId = extractGameId(game, league);
        if (!liveIds.has(gameId)) {
          allGames.push(game);
        }
      }
      
      fetched = allGames.length;
      
      if (allGames.length > 0) {
        const dateSeason = seasonForDate(league, new Date());
        
        // Process each game
        for (const game of allGames) {
          try {
            const normalized = normalizeGameWithStatus(game, league, dateSeason);
            if (!normalized || !isRealGame(normalized.home_team, normalized.away_team)) {
              continue;
            }
            
            // Check if this game exists and get current status
            const { data: existing } = await adminClient
              .from('sports_games')
              .select('id, status_norm, finalized_at')
              .eq('league', league.toLowerCase())
              .eq('external_game_id', normalized.external_game_id)
              .single();
            
            // Build payload using detected schema
            const payload = buildGamePayload(normalized, schema);
            
            // Add last_synced_at only if column exists in schema
            if (hasLastSyncedAt) {
              payload.last_synced_at = new Date().toISOString();
            }
            
            // Upsert with retry logic for schema cache issues
            const upsertResult = await upsertWithSchemaCacheRetry(
              adminClient, 
              payload, 
              schema,
              onConflictKey
            );
            
            if (!upsertResult.success) {
              errors.push(`Upsert ${normalized.external_game_id}: ${upsertResult.error}`);
              if (!leagueFirstError) {
                leagueFirstError = {
                  message: upsertResult.error || 'Unknown upsert error',
                };
              }
              continue;
            }
            
            upserted++;
            
            // Check if game just became FINAL
            const newStatus = normalized.status_norm as StatusNorm;
            const wasNotFinal = !existing || existing.status_norm !== 'FINAL';
            const isNowFinal = newStatus === 'FINAL';
            
            if (wasNotFinal && isNowFinal && existing?.id) {
              // Update finalized_at and winner
              const winner = determineWinner(normalized.home_score, normalized.away_score);
              
              await adminClient
                .from('sports_games')
                .update({
                  finalized_at: new Date().toISOString(),
                  winner_side: winner,
                })
                .eq('id', existing.id);
              
              finalized++;
              
              // Enqueue for settlement
              const enqueueResult = await enqueueSettlement(adminClient, existing.id, normalized, winner);
              if (enqueueResult) {
                enqueued++;
              }
            }
            
            // Also handle CANCELED transitions
            if (wasNotFinal && newStatus === 'CANCELED' && existing?.id) {
              await adminClient
                .from('sports_games')
                .update({
                  finalized_at: new Date().toISOString(),
                })
                .eq('id', existing.id);
              
              finalized++;
              
              // Enqueue as SKIPPED for market closure
              await enqueueSettlement(adminClient, existing.id, normalized, null, 'CANCELED');
              enqueued++;
            }
            
          } catch (err) {
            const errMsg = `Game processing: ${err instanceof Error ? err.message : 'Unknown'}`;
            errors.push(errMsg);
            if (!leagueFirstError) {
              leagueFirstError = { message: errMsg };
            }
          }
        }
      }
      
      totalFetched += fetched;
      totalUpserted += upserted;
      totalFinalized += finalized;
      totalEnqueued += enqueued;
      
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(errMsg);
      if (!leagueFirstError) {
        leagueFirstError = { message: errMsg };
      }
    }
    
    // Capture first error across all leagues
    if (leagueFirstError && !firstError) {
      firstError = { ...leagueFirstError, league };
    }
    
    results.push({
      success: errors.length === 0,
      league,
      fetched,
      upserted,
      finalized,
      enqueued,
      errors,
      duration: Date.now() - leagueStart,
      firstError: leagueFirstError,
    });
    
    console.log(`[lifecycle:sync] ${league} fetched=${fetched} upserted=${upserted} finalized=${finalized} enqueued=${enqueued}`);
  }
  
  const duration = Date.now() - startTime;
  console.log(`[lifecycle:sync] COMPLETE total_finalized=${totalFinalized} total_enqueued=${totalEnqueued} duration=${duration}ms`);
  
  return {
    success: results.every(r => r.success),
    results,
    totalFetched,
    totalUpserted,
    totalFinalized,
    totalEnqueued,
    duration,
    firstError,
  };
}

// ============================================================================
// FINALIZE JOB
// ============================================================================

/**
 * Debug result for finalize candidates
 */
export interface FinalizeCandidateDebug {
  id: number;
  league: string;
  external_game_id: string;
  home_team?: string;
  away_team?: string;
  starts_at?: string;
  status_raw?: string;
  status_norm?: string;
  finalized_at?: string;
  provider_status?: string;
  provider_status_norm?: string;
  markets_count?: number;
}

export interface FinalizeDebugResult {
  candidates: FinalizeCandidateDebug[];
  stats: {
    total_candidates: number;
    already_final: number;
    still_live: number;
    still_scheduled: number;
    provider_not_found: number;
    final_flipped: number;
    final_no_markets: number;
    final_with_markets: number;
  };
}

/**
 * Get finalize candidates for debugging (admin only)
 */
export async function getFinalizeCandidates(
  adminClient: SupabaseClient
): Promise<FinalizeDebugResult> {
  const candidates: FinalizeCandidateDebug[] = [];
  const stats = {
    total_candidates: 0,
    already_final: 0,
    still_live: 0,
    still_scheduled: 0,
    provider_not_found: 0,
    final_flipped: 0,
    final_no_markets: 0,
    final_with_markets: 0,
  };
  
  // Query candidates: games that started > 4 hours ago, not finalized
  const cutoffTime = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  
  const { data: candidateGames, error } = await adminClient
    .from('sports_games')
    .select('*')
    .lt('starts_at', cutoffTime)
    .is('finalized_at', null)
    .in('status_norm', ['SCHEDULED', 'LIVE'])
    .order('starts_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('[lifecycle:debug] Candidate query error:', error.message);
    return { candidates, stats };
  }
  
  stats.total_candidates = candidateGames?.length || 0;
  
  console.log(`[lifecycle:debug] Found ${stats.total_candidates} finalize candidates`);
  
  // Log sample candidates
  if (candidateGames && candidateGames.length > 0) {
    const sample = candidateGames.slice(0, 5);
    for (const g of sample) {
      console.log(`[lifecycle:debug] CANDIDATE league=${g.league} id=${g.external_game_id} starts=${g.starts_at} status_raw=${g.status_raw} status_norm=${g.status_norm}`);
    }
  }
  
  // Check each candidate against provider and markets
  for (const game of candidateGames || []) {
    const candidate: FinalizeCandidateDebug = {
      id: game.id,
      league: game.league,
      external_game_id: game.external_game_id,
      home_team: game.home_team,
      away_team: game.away_team,
      starts_at: game.starts_at,
      status_raw: game.status_raw,
      status_norm: game.status_norm,
      finalized_at: game.finalized_at,
    };
    
    // Try to fetch from provider to see current status
    try {
      const gameDate = game.starts_at?.split('T')[0] || new Date().toISOString().split('T')[0];
      const leagueUpper = game.league.toUpperCase() as SupportedLeague;
      
      if (ENABLED_LEAGUES.includes(leagueUpper)) {
        const providerGames = await fetchGamesForDate(leagueUpper, gameDate);
        
        const matchingGame = providerGames.find(g => {
          const gameId = extractGameId(g, leagueUpper);
          return String(gameId) === String(game.external_game_id);
        });
        
        if (matchingGame) {
          const dateSeason = seasonForDate(leagueUpper, new Date(gameDate));
          const normalized = normalizeGameWithStatus(matchingGame, leagueUpper, dateSeason);
          
          if (normalized) {
            candidate.provider_status = normalized.status;
            candidate.provider_status_norm = normalized.status_norm;
            
            if (normalized.status_norm === 'FINAL') {
              stats.final_flipped++;
            } else if (normalized.status_norm === 'LIVE') {
              stats.still_live++;
            } else {
              stats.still_scheduled++;
            }
          }
        } else {
          stats.provider_not_found++;
        }
      }
    } catch (err) {
      console.log(`[lifecycle:debug] Provider fetch error for ${game.external_game_id}: ${err}`);
    }
    
    // Check for linked markets
    try {
      // Try different ways markets might be linked
      const { count: marketsById } = await adminClient
        .from('markets')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', game.id);
      
      const { count: marketsByExtId } = await adminClient
        .from('markets')
        .select('*', { count: 'exact', head: true })
        .eq('external_game_id', game.external_game_id);
      
      candidate.markets_count = (marketsById || 0) + (marketsByExtId || 0);
      
      if (candidate.provider_status_norm === 'FINAL') {
        if (candidate.markets_count > 0) {
          stats.final_with_markets++;
        } else {
          stats.final_no_markets++;
        }
      }
    } catch (err) {
      // Markets table might not exist or have different structure
      candidate.markets_count = 0;
    }
    
    candidates.push(candidate);
    
    await sleep(25); // Rate limit
  }
  
  console.log(`[lifecycle:debug] STATS total=${stats.total_candidates} final_flipped=${stats.final_flipped} still_live=${stats.still_live} still_scheduled=${stats.still_scheduled} provider_not_found=${stats.provider_not_found} final_no_markets=${stats.final_no_markets} final_with_markets=${stats.final_with_markets}`);
  
  return { candidates, stats };
}

/**
 * Finalize stuck games and enqueue settlements
 * Catches games that may have been missed
 * 
 * Uses schema detection to avoid schema cache errors.
 */
export async function finalizeAndEnqueueSettlements(
  adminClient: SupabaseClient,
  options?: {
    leagues?: SupportedLeague[];
    stuckThresholdHours?: number;
    maxGames?: number; // Batch limit
  }
): Promise<MultiLeagueJobResult> {
  const startTime = Date.now();
  const leagues = options?.leagues || ENABLED_LEAGUES;
  const stuckThreshold = options?.stuckThresholdHours ?? 4;
  const maxGames = options?.maxGames ?? 100; // Default limit
  
  console.log(`[lifecycle:finalize] START leagues=${leagues.join(',')}`);
  
  // Detect schema once at the start
  const schema = await detectTableSchema(adminClient);
  const hasLastSyncedAt = schema.columns.has('last_synced_at');
  
  console.log(`[lifecycle:finalize] schema has_last_synced_at=${hasLastSyncedAt}`);
  
  const results: JobResult[] = [];
  let totalFinalized = 0;
  let totalEnqueued = 0;
  let totalCandidates = 0;
  let totalFinalNoMarkets = 0;
  let firstError: MultiLeagueJobResult['firstError'] = undefined;
  
  for (const league of leagues) {
    const leagueStart = Date.now();
    const errors: string[] = [];
    let finalized = 0;
    let enqueued = 0;
    let candidates = 0;
    let finalNoMarkets = 0;
    let leagueFirstError: JobResult['firstError'] = undefined;
    
    try {
      // Find games that are LIVE or stuck SCHEDULED (started > stuckThreshold hours ago)
      const cutoffTime = new Date(Date.now() - stuckThreshold * 60 * 60 * 1000).toISOString();
      
      // More permissive query: also include NULL status_norm
      const { data: stuckGames, error: queryError } = await adminClient
        .from('sports_games')
        .select('*')
        .eq('league', league.toLowerCase())
        .lt('starts_at', cutoffTime)
        .is('finalized_at', null)
        .limit(maxGames);
      
      if (queryError) {
        const errMsg = `Query error: ${queryError.message}`;
        errors.push(errMsg);
        if (!leagueFirstError) {
          leagueFirstError = { message: errMsg };
        }
        console.error(`[lifecycle:finalize] ${league} QUERY_ERROR ${queryError.message}`);
        continue;
      }
      
      candidates = stuckGames?.length || 0;
      totalCandidates += candidates;
      
      if (!stuckGames || stuckGames.length === 0) {
        console.log(`[lifecycle:finalize] ${league} NO_CANDIDATES cutoff=${cutoffTime}`);
        results.push({
          success: true,
          league,
          fetched: candidates,
          upserted: 0,
          finalized: 0,
          enqueued: 0,
          errors: [],
          duration: Date.now() - leagueStart,
        });
        continue;
      }
      
      console.log(`[lifecycle:finalize] ${league} CANDIDATES=${stuckGames.length} cutoff=${cutoffTime}`);
      
      // Log sample candidates
      const sample = stuckGames.slice(0, 3);
      for (const g of sample) {
        console.log(`[lifecycle:finalize] ${league} SAMPLE id=${g.external_game_id} starts=${g.starts_at} status_raw=${g.status_raw} status_norm=${g.status_norm}`);
      }
      
      // Re-fetch each game from provider to check current status
      for (const game of stuckGames) {
        try {
          // Fetch games for the game's date (not just today)
          const gameDate = game.starts_at?.split('T')[0] || new Date().toISOString().split('T')[0];
          const providerGames = await fetchGamesForDate(league as SupportedLeague, gameDate);
          
          // Find matching game
          const matchingGame = providerGames.find(g => {
            const gameId = extractGameId(g, league as SupportedLeague);
            return String(gameId) === String(game.external_game_id);
          });
          
          if (!matchingGame) {
            console.log(`[lifecycle:finalize] ${league} PROVIDER_NOT_FOUND id=${game.external_game_id} date=${gameDate}`);
            continue;
          }
          
          const dateSeason = seasonForDate(league as SupportedLeague, new Date(gameDate));
          const normalized = normalizeGameWithStatus(matchingGame, league as SupportedLeague, dateSeason);
          
          if (!normalized) {
            console.log(`[lifecycle:finalize] ${league} NORMALIZE_FAILED id=${game.external_game_id}`);
            continue;
          }
          
          const newStatus = normalized.status_norm as StatusNorm;
          console.log(`[lifecycle:finalize] ${league} PROVIDER_STATUS id=${game.external_game_id} raw=${normalized.status} norm=${newStatus}`);
          
          if (newStatus === 'FINAL' || newStatus === 'CANCELED') {
            const winner = newStatus === 'FINAL' 
              ? determineWinner(normalized.home_score, normalized.away_score)
              : null;
            
            // Check for linked markets BEFORE enqueuing
            const { count: marketsCount } = await adminClient
              .from('markets')
              .select('*', { count: 'exact', head: true })
              .or(`game_id.eq.${game.id},external_game_id.eq.${game.external_game_id}`);
            
            console.log(`[lifecycle:finalize] ${league} MARKETS_CHECK id=${game.external_game_id} markets=${marketsCount || 0}`);
            
            // Build update payload - only include last_synced_at if column exists
            const updatePayload: Record<string, any> = {
              status_raw: normalized.status,
              status_norm: newStatus,
              home_score: normalized.home_score,
              away_score: normalized.away_score,
              winner_side: winner,
              finalized_at: new Date().toISOString(),
            };
            
            if (hasLastSyncedAt) {
              updatePayload.last_synced_at = new Date().toISOString();
            }
            
            // Update game with retry logic
            const { error: updateError } = await adminClient
              .from('sports_games')
              .update(updatePayload)
              .eq('id', game.id);
            
            if (updateError) {
              // Retry without last_synced_at if schema cache error
              if (updateError.message?.includes('schema cache') && updateError.message?.includes('last_synced_at')) {
                console.log('[lifecycle:finalize] retry_without_last_synced_at due_to_schema_cache');
                delete updatePayload.last_synced_at;
                await adminClient.from('sports_games').update(updatePayload).eq('id', game.id);
              } else {
                errors.push(`Update ${game.external_game_id}: ${updateError.message}`);
                continue;
              }
            }
            
            finalized++;
            console.log(`[lifecycle:finalize] ${league} FINALIZED id=${game.external_game_id} winner=${winner}`);
            
            // Lock all markets for this game (in addition to DB trigger)
            if ((marketsCount || 0) > 0) {
              const { data: lockedMarkets } = await adminClient
                .from('markets')
                .update({
                  is_locked: true,
                  lock_reason: 'GAME_FINAL',
                  locked_at: new Date().toISOString(),
                })
                .eq('sports_game_id', game.id)
                .eq('is_locked', false)
                .select('id');
              
              const lockedCount = lockedMarkets?.length || 0;
              console.log(`[lifecycle:finalize] locked_markets=${lockedCount} for game_id=${game.id}`);
            }
            
            // Only enqueue if markets exist
            if ((marketsCount || 0) > 0) {
              const reason = newStatus === 'CANCELED' ? 'CANCELED' : undefined;
              const enqueueResult = await enqueueSettlement(
                adminClient, 
                game.id, 
                { ...game, ...normalized }, 
                winner,
                reason
              );
              
              if (enqueueResult) {
                enqueued++;
                console.log(`[lifecycle:finalize] ${league} ENQUEUED id=${game.external_game_id}`);
              }
            } else {
              finalNoMarkets++;
              totalFinalNoMarkets++;
              console.log(`[lifecycle:finalize] ${league} FINAL_NO_MARKETS id=${game.external_game_id} (skipping enqueue)`);
            }
          }
          
          await sleep(50); // Rate limit
          
        } catch (err) {
          const errMsg = `Game ${game.external_game_id}: ${err instanceof Error ? err.message : 'Unknown'}`;
          errors.push(errMsg);
          if (!leagueFirstError) {
            leagueFirstError = { message: errMsg };
          }
        }
      }
      
      totalFinalized += finalized;
      totalEnqueued += enqueued;
      
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(errMsg);
      if (!leagueFirstError) {
        leagueFirstError = { message: errMsg };
      }
    }
    
    // Capture first error across all leagues
    if (leagueFirstError && !firstError) {
      firstError = { ...leagueFirstError, league };
    }
    
    results.push({
      success: errors.length === 0,
      league,
      fetched: candidates,
      upserted: 0,
      finalized,
      enqueued,
      errors,
      duration: Date.now() - leagueStart,
      firstError: leagueFirstError,
    });
    
    console.log(`[lifecycle:finalize] ${league} DONE candidates=${candidates} finalized=${finalized} enqueued=${enqueued} finalNoMarkets=${finalNoMarkets}`);
  }
  
  const duration = Date.now() - startTime;
  console.log(`[lifecycle:finalize] COMPLETE total_candidates=${totalCandidates} total_finalized=${totalFinalized} total_enqueued=${totalEnqueued} total_final_no_markets=${totalFinalNoMarkets} duration=${duration}ms`);
  
  return {
    success: results.every(r => r.success),
    results,
    totalFetched: totalCandidates,
    totalUpserted: 0,
    totalFinalized,
    totalEnqueued,
    duration,
    firstError,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Normalize game data with status_norm
 */
function normalizeGameWithStatus(
  game: any, 
  league: SupportedLeague, 
  dateSeason: number
): (GameRecord & { status_norm: string }) | null {
  const leagueNormalized = league.toLowerCase();
  
  // Handle different API structures
  let gameId: string;
  let startTime: string;
  let homeTeam: string;
  let awayTeam: string;
  let homeScore: number | null = null;
  let awayScore: number | null = null;
  let rawStatus: string;
  
  if (league === 'SOCCER') {
    // Soccer uses fixture structure
    gameId = String(game.fixture?.id ?? game.id);
    startTime = parseDate(game.fixture) || new Date().toISOString();
    homeTeam = game.teams?.home?.name ?? 'Unknown';
    awayTeam = game.teams?.away?.name ?? 'Unknown';
    homeScore = parseScore(game.goals?.home ?? game.score?.fulltime?.home);
    awayScore = parseScore(game.goals?.away ?? game.score?.fulltime?.away);
    rawStatus = game.fixture?.status?.short ?? game.fixture?.status?.long ?? 'NS';
  } else {
    // American sports structure
    gameId = String(game.game?.id ?? game.id);
    const dateObj = game.game?.date ?? game.date;
    startTime = parseDate(dateObj) || new Date().toISOString();
    homeTeam = game.teams?.home?.name ?? 'Unknown';
    awayTeam = game.teams?.away?.name ?? 'Unknown';
    homeScore = parseScore(game.scores?.home?.total ?? game.scores?.home);
    awayScore = parseScore(game.scores?.away?.total ?? game.scores?.away);
    rawStatus = game.game?.status?.short ?? game.game?.status?.long ?? game.status?.short ?? 'NS';
  }
  
  if (!gameId || gameId === 'undefined') {
    return null;
  }
  
  // Normalize status
  const statusNorm = normalizeStatus('api-sports', rawStatus, {
    homeScore,
    awayScore,
    startTime,
  });
  
  return {
    league: leagueNormalized,
    external_game_id: gameId,
    provider: 'api-sports',
    season: dateSeason,
    starts_at: startTime,
    status: rawStatus,
    status_norm: statusNorm,
    home_team: homeTeam,
    away_team: awayTeam,
    home_score: homeScore,
    away_score: awayScore,
  };
}

/**
 * Extract game ID from different API structures
 */
function extractGameId(game: any, league: SupportedLeague): string {
  if (league === 'SOCCER') {
    return String(game.fixture?.id ?? game.id);
  }
  return String(game.game?.id ?? game.id);
}

/**
 * Parse date from various formats
 */
function parseDate(dateData: any): string | null {
  if (!dateData) return null;
  
  if (dateData.timestamp) {
    const ts = Number(dateData.timestamp);
    if (Number.isFinite(ts)) {
      return new Date(ts * 1000).toISOString();
    }
  }
  
  if (dateData.date && dateData.time) {
    try {
      return new Date(`${dateData.date}T${dateData.time}:00Z`).toISOString();
    } catch {
      return null;
    }
  }
  
  if (typeof dateData === 'string') {
    try {
      return new Date(dateData).toISOString();
    } catch {
      return null;
    }
  }
  
  if (dateData.date && typeof dateData.date === 'string') {
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
 * Enqueue a game for settlement (idempotent)
 */
async function enqueueSettlement(
  adminClient: SupabaseClient,
  gameId: number,
  game: any,
  winner: 'HOME' | 'AWAY' | 'DRAW' | null,
  reason?: string
): Promise<boolean> {
  try {
    // Check if already enqueued
    const { data: existing } = await adminClient
      .from('settlement_queue')
      .select('id')
      .eq('game_id', gameId)
      .single();
    
    if (existing) {
      console.log(`[lifecycle] Settlement already enqueued for game ${gameId}`);
      return false;
    }
    
    // Insert new settlement task
    const { error } = await adminClient
      .from('settlement_queue')
      .insert({
        game_id: gameId,
        league: game.league,
        external_game_id: game.external_game_id,
        provider: game.provider || 'api-sports',
        status: reason === 'CANCELED' ? 'SKIPPED' : 'QUEUED',
        outcome: winner || 'CANCELED',
        reason: reason || null,
      });
    
    if (error) {
      console.error(`[lifecycle] Failed to enqueue settlement for game ${gameId}:`, error.message);
      return false;
    }
    
    console.log(`[lifecycle] Enqueued settlement for game ${gameId} outcome=${winner || 'CANCELED'}`);
    return true;
    
  } catch (err) {
    console.error(`[lifecycle] Enqueue error for game ${gameId}:`, err);
    return false;
  }
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

