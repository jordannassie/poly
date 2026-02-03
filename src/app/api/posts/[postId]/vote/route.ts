/**
 * Post Vote API
 * 
 * POST /api/posts/[postId]/vote - Vote on a post (upvote/downvote)
 * Body: { vote_type: 1 | -1 | 0 }  // 1 = upvote, -1 = downvote, 0 = remove vote
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
    const body = await request.json();
    const { vote_type } = body;
    
    // Validate vote_type
    if (![1, -1, 0].includes(vote_type)) {
      return NextResponse.json({ error: "Invalid vote_type. Must be 1, -1, or 0" }, { status: 400 });
    }
    
    // Get current post
    const { data: post, error: postError } = await adminClient
      .from("posts")
      .select("id, upvotes, downvotes, score")
      .eq("id", postId)
      .maybeSingle();
    
    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    
    // Get existing vote
    const { data: existingVote } = await adminClient
      .from("post_votes")
      .select("id, vote_type")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .maybeSingle();
    
    let upvotesDelta = 0;
    let downvotesDelta = 0;
    
    if (existingVote) {
      // Already voted - need to update or remove
      if (vote_type === 0) {
        // Remove vote
        await adminClient
          .from("post_votes")
          .delete()
          .eq("id", existingVote.id);
        
        if (existingVote.vote_type === 1) {
          upvotesDelta = -1;
        } else {
          downvotesDelta = -1;
        }
      } else if (vote_type !== existingVote.vote_type) {
        // Changing vote direction
        await adminClient
          .from("post_votes")
          .update({ vote_type })
          .eq("id", existingVote.id);
        
        if (vote_type === 1) {
          // Changing from downvote to upvote
          upvotesDelta = 1;
          downvotesDelta = -1;
        } else {
          // Changing from upvote to downvote
          upvotesDelta = -1;
          downvotesDelta = 1;
        }
      }
      // If same vote, do nothing
    } else if (vote_type !== 0) {
      // No existing vote and not removing - create new vote
      await adminClient
        .from("post_votes")
        .insert({
          user_id: userId,
          post_id: postId,
          vote_type,
        });
      
      if (vote_type === 1) {
        upvotesDelta = 1;
      } else {
        downvotesDelta = 1;
      }
    }
    
    // Update post vote counts
    const newUpvotes = Math.max(0, (post.upvotes || 0) + upvotesDelta);
    const newDownvotes = Math.max(0, (post.downvotes || 0) + downvotesDelta);
    const newScore = newUpvotes - newDownvotes;
    
    await adminClient
      .from("posts")
      .update({
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        score: newScore,
      })
      .eq("id", postId);
    
    return NextResponse.json({
      success: true,
      upvotes: newUpvotes,
      downvotes: newDownvotes,
      score: newScore,
      user_vote: vote_type,
    });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
