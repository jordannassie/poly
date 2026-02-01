import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  PLINKO_CONFIG,
  MULTIPLIER_TABLES,
  BINOMIAL_COEFFICIENTS,
  TOTAL_OUTCOMES,
  getSlotProbabilities,
  calculateRTP,
  getMaxMultiplier,
  verifyAllRTP,
  checkPoolSolvency,
  PlinkoMode,
} from "@/lib/games/plinko-config";

/**
 * GET /api/games/plinko/rtp
 * 
 * Returns the mathematically verified RTP for each Plinko mode.
 * This endpoint is public for transparency.
 */
export async function GET() {
  const modes: PlinkoMode[] = ["low", "medium", "high"];
  const probabilities = getSlotProbabilities();
  
  const modeDetails = modes.map(mode => {
    const multipliers = [...MULTIPLIER_TABLES[mode]];
    const rtp = calculateRTP(mode);
    const houseEdge = 1 - rtp;
    const maxMultiplier = getMaxMultiplier(mode);
    
    // Calculate contribution of each slot to RTP
    const slotDetails = multipliers.map((mult, i) => ({
      slot: i,
      binomialCoeff: BINOMIAL_COEFFICIENTS[i],
      probability: probabilities[i],
      multiplier: mult,
      contribution: probabilities[i] * mult,
    }));
    
    return {
      mode,
      rtp: Math.round(rtp * 10000) / 10000, // 4 decimal places
      houseEdge: Math.round(houseEdge * 10000) / 10000,
      houseEdgePercent: `${(houseEdge * 100).toFixed(2)}%`,
      maxMultiplier,
      multipliers,
      slotDetails,
    };
  });
  
  // Verify all modes
  const verification = verifyAllRTP();
  const allValid = verification.every(v => v.valid);
  
  // Get pool status if Supabase is configured
  let poolInfo = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: poolStatus } = await supabase.rpc("get_pool_status");
      
      if (poolStatus) {
        const solvency = checkPoolSolvency(
          poolStatus.balance,
          poolStatus.reserved_liability
        );
        
        poolInfo = {
          balance: poolStatus.balance,
          availableToPay: solvency.availableToPay,
          modeAvailability: solvency.modes.map(m => ({
            mode: m.mode,
            enabled: m.enabled,
            maxBet: m.maxBet,
            reason: m.reason,
          })),
        };
      }
    } catch (e) {
      // Pool info is optional
    }
  }
  
  return NextResponse.json({
    config: {
      rows: PLINKO_CONFIG.ROWS,
      targetRTP: PLINKO_CONFIG.TARGET_RTP,
      rtpTolerance: PLINKO_CONFIG.RTP_TOLERANCE,
      houseEdge: PLINKO_CONFIG.HOUSE_EDGE,
      totalOutcomes: TOTAL_OUTCOMES,
      absoluteMaxPayoutCap: PLINKO_CONFIG.ABSOLUTE_MAX_PAYOUT_CAP,
      minBet: PLINKO_CONFIG.MIN_BET_USD,
    },
    modes: modeDetails,
    verification: {
      allValid,
      details: verification,
    },
    pool: poolInfo,
    solvencyModel: {
      description: "Loss-funded pool model. Pool starts at $0 and can never go negative.",
      rules: [
        "Bets go into pool BEFORE outcome is determined",
        "Payouts come FROM pool AFTER outcome",
        "Max payout limited by pool balance minus reserved liability",
        "Modes are dynamically enabled/disabled based on pool solvency",
      ],
    },
    formula: {
      description: "RTP is calculated as: Σ P(k) × m[k] where P(k) = C(16,k) / 2^16",
      binomialDistribution: "Ball lands in slot k with probability C(16,k)/65536",
      example: "For slot 0: P(0) = 1/65536 ≈ 0.00153%",
    },
  });
}
