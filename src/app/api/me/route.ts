/**
 * GET /api/me
 * 
 * Returns the current authenticated user info.
 * Checks in priority order:
 * 1. Supabase auth session
 * 2. Wallet login session cookie (pp_wallet_session)
 * 3. null (not logged in)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

// Wallet session cookie name
const WALLET_SESSION_COOKIE = "pp_wallet_session";

interface WalletSession {
  userId: string;
  walletAddress: string;
  username?: string;
  displayName?: string;
  expiresAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    
    // Check for wallet session cookie
    const walletSessionCookie = cookieStore.get(WALLET_SESSION_COOKIE);
    
    if (walletSessionCookie?.value) {
      try {
        const session: WalletSession = JSON.parse(walletSessionCookie.value);
        
        // Check if session is expired
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
          // Fetch fresh profile data from database
          const adminClient = getAdminClient();
          let profile = null;
          
          if (adminClient) {
            const { data } = await adminClient
              .from("profiles")
              .select("id, username, display_name, avatar_url")
              .eq("id", session.userId)
              .maybeSingle();
            
            profile = data;
          }
          
          return NextResponse.json({
            user: {
              id: session.userId,
              username: profile?.username || session.username || null,
              display_name: profile?.display_name || session.displayName || null,
              avatar_url: profile?.avatar_url || null,
              wallet_address: session.walletAddress,
            },
            authType: "wallet",
          });
        }
      } catch {
        // Invalid session cookie - continue to check other auth
      }
    }
    
    // No valid session found
    return NextResponse.json({
      user: null,
      authType: "none",
    });
  } catch (error) {
    console.error("Error in /api/me:", error);
    return NextResponse.json({
      user: null,
      authType: "none",
      error: "Internal error",
    });
  }
}
