-- ============================================================================
-- CUSTOM TASK TEMPLATES TABLE
-- Stores user-created and company-shared workflow templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_task_templates (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,

  -- Template Information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('general', 'residential', 'commercial', 'renovation', 'infrastructure')),
  icon VARCHAR(10) DEFAULT '📋',

  -- Tasks (JSONB array of task objects)
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Sharing
  is_public BOOLEAN DEFAULT false, -- Share with company

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for user templates
CREATE INDEX idx_custom_task_templates_user ON custom_task_templates(user_id);

-- Index for company templates
CREATE INDEX idx_custom_task_templates_company ON custom_task_templates(company_id);

-- Index for public templates
CREATE INDEX idx_custom_task_templates_public ON custom_task_templates(is_public) WHERE is_public = true;

-- Index for category filtering
CREATE INDEX idx_custom_task_templates_category ON custom_task_templates(category);

-- Composite index for efficient queries
CREATE INDEX idx_custom_task_templates_user_company ON custom_task_templates(user_id, company_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE custom_task_templates ENABLE ROW LEVEL SECURITY;

-- Users can see their own templates
CREATE POLICY "Users can view own templates" ON custom_task_templates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can see public templates from their company
CREATE POLICY "Users can view company public templates" ON custom_task_templates
  FOR SELECT
  USING (
    is_public = true
    AND company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can create templates
CREATE POLICY "Users can create templates" ON custom_task_templates
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can update their own templates
CREATE POLICY "Users can update own templates" ON custom_task_templates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates" ON custom_task_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_task_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_task_templates_updated_at
  BEFORE UPDATE ON custom_task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_task_templates_timestamp();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Example template structure (do NOT run in production):
/*
INSERT INTO custom_task_templates (user_id, company_id, name, description, category, icon, is_public, tasks)
VALUES (
  'user-uuid-here',
  'company-uuid-here',
  'My Custom Workflow',
  'Custom workflow for our team',
  'general',
  '🔧',
  true,
  '[
    {
      "title": "Task 1",
      "description": "First task description",
      "estimated_hours": 8,
      "priority": "high",
      "dependencies": []
    },
    {
      "title": "Task 2",
      "description": "Second task description",
      "estimated_hours": 16,
      "priority": "medium",
      "dependencies": [0]
    }
  ]'::jsonb
);
*/

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Add constraint to ensure tasks is a valid array
ALTER TABLE custom_task_templates
  ADD CONSTRAINT tasks_is_array CHECK (jsonb_typeof(tasks) = 'array');

-- Add constraint for minimum template name length
ALTER TABLE custom_task_templates
  ADD CONSTRAINT name_min_length CHECK (char_length(name) >= 3);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE custom_task_templates IS 'User-created and company-shared workflow templates';
COMMENT ON COLUMN custom_task_templates.id IS 'Unique identifier for the template';
COMMENT ON COLUMN custom_task_templates.user_id IS 'User who created the template';
COMMENT ON COLUMN custom_task_templates.company_id IS 'Company the template belongs to';
COMMENT ON COLUMN custom_task_templates.name IS 'Template name';
COMMENT ON COLUMN custom_task_templates.description IS 'Template description';
COMMENT ON COLUMN custom_task_templates.category IS 'Template category (general, residential, commercial, etc.)';
COMMENT ON COLUMN custom_task_templates.icon IS 'Emoji icon for the template';
COMMENT ON COLUMN custom_task_templates.tasks IS 'JSONB array of task objects';
COMMENT ON COLUMN custom_task_templates.is_public IS 'Whether the template is shared with the company';
COMMENT ON COLUMN custom_task_templates.created_at IS 'Timestamp when template was created';
COMMENT ON COLUMN custom_task_templates.updated_at IS 'Timestamp when template was last updated';

-- ============================================================================
-- GRANTS (if needed for specific roles)
-- ============================================================================

-- Grant necessary permissions (adjust based on your security model)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON custom_task_templates TO authenticated;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Custom Task Templates table created successfully!';
  RAISE NOTICE '📋 Table: custom_task_templates';
  RAISE NOTICE '🔐 RLS Policies: Enabled';
  RAISE NOTICE '📊 Indexes: Created';
  RAISE NOTICE '⚡ Triggers: Active';
END $$;
