/**
 * GET /api/auth/tiktok/authorize
 * 
 * Initiates TikTok OAuth flow.
 * Redirects user to TikTok's authorization page.
 * 
 * TikTok OAuth Documentation:
 * https://developers.tiktok.com/doc/login-kit-web/
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

export async function GET(request: NextRequest) {
  if (!TIKTOK_CLIENT_KEY || !TIKTOK_REDIRECT_URI) {
    console.error("TikTok OAuth not configured");
    return NextResponse.json(
      { error: "TikTok OAuth not configured" },
      { status: 500 }
    );
  }

  // Generate state for CSRF protection
  const state = crypto.randomBytes(32).toString("hex");
  
  // Generate code verifier and challenge for PKCE (TikTok requires this)
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  // Build authorization URL
  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    response_type: "code",
    scope: "user.info.basic",
    redirect_uri: TIKTOK_REDIRECT_URI,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `${TIKTOK_AUTH_URL}?${params.toString()}`;

  // Create response with redirect
  const response = NextResponse.redirect(authUrl);
  
  // Store state and code verifier in cookies for verification in callback
  response.cookies.set("tiktok_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  
  response.cookies.set("tiktok_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return response;
}
