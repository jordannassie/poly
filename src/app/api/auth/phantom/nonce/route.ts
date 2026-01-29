/**
 * POST /api/auth/phantom/nonce
 * 
 * Generates a nonce for wallet-first login/signup.
 * No session required - this is for users who want to login WITH their wallet.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Missing wallet address" },
        { status: 400 }
      );
    }

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
    const message = `Sign this message to login to ProvePicks.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

    // Store the nonce in the database
    const { error: insertError } = await adminClient
      .from("wallet_login_nonces")
      .insert({
        wallet_address: walletAddress,
        nonce: nonce,
      });

    if (insertError) {
      console.error("Failed to store login nonce:", insertError);
      return NextResponse.json(
        { error: "Failed to generate nonce" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      nonce,
      message,
    });
  } catch (error) {
    console.error("Nonce generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
