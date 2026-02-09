/**
 * POST /api/wallet/verify
 * 
 * Verifies a Solana wallet signature and links the wallet to the logged-in user.
 * Requires an authenticated session.
 */

import { NextRequest, NextResponse } from "next/server";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { getAdminClient, logSystemEvent } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

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
  // Get the admin client (service role) - required for this endpoint
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

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
    
    // Parse request body
    const body = await request.json();
    const { walletAddress, signature, message } = body;

    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        { error: "Missing required fields: walletAddress, signature, message" },
        { status: 400 }
      );
    }

    // Extract nonce from message
    const nonceMatch = message.match(/Nonce: ([a-f0-9]+)/);
    if (!nonceMatch) {
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }
    const nonce = nonceMatch[1];

    // Verify the Solana signature
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(walletAddress);

      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );

      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 400 }
        );
      }
    } catch (verifyError) {
      console.error("Signature verification error:", verifyError);
      return NextResponse.json(
        { error: "Failed to verify signature" },
        { status: 400 }
      );
    }

    // Mark the nonce as used (non-blocking)
    try {
      await adminClient
        .from("wallet_nonces")
        .update({ used_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("nonce", nonce)
        .is("used_at", null);
    } catch (nonceError) {
      console.warn("Failed to mark nonce as used:", nonceError);
    }

    // Check if user already has a primary wallet
    let hasPrimary = false;
    try {
      const { data: existingWallets } = await adminClient
        .from("wallet_connections")
        .select("id, is_primary")
        .eq("user_id", userId);

      hasPrimary = existingWallets?.some((w: { is_primary: boolean }) => w.is_primary) || false;
    } catch (checkError) {
      console.warn("Failed to check existing wallets:", checkError);
    }

    // Check if this wallet is already connected to a different user
    const { data: existingConnection } = await adminClient
      .from("wallet_connections")
      .select("user_id")
      .eq("wallet_address", walletAddress)
      .eq("chain", "solana")
      .maybeSingle();

    if (existingConnection && existingConnection.user_id !== userId) {
      return NextResponse.json(
        { error: "This wallet is already connected to another account" },
        { status: 400 }
      );
    }

    // Insert or update wallet connection
    let insertedRow = null;
    try {
      const walletData = {
        user_id: userId,
        chain: "solana",
        wallet_address: walletAddress,
        verified: true,
        is_primary: !hasPrimary,
        connected_at: new Date().toISOString(),
      };

      const { data, error: upsertError } = await adminClient
        .from("wallet_connections")
        .upsert(walletData, {
          onConflict: "chain,wallet_address",
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (upsertError) {
        console.error("Wallet connection upsert error:", upsertError);
        return NextResponse.json(
          { error: upsertError.message },
          { status: 500 }
        );
      }

      insertedRow = data;
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: dbError instanceof Error ? dbError.message : "Database error" },
        { status: 500 }
      );
    }

    // Log system event (non-blocking)
    try {
      await logSystemEvent({
        eventType: "WALLET_CONNECTED",
        severity: "info",
        actorUserId: userId,
        actorWallet: walletAddress,
        entityType: "wallet",
        entityId: insertedRow?.id,
        payload: {
          chain: "solana",
          wallet_address: walletAddress,
          is_primary: !hasPrimary,
        },
      });
    } catch (logError) {
      console.warn("Failed to log wallet connection:", logError);
    }

    return NextResponse.json({
      success: true,
      walletAddress,
      isPrimary: !hasPrimary,
      walletId: insertedRow?.id,
      message: "Wallet connected successfully",
    });
  } catch (error) {
    console.error("Wallet verification error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
