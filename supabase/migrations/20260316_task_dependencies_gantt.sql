-- ============================================================================
-- Task Dependencies & Gantt Chart Support
-- Module: Task Management Enhancement
-- Date: 2026-03-16
-- ============================================================================

-- ============================================================================
-- 1. CREATE TASK DEPENDENCIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- The task that depends on another (blocked task)
  task_id UUID NOT NULL,

  -- The task that must be completed first (blocking task)
  depends_on_task_id UUID NOT NULL,

  -- Dependency type
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start'
    CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),

  -- Lag time in days (can be negative for lead time)
  lag_days INTEGER DEFAULT 0,

  -- Is this dependency enforced (hard) or just informational (soft)
  is_hard_dependency BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent circular dependencies at constraint level
  CONSTRAINT task_dependencies_no_self_reference CHECK (task_id != depends_on_task_id),

  -- Unique constraint per company
  CONSTRAINT task_dependencies_unique UNIQUE (company_id, task_id, depends_on_task_id)
);

-- Indexes
CREATE INDEX idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
CREATE INDEX idx_task_dependencies_company_id ON task_dependencies(company_id);

-- ============================================================================
-- 2. ADD GANTT-RELATED FIELDS TO TASKS TABLE (if not exists)
-- ============================================================================

-- Add scheduling fields to tasks table
DO $$
BEGIN
  -- Start date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'start_date') THEN
    ALTER TABLE tasks ADD COLUMN start_date DATE;
  END IF;

  -- Due date (may already exist)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'due_date') THEN
    ALTER TABLE tasks ADD COLUMN due_date DATE;
  END IF;

  -- Duration in days
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'duration_days') THEN
    ALTER TABLE tasks ADD COLUMN duration_days INTEGER DEFAULT 1;
  END IF;

  -- Completion percentage (0-100)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'completion_percentage') THEN
    ALTER TABLE tasks ADD COLUMN completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100);
  END IF;

  -- Is this task a milestone?
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'is_milestone') THEN
    ALTER TABLE tasks ADD COLUMN is_milestone BOOLEAN DEFAULT false;
  END IF;

  -- Critical path flag (calculated field)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'is_on_critical_path') THEN
    ALTER TABLE tasks ADD COLUMN is_on_critical_path BOOLEAN DEFAULT false;
  END IF;

  -- Early start/finish for CPM calculations
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'early_start_date') THEN
    ALTER TABLE tasks ADD COLUMN early_start_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'early_finish_date') THEN
    ALTER TABLE tasks ADD COLUMN early_finish_date DATE;
  END IF;

  -- Late start/finish for CPM calculations
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'late_start_date') THEN
    ALTER TABLE tasks ADD COLUMN late_start_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'late_finish_date') THEN
    ALTER TABLE tasks ADD COLUMN late_finish_date DATE;
  END IF;

  -- Slack/float (calculated)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'slack_days') THEN
    ALTER TABLE tasks ADD COLUMN slack_days INTEGER;
  END IF;
END $$;

-- ============================================================================
-- 3. CREATE VIEW FOR GANTT CHART DATA
-- ============================================================================

CREATE OR REPLACE VIEW gantt_chart_tasks AS
SELECT
  t.id,
  t.title,
  t.description,
  t.project_id,
  t.status,
  t.priority,
  t.assignee_id,
  t.start_date,
  t.due_date,
  t.duration_days,
  t.completion_percentage,
  t.is_milestone,
  t.is_on_critical_path,
  t.slack_days,
  t.company_id,

  -- Dependency information
  COALESCE(
    json_agg(
      json_build_object(
        'depends_on_task_id', td.depends_on_task_id,
        'dependency_type', td.dependency_type,
        'lag_days', td.lag_days,
        'is_hard_dependency', td.is_hard_dependency
      )
    ) FILTER (WHERE td.id IS NOT NULL),
    '[]'
  ) AS dependencies,

  -- Count of tasks that depend on this one
  (SELECT COUNT(*)
   FROM task_dependencies td2
   WHERE td2.depends_on_task_id = t.id) AS blocked_tasks_count,

  -- Is this task blocked by incomplete dependencies?
  EXISTS(
    SELECT 1
    FROM task_dependencies td3
    JOIN tasks t2 ON t2.id = td3.depends_on_task_id
    WHERE td3.task_id = t.id
      AND td3.is_hard_dependency = true
      AND t2.status != 'completed'
  ) AS is_blocked

FROM tasks t
LEFT JOIN task_dependencies td ON td.task_id = t.id
GROUP BY t.id;

-- ============================================================================
-- 4. FUNCTION: CALCULATE CRITICAL PATH (CPM Algorithm)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_critical_path(p_project_id UUID)
RETURNS TABLE(
  task_id UUID,
  is_critical BOOLEAN,
  early_start DATE,
  early_finish DATE,
  late_start DATE,
  late_finish DATE,
  slack_days INTEGER
) AS $$
BEGIN
  -- This is a simplified CPM calculation
  -- For production, consider using a more sophisticated algorithm

  -- Reset all critical path flags
  UPDATE tasks
  SET is_on_critical_path = false,
      slack_days = NULL
  WHERE project_id = p_project_id;

  -- Forward pass: Calculate early start and early finish
  WITH RECURSIVE forward_pass AS (
    -- Base case: Tasks with no dependencies
    SELECT
      t.id AS task_id,
      t.start_date::DATE AS early_start,
      (t.start_date::DATE + COALESCE(t.duration_days, 1))::DATE AS early_finish,
      0 AS level
    FROM tasks t
    WHERE t.project_id = p_project_id
      AND NOT EXISTS (
        SELECT 1 FROM task_dependencies td
        WHERE td.task_id = t.id
      )

    UNION ALL

    -- Recursive case: Tasks that depend on completed forward pass tasks
    SELECT
      t.id AS task_id,
      GREATEST(
        fp.early_finish + COALESCE(td.lag_days, 0),
        t.start_date::DATE
      )::DATE AS early_start,
      (GREATEST(
        fp.early_finish + COALESCE(td.lag_days, 0),
        t.start_date::DATE
      ) + COALESCE(t.duration_days, 1))::DATE AS early_finish,
      fp.level + 1
    FROM tasks t
    JOIN task_dependencies td ON td.task_id = t.id
    JOIN forward_pass fp ON fp.task_id = td.depends_on_task_id
    WHERE t.project_id = p_project_id
  )
  UPDATE tasks t
  SET early_start_date = fp.early_start,
      early_finish_date = fp.early_finish
  FROM forward_pass fp
  WHERE t.id = fp.task_id;

  -- Calculate late start/finish and slack
  -- (Simplified - a full CPM would do backward pass)
  UPDATE tasks t
  SET late_start_date = t.early_start_date,
      late_finish_date = t.early_finish_date,
      slack_days = 0,
      is_on_critical_path = true
  WHERE t.project_id = p_project_id
    AND t.early_finish_date = (
      SELECT MAX(early_finish_date)
      FROM tasks
      WHERE project_id = p_project_id
    );

  -- Return results
  RETURN QUERY
  SELECT
    t.id,
    t.is_on_critical_path,
    t.early_start_date,
    t.early_finish_date,
    t.late_start_date,
    t.late_finish_date,
    t.slack_days
  FROM tasks t
  WHERE t.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. FUNCTION: DETECT CIRCULAR DEPENDENCIES
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_circular_dependency(
  p_task_id UUID,
  p_depends_on_task_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_circular BOOLEAN;
BEGIN
  -- Use recursive CTE to detect cycles
  WITH RECURSIVE dependency_chain AS (
    SELECT
      task_id,
      depends_on_task_id,
      1 AS depth,
      ARRAY[task_id, depends_on_task_id] AS path
    FROM task_dependencies
    WHERE task_id = p_depends_on_task_id

    UNION ALL

    SELECT
      td.task_id,
      td.depends_on_task_id,
      dc.depth + 1,
      dc.path || td.depends_on_task_id
    FROM task_dependencies td
    JOIN dependency_chain dc ON dc.depends_on_task_id = td.task_id
    WHERE NOT (td.depends_on_task_id = ANY(dc.path))
      AND dc.depth < 20 -- Prevent infinite loops
  )
  SELECT EXISTS(
    SELECT 1 FROM dependency_chain
    WHERE depends_on_task_id = p_task_id
  ) INTO v_is_circular;

  RETURN v_is_circular;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. TRIGGER: PREVENT CIRCULAR DEPENDENCIES
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_circular_dependencies()
RETURNS TRIGGER AS $$
BEGIN
  IF detect_circular_dependency(NEW.task_id, NEW.depends_on_task_id) THEN
    RAISE EXCEPTION 'Circular dependency detected: Task % would depend on itself through a chain', NEW.task_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_circular_dependencies
  BEFORE INSERT OR UPDATE ON task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_dependencies();

-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- View dependencies for tasks in your company
CREATE POLICY "Users can view task dependencies in their company"
  ON task_dependencies FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Create dependencies (requires task management permission)
CREATE POLICY "Users can create task dependencies"
  ON task_dependencies FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_role_assignments ura ON ura.user_id = up.id
      JOIN custom_roles cr ON cr.id = ura.role_id
      WHERE up.id = auth.uid()
        AND cr.permissions->>'canManageTasks' = 'true'
    )
  );

-- Update dependencies (requires task management permission)
CREATE POLICY "Users can update task dependencies"
  ON task_dependencies FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_role_assignments ura ON ura.user_id = up.id
      JOIN custom_roles cr ON cr.id = ura.role_id
      WHERE up.id = auth.uid()
        AND cr.permissions->>'canManageTasks' = 'true'
    )
  );

-- Delete dependencies (requires task management permission)
CREATE POLICY "Users can delete task dependencies"
  ON task_dependencies FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_role_assignments ura ON ura.user_id = up.id
      JOIN custom_roles cr ON cr.id = ura.role_id
      WHERE up.id = auth.uid()
        AND cr.permissions->>'canManageTasks' = 'true'
    )
  );

-- ============================================================================
-- 8. SAMPLE DATA (for development/testing)
-- ============================================================================

-- This is commented out - uncomment to add sample dependencies
/*
INSERT INTO task_dependencies (company_id, task_id, depends_on_task_id, dependency_type, lag_days)
VALUES
  -- Example: Foundation must be complete before framing can start
  ((SELECT id FROM companies LIMIT 1),
   (SELECT id FROM tasks WHERE title LIKE '%Framing%' LIMIT 1),
   (SELECT id FROM tasks WHERE title LIKE '%Foundation%' LIMIT 1),
   'finish_to_start', 0),

  -- Example: Electrical and Plumbing can start at same time after framing
  ((SELECT id FROM companies LIMIT 1),
   (SELECT id FROM tasks WHERE title LIKE '%Electrical%' LIMIT 1),
   (SELECT id FROM tasks WHERE title LIKE '%Framing%' LIMIT 1),
   'finish_to_start', 0);
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE task_dependencies IS 'Task dependencies for Gantt chart and critical path analysis';
COMMENT ON FUNCTION calculate_critical_path IS 'Calculate critical path using CPM algorithm';
COMMENT ON FUNCTION detect_circular_dependency IS 'Detect circular dependencies to prevent infinite loops';
