/**
 * Post Like API
 * 
 * POST /api/posts/[postId]/like - Like a post
 * DELETE /api/posts/[postId]/like - Unlike a post
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

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const userId = getCurrentUserId();
  
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  const { postId } = params;
  
  try {
    // Check if post exists
    const { data: post } = await adminClient
      .from("posts")
      .select("id, likes_count")
      .eq("id", postId)
      .maybeSingle();
    
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    
    // Create like
    const { error: likeError } = await adminClient
      .from("post_likes")
      .insert({
        user_id: userId,
        post_id: postId,
      });
    
    if (likeError) {
      if (likeError.code === "23505") {
        // Already liked
        return NextResponse.json({ success: true, already_liked: true });
      }
      console.error("Like post error:", likeError);
      return NextResponse.json({ error: likeError.message }, { status: 500 });
    }
    
    // Increment likes count
    const { error: updateError } = await adminClient
      .from("posts")
      .update({ likes_count: (post.likes_count || 0) + 1 })
      .eq("id", postId);
    
    if (updateError) {
      console.error("Update likes count error:", updateError);
    }
    
    return NextResponse.json({ success: true, likes_count: (post.likes_count || 0) + 1 });
  } catch (error) {
    console.error("Like post error:", error);
    return NextResponse.json({ error: "Failed to like post" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const userId = getCurrentUserId();
  
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  const { postId } = params;
  
  try {
    // Get current likes count
    const { data: post } = await adminClient
      .from("posts")
      .select("id, likes_count")
      .eq("id", postId)
      .maybeSingle();
    
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    
    // Delete like
    const { error: unlikeError } = await adminClient
      .from("post_likes")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);
    
    if (unlikeError) {
      console.error("Unlike post error:", unlikeError);
      return NextResponse.json({ error: unlikeError.message }, { status: 500 });
    }
    
    // Decrement likes count
    const newCount = Math.max(0, (post.likes_count || 0) - 1);
    const { error: updateError } = await adminClient
      .from("posts")
      .update({ likes_count: newCount })
      .eq("id", postId);
    
    if (updateError) {
      console.error("Update likes count error:", updateError);
    }
    
    return NextResponse.json({ success: true, likes_count: newCount });
  } catch (error) {
    console.error("Unlike post error:", error);
    return NextResponse.json({ error: "Failed to unlike post" }, { status: 500 });
  }
}
