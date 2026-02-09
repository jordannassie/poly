/**
 * Post Comments API
 * 
 * GET /api/posts/[postId]/comments - Get comments for a post
 * POST /api/posts/[postId]/comments - Create a comment on a post
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
  const { postId } = params;
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  try {
    // Get comments for the post
    const { data: comments, error } = await adminClient
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .is("parent_id", null) // Only top-level comments
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Get comments error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const currentUserId = getCurrentUserId();
    
    // Enrich comments with user profiles
    const enrichedComments = await Promise.all(
      (comments || []).map(async (comment) => {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", comment.user_id)
          .maybeSingle();
        
        // Check if current user liked this comment
        // Note: We'd need a comment_likes table for this
        // For now, just return has_liked: false
        
        return {
          ...comment,
          user: profile || { username: "Unknown", display_name: null, avatar_url: null },
          has_liked: false,
        };
      })
    );
    
    return NextResponse.json({ comments: enrichedComments });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json({ error: "Failed to get comments" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const userId = getCurrentUserId();
  
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  
  const { postId } = params;
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  try {
    const body = await request.json();
    const { content, parent_id } = body;
    
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    
    if (content.length > 1000) {
      return NextResponse.json({ error: "Content too long (max 1000 chars)" }, { status: 400 });
    }
    
    // Check if post exists
    const { data: post, error: postError } = await adminClient
      .from("posts")
      .select("id, comments_count")
      .eq("id", postId)
      .maybeSingle();
    
    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    
    // Create comment
    const { data: comment, error } = await adminClient
      .from("post_comments")
      .insert({
        user_id: userId,
        post_id: postId,
        parent_id: parent_id || null,
        content: content.trim(),
      })
      .select()
      .single();
    
    if (error) {
      console.error("Create comment error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Increment comments count on the post
    await adminClient
      .from("posts")
      .update({ comments_count: (post.comments_count || 0) + 1 })
      .eq("id", postId);
    
    // Fetch user profile for response
    const { data: profile } = await adminClient
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    
    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        user: profile || { username: "Unknown", display_name: null, avatar_url: null },
        has_liked: false,
      },
    });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
