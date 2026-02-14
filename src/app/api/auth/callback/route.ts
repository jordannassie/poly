/**
 * GET /api/auth/callback
 * 
 * OAuth callback handler for Supabase Auth (Google).
 * Exchanges the code for a session and redirects to the app.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminClient, logSystemEvent } from "@/lib/supabase/admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  // Use host header to determine origin (works in production + local dev)
  const host = request.headers.get("host") || "";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  if (!code) {
    // No code - redirect to home with error
    return NextResponse.redirect(`${origin}/?error=no_code`);
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${origin}/?error=config_error`);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Exchange the code for a session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  if (data.user) {
    // Ensure profile exists for OAuth users
    const adminClient = getAdminClient();
    if (adminClient) {
      try {
        // Check if profile exists
        const { data: existingProfile } = await adminClient
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!existingProfile) {
          // Create profile for new OAuth user
          const email = data.user.email || "";
          const emailPrefix = email.split("@")[0] || "user";
          const username = `${emailPrefix}_${data.user.id.slice(0, 6)}`;
          const displayName = data.user.user_metadata?.full_name || 
                             data.user.user_metadata?.name ||
                             emailPrefix;

          await adminClient
            .from("profiles")
            .upsert({
              id: data.user.id,
              username: username,
              display_name: displayName,
              is_public: true,
              auth_provider: "google",
              email_visible: false,
            }, {
              onConflict: "id",
            });

          // Log new user signup
          await logSystemEvent({
            eventType: "GOOGLE_SIGNUP",
            severity: "info",
            actorUserId: data.user.id,
            entityType: "user",
            entityId: data.user.id,
            payload: {
              email: data.user.email,
              provider: "google",
            },
          });
        } else {
          // Log existing user login
          await logSystemEvent({
            eventType: "GOOGLE_LOGIN",
            severity: "info",
            actorUserId: data.user.id,
            entityType: "user",
            entityId: data.user.id,
            payload: {
              email: data.user.email,
              provider: "google",
            },
          });
        }
      } catch (profileError) {
        console.warn("Failed to create/check profile:", profileError);
        // Continue anyway - profile can be created later
      }
    }
  }

  // Redirect to portfolio page after successful login
  return NextResponse.redirect(`${origin}/portfolio`);
}
