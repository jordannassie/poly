/**
 * GET /api/auth/google
 * 
 * Initiates Google OAuth flow via Supabase Auth.
 * Redirects user to Google's authorization page.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Build origin from host header (works in prod + dev, never localhost in prod)
  const host = request.headers.get("host") || "";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;
  const redirectTo = `${origin}/api/auth/callback`;

  // Dev-only logging
  if (process.env.NODE_ENV !== "production") {
    console.log("[google oauth redirectTo]", redirectTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  if (data.url) {
    return NextResponse.redirect(data.url);
  }

  return NextResponse.json(
    { error: "Failed to generate OAuth URL" },
    { status: 500 }
  );
}
