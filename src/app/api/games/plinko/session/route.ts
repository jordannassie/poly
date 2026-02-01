import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  generateServerSeed,
  generateClientSeed,
  hashSeed,
} from "@/lib/games/provably-fair";

/**
 * GET /api/games/plinko/session
 * Get current active session or create a new one
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
    
    // Get active session
    const { data: session } = await supabase
      .from("plinko_sessions")
      .select("id, server_seed_hash, client_seed, nonce, created_at")
      .eq("user_id", userId)
      .eq("revealed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (session) {
      return NextResponse.json({
        session: {
          id: session.id,
          serverSeedHash: session.server_seed_hash,
          clientSeed: session.client_seed,
          nonce: session.nonce,
          createdAt: session.created_at,
        },
      });
    }
    
    // Create new session
    const serverSeed = generateServerSeed();
    const serverSeedHash = hashSeed(serverSeed);
    const clientSeed = generateClientSeed();
    
    const { data: newSession, error } = await supabase
      .from("plinko_sessions")
      .insert({
        user_id: userId,
        server_seed: serverSeed,
        server_seed_hash: serverSeedHash,
        client_seed: clientSeed,
        nonce: 0,
      })
      .select("id, server_seed_hash, client_seed, nonce, created_at")
      .single();
    
    if (error) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
    
    return NextResponse.json({
      session: {
        id: newSession.id,
        serverSeedHash: newSession.server_seed_hash,
        clientSeed: newSession.client_seed,
        nonce: newSession.nonce,
        createdAt: newSession.created_at,
      },
      isNew: true,
    });
    
  } catch (error) {
    console.error("Session error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/games/plinko/session
 * Create a new session (rotates seeds) and optionally reveal the old one
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientSeed: providedClientSeed, revealPrevious = true } = body;
    
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
    
    let revealedSeed: string | null = null;
    
    // Reveal previous session if requested
    if (revealPrevious) {
      const { data: oldSession } = await supabase
        .from("plinko_sessions")
        .select("id, server_seed")
        .eq("user_id", userId)
        .eq("revealed", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (oldSession) {
        revealedSeed = oldSession.server_seed;
        
        await supabase
          .from("plinko_sessions")
          .update({ revealed: true, revealed_at: new Date().toISOString() })
          .eq("id", oldSession.id);
      }
    }
    
    // Create new session
    const serverSeed = generateServerSeed();
    const serverSeedHash = hashSeed(serverSeed);
    const clientSeed = providedClientSeed || generateClientSeed();
    
    const { data: newSession, error } = await supabase
      .from("plinko_sessions")
      .insert({
        user_id: userId,
        server_seed: serverSeed,
        server_seed_hash: serverSeedHash,
        client_seed: clientSeed,
        nonce: 0,
      })
      .select("id, server_seed_hash, client_seed, nonce, created_at")
      .single();
    
    if (error) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
    
    return NextResponse.json({
      session: {
        id: newSession.id,
        serverSeedHash: newSession.server_seed_hash,
        clientSeed: newSession.client_seed,
        nonce: newSession.nonce,
        createdAt: newSession.created_at,
      },
      previousServerSeed: revealedSeed,
    });
    
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
