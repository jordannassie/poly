/**
 * POST /api/wallet/verify
 * 
 * Verifies a Solana wallet signature and links the wallet to the user's account.
 * Uses Supabase service role client for guaranteed inserts.
 */

import { NextRequest, NextResponse } from "next/server";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { getAdminClient, logSystemEvent } from "@/lib/supabase/admin";

// Demo user ID for wallet connections (stable UUID for demo user)
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(request: NextRequest) {
  // Get the admin client (service role) - required for this endpoint
  const adminClient = getAdminClient();
  if (!adminClient) {
    console.error("Service role client not available");
    return NextResponse.json(
      { error: "Server configuration error: service role not configured" },
      { status: 500 }
    );
  }

  try {
    // For demo mode, we use a fixed demo user ID
    // In production with real auth, this would come from session.user.id
    const userId = DEMO_USER_ID;
    
    // Parse request body
    const body = await request.json();
    const { walletAddress, signature, message } = body;

    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        { error: "Missing required fields: walletAddress, signature, message" },
        { status: 400 }
      );
    }

    // Extract nonce from message for logging
    const nonceMatch = message.match(/Nonce: ([a-f0-9]+)/);
    if (!nonceMatch) {
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }
    const nonce = nonceMatch[1];

    // Verify the Solana signature using tweetnacl
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
        { error: "Failed to verify signature. Please try again." },
        { status: 400 }
      );
    }

    // Mark the nonce as used (non-blocking, ignore errors)
    try {
      await adminClient
        .from("wallet_nonces")
        .update({ used_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("nonce", nonce)
        .is("used_at", null);
    } catch (nonceError) {
      console.warn("Failed to mark nonce as used:", nonceError);
      // Continue anyway - nonce expiry will handle cleanup
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
      // Continue - assume no primary
    }

    // Check if this wallet is already connected to a different user
    try {
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
    } catch (checkError) {
      console.warn("Failed to check wallet ownership:", checkError);
      // Continue - will fail on insert if duplicate
    }

    // Insert or update wallet connection using service role client
    // The unique constraint is on (chain, wallet_address)
    let insertedRow = null;
    try {
      const walletData = {
        user_id: userId,
        chain: "solana",
        wallet_address: walletAddress,
        verified: true,
        is_primary: !hasPrimary, // Set as primary if no primary exists
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
      console.log("Wallet connection saved:", insertedRow);
    } catch (dbError) {
      console.error("Database error during wallet insert:", dbError);
      return NextResponse.json(
        { error: dbError instanceof Error ? dbError.message : "Database error" },
        { status: 500 }
      );
    }

    // Log system event (non-blocking, don't fail on error)
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
      console.warn("Failed to log wallet connection event:", logError);
      // Don't fail the request - wallet was connected successfully
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
