/**
 * Admin Setup Tables API
 * 
 * POST /api/admin/setup-tables - Creates missing tables for following and posts
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const results: { table: string; status: string; error?: string }[] = [];

  try {
    // Create team_follows table
    const { error: teamFollowsError } = await adminClient.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.team_follows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          team_id TEXT NOT NULL,
          league TEXT NOT NULL,
          team_name TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, team_id)
        );
        CREATE INDEX IF NOT EXISTS idx_team_follows_user_id ON public.team_follows(user_id);
        CREATE INDEX IF NOT EXISTS idx_team_follows_team_id ON public.team_follows(team_id);
      `
    });

    if (teamFollowsError) {
      // Try direct insert to check if table exists
      const { error: checkError } = await adminClient
        .from("team_follows")
        .select("id")
        .limit(1);
      
      if (checkError && checkError.message.includes("does not exist")) {
        results.push({ table: "team_follows", status: "missing", error: "Table needs to be created via Supabase SQL" });
      } else {
        results.push({ table: "team_follows", status: "exists" });
      }
    } else {
      results.push({ table: "team_follows", status: "created" });
    }

    // Check posts table
    const { error: postsCheckError } = await adminClient
      .from("posts")
      .select("id")
      .limit(1);
    
    if (postsCheckError && postsCheckError.message.includes("does not exist")) {
      results.push({ table: "posts", status: "missing", error: "Table needs to be created via Supabase SQL" });
    } else {
      results.push({ table: "posts", status: "exists" });
    }

    // Check post_likes table
    const { error: postLikesCheckError } = await adminClient
      .from("post_likes")
      .select("id")
      .limit(1);
    
    if (postLikesCheckError && postLikesCheckError.message.includes("does not exist")) {
      results.push({ table: "post_likes", status: "missing", error: "Table needs to be created via Supabase SQL" });
    } else {
      results.push({ table: "post_likes", status: "exists" });
    }

    // Check post_comments table
    const { error: postCommentsCheckError } = await adminClient
      .from("post_comments")
      .select("id")
      .limit(1);
    
    if (postCommentsCheckError && postCommentsCheckError.message.includes("does not exist")) {
      results.push({ table: "post_comments", status: "missing", error: "Table needs to be created via Supabase SQL" });
    } else {
      results.push({ table: "post_comments", status: "exists" });
    }

    const missingTables = results.filter(r => r.status === "missing");
    
    if (missingTables.length > 0) {
      return NextResponse.json({
        success: false,
        message: "Some tables are missing. Please run the SQL migration in Supabase.",
        results,
        sql: `
-- Run this SQL in Supabase SQL Editor:

-- Team Follows Table
CREATE TABLE IF NOT EXISTS public.team_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id TEXT NOT NULL,
  league TEXT NOT NULL,
  team_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);
CREATE INDEX IF NOT EXISTS idx_team_follows_user_id ON public.team_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_team_follows_team_id ON public.team_follows(team_id);
CREATE INDEX IF NOT EXISTS idx_team_follows_league ON public.team_follows(league);
ALTER TABLE public.team_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view team follows" ON public.team_follows FOR SELECT USING (true);
CREATE POLICY "Service role can manage team follows" ON public.team_follows FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id TEXT,
  league TEXT,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_team_id ON public.posts(team_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Service role can manage posts" ON public.posts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Post Likes Table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view post likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Service role can manage post likes" ON public.post_likes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Post Comments Table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view post comments" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Service role can manage post comments" ON public.post_comments FOR ALL TO service_role USING (true) WITH CHECK (true);
        `
      });
    }

    return NextResponse.json({
      success: true,
      message: "All tables exist",
      results,
    });
  } catch (error) {
    console.error("Setup tables error:", error);
    return NextResponse.json({ 
      error: "Failed to check/create tables",
      details: String(error),
    }, { status: 500 });
  }
}
