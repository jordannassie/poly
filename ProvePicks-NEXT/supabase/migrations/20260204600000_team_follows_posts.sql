-- =====================================================
-- TEAM FOLLOWS AND POSTS TABLES
-- Enable team following and community posts
-- =====================================================

-- ===================
-- TEAM FOLLOWS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS public.team_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id TEXT NOT NULL,  -- Format: "league:team_name" e.g. "nfl:kansas-city-chiefs"
  league TEXT NOT NULL,   -- nfl, nba, mlb, nhl, soccer
  team_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

-- Indexes for team_follows
CREATE INDEX IF NOT EXISTS idx_team_follows_user_id ON public.team_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_team_follows_team_id ON public.team_follows(team_id);
CREATE INDEX IF NOT EXISTS idx_team_follows_league ON public.team_follows(league);

-- Enable RLS
ALTER TABLE public.team_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_follows
DROP POLICY IF EXISTS "Anyone can view team follows" ON public.team_follows;
CREATE POLICY "Anyone can view team follows"
  ON public.team_follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage team follows" ON public.team_follows;
CREATE POLICY "Service role can manage team follows"
  ON public.team_follows FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===================
-- POSTS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id TEXT,           -- Optional: for team community posts
  league TEXT,            -- Optional: for team community posts
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_team_id ON public.posts(team_id);
CREATE INDEX IF NOT EXISTS idx_posts_league ON public.posts(league);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
CREATE POLICY "Anyone can view posts"
  ON public.posts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage posts" ON public.posts;
CREATE POLICY "Service role can manage posts"
  ON public.posts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===================
-- POST LIKES TABLE
-- ===================
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Index for post likes
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);

-- Enable RLS
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post likes
DROP POLICY IF EXISTS "Anyone can view post likes" ON public.post_likes;
CREATE POLICY "Anyone can view post likes"
  ON public.post_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage post likes" ON public.post_likes;
CREATE POLICY "Service role can manage post likes"
  ON public.post_likes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===================
-- POST COMMENTS TABLE
-- ===================
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

-- Indexes for post comments
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON public.post_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON public.post_comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post comments
DROP POLICY IF EXISTS "Anyone can view post comments" ON public.post_comments;
CREATE POLICY "Anyone can view post comments"
  ON public.post_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage post comments" ON public.post_comments;
CREATE POLICY "Service role can manage post comments"
  ON public.post_comments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
