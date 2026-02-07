/**
 * GET /api/auth/tiktok/callback
 * 
 * TikTok OAuth callback handler.
 * Exchanges the authorization code for an access token,
 * fetches user info, and creates/updates the user session.
 * 
 * TikTok OAuth Documentation:
 * https://developers.tiktok.com/doc/login-kit-web/
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, logSystemEvent } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USERINFO_URL = "https://open.tiktokapis.com/v2/user/info/";
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

// Session cookie name
const OAUTH_SESSION_COOKIE = "pp_oauth_session";

interface TikTokTokenResponse {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

interface TikTokUserResponse {
  data: {
    user: {
      open_id: string;
      union_id: string;
      avatar_url: string;
      avatar_url_100: string;
      avatar_large_url: string;
      display_name: string;
      bio_description?: string;
      profile_deep_link?: string;
      is_verified?: boolean;
      follower_count?: number;
      following_count?: number;
      likes_count?: number;
      video_count?: number;
    };
  };
  error: {
    code: string;
    message: string;
    log_id: string;
  };
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const origin = requestUrl.origin;

  // Handle error from TikTok
  if (error) {
    const errorDescription = requestUrl.searchParams.get("error_description") || "Unknown error";
    console.error("TikTok OAuth error:", error, errorDescription);
    return NextResponse.redirect(`${origin}/?error=tiktok_${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=no_code`);
  }

  if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET || !TIKTOK_REDIRECT_URI) {
    console.error("TikTok OAuth not configured");
    return NextResponse.redirect(`${origin}/?error=config_error`);
  }

  // Verify state for CSRF protection
  const cookieStore = await cookies();
  const storedState = cookieStore.get("tiktok_oauth_state")?.value;
  const codeVerifier = cookieStore.get("tiktok_code_verifier")?.value;

  if (!storedState || storedState !== state) {
    console.error("TikTok OAuth state mismatch");
    return NextResponse.redirect(`${origin}/?error=invalid_state`);
  }

  if (!codeVerifier) {
    console.error("TikTok OAuth code verifier not found");
    return NextResponse.redirect(`${origin}/?error=missing_verifier`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: TIKTOK_REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("TikTok token exchange failed:", errorText);
      return NextResponse.redirect(`${origin}/?error=token_exchange_failed`);
    }

    const tokenData: TikTokTokenResponse = await tokenResponse.json();

    // Fetch user info
    const userInfoUrl = new URL(TIKTOK_USERINFO_URL);
    userInfoUrl.searchParams.set("fields", "open_id,union_id,avatar_url,display_name");

    const userResponse = await fetch(userInfoUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("TikTok user info failed:", errorText);
      return NextResponse.redirect(`${origin}/?error=user_info_failed`);
    }

    const userData: TikTokUserResponse = await userResponse.json();

    if (userData.error?.code) {
      console.error("TikTok API error:", userData.error);
      return NextResponse.redirect(`${origin}/?error=tiktok_api_error`);
    }

    const tiktokUser = userData.data.user;

    // Get admin client for database operations
    const adminClient = getAdminClient();
    if (!adminClient) {
      console.error("Admin client not configured");
      return NextResponse.redirect(`${origin}/?error=server_error`);
    }

    // Check if user exists with this TikTok ID
    // We'll store TikTok users with a synthetic email
    const syntheticEmail = `tiktok_${tiktokUser.open_id}@provepicks.local`;

    // Try to find existing user by email
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === syntheticEmail);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user
      isNewUser = true;
      
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        user_metadata: {
          tiktok_open_id: tiktokUser.open_id,
          tiktok_display_name: tiktokUser.display_name,
          avatar_url: tiktokUser.avatar_url,
          auth_method: "tiktok",
        },
      });

      if (createError || !newUser?.user) {
        console.error("Failed to create TikTok user:", createError);
        return NextResponse.redirect(`${origin}/?error=create_user_failed`);
      }

      userId = newUser.user.id;

      // Create profile
      const username = `tiktok_${tiktokUser.open_id.slice(0, 8)}`;
      const { error: profileError } = await adminClient
        .from("profiles")
        .upsert({
          id: userId,
          username: username,
          display_name: tiktokUser.display_name || username,
          avatar_url: tiktokUser.avatar_url,
          is_public: true,
          auth_provider: "tiktok",
          email_visible: false,
        }, {
          onConflict: "id",
        });

      if (profileError) {
        console.warn("Failed to create TikTok profile:", profileError);
      }
    }

    // Get profile info
    const { data: profile } = await adminClient
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    // Create session data
    const sessionData = {
      userId,
      provider: "tiktok",
      tiktokOpenId: tiktokUser.open_id,
      username: profile?.username || null,
      displayName: profile?.display_name || tiktokUser.display_name || null,
      avatarUrl: profile?.avatar_url || tiktokUser.avatar_url || null,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Create response and set cookies
    const response = NextResponse.redirect(origin);

    // Set session cookie
    response.cookies.set(OAUTH_SESSION_COOKIE, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Clear OAuth state cookies
    response.cookies.delete("tiktok_oauth_state");
    response.cookies.delete("tiktok_code_verifier");

    // Log event
    try {
      await logSystemEvent({
        eventType: isNewUser ? "TIKTOK_SIGNUP" : "TIKTOK_LOGIN",
        severity: "info",
        actorUserId: userId,
        entityType: "user",
        entityId: userId,
        payload: {
          tiktok_open_id: tiktokUser.open_id,
          display_name: tiktokUser.display_name,
          is_new_user: isNewUser,
        },
      });
    } catch (logError) {
      console.warn("Failed to log TikTok auth event:", logError);
    }

    return response;
  } catch (error) {
    console.error("TikTok OAuth callback error:", error);
    return NextResponse.redirect(`${origin}/?error=callback_error`);
  }
}
