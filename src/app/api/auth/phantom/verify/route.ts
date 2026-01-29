/**
 * POST /api/auth/phantom/verify
 * 
 * Verifies a Phantom wallet signature for login/signup.
 * If wallet exists in wallet_connections, logs in existing user.
 * If not, creates a new user and wallet connection.
 * Sets a session cookie for the user.
 */

import { NextRequest, NextResponse } from "next/server";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { getAdminClient, logSystemEvent } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

// Session cookie name for wallet-authenticated users
const WALLET_SESSION_COOKIE = "pp_wallet_session";

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

    // Verify the nonce exists and is valid
    const { data: nonceRecord, error: nonceError } = await adminClient
      .from("wallet_login_nonces")
      .select("*")
      .eq("wallet_address", walletAddress)
      .eq("nonce", nonce)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (nonceError || !nonceRecord) {
      return NextResponse.json(
        { error: "Invalid or expired nonce. Please try again." },
        { status: 400 }
      );
    }

    // Check if nonce is not too old (5 minutes max)
    const nonceAge = Date.now() - new Date(nonceRecord.created_at).getTime();
    if (nonceAge > 5 * 60 * 1000) {
      return NextResponse.json(
        { error: "Nonce expired. Please try again." },
        { status: 400 }
      );
    }

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

    // Mark the nonce as used
    await adminClient
      .from("wallet_login_nonces")
      .update({ used_at: new Date().toISOString() })
      .eq("id", nonceRecord.id);

    // Check if this wallet is already connected to a user
    const { data: existingWallet } = await adminClient
      .from("wallet_connections")
      .select("user_id")
      .eq("wallet_address", walletAddress)
      .eq("chain", "solana")
      .maybeSingle();

    let userId: string;
    let isNewUser = false;

    if (existingWallet) {
      // Existing user - use their user_id
      userId = existingWallet.user_id;
    } else {
      // New user - create account
      isNewUser = true;
      
      // Generate synthetic email from wallet address
      const walletPrefix = walletAddress.slice(0, 8);
      const walletSuffix = walletAddress.slice(-8);
      const syntheticEmail = `wallet_${walletPrefix}_${walletSuffix}@provepicks.local`;
      
      // Create user via admin API
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true, // Auto-confirm since wallet verified
        user_metadata: {
          wallet_address: walletAddress,
          auth_method: "phantom",
        },
      });

      if (createError || !newUser?.user) {
        console.error("Failed to create user:", createError);
        return NextResponse.json(
          { error: "Failed to create account" },
          { status: 500 }
        );
      }

      userId = newUser.user.id;

      // Create profile for new user
      const username = `wallet_${walletPrefix.toLowerCase()}`;
      const { error: profileError } = await adminClient
        .from("profiles")
        .upsert({
          id: userId,
          username: username,
          display_name: `Wallet ${walletPrefix}...${walletSuffix}`,
          is_public: true,
        }, {
          onConflict: "id",
        });

      if (profileError) {
        console.warn("Failed to create profile:", profileError);
        // Continue anyway - profile can be created later
      }

      // Create wallet connection for new user
      const { error: walletError } = await adminClient
        .from("wallet_connections")
        .insert({
          user_id: userId,
          chain: "solana",
          wallet_address: walletAddress,
          verified: true,
          is_primary: true,
          connected_at: new Date().toISOString(),
        });

      if (walletError) {
        console.error("Failed to create wallet connection:", walletError);
        // This is critical - clean up user?
        return NextResponse.json(
          { error: "Failed to link wallet" },
          { status: 500 }
        );
      }
    }

    // Get user profile info
    const { data: profile } = await adminClient
      .from("profiles")
      .select("username, display_name")
      .eq("id", userId)
      .maybeSingle();

    // Create session data
    const sessionData = {
      userId,
      walletAddress,
      username: profile?.username || null,
      displayName: profile?.display_name || null,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };

    // Set session cookie
    const cookieStore = cookies();
    cookieStore.set(WALLET_SESSION_COOKIE, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Log system event
    try {
      await logSystemEvent({
        eventType: isNewUser ? "WALLET_SIGNUP" : "WALLET_LOGIN",
        severity: "info",
        actorUserId: userId,
        actorWallet: walletAddress,
        entityType: "user",
        entityId: userId,
        payload: {
          wallet_address: walletAddress,
          is_new_user: isNewUser,
        },
      });
    } catch (logError) {
      console.warn("Failed to log auth event:", logError);
    }

    return NextResponse.json({
      success: true,
      userId,
      walletAddress,
      username: profile?.username,
      displayName: profile?.display_name,
      isNewUser,
      message: isNewUser ? "Account created successfully" : "Logged in successfully",
    });
  } catch (error) {
    console.error("Phantom auth error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
