/**
 * Settlement Processor
 * 
 * Processes settlement queue items, calculates winners, executes payouts
 * 
 * Key features:
 * - Receipt-based idempotency (double-pay impossible)
 * - CANCELED/POSTPONED full refund handling
 * - Platform fee on wins only (0% on refunds)
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface SettlementQueueItem {
  id: string;
  game_id: number;
  league: string;
  external_game_id: string;
  provider: string;
  status: 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED' | 'SKIPPED';
  outcome: string | null;
  reason: string | null;
  attempts: number;
  next_attempt_at: string;
  locked_by: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementResult {
  success: boolean;
  queueItemId: string;
  gameId: number;
  marketsSettled: number;
  payoutsCreated: number;
  refundsCreated: number;
  totalPayoutAmount: number;
  totalRefundAmount: number;
  totalFeeAmount: number;
  receiptsCreated: number;
  skippedDueToReceipt: number;
  error?: string;
}

export interface SettlementPreview {
  gameId: number;
  outcome: string;
  markets: {
    marketId: string;
    grossPool: number;
    winningPool: number;
    losingPool: number;
    platformFee: number;
    netDistributed: number;
    winnersCount: number;
    losersCount: number;
    feeRate: number;
  }[];
  totals: {
    grossPool: number;
    winningPool: number;
    losingPool: number;
    platformFee: number;
    netDistributed: number;
    winnersCount: number;
    losersCount: number;
  };
}

export interface SettlementReceipt {
  id: string;
  settlement_queue_id: string;
  market_id: string;
  game_id: number;
  user_id: string;
  receipt_type: 'PAYOUT' | 'REFUND' | 'FEE';
  status: 'INITIATED' | 'CONFIRMED' | 'FAILED';
  amount: number;
  currency: string;
  payout_id?: string;
  ledger_entry_id?: string;
  tx_hash?: string;
  initiated_at: string;
  confirmed_at?: string;
  failed_at?: string;
  failure_reason?: string;
}

// Platform fee (3%) - deducted from losing side, NOT refunds
const PLATFORM_FEE_RATE = 0.03;

// Worker ID for locking
const WORKER_ID = process.env.ADMIN_WORKER_ID || `worker-${Date.now()}`;

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

/**
 * List settlement queue items
 */
export async function listSettlementQueue(
  adminClient: SupabaseClient,
  options?: {
    status?: string[];
    league?: string;
    limit?: number;
  }
): Promise<SettlementQueueItem[]> {
  let query = adminClient
    .from('settlement_queue')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (options?.status && options.status.length > 0) {
    query = query.in('status', options.status);
  }
  
  if (options?.league) {
    query = query.eq('league', options.league);
  }
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[settlement] Failed to list queue:', error.message);
    return [];
  }
  
  return (data || []) as SettlementQueueItem[];
}

/**
 * Get queue statistics
 */
export async function getQueueStats(
  adminClient: SupabaseClient
): Promise<{
  queued: number;
  processing: number;
  done: number;
  failed: number;
  skipped: number;
  total: number;
}> {
  const { data, error } = await adminClient
    .from('settlement_queue')
    .select('status');
  
  if (error) {
    console.error('[settlement] Failed to get queue stats:', error.message);
    return { queued: 0, processing: 0, done: 0, failed: 0, skipped: 0, total: 0 };
  }
  
  const items = data || [];
  return {
    queued: items.filter(i => i.status === 'QUEUED').length,
    processing: items.filter(i => i.status === 'PROCESSING').length,
    done: items.filter(i => i.status === 'DONE').length,
    failed: items.filter(i => i.status === 'FAILED').length,
    skipped: items.filter(i => i.status === 'SKIPPED').length,
    total: items.length,
  };
}

/**
 * Lock a queue item for processing (atomic)
 */
export async function lockNextQueueItem(
  adminClient: SupabaseClient
): Promise<SettlementQueueItem | null> {
  const now = new Date().toISOString();
  
  // Find and lock the next available item
  const { data, error } = await adminClient
    .from('settlement_queue')
    .update({
      status: 'PROCESSING',
      locked_by: WORKER_ID,
      locked_at: now,
    })
    .eq('status', 'QUEUED')
    .lte('next_attempt_at', now)
    .is('locked_by', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .select()
    .single();
  
  if (error) {
    if (error.code !== 'PGRST116') { // No rows returned
      console.error('[settlement] Failed to lock queue item:', error.message);
    }
    return null;
  }
  
  return data as SettlementQueueItem;
}

/**
 * Mark a queue item as done
 */
export async function markQueueItemDone(
  adminClient: SupabaseClient,
  queueItemId: string
): Promise<boolean> {
  const { error } = await adminClient
    .from('settlement_queue')
    .update({
      status: 'DONE',
      locked_by: null,
      locked_at: null,
    })
    .eq('id', queueItemId);
  
  if (error) {
    console.error('[settlement] Failed to mark item done:', error.message);
    return false;
  }
  
  return true;
}

/**
 * Mark a queue item as failed with retry
 */
export async function markQueueItemFailed(
  adminClient: SupabaseClient,
  queueItemId: string,
  reason: string
): Promise<boolean> {
  // Exponential backoff: 1min, 5min, 30min, 2hr, 12hr
  const { data: item } = await adminClient
    .from('settlement_queue')
    .select('attempts')
    .eq('id', queueItemId)
    .single();
  
  const attempts = (item?.attempts || 0) + 1;
  const backoffMinutes = [1, 5, 30, 120, 720][Math.min(attempts - 1, 4)];
  const nextAttempt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();
  
  const { error } = await adminClient
    .from('settlement_queue')
    .update({
      status: 'FAILED',
      reason,
      attempts,
      next_attempt_at: nextAttempt,
      locked_by: null,
      locked_at: null,
    })
    .eq('id', queueItemId);
  
  if (error) {
    console.error('[settlement] Failed to mark item failed:', error.message);
    return false;
  }
  
  return true;
}

// ============================================================================
// SETTLEMENT PROCESSING
// ============================================================================

/**
 * Check if a receipt exists for a user+market+type combination
 */
async function receiptExists(
  adminClient: SupabaseClient,
  marketId: string,
  userId: string,
  receiptType: 'PAYOUT' | 'REFUND' | 'FEE'
): Promise<boolean> {
  const { data } = await adminClient
    .from('settlement_receipts')
    .select('id')
    .eq('market_id', marketId)
    .eq('user_id', userId)
    .eq('receipt_type', receiptType)
    .single();
  
  return !!data;
}

/**
 * Create a settlement receipt (idempotent - uses unique constraint)
 */
async function createReceipt(
  adminClient: SupabaseClient,
  receipt: {
    settlement_queue_id: string;
    market_id: string;
    game_id: number;
    user_id: string;
    receipt_type: 'PAYOUT' | 'REFUND' | 'FEE';
    amount: number;
    currency: string;
  }
): Promise<{ id: string } | null> {
  const { data, error } = await adminClient
    .from('settlement_receipts')
    .insert({
      ...receipt,
      status: 'INITIATED',
      initiated_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  
  if (error) {
    // Duplicate key means already exists - that's fine (idempotent)
    if (error.code === '23505') {
      console.log(`[settlement] Receipt already exists for user ${receipt.user_id} market ${receipt.market_id} type ${receipt.receipt_type}`);
      return null;
    }
    console.error(`[settlement] Failed to create receipt:`, error.message);
    return null;
  }
  
  return data;
}

/**
 * Confirm a receipt after successful payout
 */
async function confirmReceipt(
  adminClient: SupabaseClient,
  receiptId: string,
  details: { payout_id?: string; ledger_entry_id?: string; tx_hash?: string }
): Promise<boolean> {
  const { error } = await adminClient
    .from('settlement_receipts')
    .update({
      status: 'CONFIRMED',
      confirmed_at: new Date().toISOString(),
      ...details,
    })
    .eq('id', receiptId);
  
  if (error) {
    console.error(`[settlement] Failed to confirm receipt ${receiptId}:`, error.message);
    return false;
  }
  
  return true;
}

/**
 * Fail a receipt after unsuccessful payout
 */
async function failReceipt(
  adminClient: SupabaseClient,
  receiptId: string,
  reason: string
): Promise<boolean> {
  const { error } = await adminClient
    .from('settlement_receipts')
    .update({
      status: 'FAILED',
      failed_at: new Date().toISOString(),
      failure_reason: reason,
    })
    .eq('id', receiptId);
  
  if (error) {
    console.error(`[settlement] Failed to fail receipt ${receiptId}:`, error.message);
    return false;
  }
  
  return true;
}

/**
 * Process a single settlement queue item
 */
export async function processSettlement(
  adminClient: SupabaseClient,
  queueItem: SettlementQueueItem
): Promise<SettlementResult> {
  const result: SettlementResult = {
    success: false,
    queueItemId: queueItem.id,
    gameId: queueItem.game_id,
    marketsSettled: 0,
    payoutsCreated: 0,
    refundsCreated: 0,
    totalPayoutAmount: 0,
    totalRefundAmount: 0,
    totalFeeAmount: 0,
    receiptsCreated: 0,
    skippedDueToReceipt: 0,
  };
  
  try {
    console.log(`[settlement] Processing game ${queueItem.game_id} outcome=${queueItem.outcome}`);
    
    // 1. Load game to verify it's final
    const { data: game, error: gameError } = await adminClient
      .from('sports_games')
      .select('*')
      .eq('id', queueItem.game_id)
      .single();
    
    if (gameError || !game) {
      throw new Error(`Game not found: ${gameError?.message || 'Unknown'}`);
    }
    
    // 2. IDEMPOTENCY CHECK #1: Game already settled
    if (game.settled_at) {
      console.log(`[settlement] Game ${queueItem.game_id} already settled at ${game.settled_at}`);
      await markQueueItemDone(adminClient, queueItem.id);
      result.success = true;
      return result;
    }
    
    // 3. IDEMPOTENCY CHECK #2: Check for existing market_settlements for this game
    const { data: existingGameSettlements, error: gsError } = await adminClient
      .from('market_settlements')
      .select('id')
      .eq('game_id', queueItem.game_id);
    
    if (!gsError && existingGameSettlements && existingGameSettlements.length > 0) {
      console.log(`[settlement] Game ${queueItem.game_id} has ${existingGameSettlements.length} existing market settlements`);
      // Game was partially or fully settled - mark as done
      await adminClient
        .from('sports_games')
        .update({ settled_at: new Date().toISOString() })
        .eq('id', queueItem.game_id);
      await markQueueItemDone(adminClient, queueItem.id);
      result.success = true;
      result.marketsSettled = existingGameSettlements.length;
      return result;
    }
    
    // 4. Find markets tied to this game (prefer sports_game_id, fallback to sportsdata_game_id)
    let markets: any[] | null = null;
    let marketsError: any = null;
    
    // Try by sports_game_id first (new FK binding)
    const { data: marketsByGameId, error: err1 } = await adminClient
      .from('markets')
      .select('*')
      .eq('sports_game_id', queueItem.game_id);
    
    if (!err1 && marketsByGameId && marketsByGameId.length > 0) {
      markets = marketsByGameId;
    } else {
      // Fallback to sportsdata_game_id (legacy binding)
      const { data: marketsByLegacy, error: err2 } = await adminClient
        .from('markets')
        .select('*')
        .eq('sportsdata_game_id', parseInt(queueItem.external_game_id))
        .eq('league', queueItem.league);
      
      if (err2) {
        marketsError = err2;
      } else {
        markets = marketsByLegacy;
      }
    }
    
    if (marketsError) {
      throw new Error(`Failed to find markets: ${marketsError.message}`);
    }
    
    if (!markets || markets.length === 0) {
      console.log(`[settlement] No markets found for game ${queueItem.game_id}`);
      
      // Still mark as done - no markets to settle
      await adminClient
        .from('sports_games')
        .update({ settled_at: new Date().toISOString() })
        .eq('id', queueItem.game_id);
      
      await markQueueItemDone(adminClient, queueItem.id);
      result.success = true;
      return result;
    }
    
    // SAFETY CHECK: Ensure all markets are locked before processing
    const unlockedMarkets = markets.filter((m: any) => !m.is_locked);
    if (unlockedMarkets.length > 0) {
      console.error(`[settlement] SAFETY_VIOLATION: ${unlockedMarkets.length} unlocked markets for game ${queueItem.game_id}`);
      
      // Auto-lock them now (shouldn't happen but safety net)
      await adminClient
        .from('markets')
        .update({
          is_locked: true,
          lock_reason: 'SETTLEMENT_SAFETY',
          locked_at: new Date().toISOString(),
        })
        .in('id', unlockedMarkets.map((m: any) => m.id));
      
      console.log(`[settlement] SAFETY_FIX: Auto-locked ${unlockedMarkets.length} markets`);
    }
    
    // Determine if this is a cancellation/postponement (full refund scenario)
    const outcome = queueItem.outcome || 'CANCELED';
    const isCancellation = outcome === 'CANCELED' || outcome === 'POSTPONED';
    
    // 5. Process each market
    for (const market of markets) {
      try {
        // Skip already settled markets
        if (market.market_status === 'settled' || market.market_status === 'void') {
          result.marketsSettled++;
          continue;
        }
        
        // Check if market settlement already exists (idempotent)
        const { data: existingSettlement } = await adminClient
          .from('market_settlements')
          .select('id')
          .eq('market_id', market.id)
          .single();
        
        if (existingSettlement) {
          console.log(`[settlement] Market ${market.id} already has settlement record`);
          result.marketsSettled++;
          continue;
        }
        
        // Update market status
        const newMarketStatus = isCancellation ? 'void' : 'settled';
        await adminClient
          .from('markets')
          .update({
            market_status: newMarketStatus,
            game_status: 'final',
            final_outcome: outcome,
          })
          .eq('id', market.id);
        
        // Find trades/positions for this market (from ledger_entries)
        const { data: trades } = await adminClient
          .from('ledger_entries')
          .select('*')
          .eq('market_id', market.id)
          .eq('entry_type', 'trade_lock');
        
        let grossPool = 0;
        let winningPool = 0;
        let losingPool = 0;
        let platformFee = 0;
        let netDistributed = 0;
        let winnersCount = 0;
        let losersCount = 0;
        
        // First pass: calculate pools
        const winningTrades: any[] = [];
        const losingTrades: any[] = [];
        
        if (trades && trades.length > 0) {
          for (const trade of trades) {
            const tradeAmount = Number(trade.amount) || 0;
            grossPool += tradeAmount;
            
            if (!isCancellation) {
              const tradeSide = trade.meta?.side || trade.meta?.position;
              const isWinner = tradeSide?.toUpperCase() === outcome;
              
              if (isWinner) {
                winningPool += tradeAmount;
                winnersCount++;
                winningTrades.push({ ...trade, amount: tradeAmount });
              } else {
                losingPool += tradeAmount;
                losersCount++;
                losingTrades.push({ ...trade, amount: tradeAmount });
              }
            }
          }
          
          // Calculate fee from LOSING side (3%)
          platformFee = losingPool * PLATFORM_FEE_RATE;
          netDistributed = losingPool - platformFee; // Amount from losers going to winners
          
          console.log(`[settlement] Market ${market.id}: grossPool=${grossPool}, winningPool=${winningPool}, losingPool=${losingPool}, fee=${platformFee}, netDistributed=${netDistributed}`);
          
          // Process each trade
          for (const trade of trades) {
            const tradeAmount = Number(trade.amount) || 0;
            
            if (isCancellation) {
              // CANCELLATION: Full refund (no platform fee)
              if (await receiptExists(adminClient, market.id, trade.user_id, 'REFUND')) {
                result.skippedDueToReceipt++;
                continue;
              }
              
              const receipt = await createReceipt(adminClient, {
                settlement_queue_id: queueItem.id,
                market_id: market.id,
                game_id: queueItem.game_id,
                user_id: trade.user_id,
                receipt_type: 'REFUND',
                amount: tradeAmount,
                currency: trade.currency || 'USDC',
              });
              
              if (!receipt) {
                result.skippedDueToReceipt++;
                continue;
              }
              
              result.receiptsCreated++;
              
              const { data: ledgerEntry, error: refundError } = await adminClient
                .from('ledger_entries')
                .insert({
                  user_id: trade.user_id,
                  market_id: market.id,
                  entry_type: 'trade_release',
                  direction: 'credit',
                  amount: tradeAmount,
                  currency: trade.currency || 'USDC',
                  reference_id: `refund-${queueItem.id}`,
                  meta: { 
                    reason: isCancellation ? 'game_canceled' : 'game_postponed', 
                    original_trade: trade.id,
                    receipt_id: receipt.id,
                  },
                })
                .select('id')
                .single();
              
              if (refundError) {
                console.error(`[settlement] Refund failed for trade ${trade.id}:`, refundError.message);
                await failReceipt(adminClient, receipt.id, refundError.message);
              } else {
                await confirmReceipt(adminClient, receipt.id, { ledger_entry_id: ledgerEntry?.id });
                result.refundsCreated++;
                result.totalRefundAmount += tradeAmount;
              }
              
            } else {
              // NORMAL SETTLEMENT: Pay winners proportionally
              const tradeSide = trade.meta?.side || trade.meta?.position;
              const isWinner = tradeSide?.toUpperCase() === outcome;
              
              if (isWinner && winningPool > 0) {
                if (await receiptExists(adminClient, market.id, trade.user_id, 'PAYOUT')) {
                  result.skippedDueToReceipt++;
                  continue;
                }
                
                // Calculate proportional share of losing pool (minus fee)
                // Winner gets: their stake back + proportional share of (losing pool - fee)
                const proportion = tradeAmount / winningPool;
                const shareOfLosingPool = netDistributed * proportion;
                const netPayout = tradeAmount + shareOfLosingPool;
                
                const receipt = await createReceipt(adminClient, {
                  settlement_queue_id: queueItem.id,
                  market_id: market.id,
                  game_id: queueItem.game_id,
                  user_id: trade.user_id,
                  receipt_type: 'PAYOUT',
                  amount: netPayout,
                  currency: trade.currency || 'USDC',
                });
                
                if (!receipt) {
                  result.skippedDueToReceipt++;
                  continue;
                }
                
                result.receiptsCreated++;
                
                const { data: payoutRecord, error: payoutError } = await adminClient
                  .from('payouts')
                  .insert({
                    user_id: trade.user_id,
                    market_id: market.id,
                    amount: netPayout,
                    currency: trade.currency || 'USDC',
                    status: 'queued',
                  })
                  .select('id')
                  .single();
                
                if (payoutError) {
                  console.error(`[settlement] Payout creation failed:`, payoutError.message);
                  await failReceipt(adminClient, receipt.id, payoutError.message);
                  continue;
                }
                
                const { data: ledgerEntry, error: ledgerError } = await adminClient
                  .from('ledger_entries')
                  .insert({
                    user_id: trade.user_id,
                    market_id: market.id,
                    entry_type: 'payout',
                    direction: 'credit',
                    amount: netPayout,
                    currency: trade.currency || 'USDC',
                    reference_id: `settlement-${queueItem.id}`,
                    meta: { 
                      outcome, 
                      original_trade: trade.id,
                      receipt_id: receipt.id,
                      payout_id: payoutRecord?.id,
                      stake: tradeAmount,
                      share_of_losing_pool: shareOfLosingPool,
                      proportion,
                    },
                  })
                  .select('id')
                  .single();
                
                if (ledgerError) {
                  console.error(`[settlement] Ledger entry failed:`, ledgerError.message);
                  await failReceipt(adminClient, receipt.id, ledgerError.message);
                } else {
                  await confirmReceipt(adminClient, receipt.id, { 
                    payout_id: payoutRecord?.id, 
                    ledger_entry_id: ledgerEntry?.id 
                  });
                  result.payoutsCreated++;
                  result.totalPayoutAmount += netPayout;
                }
              }
            }
          }
        }
        
        // Create market settlement record with fee tracking
        const { data: settlementRecord } = await adminClient
          .from('market_settlements')
          .insert({
            market_id: market.id,
            game_id: queueItem.game_id,
            outcome,
            total_volume: grossPool,
            total_payouts: result.totalPayoutAmount,
            payout_count: winnersCount,
            gross_pool: grossPool,
            losing_pool: losingPool,
            winning_pool: winningPool,
            platform_fee_amount: platformFee,
            net_distributed_amount: netDistributed,
            winners_count: winnersCount,
            losers_count: losersCount,
            fee_rate: PLATFORM_FEE_RATE,
            settled_by: 'system',
          })
          .select('id')
          .single();
        
        // ATOMIC: Record fee in treasury ledger (if fee > 0)
        if (platformFee > 0 && settlementRecord) {
          const { error: treasuryError } = await adminClient
            .from('treasury_ledger')
            .insert({
              settlement_id: settlementRecord.id,
              market_id: market.id,
              game_id: queueItem.game_id,
              entry_type: 'SETTLEMENT_FEE',
              amount: platformFee,
              fee_rate: PLATFORM_FEE_RATE,
              gross_pool: grossPool,
              losing_pool: losingPool,
              meta: {
                outcome,
                winners_count: winnersCount,
                losers_count: losersCount,
                net_distributed: netDistributed,
              },
            });
          
          if (treasuryError) {
            console.error(`[settlement] Treasury ledger entry failed:`, treasuryError.message);
            // Non-fatal: settlement still succeeds
          } else {
            console.log(`[settlement] Treasury fee recorded: $${platformFee.toFixed(2)} from market ${market.id}`);
            result.totalFeeAmount += platformFee;
          }
        }
        
        result.marketsSettled++;
        
      } catch (marketErr) {
        console.error(`[settlement] Market ${market.id} processing error:`, marketErr);
      }
    }
    
    // 6. Mark game as settled
    await adminClient
      .from('sports_games')
      .update({ settled_at: new Date().toISOString() })
      .eq('id', queueItem.game_id);
    
    // 7. Mark queue item as done
    await markQueueItemDone(adminClient, queueItem.id);
    
    result.success = true;
    console.log(`[settlement] Completed game ${queueItem.game_id}: ${result.marketsSettled} markets, ${result.payoutsCreated} payouts, ${result.refundsCreated} refunds`);
    
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    result.error = errorMsg;
    console.error(`[settlement] Failed game ${queueItem.game_id}:`, errorMsg);
    
    // Mark as failed with retry
    await markQueueItemFailed(adminClient, queueItem.id, errorMsg);
  }
  
  return result;
}

/**
 * Process all available queue items
 */
export async function processAllSettlements(
  adminClient: SupabaseClient,
  options?: { maxItems?: number }
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  results: SettlementResult[];
}> {
  const maxItems = options?.maxItems || 50;
  const results: SettlementResult[] = [];
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  
  while (processed < maxItems) {
    const item = await lockNextQueueItem(adminClient);
    if (!item) {
      break; // No more items
    }
    
    const result = await processSettlement(adminClient, item);
    results.push(result);
    processed++;
    
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }
  
  console.log(`[settlement] Batch complete: processed=${processed} succeeded=${succeeded} failed=${failed}`);
  
  return { processed, succeeded, failed, results };
}

// ============================================================================
// ADMIN PREVIEW & TREASURY
// ============================================================================

/**
 * Preview settlement without executing (for admin review)
 */
export async function previewSettlement(
  adminClient: SupabaseClient,
  gameId: number
): Promise<SettlementPreview | null> {
  // Load game
  const { data: game, error: gameError } = await adminClient
    .from('sports_games')
    .select('*')
    .eq('id', gameId)
    .single();
  
  if (gameError || !game) {
    console.error(`[settlement] Preview failed - game not found:`, gameError?.message);
    return null;
  }
  
  // Determine outcome
  const outcome = game.winner_side || 'UNKNOWN';
  const isCancellation = outcome === 'CANCELED' || outcome === 'POSTPONED';
  
  // Find markets
  const { data: markets } = await adminClient
    .from('markets')
    .select('*')
    .eq('sports_game_id', gameId);
  
  if (!markets || markets.length === 0) {
    return {
      gameId,
      outcome,
      markets: [],
      totals: {
        grossPool: 0,
        winningPool: 0,
        losingPool: 0,
        platformFee: 0,
        netDistributed: 0,
        winnersCount: 0,
        losersCount: 0,
      },
    };
  }
  
  const marketPreviews: SettlementPreview['markets'] = [];
  const totals = {
    grossPool: 0,
    winningPool: 0,
    losingPool: 0,
    platformFee: 0,
    netDistributed: 0,
    winnersCount: 0,
    losersCount: 0,
  };
  
  for (const market of markets) {
    // Find trades
    const { data: trades } = await adminClient
      .from('ledger_entries')
      .select('*')
      .eq('market_id', market.id)
      .eq('entry_type', 'trade_lock');
    
    let grossPool = 0;
    let winningPool = 0;
    let losingPool = 0;
    let winnersCount = 0;
    let losersCount = 0;
    
    if (trades) {
      for (const trade of trades) {
        const tradeAmount = Number(trade.amount) || 0;
        grossPool += tradeAmount;
        
        if (!isCancellation) {
          const tradeSide = trade.meta?.side || trade.meta?.position;
          const isWinner = tradeSide?.toUpperCase() === outcome;
          
          if (isWinner) {
            winningPool += tradeAmount;
            winnersCount++;
          } else {
            losingPool += tradeAmount;
            losersCount++;
          }
        }
      }
    }
    
    const platformFee = isCancellation ? 0 : losingPool * PLATFORM_FEE_RATE;
    const netDistributed = isCancellation ? grossPool : losingPool - platformFee;
    
    marketPreviews.push({
      marketId: market.id,
      grossPool,
      winningPool,
      losingPool,
      platformFee,
      netDistributed,
      winnersCount,
      losersCount,
      feeRate: PLATFORM_FEE_RATE,
    });
    
    totals.grossPool += grossPool;
    totals.winningPool += winningPool;
    totals.losingPool += losingPool;
    totals.platformFee += platformFee;
    totals.netDistributed += netDistributed;
    totals.winnersCount += winnersCount;
    totals.losersCount += losersCount;
  }
  
  return {
    gameId,
    outcome,
    markets: marketPreviews,
    totals,
  };
}

/**
 * Get treasury balance and statistics
 */
export async function getTreasuryBalance(
  adminClient: SupabaseClient
): Promise<{
  totalFeesCollected: number;
  totalWithdrawn: number;
  currentBalance: number;
  totalEntries: number;
  lastUpdated: string | null;
}> {
  const { data, error } = await adminClient
    .from('treasury_balance')
    .select('*')
    .single();
  
  if (error) {
    console.error(`[settlement] Treasury balance query failed:`, error.message);
    return {
      totalFeesCollected: 0,
      totalWithdrawn: 0,
      currentBalance: 0,
      totalEntries: 0,
      lastUpdated: null,
    };
  }
  
  return {
    totalFeesCollected: Number(data.total_fees_collected) || 0,
    totalWithdrawn: Number(data.total_withdrawn) || 0,
    currentBalance: Number(data.current_balance) || 0,
    totalEntries: Number(data.total_entries) || 0,
    lastUpdated: data.last_updated,
  };
}

/**
 * Get recent treasury ledger entries
 */
export async function getTreasuryLedger(
  adminClient: SupabaseClient,
  options?: { limit?: number }
): Promise<any[]> {
  const { data, error } = await adminClient
    .from('treasury_ledger')
    .select(`
      *,
      market:markets(id, slug, home_team, away_team),
      game:sports_games(id, home_team, away_team, home_score, away_score)
    `)
    .order('created_at', { ascending: false })
    .limit(options?.limit || 50);
  
  if (error) {
    console.error(`[settlement] Treasury ledger query failed:`, error.message);
    return [];
  }
  
  return data || [];
}

/**
 * Check if a settlement has already been processed (idempotency check)
 */
export async function isSettlementProcessed(
  adminClient: SupabaseClient,
  gameId: number
): Promise<{ processed: boolean; settledAt?: string; marketCount?: number }> {
  // Check 1: Game has settled_at
  const { data: game } = await adminClient
    .from('sports_games')
    .select('settled_at')
    .eq('id', gameId)
    .single();
  
  if (game?.settled_at) {
    // Check 2: Count market settlements
    const { data: settlements } = await adminClient
      .from('market_settlements')
      .select('id')
      .eq('game_id', gameId);
    
    return {
      processed: true,
      settledAt: game.settled_at,
      marketCount: settlements?.length || 0,
    };
  }
  
  return { processed: false };
}
