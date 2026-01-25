-- ============================================
-- COMPLETE DATABASE DEPLOYMENT SCRIPT
-- For The Sierra Suites Construction Platform
-- ============================================

-- This script creates all necessary tables, indexes, RLS policies,
-- and storage buckets for the application.

-- ============================================
-- 1. TASKFLOW TABLES
-- ============================================

-- Main tasks table (comprehensive construction task management)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Basic Information
  title TEXT NOT NULL,
  description TEXT,

  -- Construction Categorization
  phase TEXT CHECK (phase IN ('preconstruction', 'foundation', 'framing', 'mep', 'finishes', 'closeout', 'warranty')),
  trade TEXT CHECK (trade IN ('general', 'concrete', 'electrical', 'plumbing', 'hvac', 'carpentry', 'masonry')),
  location TEXT,
  zone TEXT,
  floor_level TEXT,

  -- Status & Priority
  status TEXT CHECK (status IN ('not-started', 'in-progress', 'blocked', 'under-review', 'completed')) DEFAULT 'not-started',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Time Tracking
  start_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  duration_days INTEGER,
  buffer_days INTEGER DEFAULT 0,

  -- Dependencies & Scheduling
  dependencies UUID[],
  predecessor_tasks UUID[],
  successor_tasks UUID[],
  critical_path BOOLEAN DEFAULT false,

  -- Weather Considerations
  weather_dependent BOOLEAN DEFAULT false,
  min_temperature NUMERIC,
  max_wind_speed NUMERIC,
  rain_acceptable BOOLEAN DEFAULT false,

  -- Inspection & Quality
  inspection_required BOOLEAN DEFAULT false,
  inspection_type TEXT,
  inspection_date TIMESTAMP WITH TIME ZONE,
  inspector_name TEXT,
  quality_standards TEXT[],

  -- Resources
  assigned_to UUID REFERENCES auth.users(id),
  assigned_team UUID[],
  crew_size INTEGER,
  equipment_needed TEXT[],
  materials_needed TEXT[],
  required_certifications TEXT[],

  -- Safety & Quality
  safety_protocols TEXT[],
  ppe_required TEXT[],
  hazards TEXT[],
  safety_score INTEGER CHECK (safety_score >= 0 AND safety_score <= 100),
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),

  -- Documentation
  documents UUID[],
  photos UUID[],
  notes TEXT,

  -- Completion
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  completion_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  content TEXT NOT NULL,
  mentions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. FIELDSNAP TABLES
-- ============================================

-- Media assets table (photos and videos)
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- File Information
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  duration NUMERIC, -- for videos

  -- Capture Information
  device_info JSONB,
  capture_source TEXT CHECK (capture_source IN ('upload', 'camera', 'mobile', 'drone', 'api')),

  -- GPS & Location
  gps_latitude NUMERIC,
  gps_longitude NUMERIC,
  gps_altitude NUMERIC,
  gps_heading NUMERIC,
  gps_accuracy NUMERIC,

  -- Timestamps
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  ai_tags TEXT[] DEFAULT '{}',

  -- AI Analysis
  ai_analysis JSONB,
  ai_processed_at TIMESTAMP WITH TIME ZONE,

  -- Weather Data
  weather_data JSONB,

  -- Blueprint Integration
  blueprint_id UUID,
  blueprint_coordinates JSONB,

  -- Review & Status
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,

  -- Soft Delete
  deleted_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photo annotations table
CREATE TABLE IF NOT EXISTS photo_annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  annotation_type TEXT CHECK (annotation_type IN ('point', 'rectangle', 'circle', 'polygon', 'arrow', 'text')),
  coordinates JSONB NOT NULL,
  content TEXT,
  category TEXT CHECK (category IN ('defect', 'safety', 'progress', 'note', 'issue')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  assigned_to UUID REFERENCES auth.users(id),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photo comments table
CREATE TABLE IF NOT EXISTS photo_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI analysis history table
CREATE TABLE IF NOT EXISTS ai_analysis_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  model_version TEXT NOT NULL,
  processing_time_ms INTEGER,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CORE APPLICATION TABLES
-- ============================================

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  client_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  status TEXT CHECK (status IN ('active', 'on-hold', 'completed', 'archived')) DEFAULT 'active',
  budget NUMERIC,
  spent NUMERIC DEFAULT 0,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  description TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('project_created', 'project_updated', 'task_completed', 'photo_uploaded', 'milestone_reached', 'comment_added')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================

-- Tasks indexes
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_priority_idx ON tasks(priority);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_trade_idx ON tasks(trade);
CREATE INDEX IF NOT EXISTS tasks_phase_idx ON tasks(phase);

-- Media assets indexes
CREATE INDEX IF NOT EXISTS media_assets_user_id_idx ON media_assets(user_id);
CREATE INDEX IF NOT EXISTS media_assets_project_id_idx ON media_assets(project_id);
CREATE INDEX IF NOT EXISTS media_assets_captured_at_idx ON media_assets(captured_at DESC);
CREATE INDEX IF NOT EXISTS media_assets_status_idx ON media_assets(status);
CREATE INDEX IF NOT EXISTS media_assets_tags_idx ON media_assets USING gin(tags);
CREATE INDEX IF NOT EXISTS media_assets_ai_tags_idx ON media_assets USING gin(ai_tags);

-- Projects indexes
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);

-- Activities indexes
CREATE INDEX IF NOT EXISTS activities_user_id_idx ON activities(user_id);
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON activities(created_at DESC);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read) WHERE read = false;

-- Comments indexes
CREATE INDEX IF NOT EXISTS task_comments_task_id_idx ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS photo_comments_media_asset_id_idx ON photo_comments(media_asset_id);

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Tasks policies
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- Task comments policies
CREATE POLICY "Users can view comments on own tasks" ON task_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_comments.task_id AND tasks.user_id = auth.uid())
);
CREATE POLICY "Users can create comments on own tasks" ON task_comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_comments.task_id AND tasks.user_id = auth.uid())
);
CREATE POLICY "Users can update own comments" ON task_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON task_comments FOR DELETE USING (auth.uid() = user_id);

-- Task attachments policies
CREATE POLICY "Users can view attachments on own tasks" ON task_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_attachments.task_id AND tasks.user_id = auth.uid())
);
CREATE POLICY "Users can create attachments on own tasks" ON task_attachments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_attachments.task_id AND tasks.user_id = auth.uid())
);
CREATE POLICY "Users can delete own attachments" ON task_attachments FOR DELETE USING (auth.uid() = user_id);

-- Media assets policies
CREATE POLICY "Users can view own media" ON media_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload media" ON media_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own media" ON media_assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own media" ON media_assets FOR DELETE USING (auth.uid() = user_id);

-- Photo annotations policies
CREATE POLICY "Users can view annotations on own photos" ON photo_annotations FOR SELECT USING (
  EXISTS (SELECT 1 FROM media_assets WHERE media_assets.id = photo_annotations.media_asset_id AND media_assets.user_id = auth.uid())
);
CREATE POLICY "Users can create annotations" ON photo_annotations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM media_assets WHERE media_assets.id = photo_annotations.media_asset_id AND media_assets.user_id = auth.uid())
);
CREATE POLICY "Users can update own annotations" ON photo_annotations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own annotations" ON photo_annotations FOR DELETE USING (auth.uid() = user_id);

-- Photo comments policies
CREATE POLICY "Users can view comments on own photos" ON photo_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM media_assets WHERE media_assets.id = photo_comments.media_asset_id AND media_assets.user_id = auth.uid())
);
CREATE POLICY "Users can create comments" ON photo_comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM media_assets WHERE media_assets.id = photo_comments.media_asset_id AND media_assets.user_id = auth.uid())
);
CREATE POLICY "Users can delete own comments" ON photo_comments FOR DELETE USING (auth.uid() = user_id);

-- AI analysis history policies
CREATE POLICY "Users can view own AI analysis" ON ai_analysis_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create AI analysis" ON ai_analysis_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- Activities policies
CREATE POLICY "Users can view own activities" ON activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create activities" ON activities FOR INSERT WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 6. UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_assets_updated_at BEFORE UPDATE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_annotations_updated_at BEFORE UPDATE ON photo_annotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. STORAGE BUCKETS
-- ============================================

-- Note: These need to be created via Supabase Dashboard or CLI
-- as SQL cannot create storage buckets directly

/*
Create the following storage buckets in Supabase Dashboard:

1. task-attachments
   - Public: false
   - File size limit: 50MB
   - Allowed MIME types: all

2. media-assets
   - Public: true
   - File size limit: 100MB
   - Allowed MIME types: image/*, video/*

3. project-files
   - Public: false
   - File size limit: 50MB
   - Allowed MIME types: all
*/

-- ============================================
-- DEPLOYMENT COMPLETE
-- ============================================

-- Verify deployment with these queries:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- SELECT * FROM pg_indexes WHERE schemaname = 'public';
