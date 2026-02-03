/**
 * Team Follow API
 * 
 * GET /api/teams/follow?team_id=... - Check if following a team + get follower count
 * POST /api/teams/follow - Follow a team
 * DELETE /api/teams/follow - Unfollow a team
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
  const teamId = searchParams.get("team_id");
  
  if (!teamId) {
    return NextResponse.json({ error: "team_id required" }, { status: 400 });
  }
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  const currentUserId = getCurrentUserId();
  
  try {
    // Get follower count for this team
    const { count: followersCount } = await adminClient
      .from("team_follows")
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId);
    
    // Check if current user is following
    let isFollowing = false;
    if (currentUserId) {
      const { data: follow } = await adminClient
        .from("team_follows")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("team_id", teamId)
        .maybeSingle();
      
      isFollowing = !!follow;
    }
    
    return NextResponse.json({
      followers_count: followersCount || 0,
      is_following: isFollowing,
    });
  } catch (error) {
    console.error("Team follow status error:", error);
    return NextResponse.json({ error: "Failed to get follow status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = getCurrentUserId();
  
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  try {
    const body = await request.json();
    const { team_id, league, team_name } = body;
    
    if (!team_id || !league || !team_name) {
      return NextResponse.json({ error: "team_id, league, and team_name required" }, { status: 400 });
    }
    
    // Create follow
    const { error } = await adminClient
      .from("team_follows")
      .insert({
        user_id: userId,
        team_id: team_id,
        league: league.toLowerCase(),
        team_name: team_name,
      });
    
    if (error) {
      if (error.code === "23505") {
        // Already following
        return NextResponse.json({ success: true, already_following: true });
      }
      console.error("Team follow error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Team follow error:", error);
    return NextResponse.json({ error: "Failed to follow team" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = getCurrentUserId();
  
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  try {
    const body = await request.json();
    const { team_id } = body;
    
    if (!team_id) {
      return NextResponse.json({ error: "team_id required" }, { status: 400 });
    }
    
    // Delete follow
    const { error } = await adminClient
      .from("team_follows")
      .delete()
      .eq("user_id", userId)
      .eq("team_id", team_id);
    
    if (error) {
      console.error("Team unfollow error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Team unfollow error:", error);
    return NextResponse.json({ error: "Failed to unfollow team" }, { status: 500 });
  }
}
