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
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  try {
    let query = adminClient
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    
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
    
    // Enrich posts with user profiles
    const enrichedPosts = await Promise.all(
      (posts || []).map(async (post) => {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", post.user_id)
          .maybeSingle();
        
        // Check if current user liked this post
        const currentUserId = getCurrentUserId();
        let hasLiked = false;
        if (currentUserId) {
          const { data: like } = await adminClient
            .from("post_likes")
            .select("id")
            .eq("user_id", currentUserId)
            .eq("post_id", post.id)
            .maybeSingle();
          hasLiked = !!like;
        }
        
        return {
          ...post,
          user: profile || { username: "Unknown", display_name: null, avatar_url: null },
          has_liked: hasLiked,
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
    const { content, team_id, league } = body;
    
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    
    if (content.length > 2000) {
      return NextResponse.json({ error: "Content too long (max 2000 chars)" }, { status: 400 });
    }
    
    // Create post
    const { data: post, error } = await adminClient
      .from("posts")
      .insert({
        user_id: userId,
        content: content.trim(),
        team_id: team_id || null,
        league: league?.toLowerCase() || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error("Create post error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
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
        has_liked: false,
      },
    });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
