import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  PLINKO_CONFIG,
  PlinkoMode,
  MULTIPLIER_TABLES,
  getMaxMultiplier,
  validateBet,
  getSlotFromRandom,
  calculateMaxBet,
} from "@/lib/games/plinko-config";
import {
  generateServerSeed,
  generateClientSeed,
  hashSeed,
  computeSlot,
} from "@/lib/games/provably-fair";

// Rate limiting: simple in-memory store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 30; // 30 plays per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { mode, betAmount, clientSeed: providedClientSeed } = body;
    
    // Validate mode
    if (!mode || !["low", "medium", "high"].includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Must be 'low', 'medium', or 'high'" },
        { status: 400 }
      );
    }
    
    // Validate bet amount
    if (typeof betAmount !== "number" || betAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid bet amount" },
        { status: 400 }
      );
    }
    
    // Round to 2 decimal places
    const bet = Math.round(betAmount * 100) / 100;
    
    // Create Supabase client with service role for treasury access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authenticated user from session cookie
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token")?.value;
    const refreshToken = cookieStore.get("sb-refresh-token")?.value;
    
    let userId: string | null = null;
    
    if (accessToken && refreshToken) {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      userId = user?.id || null;
    }
    
    // For demo purposes, allow demo user
    if (!userId) {
      // Check for demo mode header
      const demoMode = request.headers.get("x-demo-mode");
      if (demoMode === "true") {
        // Use a fixed demo user ID
        userId = "00000000-0000-0000-0000-000000000001";
      } else {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
    }
    
    // Rate limit check
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before playing again." },
        { status: 429 }
      );
    }
    
    // Get current treasury balance
    const { data: treasuryData, error: treasuryError } = await supabase
      .from("game_treasury")
      .select("balance")
      .single();
    
    if (treasuryError || !treasuryData) {
      console.error("Treasury error:", treasuryError);
      return NextResponse.json(
        { error: "Unable to verify treasury. Please try again." },
        { status: 500 }
      );
    }
    
    const treasuryBalance = Number(treasuryData.balance);
    
    // Validate bet against treasury
    const validation = validateBet(bet, mode as PlinkoMode, treasuryBalance);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: validation.error,
          maxBet: validation.maxBet
        },
        { status: 400 }
      );
    }
    
    // Get or create active session for user
    let session: {
      id: string;
      server_seed: string;
      server_seed_hash: string;
      client_seed: string;
      nonce: number;
    };
    
    const { data: existingSession } = await supabase
      .from("plinko_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("revealed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (existingSession) {
      session = existingSession;
    } else {
      // Create new session
      const serverSeed = generateServerSeed();
      const serverSeedHash = hashSeed(serverSeed);
      const clientSeed = providedClientSeed || generateClientSeed();
      
      const { data: newSession, error: sessionError } = await supabase
        .from("plinko_sessions")
        .insert({
          user_id: userId,
          server_seed: serverSeed,
          server_seed_hash: serverSeedHash,
          client_seed: clientSeed,
          nonce: 0,
        })
        .select()
        .single();
      
      if (sessionError || !newSession) {
        console.error("Session creation error:", sessionError);
        return NextResponse.json(
          { error: "Failed to create game session" },
          { status: 500 }
        );
      }
      
      session = newSession;
    }
    
    // Compute outcome using provably fair RNG
    const { slot, outcomeHex, randomFloat } = computeSlot(
      session.server_seed,
      session.client_seed,
      session.nonce,
      getSlotFromRandom
    );
    
    // Get multiplier and calculate payout
    const multiplier = MULTIPLIER_TABLES[mode as PlinkoMode][slot];
    const payout = Math.round(bet * multiplier * 100) / 100;
    
    // Execute the play atomically using database function
    const { data: playResult, error: playError } = await supabase.rpc(
      "execute_plinko_play",
      {
        p_user_id: userId,
        p_session_id: session.id,
        p_mode: mode,
        p_bet_amount: bet,
        p_slot: slot,
        p_multiplier: multiplier,
        p_payout: payout,
        p_server_seed_hash: session.server_seed_hash,
        p_client_seed: session.client_seed,
        p_nonce: session.nonce,
        p_outcome_hex: outcomeHex,
        p_random_float: randomFloat,
      }
    );
    
    if (playError) {
      console.error("Play execution error:", playError);
      return NextResponse.json(
        { error: "Failed to execute play. Bet not placed." },
        { status: 500 }
      );
    }
    
    if (!playResult?.success) {
      return NextResponse.json(
        { error: playResult?.error || "Play failed. Bet not placed." },
        { status: 400 }
      );
    }
    
    // Calculate max bet for next play
    const newTreasuryBalance = playResult.treasury_balance;
    const maxBet = calculateMaxBet(newTreasuryBalance, mode as PlinkoMode);
    
    // Return result (server seed is NOT revealed yet)
    return NextResponse.json({
      success: true,
      play: {
        slot,
        multiplier,
        payout,
        profit: payout - bet,
        betAmount: bet,
        mode,
      },
      session: {
        serverSeedHash: session.server_seed_hash,
        clientSeed: session.client_seed,
        nonce: session.nonce,
      },
      balance: playResult.user_balance,
      maxBet,
    });
    
  } catch (error) {
    console.error("Plinko play error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Bet not placed." },
      { status: 500 }
    );
  }
}
