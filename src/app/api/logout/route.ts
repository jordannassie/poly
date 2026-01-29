/**
 * POST /api/logout
 * 
 * Clears all authentication sessions (wallet and Supabase).
 * Clears cookies and returns 200.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Cookie names to clear
const WALLET_SESSION_COOKIE = "pp_wallet_session";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    
    // Clear wallet session cookie
    cookieStore.set(WALLET_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0, // Immediately expire
    });
    
    // Clear any other auth-related cookies
    // Supabase auth cookies are typically managed client-side
    // but we'll clear common ones if present
    const supabaseCookies = [
      "sb-access-token",
      "sb-refresh-token",
    ];
    
    for (const cookieName of supabaseCookies) {
      try {
        cookieStore.set(cookieName, "", {
          path: "/",
          maxAge: 0,
        });
      } catch {
        // Cookie may not exist
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
