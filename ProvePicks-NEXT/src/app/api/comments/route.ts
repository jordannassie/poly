/**
 * Comments API
 * 
 * GET /api/comments?market_slug=... - Get comments for a market
 * POST /api/comments - Create a new comment
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
  const marketSlug = searchParams.get("market_slug");
  
  if (!marketSlug) {
    return NextResponse.json({ error: "market_slug required" }, { status: 400 });
  }
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  try {
    // Fetch comments with user profiles
    const { data: comments, error } = await adminClient
      .from("comments")
      .select(`
        id,
        content,
        position,
        likes_count,
        created_at,
        parent_id,
        user_id,
        profiles:user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("market_slug", marketSlug)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (error) {
      console.error("Comments fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Transform to include user info at top level
    const transformedComments = (comments || []).map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      position: comment.position,
      likes_count: comment.likes_count,
      created_at: comment.created_at,
      parent_id: comment.parent_id,
      user_id: comment.user_id,
      username: comment.profiles?.username,
      display_name: comment.profiles?.display_name,
      avatar_url: comment.profiles?.avatar_url,
    }));
    
    return NextResponse.json({ comments: transformedComments });
  } catch (error) {
    console.error("Comments error:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
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
    const { market_slug, content, position, parent_id } = body;
    
    if (!market_slug || !content) {
      return NextResponse.json({ error: "market_slug and content required" }, { status: 400 });
    }
    
    if (content.length > 500) {
      return NextResponse.json({ error: "Comment too long (max 500 chars)" }, { status: 400 });
    }
    
    // Create comment
    const { data: comment, error } = await adminClient
      .from("comments")
      .insert({
        user_id: userId,
        market_slug,
        content: content.trim(),
        position: position || null,
        parent_id: parent_id || null,
      })
      .select(`
        id,
        content,
        position,
        likes_count,
        created_at,
        parent_id,
        user_id
      `)
      .single();
    
    if (error) {
      console.error("Comment create error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Fetch user profile for response
    const { data: profile } = await adminClient
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", userId)
      .single();
    
    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        username: profile?.username,
        display_name: profile?.display_name,
        avatar_url: profile?.avatar_url,
      },
    });
  } catch (error) {
    console.error("Comment error:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
