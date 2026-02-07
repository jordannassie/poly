/**
 * POST /api/auth/evm/nonce
 * 
 * Generates a nonce for EVM wallet (MetaMask/Coinbase Wallet) login/signup.
 * Creates a Sign-In With Ethereum (SIWE) style message.
 * Uses service-role Supabase client for database access.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import crypto from "crypto";

// Domain for the sign message
const DOMAIN = "provepicks.com";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "NONCE_ERROR", details: "Invalid request body" },
        { status: 400 }
      );
    }

    const { walletAddress } = body;

    // Validate EVM address format (0x + 40 hex chars)
    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "NONCE_ERROR", details: "Missing or invalid wallet address" },
        { status: 400 }
      );
    }

    const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!evmAddressRegex.test(walletAddress)) {
      return NextResponse.json(
        { error: "NONCE_ERROR", details: "Invalid EVM address format" },
        { status: 400 }
      );
    }

    // Check if admin client is configured
    if (!isAdminConfigured()) {
      console.error("Admin client not configured - missing SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json(
        { error: "NONCE_ERROR", details: "Server not configured for wallet auth" },
        { status: 500 }
      );
    }

    // Get admin client (service role) for storing nonce
    const adminClient = getAdminClient();
    if (!adminClient) {
      console.error("Failed to get admin client");
      return NextResponse.json(
        { error: "NONCE_ERROR", details: "Database connection failed" },
        { status: 500 }
      );
    }

    // Generate a cryptographically random nonce (64 hex chars = 32 bytes)
    const nonce = crypto.randomBytes(32).toString("hex");
    const timestamp = new Date().toISOString();
    
    // Create SIWE-style message
    // See: https://eips.ethereum.org/EIPS/eip-4361
    const message = `${DOMAIN} wants you to sign in with your Ethereum account:
${walletAddress}

Sign in to ProvePicks

URI: https://${DOMAIN}
Version: 1
Chain ID: 1
Nonce: ${nonce}
Issued At: ${timestamp}`;

    // Store the nonce in the database using service role
    // Re-use the wallet_login_nonces table with chain indicator
    const { error: insertError } = await adminClient
      .from("wallet_login_nonces")
      .insert({
        wallet_address: walletAddress.toLowerCase(), // Normalize EVM addresses
        nonce: nonce,
      });

    if (insertError) {
      console.error("Failed to store login nonce:", insertError.message, insertError.code);
      return NextResponse.json(
        { 
          error: "NONCE_ERROR", 
          details: `Database insert failed: ${insertError.message}`,
          code: insertError.code,
        },
        { status: 500 }
      );
    }

    // Success - return nonce and message
    return NextResponse.json({
      nonce,
      message,
      expiresIn: 300, // 5 minutes
    });
  } catch (error) {
    console.error("EVM nonce generation error:", error);
    return NextResponse.json(
      { 
        error: "NONCE_ERROR", 
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
