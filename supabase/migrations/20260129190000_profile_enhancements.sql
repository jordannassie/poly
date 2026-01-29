-- =====================================================
-- PROFILE ENHANCEMENTS
-- Add banner_url, auth_provider, email_visible columns
-- Storage buckets for avatars and banners
-- =====================================================

-- Add new columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT,
  ADD COLUMN IF NOT EXISTS email_visible BOOLEAN DEFAULT TRUE;

-- Create index for auth_provider lookups
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider ON public.profiles(auth_provider);

-- =====================================================
-- STORAGE BUCKETS
-- Run these in Supabase Dashboard > Storage > Create Bucket
-- Or use the Supabase SQL Editor with storage schema access
-- =====================================================

-- Note: Storage bucket creation typically requires the storage schema
-- These commands may need to be run separately in Supabase Dashboard

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('banners', 'banners', true)
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES (Run in Supabase Dashboard)
-- =====================================================

-- For avatars bucket:
-- Policy: "Users can upload own avatar"
-- CREATE POLICY "Users can upload own avatar"
-- ON storage.objects
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'avatars' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Policy: "Users can update own avatar"
-- CREATE POLICY "Users can update own avatar"
-- ON storage.objects
-- FOR UPDATE
-- TO authenticated
-- USING (
--   bucket_id = 'avatars' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Policy: "Anyone can view avatars"
-- CREATE POLICY "Anyone can view avatars"
-- ON storage.objects
-- FOR SELECT
-- TO public
-- USING (bucket_id = 'avatars');

-- For banners bucket (same pattern):
-- CREATE POLICY "Users can upload own banner"
-- ON storage.objects
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'banners' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- CREATE POLICY "Users can update own banner"
-- ON storage.objects
-- FOR UPDATE
-- TO authenticated
-- USING (
--   bucket_id = 'banners' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- CREATE POLICY "Anyone can view banners"
-- ON storage.objects
-- FOR SELECT
-- TO public
-- USING (bucket_id = 'banners');
