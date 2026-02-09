/**
 * POST /api/wallet/nonce
 * 
 * Generates a nonce for linking a wallet to an EXISTING logged-in user.
 * Requires an authenticated session.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import crypto from "crypto";

// Session cookie for wallet-authenticated users
const WALLET_SESSION_COOKIE = "pp_wallet_session";

// Get current user from session
function getCurrentUser(): { userId: string; walletAddress?: string } | null {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(WALLET_SESSION_COOKIE);
    
    if (sessionCookie?.value) {
      const session = JSON.parse(sessionCookie.value);
      // Check if session is expired
      if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
        return { userId: session.userId, walletAddress: session.walletAddress };
      }
    }
  } catch {
    // Invalid session
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Check for authenticated session
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const userId = currentUser.userId;

    // Get admin client for storing nonce
    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Generate a random nonce
    const nonce = crypto.randomBytes(32).toString("hex");
    const timestamp = new Date().toISOString();
    
    // Create the message to sign
    const message = `Sign this message to connect your wallet to ProvePicks.\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

    // Store the nonce in the database
    const { error: insertError } = await adminClient
      .from("wallet_nonces")
      .insert({
        user_id: userId,
        nonce: nonce,
      });

    if (insertError) {
      console.error("Failed to store nonce:", insertError);
      return NextResponse.json(
        { error: "Failed to generate nonce" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      nonce,
      message,
      userId,
    });
  } catch (error) {
    console.error("Nonce generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
