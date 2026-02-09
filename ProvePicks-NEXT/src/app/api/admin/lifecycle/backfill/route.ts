/**
 * Lifecycle Backfill API
 * 
 * POST - Start a backfill job for the last N days
 * GET - Get backfill status
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { 
  discoverGamesRollingWindow,
  finalizeAndEnqueueSettlements,
  acquireJobLock,
  releaseJobLock,
} from "@/lib/lifecycle";
import { fetchGamesForDate, seasonForDate } from "@/lib/apiSports/gameSync";
import { getLeagueConfig, SupportedLeague } from "@/lib/apiSports/leagueConfig";
import { normalizeStatus, determineWinner } from "@/lib/lifecycle/statusNorm";
import { isRealGame } from "@/lib/sports/placeholderTeams";

const ENABLED_LEAGUES: SupportedLeague[] = ['NFL', 'NBA', 'NHL', 'MLB', 'SOCCER'];

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export interface BackfillProgress {
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentDay?: number;
  totalDays?: number;
  currentLeague?: string;
  gamesProcessed: number;
  gamesUpserted: number;
  gamesFinalized: number;
  errors: string[];
  startedAt?: string;
  completedAt?: string;
}

// In-memory progress tracking (for this instance)
let backfillProgress: BackfillProgress = {
  status: 'idle',
  gamesProcessed: 0,
  gamesUpserted: 0,
  gamesFinalized: 0,
  errors: [],
};

export async function GET(request: NextRequest) {
  // Require admin auth
  const authResult = requireAdmin(request);
  if (!authResult.authenticated) {
    return authResult.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(backfillProgress);
}

export async function POST(request: NextRequest) {
  // Require admin auth
  const authResult = requireAdmin(request);
  if (!authResult.authenticated) {
    return authResult.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, days = 30, leagues = ENABLED_LEAGUES } = body;

    const adminClient = getAdminClient();

    if (action === 'cancel') {
      // Cancel the running backfill
      backfillProgress.status = 'idle';
      await releaseJobLock(adminClient, 'backfill');
      return NextResponse.json({ success: true, message: 'Backfill cancelled' });
    }

    if (action === 'status') {
      return NextResponse.json(backfillProgress);
    }

    // Start backfill
    if (backfillProgress.status === 'running') {
      return NextResponse.json({
        success: false,
        error: 'Backfill already running',
        progress: backfillProgress,
      }, { status: 409 });
    }

    // Acquire lock
    const lockResult = await acquireJobLock(adminClient, 'backfill', { ttlMinutes: 60 });
    if (!lockResult.acquired) {
      return NextResponse.json({
        success: false,
        error: 'Could not acquire backfill lock',
        existingLock: lockResult.existingLock,
      }, { status: 409 });
    }

    // Reset progress
    backfillProgress = {
      status: 'running',
      currentDay: 0,
      totalDays: days,
      gamesProcessed: 0,
      gamesUpserted: 0,
      gamesFinalized: 0,
      errors: [],
      startedAt: new Date().toISOString(),
    };

    // Start backfill in background (non-blocking)
    runBackfill(adminClient, days, leagues).catch(err => {
      console.error('[backfill] Fatal error:', err);
      backfillProgress.status = 'failed';
      backfillProgress.errors.push(err.message || 'Unknown fatal error');
    }).finally(() => {
      releaseJobLock(adminClient, 'backfill');
    });

    return NextResponse.json({
      success: true,
      message: `Backfill started for ${days} days`,
      progress: backfillProgress,
    });

  } catch (error) {
    console.error("[backfill] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function runBackfill(
  adminClient: any,
  days: number,
  leagues: SupportedLeague[]
) {
  const now = new Date();
  
  // Process day by day (from oldest to newest)
  for (let dayOffset = days; dayOffset >= 0; dayOffset--) {
    if (backfillProgress.status !== 'running') {
      console.log('[backfill] Cancelled');
      return;
    }

    const date = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    backfillProgress.currentDay = days - dayOffset + 1;
    
    console.log(`[backfill] Processing day ${backfillProgress.currentDay}/${days}: ${dateStr}`);

    for (const league of leagues) {
      if (backfillProgress.status !== 'running') return;
      
      backfillProgress.currentLeague = league;
      
      try {
        // Fetch games for this day
        const games = await fetchGamesForDate(league, dateStr);
        const dateSeason = seasonForDate(league, date);
        
        // Process and upsert games
        for (const game of games) {
          const normalized = normalizeGameForBackfill(game, league, dateSeason);
          if (!normalized) continue;
          if (!isRealGame(normalized.home_team, normalized.away_team)) continue;
          
          backfillProgress.gamesProcessed++;
          
          // Upsert game
          const { error: upsertError } = await adminClient
            .from('sports_games')
            .upsert(normalized, { onConflict: 'league,external_game_id' });
          
          if (upsertError) {
            backfillProgress.errors.push(`${dateStr}/${league}: ${upsertError.message}`);
          } else {
            backfillProgress.gamesUpserted++;
            
            // If game is FINAL, check if it needs settlement queue entry
            if (normalized.status_norm === 'FINAL') {
              await ensureSettlementEnqueued(adminClient, normalized);
              backfillProgress.gamesFinalized++;
            }
          }
        }
        
        // Small delay between leagues
        await sleep(100);
        
      } catch (err) {
        const errorMsg = `${dateStr}/${league}: ${err instanceof Error ? err.message : 'Unknown'}`;
        console.error(`[backfill] Error:`, errorMsg);
        backfillProgress.errors.push(errorMsg);
      }
    }
    
    // Small delay between days
    await sleep(200);
  }
  
  // Run finalize to catch any missed games
  console.log('[backfill] Running finalize job...');
  try {
    await finalizeAndEnqueueSettlements(adminClient);
  } catch (err) {
    console.error('[backfill] Finalize error:', err);
  }
  
  backfillProgress.status = 'completed';
  backfillProgress.completedAt = new Date().toISOString();
  console.log(`[backfill] Complete: ${backfillProgress.gamesUpserted} games, ${backfillProgress.gamesFinalized} finalized`);
}

function normalizeGameForBackfill(
  game: any,
  league: SupportedLeague,
  dateSeason: number
): any | null {
  const leagueNormalized = league.toLowerCase();
  
  let gameId: string;
  let startTime: string;
  let homeTeam: string;
  let awayTeam: string;
  let homeScore: number | null = null;
  let awayScore: number | null = null;
  let rawStatus: string;
  
  if (league === 'SOCCER') {
    gameId = String(game.fixture?.id ?? game.id);
    startTime = parseDate(game.fixture) || new Date().toISOString();
    homeTeam = game.teams?.home?.name ?? 'Unknown';
    awayTeam = game.teams?.away?.name ?? 'Unknown';
    homeScore = parseScore(game.goals?.home ?? game.score?.fulltime?.home);
    awayScore = parseScore(game.goals?.away ?? game.score?.fulltime?.away);
    rawStatus = game.fixture?.status?.short ?? game.fixture?.status?.long ?? 'NS';
  } else {
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
  
  const statusNorm = normalizeStatus('api-sports', rawStatus, {
    homeScore,
    awayScore,
    startTime,
  });
  
  // Determine winner for FINAL games
  let winnerSide: 'HOME' | 'AWAY' | 'DRAW' | null = null;
  let finalizedAt: string | null = null;
  
  if (statusNorm === 'FINAL') {
    winnerSide = determineWinner(homeScore, awayScore);
    finalizedAt = new Date().toISOString();
  }
  
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
    winner_side: winnerSide,
    finalized_at: finalizedAt,
    last_synced_at: new Date().toISOString(),
  };
}

async function ensureSettlementEnqueued(adminClient: any, game: any): Promise<void> {
  // Check if game exists in DB first
  const { data: existingGame } = await adminClient
    .from('sports_games')
    .select('id, settled_at')
    .eq('league', game.league)
    .eq('external_game_id', game.external_game_id)
    .single();
  
  if (!existingGame || existingGame.settled_at) {
    return; // Already settled or doesn't exist
  }
  
  // Check if already in queue
  const { data: existingQueue } = await adminClient
    .from('settlement_queue')
    .select('id')
    .eq('game_id', existingGame.id)
    .single();
  
  if (existingQueue) {
    return; // Already queued
  }
  
  // Enqueue for settlement
  await adminClient
    .from('settlement_queue')
    .insert({
      game_id: existingGame.id,
      league: game.league,
      external_game_id: game.external_game_id,
      provider: game.provider || 'api-sports',
      status: 'QUEUED',
      outcome: game.winner_side || 'DRAW',
    });
}

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

function parseScore(score: any): number | null {
  if (score === null || score === undefined) return null;
  const num = Number(score);
  return Number.isFinite(num) ? num : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
