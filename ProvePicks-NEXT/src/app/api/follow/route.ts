/**
 * Follow API
 * 
 * GET /api/follow?user_id=... - Check if following a user + get counts
 * POST /api/follow - Follow a user
 * DELETE /api/follow - Unfollow a user
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
  const targetUserId = searchParams.get("user_id");
  
  if (!targetUserId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  const currentUserId = getCurrentUserId();
  
  try {
    // Get follower count
    const { count: followersCount } = await adminClient
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", targetUserId);
    
    // Get following count
    const { count: followingCount } = await adminClient
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", targetUserId);
    
    // Check if current user is following
    let isFollowing = false;
    if (currentUserId && currentUserId !== targetUserId) {
      const { data: follow } = await adminClient
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId)
        .maybeSingle();
      
      isFollowing = !!follow;
    }
    
    return NextResponse.json({
      followers_count: followersCount || 0,
      following_count: followingCount || 0,
      is_following: isFollowing,
    });
  } catch (error) {
    console.error("Follow status error:", error);
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
    const { user_id: targetUserId } = body;
    
    if (!targetUserId) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }
    
    if (userId === targetUserId) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }
    
    // Check if target user exists
    const { data: targetUser } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", targetUserId)
      .maybeSingle();
    
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Create follow
    const { error } = await adminClient
      .from("follows")
      .insert({
        follower_id: userId,
        following_id: targetUserId,
      });
    
    if (error) {
      if (error.code === "23505") {
        // Already following
        return NextResponse.json({ success: true, already_following: true });
      }
      console.error("Follow error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json({ error: "Failed to follow" }, { status: 500 });
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
    const { user_id: targetUserId } = body;
    
    if (!targetUserId) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }
    
    // Delete follow
    const { error } = await adminClient
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", targetUserId);
    
    if (error) {
      console.error("Unfollow error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unfollow error:", error);
    return NextResponse.json({ error: "Failed to unfollow" }, { status: 500 });
  }
}
