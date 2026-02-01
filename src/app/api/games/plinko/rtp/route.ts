import { NextResponse } from "next/server";
import {
  PLINKO_CONFIG,
  MULTIPLIER_TABLES,
  BINOMIAL_COEFFICIENTS,
  TOTAL_OUTCOMES,
  getSlotProbabilities,
  calculateRTP,
  getMaxMultiplier,
  verifyAllRTP,
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
  
  return NextResponse.json({
    config: {
      rows: PLINKO_CONFIG.ROWS,
      targetRTP: PLINKO_CONFIG.TARGET_RTP,
      rtpTolerance: PLINKO_CONFIG.RTP_TOLERANCE,
      houseEdge: PLINKO_CONFIG.HOUSE_EDGE,
      totalOutcomes: TOTAL_OUTCOMES,
      maxPayoutCap: PLINKO_CONFIG.MAX_PAYOUT_CAP_USD,
      minBet: PLINKO_CONFIG.MIN_BET_USD,
    },
    modes: modeDetails,
    verification: {
      allValid,
      details: verification,
    },
    formula: {
      description: "RTP is calculated as: Σ P(k) × m[k] where P(k) = C(16,k) / 2^16",
      binomialDistribution: "Ball lands in slot k with probability C(16,k)/65536",
      example: "For slot 0: P(0) = 1/65536 ≈ 0.00153%",
    },
  });
}
