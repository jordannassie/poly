import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  PLINKO_CONFIG,
  PlinkoMode,
  checkPoolSolvency,
} from "@/lib/games/plinko-config";

/**
 * GET /api/games/balance
 * Get user's game balance and pool status (for mode availability)
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authenticated user
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token")?.value;
    
    let userId: string | null = null;
    
    if (accessToken) {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      userId = user?.id || null;
    }
    
    // Demo mode
    if (!userId) {
      const demoMode = request.headers.get("x-demo-mode");
      if (demoMode === "true") {
        userId = "00000000-0000-0000-0000-000000000001";
      } else {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
    }
    
    // Get user balance
    const { data: balanceData } = await supabase
      .from("game_balances")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    // Get pool status
    const { data: poolStatus, error: poolError } = await supabase.rpc("get_pool_status");
    
    const userBalance = balanceData?.balance || 0;
    const poolBalance = poolStatus?.balance || 0;
    const reservedLiability = poolStatus?.reserved_liability || 0;
    
    // Calculate mode availability based on pool solvency
    const solvency = checkPoolSolvency(poolBalance, reservedLiability);
    
    return NextResponse.json({
      balance: userBalance,
      stats: balanceData ? {
        totalDeposited: balanceData.total_deposited,
        totalWithdrawn: balanceData.total_withdrawn,
        totalWagered: balanceData.total_wagered,
        totalWon: balanceData.total_won,
        playCount: balanceData.play_count,
        netProfit: balanceData.total_won - balanceData.total_wagered,
      } : null,
      pool: {
        balance: poolBalance,
        available: solvency.availableToPay,
        totalBets: poolStatus?.total_bets || 0,
        totalPayouts: poolStatus?.total_payouts || 0,
        playCount: poolStatus?.play_count || 0,
      },
      modes: solvency.modes,
      limits: {
        minBet: PLINKO_CONFIG.MIN_BET_USD,
      },
    });
    
  } catch (error) {
    console.error("Balance error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/games/balance
 * Add funds to game balance (demo credits)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount } = body;
    
    if (typeof amount !== "number" || amount <= 0 || amount > 1000) {
      return NextResponse.json({ error: "Invalid amount (max 1000)" }, { status: 400 });
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authenticated user
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token")?.value;
    
    let userId: string | null = null;
    
    if (accessToken) {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      userId = user?.id || null;
    }
    
    if (!userId) {
      const demoMode = request.headers.get("x-demo-mode");
      if (demoMode === "true") {
        userId = "00000000-0000-0000-0000-000000000001";
      } else {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
    }
    
    // Add balance using function
    const { data: newBalance, error } = await supabase.rpc("add_game_balance", {
      p_user_id: userId,
      p_amount: amount,
    });
    
    if (error) {
      console.error("Add balance error:", error);
      return NextResponse.json({ error: "Failed to add balance" }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      balance: newBalance,
    });
    
  } catch (error) {
    console.error("Add funds error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
