-- =====================================================
-- POSTS ENHANCEMENTS
-- Add Reddit-style features: title, post types, ranking
-- =====================================================

-- Add new columns to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'link', 'poll'));
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS flair TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

-- Create index for ranking/sorting
CREATE INDEX IF NOT EXISTS idx_posts_score ON public.posts(score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_score_created ON public.posts(score DESC, created_at DESC);

-- ===================
-- POST VOTES TABLE
-- ===================
CREATE TABLE IF NOT EXISTS public.post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)), -- -1 = downvote, 1 = upvote
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Indexes for post votes
CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON public.post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_user_id ON public.post_votes(user_id);

-- Enable RLS
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post votes
DROP POLICY IF EXISTS "Anyone can view post votes" ON public.post_votes;
CREATE POLICY "Anyone can view post votes"
  ON public.post_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage post votes" ON public.post_votes;
CREATE POLICY "Service role can manage post votes"
  ON public.post_votes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
