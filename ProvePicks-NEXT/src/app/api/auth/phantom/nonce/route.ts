/**
 * POST /api/auth/phantom/nonce
 * 
 * Generates a nonce for wallet-first login/signup.
 * No session required - this is for users who want to login WITH their wallet.
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

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "NONCE_ERROR", details: "Missing or invalid wallet address" },
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
    
    // Create the message to sign with domain
    const message = `${DOMAIN} wants you to sign in with your Solana wallet.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nIssued At: ${timestamp}`;

    // Store the nonce in the database using service role
    const { error: insertError } = await adminClient
      .from("wallet_login_nonces")
      .insert({
        wallet_address: walletAddress,
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
    console.error("Nonce generation error:", error);
    return NextResponse.json(
      { 
        error: "NONCE_ERROR", 
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
