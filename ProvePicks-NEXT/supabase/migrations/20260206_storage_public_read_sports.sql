-- Migration: Enable public read access for SPORTS storage bucket
-- This policy allows anonymous users to read objects from the SPORTS bucket

-- Add a Storage objects SELECT policy for the SPORTS bucket
-- Using DO block to handle "policy already exists" gracefully
DO $$
BEGIN
  -- Check if policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access - SPORTS bucket'
  ) THEN
    -- Create the policy
    CREATE POLICY "Public read access - SPORTS bucket"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'SPORTS');
    
    RAISE NOTICE 'Created policy: Public read access - SPORTS bucket';
  ELSE
    RAISE NOTICE 'Policy already exists: Public read access - SPORTS bucket';
  END IF;
END $$;
