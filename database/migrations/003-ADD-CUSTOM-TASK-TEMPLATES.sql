-- ============================================================================
-- MIGRATION 003: ADD CUSTOM TASK TEMPLATES
-- ============================================================================
-- Date: January 24, 2026
-- Purpose: Deploy custom_task_templates table (missing from Supabase)
-- Required for: CustomTemplateManager component (Enterprise Part 2)
-- Dependencies: tasks table must exist
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.custom_task_templates (
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
-- STEP 2: CREATE INDEXES
-- ============================================================================

-- Index for user templates
CREATE INDEX IF NOT EXISTS idx_custom_task_templates_user ON public.custom_task_templates(user_id);

-- Index for company templates
CREATE INDEX IF NOT EXISTS idx_custom_task_templates_company ON public.custom_task_templates(company_id);

-- Index for public templates
CREATE INDEX IF NOT EXISTS idx_custom_task_templates_public ON public.custom_task_templates(is_public) WHERE is_public = true;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_custom_task_templates_category ON public.custom_task_templates(category);

-- Composite index for efficient queries
CREATE INDEX IF NOT EXISTS idx_custom_task_templates_user_company ON public.custom_task_templates(user_id, company_id);

-- ============================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.custom_task_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE RLS POLICIES
-- ============================================================================

-- Users can see their own templates
DROP POLICY IF EXISTS "Users can view own templates" ON public.custom_task_templates;
CREATE POLICY "Users can view own templates" ON public.custom_task_templates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can see public templates from their company
DROP POLICY IF EXISTS "Users can view company public templates" ON public.custom_task_templates;
CREATE POLICY "Users can view company public templates" ON public.custom_task_templates
  FOR SELECT
  USING (
    is_public = true
    AND company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Users can create templates
DROP POLICY IF EXISTS "Users can create templates" ON public.custom_task_templates;
CREATE POLICY "Users can create templates" ON public.custom_task_templates
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Users can update their own templates
DROP POLICY IF EXISTS "Users can update own templates" ON public.custom_task_templates;
CREATE POLICY "Users can update own templates" ON public.custom_task_templates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own templates
DROP POLICY IF EXISTS "Users can delete own templates" ON public.custom_task_templates;
CREATE POLICY "Users can delete own templates" ON public.custom_task_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 5: CREATE FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_task_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: CREATE TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS custom_task_templates_updated_at ON public.custom_task_templates;
CREATE TRIGGER custom_task_templates_updated_at
  BEFORE UPDATE ON public.custom_task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_task_templates_timestamp();

-- ============================================================================
-- STEP 7: ADD CONSTRAINTS
-- ============================================================================

-- Add constraint to ensure tasks is a valid array
ALTER TABLE public.custom_task_templates
  DROP CONSTRAINT IF EXISTS tasks_is_array;
ALTER TABLE public.custom_task_templates
  ADD CONSTRAINT tasks_is_array CHECK (jsonb_typeof(tasks) = 'array');

-- Add constraint for minimum template name length
ALTER TABLE public.custom_task_templates
  DROP CONSTRAINT IF EXISTS name_min_length;
ALTER TABLE public.custom_task_templates
  ADD CONSTRAINT name_min_length CHECK (char_length(name) >= 3);

-- ============================================================================
-- STEP 8: ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE public.custom_task_templates IS 'User-created and company-shared workflow templates';
COMMENT ON COLUMN public.custom_task_templates.id IS 'Unique identifier for the template';
COMMENT ON COLUMN public.custom_task_templates.user_id IS 'User who created the template';
COMMENT ON COLUMN public.custom_task_templates.company_id IS 'Company the template belongs to';
COMMENT ON COLUMN public.custom_task_templates.name IS 'Template name';
COMMENT ON COLUMN public.custom_task_templates.description IS 'Template description';
COMMENT ON COLUMN public.custom_task_templates.category IS 'Template category (general, residential, commercial, etc.)';
COMMENT ON COLUMN public.custom_task_templates.icon IS 'Emoji icon for the template';
COMMENT ON COLUMN public.custom_task_templates.tasks IS 'JSONB array of task objects';
COMMENT ON COLUMN public.custom_task_templates.is_public IS 'Whether the template is shared with the company';
COMMENT ON COLUMN public.custom_task_templates.created_at IS 'Timestamp when template was created';
COMMENT ON COLUMN public.custom_task_templates.updated_at IS 'Timestamp when template was last updated';

-- ============================================================================
-- STEP 9: GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.custom_task_templates TO authenticated;

-- ============================================================================
-- STEP 10: VERIFY DEPLOYMENT
-- ============================================================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'custom_task_templates'
  ) THEN
    RAISE NOTICE '✅ Table custom_task_templates created successfully!';
  ELSE
    RAISE EXCEPTION '❌ Table custom_task_templates was not created!';
  END IF;

  -- Check if RLS is enabled
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'custom_task_templates'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS enabled on custom_task_templates';
  ELSE
    RAISE WARNING '⚠️  RLS NOT enabled on custom_task_templates!';
  END IF;

  -- Check policies
  IF EXISTS (
    SELECT FROM pg_policies
    WHERE tablename = 'custom_task_templates'
  ) THEN
    RAISE NOTICE '✅ RLS policies created for custom_task_templates';
    RAISE NOTICE 'Policy count: %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'custom_task_templates');
  ELSE
    RAISE WARNING '⚠️  No RLS policies found for custom_task_templates!';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ MIGRATION 003 COMPLETED';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Table: custom_task_templates';
  RAISE NOTICE 'Indexes: 5 created';
  RAISE NOTICE 'RLS Policies: 5 created';
  RAISE NOTICE 'Triggers: 1 created';
  RAISE NOTICE 'Constraints: 2 created';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Custom Task Templates feature is now ready!';
  RAISE NOTICE 'Users can create and share workflow templates.';
END $$;

-- ============================================================================
-- OPTIONAL: SAMPLE DATA (Uncomment to insert example template)
-- ============================================================================

/*
-- Example custom template (DO NOT RUN IN PRODUCTION)
INSERT INTO public.custom_task_templates (user_id, company_id, name, description, category, icon, is_public, tasks)
VALUES (
  'YOUR-USER-ID-HERE',
  'YOUR-COMPANY-ID-HERE',
  'Sample Custom Workflow',
  'Example template showing structure',
  'general',
  '🔧',
  false,
  '[
    {
      "title": "Task 1",
      "description": "First task in workflow",
      "estimated_hours": 8,
      "priority": "high",
      "dependencies": []
    },
    {
      "title": "Task 2",
      "description": "Second task in workflow",
      "estimated_hours": 16,
      "priority": "medium",
      "dependencies": [0]
    }
  ]'::jsonb
);
*/

-- ============================================================================
-- ROLLBACK SCRIPT (If you need to undo this migration)
-- ============================================================================

/*
-- To rollback this migration, run:

DROP TRIGGER IF EXISTS custom_task_templates_updated_at ON public.custom_task_templates;
DROP FUNCTION IF EXISTS update_custom_task_templates_timestamp();
DROP TABLE IF EXISTS public.custom_task_templates CASCADE;

-- Verify rollback
SELECT 'custom_task_templates table dropped successfully' AS status
WHERE NOT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'custom_task_templates'
);
*/

-- ============================================================================
-- END OF MIGRATION 003
-- ============================================================================
