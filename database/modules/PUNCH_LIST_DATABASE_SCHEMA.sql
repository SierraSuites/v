-- ============================================
-- PUNCH LIST SYSTEM DATABASE SCHEMA
-- AI-Driven Quality Management for Construction
-- ============================================

-- ============================================
-- 1. PUNCH LIST ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS punch_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES media_assets(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- Link to TaskFlow task

  -- Core Information
  title TEXT NOT NULL,
  description TEXT,
  location_description TEXT, -- "North wall, 2nd floor, near electrical panel"

  -- Classification
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
  category TEXT CHECK (category IN ('safety', 'quality', 'compliance', 'aesthetic', 'functional')),
  trade TEXT CHECK (trade IN ('general', 'concrete', 'electrical', 'plumbing', 'hvac', 'carpentry', 'masonry')),

  -- Status Tracking
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'pending_review', 'resolved', 'closed', 'rejected')) DEFAULT 'open',

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,

  -- Dates
  due_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- AI-Generated Fields
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_confidence DECIMAL CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ai_finding_type TEXT CHECK (ai_finding_type IN ('safety_issue', 'quality_defect', 'compliance_violation', 'progress_tracking')),
  ai_details JSONB, -- Store full AI analysis details

  -- Cost & Impact
  estimated_cost DECIMAL,
  actual_cost DECIMAL,
  impact_level TEXT CHECK (impact_level IN ('blocking', 'high', 'medium', 'low')),

  -- Workflow
  requires_inspection BOOLEAN DEFAULT FALSE,
  inspection_completed BOOLEAN DEFAULT FALSE,
  inspector_notes TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Search optimization
  search_vector tsvector
);

-- ============================================
-- 2. PUNCH LIST COMMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS punch_list_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  punch_list_item_id UUID REFERENCES punch_list_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  user_name TEXT NOT NULL,

  -- Comment Content
  comment TEXT NOT NULL,
  comment_type TEXT CHECK (comment_type IN ('note', 'status_change', 'assignment', 'resolution', 'rejection')),

  -- Proof of Resolution
  photo_proof_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,

  -- Status Tracking
  resolved BOOLEAN DEFAULT FALSE,
  resolution_approved BOOLEAN,
  approved_by UUID REFERENCES auth.users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 3. PUNCH LIST ATTACHMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS punch_list_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  punch_list_item_id UUID REFERENCES punch_list_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,

  -- File Information
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,

  -- Context
  attachment_type TEXT CHECK (attachment_type IN ('before', 'after', 'supporting', 'specification')),
  description TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 4. PUNCH LIST HISTORY TABLE (Audit Trail)
-- ============================================

CREATE TABLE IF NOT EXISTS punch_list_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  punch_list_item_id UUID REFERENCES punch_list_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,

  -- Change Tracking
  action TEXT NOT NULL, -- 'created', 'updated', 'assigned', 'status_changed', 'resolved', 'reopened'
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  change_details JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================

-- Punch List Items Indexes
CREATE INDEX IF NOT EXISTS idx_punch_items_project ON punch_list_items(project_id);
CREATE INDEX IF NOT EXISTS idx_punch_items_photo ON punch_list_items(photo_id);
CREATE INDEX IF NOT EXISTS idx_punch_items_task ON punch_list_items(task_id);
CREATE INDEX IF NOT EXISTS idx_punch_items_status ON punch_list_items(status);
CREATE INDEX IF NOT EXISTS idx_punch_items_severity ON punch_list_items(severity);
CREATE INDEX IF NOT EXISTS idx_punch_items_assigned ON punch_list_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_punch_items_due_date ON punch_list_items(due_date);
CREATE INDEX IF NOT EXISTS idx_punch_items_created_at ON punch_list_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_punch_items_ai_generated ON punch_list_items(ai_generated) WHERE ai_generated = TRUE;
CREATE INDEX IF NOT EXISTS idx_punch_items_search ON punch_list_items USING GIN(search_vector);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_punch_items_project_status ON punch_list_items(project_id, status);
CREATE INDEX IF NOT EXISTS idx_punch_items_project_severity ON punch_list_items(project_id, severity);
CREATE INDEX IF NOT EXISTS idx_punch_items_assigned_status ON punch_list_items(assigned_to, status) WHERE assigned_to IS NOT NULL;

-- Comments Indexes
CREATE INDEX IF NOT EXISTS idx_punch_comments_item ON punch_list_comments(punch_list_item_id);
CREATE INDEX IF NOT EXISTS idx_punch_comments_user ON punch_list_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_punch_comments_resolved ON punch_list_comments(resolved) WHERE resolved = TRUE;

-- Attachments Indexes
CREATE INDEX IF NOT EXISTS idx_punch_attachments_item ON punch_list_attachments(punch_list_item_id);

-- History Indexes
CREATE INDEX IF NOT EXISTS idx_punch_history_item ON punch_list_history(punch_list_item_id);
CREATE INDEX IF NOT EXISTS idx_punch_history_created ON punch_list_history(created_at DESC);

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE punch_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_list_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_list_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_list_history ENABLE ROW LEVEL SECURITY;

-- Punch List Items Policies
CREATE POLICY "Users can view punch items from their projects" ON punch_list_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = punch_list_items.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create punch items in their projects" ON punch_list_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = punch_list_items.project_id AND projects.user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can update punch items in their projects" ON punch_list_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = punch_list_items.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete punch items they created" ON punch_list_items
  FOR DELETE USING (created_by = auth.uid());

-- Comments Policies
CREATE POLICY "Users can view comments on accessible punch items" ON punch_list_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM punch_list_items
      JOIN projects ON projects.id = punch_list_items.project_id
      WHERE punch_list_items.id = punch_list_comments.punch_list_item_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on accessible punch items" ON punch_list_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM punch_list_items
      JOIN projects ON projects.id = punch_list_items.project_id
      WHERE punch_list_items.id = punch_list_comments.punch_list_item_id
      AND projects.user_id = auth.uid()
    ) AND user_id = auth.uid()
  );

-- Attachments Policies
CREATE POLICY "Users can view attachments on accessible punch items" ON punch_list_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM punch_list_items
      JOIN projects ON projects.id = punch_list_items.project_id
      WHERE punch_list_items.id = punch_list_attachments.punch_list_item_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add attachments to accessible punch items" ON punch_list_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM punch_list_items
      JOIN projects ON projects.id = punch_list_items.project_id
      WHERE punch_list_items.id = punch_list_attachments.punch_list_item_id
      AND projects.user_id = auth.uid()
    ) AND user_id = auth.uid()
  );

-- History Policies
CREATE POLICY "Users can view history of accessible punch items" ON punch_list_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM punch_list_items
      JOIN projects ON projects.id = punch_list_items.project_id
      WHERE punch_list_items.id = punch_list_history.punch_list_item_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================
-- 7. TRIGGERS FOR AUTOMATION
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_punch_list_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER punch_items_updated_at
  BEFORE UPDATE ON punch_list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_punch_list_updated_at();

CREATE TRIGGER punch_comments_updated_at
  BEFORE UPDATE ON punch_list_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_punch_list_updated_at();

-- Create history entry on punch item changes
CREATE OR REPLACE FUNCTION create_punch_item_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO punch_list_history (punch_list_item_id, user_id, user_name, action, change_details)
    VALUES (NEW.id, NEW.created_by, 'User', 'created', row_to_json(NEW)::jsonb);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Track status changes
    IF OLD.status != NEW.status THEN
      INSERT INTO punch_list_history (punch_list_item_id, user_id, user_name, action, field_changed, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'User', 'status_changed', 'status', OLD.status, NEW.status);
    END IF;

    -- Track assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO punch_list_history (punch_list_item_id, user_id, user_name, action, field_changed, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'User', 'assigned', 'assigned_to', OLD.assigned_to::text, NEW.assigned_to::text);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER punch_items_history
  AFTER INSERT OR UPDATE ON punch_list_items
  FOR EACH ROW
  EXECUTE FUNCTION create_punch_item_history();

-- Update search vector for full-text search
CREATE OR REPLACE FUNCTION update_punch_item_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.location_description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER punch_items_search_vector
  BEFORE INSERT OR UPDATE ON punch_list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_punch_item_search_vector();

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Get punch list statistics for a project
CREATE OR REPLACE FUNCTION get_punch_list_stats(project_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'open', COUNT(*) FILTER (WHERE status = 'open'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'resolved', COUNT(*) FILTER (WHERE status = 'resolved'),
    'closed', COUNT(*) FILTER (WHERE status = 'closed'),
    'critical', COUNT(*) FILTER (WHERE severity = 'critical'),
    'high', COUNT(*) FILTER (WHERE severity = 'high'),
    'overdue', COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('resolved', 'closed')),
    'ai_generated', COUNT(*) FILTER (WHERE ai_generated = TRUE)
  )
  INTO result
  FROM punch_list_items
  WHERE project_id = project_uuid;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Get punch list items due soon (next 7 days)
CREATE OR REPLACE FUNCTION get_punch_items_due_soon(project_uuid UUID)
RETURNS SETOF punch_list_items AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM punch_list_items
  WHERE project_id = project_uuid
  AND due_date BETWEEN NOW() AND (NOW() + INTERVAL '7 days')
  AND status NOT IN ('resolved', 'closed')
  ORDER BY due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DEPLOYMENT COMPLETE
-- ============================================

-- Verify tables created
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'punch_%'
ORDER BY tablename;
