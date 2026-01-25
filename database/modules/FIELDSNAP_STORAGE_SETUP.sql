-- FieldSnap Storage Bucket Setup
-- Run this in Supabase SQL Editor

-- 1. Create the photos storage bucket (if it doesn't exist)
-- Note: This is done via Supabase Dashboard > Storage > New Bucket
-- Bucket name: photos
-- Public: Yes (for easier URL access)
-- File size limit: 50MB
-- Allowed MIME types: image/*

-- 2. Set up RLS policies for the photos bucket

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload photos to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own photos
CREATE POLICY "Users can view their own photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own photos
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Create indexes for better performance on media_assets table
CREATE INDEX IF NOT EXISTS idx_media_assets_user_project ON media_assets(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_captured_at ON media_assets(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_uploaded_at ON media_assets(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON media_assets(status);
CREATE INDEX IF NOT EXISTS idx_media_assets_tags ON media_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_media_assets_ai_tags ON media_assets USING GIN(ai_tags);

-- 4. Create a function to automatically update storage_usage table
CREATE OR REPLACE FUNCTION update_user_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO storage_usage (user_id, total_size, photo_count)
    VALUES (NEW.user_id, NEW.file_size, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET
      total_size = storage_usage.total_size + NEW.file_size,
      photo_count = storage_usage.photo_count + 1,
      updated_at = NOW();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE storage_usage
    SET
      total_size = GREATEST(0, total_size - OLD.file_size),
      photo_count = GREATEST(0, photo_count - 1),
      updated_at = NOW()
    WHERE user_id = OLD.user_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.file_size != NEW.file_size THEN
    UPDATE storage_usage
    SET
      total_size = total_size - OLD.file_size + NEW.file_size,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger to update storage usage
DROP TRIGGER IF EXISTS trigger_update_storage_usage ON media_assets;
CREATE TRIGGER trigger_update_storage_usage
AFTER INSERT OR UPDATE OR DELETE ON media_assets
FOR EACH ROW
EXECUTE FUNCTION update_user_storage_usage();

-- 6. Create storage_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS storage_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_size BIGINT DEFAULT 0 NOT NULL,
  photo_count INTEGER DEFAULT 0 NOT NULL,
  video_count INTEGER DEFAULT 0 NOT NULL,
  document_count INTEGER DEFAULT 0 NOT NULL,
  other_count INTEGER DEFAULT 0 NOT NULL,
  last_upload_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on storage_usage
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for storage_usage
CREATE POLICY "Users can view own storage usage"
ON storage_usage FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own storage usage"
ON storage_usage FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own storage usage"
ON storage_usage FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 7. Create a view for easy photo statistics
CREATE OR REPLACE VIEW photo_statistics AS
SELECT
  user_id,
  COUNT(*) as total_photos,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_photos,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_photos,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_photos,
  COUNT(CASE WHEN ai_analysis IS NOT NULL THEN 1 END) as ai_analyzed_photos,
  COUNT(CASE WHEN ai_analysis->>'defects' != '[]' THEN 1 END) as photos_with_defects,
  COUNT(CASE WHEN ai_analysis->>'safety_issues' != '[]' THEN 1 END) as photos_with_safety_issues,
  COUNT(DISTINCT project_id) as unique_projects,
  SUM(file_size) as total_size,
  AVG(file_size) as avg_file_size,
  MAX(captured_at) as last_capture_date,
  MAX(uploaded_at) as last_upload_date
FROM media_assets
GROUP BY user_id;

-- 8. Grant access to the view
GRANT SELECT ON photo_statistics TO authenticated;

COMMIT;
