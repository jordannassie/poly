import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  PLINKO_CONFIG,
  PlinkoMode,
  calculateMaxBet,
  getMaxMultiplier,
} from "@/lib/games/plinko-config";

/**
 * GET /api/games/balance
 * Get user's game balance and treasury info
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
    
    // Get treasury balance (for max bet calculation)
    const { data: treasuryData } = await supabase
      .from("game_treasury")
      .select("balance")
      .single();
    
    const userBalance = balanceData?.balance || 0;
    const treasuryBalance = treasuryData?.balance || 0;
    
    // Calculate max bets for each mode
    const modes: PlinkoMode[] = ["low", "medium", "high"];
    const maxBets = Object.fromEntries(
      modes.map(mode => [mode, calculateMaxBet(treasuryBalance, mode)])
    );
    
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
      limits: {
        minBet: PLINKO_CONFIG.MIN_BET_USD,
        maxPayoutCap: PLINKO_CONFIG.MAX_PAYOUT_CAP_USD,
        maxBetsByMode: maxBets,
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
    
    // Upsert user balance
    const { data, error } = await supabase
      .from("game_balances")
      .upsert(
        {
          user_id: userId,
          balance: amount,
          total_deposited: amount,
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();
    
    // If exists, add to balance instead
    if (error?.code === "23505" || !data) {
      const { data: updated, error: updateError } = await supabase
        .from("game_balances")
        .update({
          balance: supabase.rpc("increment_balance", { amount }),
          total_deposited: supabase.rpc("increment_deposited", { amount }),
        })
        .eq("user_id", userId)
        .select()
        .single();
      
      // Fallback: direct update
      await supabase.rpc("add_game_balance", {
        p_user_id: userId,
        p_amount: amount,
      }).then(() => {});
    }
    
    // Get updated balance
    const { data: balanceData } = await supabase
      .from("game_balances")
      .select("balance")
      .eq("user_id", userId)
      .single();
    
    return NextResponse.json({
      success: true,
      balance: balanceData?.balance || amount,
    });
    
  } catch (error) {
    console.error("Add funds error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
