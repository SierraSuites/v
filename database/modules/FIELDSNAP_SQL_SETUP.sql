-- ============================================
-- FIELDSNAP DATABASE SETUP FOR SUPABASE
-- Enterprise-Grade Visual Intelligence Platform
-- ============================================

-- ============================================
-- 1. MEDIA ASSETS TABLE (Core photo storage)
-- ============================================
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  -- File Information
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,

  -- Capture Metadata
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  capture_device TEXT, -- Camera model, drone type, etc.
  capture_source TEXT CHECK (capture_source IN ('mobile', 'drone', '360camera', 'security', 'scanner', 'api')) DEFAULT 'mobile',

  -- Geolocation Data
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  gps_altitude DECIMAL(10, 2),
  gps_accuracy DECIMAL(10, 2),
  gps_heading DECIMAL(5, 2), -- Compass direction

  -- Weather Conditions at Capture
  weather_condition TEXT,
  weather_temperature DECIMAL(5, 2),
  weather_humidity INTEGER,
  weather_wind_speed DECIMAL(5, 2),
  weather_visibility DECIMAL(5, 2),

  -- Blueprint Alignment
  blueprint_coordinates JSONB, -- { x, y, floor, room, zone }
  blueprint_id UUID, -- Reference to blueprint document

  -- User Annotations
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  annotations JSONB DEFAULT '[]', -- Array of annotation objects

  -- AI Analysis Results
  ai_tags TEXT[] DEFAULT '{}',
  ai_analysis JSONB, -- Comprehensive AI analysis results
  ai_confidence DECIMAL(5, 4),
  ai_processing_status TEXT CHECK (ai_processing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  ai_processed_at TIMESTAMPTZ,

  -- Quality & Safety
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  safety_issues JSONB DEFAULT '[]',
  defects_detected JSONB DEFAULT '[]',
  compliance_status TEXT CHECK (compliance_status IN ('compliant', 'non-compliant', 'needs_review')) DEFAULT 'needs_review',

  -- Review Status
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Organization
  album_ids UUID[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,

  -- Metadata
  exif_data JSONB, -- Full EXIF data from photo
  custom_metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS media_assets_user_id_idx ON public.media_assets(user_id);
CREATE INDEX IF NOT EXISTS media_assets_project_id_idx ON public.media_assets(project_id);
CREATE INDEX IF NOT EXISTS media_assets_captured_at_idx ON public.media_assets(captured_at DESC);
CREATE INDEX IF NOT EXISTS media_assets_status_idx ON public.media_assets(status);
CREATE INDEX IF NOT EXISTS media_assets_tags_idx ON public.media_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS media_assets_ai_tags_idx ON public.media_assets USING GIN(ai_tags);
CREATE INDEX IF NOT EXISTS media_assets_gps_idx ON public.media_assets(gps_latitude, gps_longitude) WHERE gps_latitude IS NOT NULL;

-- ============================================
-- 2. SMART ALBUMS (Dynamic & Manual Collections)
-- ============================================
CREATE TABLE IF NOT EXISTS public.smart_albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  description TEXT,
  album_type TEXT CHECK (album_type IN ('manual', 'smart', 'ai_curated')) DEFAULT 'manual',

  -- Smart Album Rules (for dynamic albums)
  rules JSONB, -- Query rules for auto-population

  -- Appearance
  cover_image_url TEXT,
  color TEXT DEFAULT '#FF6B6B',
  icon TEXT,

  -- Visibility
  is_public BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  shared_with UUID[], -- Array of user IDs

  -- Stats
  photo_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS smart_albums_user_id_idx ON public.smart_albums(user_id);
CREATE INDEX IF NOT EXISTS smart_albums_project_id_idx ON public.smart_albums(project_id);

-- ============================================
-- 3. AI ANALYSIS HISTORY (Audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_analysis_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE NOT NULL,

  analysis_type TEXT NOT NULL, -- 'object_detection', 'defect_detection', 'safety_check', etc.
  model_version TEXT NOT NULL,

  input_params JSONB,
  results JSONB NOT NULL,
  confidence DECIMAL(5, 4),

  processing_time_ms INTEGER,
  processing_cost DECIMAL(10, 6), -- API cost tracking

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_analysis_history_media_asset_id_idx ON public.ai_analysis_history(media_asset_id);
CREATE INDEX IF NOT EXISTS ai_analysis_history_analysis_type_idx ON public.ai_analysis_history(analysis_type);

-- ============================================
-- 4. PHOTO ANNOTATIONS (Markup & Issues)
-- ============================================
CREATE TABLE IF NOT EXISTS public.photo_annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  annotation_type TEXT CHECK (annotation_type IN ('rectangle', 'circle', 'arrow', 'text', 'polygon', 'measurement')) NOT NULL,

  -- Geometry
  coordinates JSONB NOT NULL, -- Shape-specific coordinate data
  color TEXT DEFAULT '#FF6B6B',
  stroke_width INTEGER DEFAULT 2,

  -- Content
  text_content TEXT,
  measurement_value DECIMAL(10, 2),
  measurement_unit TEXT,

  -- Issue Tracking
  is_issue BOOLEAN DEFAULT false,
  issue_type TEXT,
  issue_severity TEXT CHECK (issue_severity IN ('low', 'medium', 'high', 'critical')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS photo_annotations_media_asset_id_idx ON public.photo_annotations(media_asset_id);
CREATE INDEX IF NOT EXISTS photo_annotations_created_by_idx ON public.photo_annotations(created_by);
CREATE INDEX IF NOT EXISTS photo_annotations_assigned_to_idx ON public.photo_annotations(assigned_to) WHERE assigned_to IS NOT NULL;

-- ============================================
-- 5. PHOTO COMMENTS (Collaboration)
-- ============================================
CREATE TABLE IF NOT EXISTS public.photo_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_comment_id UUID REFERENCES public.photo_comments(id) ON DELETE CASCADE,

  comment_text TEXT NOT NULL,
  mentions UUID[], -- Array of mentioned user IDs

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS photo_comments_media_asset_id_idx ON public.photo_comments(media_asset_id);
CREATE INDEX IF NOT EXISTS photo_comments_user_id_idx ON public.photo_comments(user_id);

-- ============================================
-- 6. STORAGE USAGE TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS public.storage_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  total_bytes BIGINT DEFAULT 0,
  photo_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  document_count INTEGER DEFAULT 0,

  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- ============================================
-- 7. VISUAL ANALYTICS CACHE
-- ============================================
CREATE TABLE IF NOT EXISTS public.visual_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,

  metric_type TEXT NOT NULL, -- 'progress', 'quality', 'safety', 'coverage'
  metric_date DATE NOT NULL,

  metric_value DECIMAL(10, 4),
  metric_data JSONB, -- Detailed breakdown

  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, metric_type, metric_date)
);

CREATE INDEX IF NOT EXISTS visual_analytics_project_id_idx ON public.visual_analytics(project_id);
CREATE INDEX IF NOT EXISTS visual_analytics_metric_type_idx ON public.visual_analytics(metric_type);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_analytics ENABLE ROW LEVEL SECURITY;

-- Media Assets Policies
CREATE POLICY "Users can view their own media"
  ON public.media_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view project media if they have access"
  ON public.media_assets FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = projects.id
        AND user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert their own media"
  ON public.media_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media"
  ON public.media_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media"
  ON public.media_assets FOR DELETE
  USING (auth.uid() = user_id);

-- Smart Albums Policies
CREATE POLICY "Users can manage their own albums"
  ON public.smart_albums FOR ALL
  USING (auth.uid() = user_id);

-- Annotations Policies
CREATE POLICY "Users can view annotations on accessible media"
  ON public.photo_annotations FOR SELECT
  USING (
    media_asset_id IN (
      SELECT id FROM public.media_assets
      WHERE user_id = auth.uid()
      OR project_id IN (
        SELECT id FROM public.projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create annotations"
  ON public.photo_annotations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Comments Policies
CREATE POLICY "Users can view comments on accessible media"
  ON public.photo_comments FOR SELECT
  USING (
    media_asset_id IN (
      SELECT id FROM public.media_assets
      WHERE user_id = auth.uid()
      OR project_id IN (
        SELECT id FROM public.projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create comments"
  ON public.photo_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Storage Usage Policies
CREATE POLICY "Users can view their own storage usage"
  ON public.storage_usage FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_smart_albums_updated_at
  BEFORE UPDATE ON public.smart_albums
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_annotations_updated_at
  BEFORE UPDATE ON public.photo_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update storage usage
CREATE OR REPLACE FUNCTION update_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.storage_usage (user_id, total_bytes, photo_count)
    VALUES (NEW.user_id, NEW.file_size, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET total_bytes = storage_usage.total_bytes + NEW.file_size,
        photo_count = storage_usage.photo_count + 1,
        last_calculated_at = NOW();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.storage_usage
    SET total_bytes = total_bytes - OLD.file_size,
        photo_count = photo_count - 1,
        last_calculated_at = NOW()
    WHERE user_id = OLD.user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_storage_on_media_change
  AFTER INSERT OR DELETE ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_usage();

-- ============================================
-- STORAGE BUCKETS (Create in Supabase Dashboard)
-- ============================================
-- 1. Bucket: 'media-assets'
--    - Public: false
--    - File size limit: 100MB per file
--    - Allowed MIME types: image/*, video/*
--    - Enable image transformations
--    - Auto-generate thumbnails

-- 2. Bucket: 'blueprints'
--    - Public: false
--    - File size limit: 50MB
--    - Allowed MIME types: application/pdf, image/*

-- ============================================
-- COMPLETE!
-- ============================================
-- Run this script in Supabase SQL Editor to create all tables and policies
-- Then set up storage buckets in the Storage section
-- Configure Cloudinary or Supabase Storage for media hosting
