/**
 * Individual Post API
 * 
 * GET /api/posts/[postId] - Get a single post
 * DELETE /api/posts/[postId] - Delete a post (owner only)
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

export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { postId } = params;

  try {
    const { data: post, error } = await adminClient
      .from("posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (error) {
      console.error("Get post error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Get user profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", post.user_id)
      .maybeSingle();

    // Check vote status
    const currentUserId = getCurrentUserId();
    let userVote = 0;
    if (currentUserId) {
      const { data: vote } = await adminClient
        .from("post_votes")
        .select("vote_type")
        .eq("user_id", currentUserId)
        .eq("post_id", postId)
        .maybeSingle();
      userVote = vote?.vote_type || 0;
    }

    return NextResponse.json({
      post: {
        ...post,
        user: profile || { username: "Unknown", display_name: null, avatar_url: null },
        user_vote: userVote,
        is_owner: currentUserId === post.user_id,
      },
    });
  } catch (error) {
    console.error("Get post error:", error);
    return NextResponse.json({ error: "Failed to get post" }, { status: 500 });
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
    // First, verify the post exists and belongs to the user
    const { data: post, error: fetchError } = await adminClient
      .from("posts")
      .select("id, user_id")
      .eq("id", postId)
      .maybeSingle();

    if (fetchError) {
      console.error("Fetch post error:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check ownership
    if (post.user_id !== userId) {
      return NextResponse.json({ error: "You can only delete your own posts" }, { status: 403 });
    }

    // Delete all votes for this post
    await adminClient
      .from("post_votes")
      .delete()
      .eq("post_id", postId);

    // Delete all comments for this post
    await adminClient
      .from("post_comments")
      .delete()
      .eq("post_id", postId);

    // Delete all likes for this post (if table exists)
    await adminClient
      .from("post_likes")
      .delete()
      .eq("post_id", postId);

    // Delete the post
    const { error: deleteError } = await adminClient
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deleteError) {
      console.error("Delete post error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Post deleted" });
  } catch (error) {
    console.error("Delete post error:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
