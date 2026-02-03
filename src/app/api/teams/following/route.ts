/**
 * Get Teams a User is Following
 * 
 * GET /api/teams/following?user_id=... - Get teams a user is following
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

const WALLET_SESSION_COOKIE = "pp_wallet_session";

interface WalletSession {
  userId: string;
  expiresAt: string;
}

function getCurrentUserId(): string | null {
  try {
    const cookieStore = cookies();
    const walletSessionCookie = cookieStore.get(WALLET_SESSION_COOKIE);
    
    if (walletSessionCookie?.value) {
      const session: WalletSession = JSON.parse(walletSessionCookie.value);
      if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
        return session.userId;
      }
    }
  } catch {
    // Invalid session
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let targetUserId = searchParams.get("user_id");
  
  // If no user_id provided, use current user
  if (!targetUserId) {
    targetUserId = getCurrentUserId();
  }
  
  if (!targetUserId) {
    return NextResponse.json({ error: "user_id required or must be logged in" }, { status: 400 });
  }
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  try {
    // Get teams the user is following
    const { data: follows, error } = await adminClient
      .from("team_follows")
      .select("team_id, league, team_name, created_at")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Get following teams error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Enrich with team logos from sports_teams
    const teamsWithLogos = await Promise.all(
      (follows || []).map(async (follow) => {
        const { data: team } = await adminClient
          .from("sports_teams")
          .select("logo, slug")
          .eq("league", follow.league)
          .ilike("name", follow.team_name)
          .maybeSingle();
        
        return {
          ...follow,
          logo: team?.logo || null,
          slug: team?.slug || follow.team_name.toLowerCase().replace(/\s+/g, "-"),
        };
      })
    );
    
    return NextResponse.json({ teams: teamsWithLogos });
  } catch (error) {
    console.error("Get following teams error:", error);
    return NextResponse.json({ error: "Failed to get following teams" }, { status: 500 });
  }
}
