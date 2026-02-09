/**
 * Posts API
 * 
 * GET /api/posts?team_id=... - Get posts for a team
 * GET /api/posts?user_id=... - Get posts by a user
 * POST /api/posts - Create a post
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
  const userId = searchParams.get("user_id");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const sort = searchParams.get("sort") || "top"; // "top" (by score) or "new" (by date)
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  try {
    let query = adminClient
      .from("posts")
      .select("*")
      .range(offset, offset + limit - 1);
    
    // Sort by score (ranking) or by date
    if (sort === "new") {
      query = query.order("created_at", { ascending: false });
    } else {
      // Default: sort by score DESC, then by created_at DESC
      query = query.order("score", { ascending: false }).order("created_at", { ascending: false });
    }
    
    if (teamId) {
      query = query.eq("team_id", teamId);
    }
    
    if (userId) {
      query = query.eq("user_id", userId);
    }
    
    const { data: posts, error } = await query;
    
    if (error) {
      console.error("Get posts error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const currentUserId = getCurrentUserId();
    
    // Enrich posts with user profiles and vote status
    const enrichedPosts = await Promise.all(
      (posts || []).map(async (post) => {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", post.user_id)
          .maybeSingle();
        
        // Check if current user voted on this post
        let userVote = 0; // -1, 0, or 1
        if (currentUserId) {
          const { data: vote } = await adminClient
            .from("post_votes")
            .select("vote_type")
            .eq("user_id", currentUserId)
            .eq("post_id", post.id)
            .maybeSingle();
          userVote = vote?.vote_type || 0;
        }
        
        return {
          ...post,
          user: profile || { username: "Unknown", display_name: null, avatar_url: null },
          user_vote: userVote,
          is_owner: currentUserId === post.user_id,
        };
      })
    );
    
    return NextResponse.json({ posts: enrichedPosts });
  } catch (error) {
    console.error("Get posts error:", error);
    return NextResponse.json({ error: "Failed to get posts" }, { status: 500 });
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
    const { 
      title, 
      content, 
      team_id, 
      league, 
      post_type = "text",
      flair,
      link_url,
      image_url 
    } = body;
    
    // For market comments (team_id starts with "market:"), title is optional
    const isMarketComment = team_id?.startsWith("market:");
    
    // Title is required for discussion posts (but optional for market comments)
    if (!isMarketComment && (!title || title.trim().length === 0)) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    
    // For market comments, content is required if no title
    if (isMarketComment && !title && (!content || content.trim().length === 0)) {
      return NextResponse.json({ error: "Comment is required" }, { status: 400 });
    }
    
    if (title && title.length > 300) {
      return NextResponse.json({ error: "Title too long (max 300 chars)" }, { status: 400 });
    }
    
    if (content && content.length > 10000) {
      return NextResponse.json({ error: "Content too long (max 10000 chars)" }, { status: 400 });
    }
    
    // Validate post type (skip for market comments which use "comment" type)
    if (!isMarketComment && !["text", "image", "link", "poll"].includes(post_type)) {
      return NextResponse.json({ error: "Invalid post type" }, { status: 400 });
    }
    
    // Create post
    const { data: post, error } = await adminClient
      .from("posts")
      .insert({
        user_id: userId,
        title: title?.trim() || null,
        content: content?.trim() || null,
        team_id: team_id || null,
        league: league?.toLowerCase() || null,
        post_type: isMarketComment ? "comment" : post_type,
        flair: flair || null,
        link_url: link_url || null,
        image_url: image_url || null,
        upvotes: 1, // Auto-upvote own post
        downvotes: 0,
        score: 1,
      })
      .select()
      .single();
    
    if (error) {
      console.error("Create post error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Auto-upvote the post by the creator
    await adminClient
      .from("post_votes")
      .insert({
        user_id: userId,
        post_id: post.id,
        vote_type: 1,
      });
    
    // Fetch user profile for response
    const { data: profile } = await adminClient
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    
    return NextResponse.json({
      success: true,
      post: {
        ...post,
        user: profile || { username: "Unknown", display_name: null, avatar_url: null },
        user_vote: 1, // Creator auto-upvoted
      },
    });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
