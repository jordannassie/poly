/**
 * GET /api/wallets/my
 * 
 * Returns wallet connections for the current authenticated user.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

// Wallet session cookie name
const WALLET_SESSION_COOKIE = "pp_wallet_session";

interface WalletSession {
  userId: string;
  walletAddress: string;
  expiresAt: string;
}

function getCurrentUserId(): string | null {
  try {
    const cookieStore = cookies();
    const walletSessionCookie = cookieStore.get(WALLET_SESSION_COOKIE);
    
    if (walletSessionCookie?.value) {
      const session: WalletSession = JSON.parse(walletSessionCookie.value);
      if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
        return session.userId;
      }
    }
  } catch {
    // Invalid session
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getCurrentUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }
    
    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    
    // Fetch wallet connections for this user
    const { data: wallets, error } = await adminClient
      .from("wallet_connections")
      .select("id, chain, wallet_address, verified, is_primary, connected_at")
      .eq("user_id", userId)
      .order("connected_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching wallets:", error);
      return NextResponse.json(
        { error: "Failed to fetch wallets" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      wallets: wallets || [],
    });
  } catch (error) {
    console.error("Error in /api/wallets/my:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
