/**
 * POST /api/wallet/nonce
 * 
 * Generates a random nonce for wallet signature verification.
 * Works with demo auth - uses X-Demo-User header or creates a demo session.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

// Demo user ID for wallet connections (stable UUID for demo user)
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(request: NextRequest) {
  try {
    const adminClient = getAdminClient();
    
    // For demo mode, we use a fixed demo user ID
    // In production, this would come from Supabase auth session
    const userId = DEMO_USER_ID;
    
    // Generate a random nonce
    const nonce = crypto.randomBytes(32).toString("hex");
    
    // Create the message to sign
    const timestamp = new Date().toISOString();
    const message = `Sign this message to connect your wallet to ProvePicks.\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
    
    // Store the nonce in the database (if admin client is available)
    if (adminClient) {
      const { error: insertError } = await adminClient
        .from("wallet_nonces")
        .insert({
          user_id: userId,
          nonce: nonce,
        });

      if (insertError) {
        console.error("Failed to store nonce:", insertError);
        // Continue anyway - nonce validation will work via memory/signature only
      }
    }

    return NextResponse.json({
      nonce,
      message,
      userId, // Include for client tracking
    });
  } catch (error) {
    console.error("Nonce generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
