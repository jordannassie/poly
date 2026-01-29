/**
 * POST /api/wallet/verify
 * 
 * Verifies a Solana wallet signature and links the wallet to the user's account.
 * Works with demo auth - uses demo user ID for now.
 */

import { NextRequest, NextResponse } from "next/server";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { getAdminClient, logSystemEvent } from "@/lib/supabase/admin";

// Demo user ID for wallet connections (stable UUID for demo user)
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(request: NextRequest) {
  try {
    // For demo mode, we use a fixed demo user ID
    // In production, this would come from Supabase auth session
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
        { error: "Failed to verify signature. Please try again." },
        { status: 400 }
      );
    }

    // Use admin client for wallet_connections
    const adminClient = getAdminClient();
    if (!adminClient) {
      // In demo mode without Supabase, just return success
      return NextResponse.json({
        success: true,
        walletAddress,
        isPrimary: true,
        message: "Wallet verified successfully (demo mode)",
      });
    }

    // Mark the nonce as used
    await adminClient
      .from("wallet_nonces")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("nonce", nonce)
      .is("used_at", null);

    // Check if user already has a primary wallet
    const { data: existingWallets } = await adminClient
      .from("wallet_connections")
      .select("id, is_primary")
      .eq("user_id", userId)
      .eq("chain", "solana");

    const hasPrimary = existingWallets?.some((w: { is_primary: boolean }) => w.is_primary);

    // Check if this wallet is already connected to another user
    const { data: existingConnection } = await adminClient
      .from("wallet_connections")
      .select("user_id")
      .eq("wallet_address", walletAddress)
      .eq("chain", "solana")
      .single();

    if (existingConnection && existingConnection.user_id !== userId) {
      return NextResponse.json(
        { error: "This wallet is already connected to another account" },
        { status: 400 }
      );
    }

    // Upsert the wallet connection
    const { error: upsertError } = await adminClient
      .from("wallet_connections")
      .upsert({
        user_id: userId,
        chain: "solana",
        wallet_address: walletAddress,
        verified: true,
        is_primary: !hasPrimary, // Set as primary if no primary exists
        connected_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,chain,wallet_address",
      });

    if (upsertError) {
      console.error("Wallet connection upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to save wallet connection" },
        { status: 500 }
      );
    }

    // Log system event
    await logSystemEvent({
      eventType: "WALLET_CONNECTED",
      severity: "info",
      actorUserId: userId,
      actorWallet: walletAddress,
      entityType: "wallet",
      payload: {
        chain: "solana",
        wallet_address: walletAddress,
        is_primary: !hasPrimary,
      },
    });

    return NextResponse.json({
      success: true,
      walletAddress,
      isPrimary: !hasPrimary,
      message: "Wallet connected successfully",
    });
  } catch (error) {
    console.error("Wallet verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
