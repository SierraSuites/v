-- ============================================================================
-- DESIGN SELECTIONS
-- Tracks material and finish choices per project.
-- Integrates with:
--   - project_expenses (upgrade costs roll up to project budget)
--   - tasks (status changes auto-create procurement/delivery tasks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS design_selections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- What it is
  category             TEXT NOT NULL,
  room_location        TEXT NOT NULL DEFAULT '',
  option_name          TEXT NOT NULL,
  manufacturer         TEXT NOT NULL DEFAULT '',
  model                TEXT NOT NULL DEFAULT '',
  sku                  TEXT NOT NULL DEFAULT '',
  color                TEXT NOT NULL DEFAULT '',
  finish               TEXT NOT NULL DEFAULT '',
  description          TEXT NOT NULL DEFAULT '',
  image_urls           TEXT[] NOT NULL DEFAULT '{}',

  -- Pricing
  price                NUMERIC(12,2) NOT NULL DEFAULT 0,
  upgrade_cost         NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Procurement
  lead_time_days       INTEGER NOT NULL DEFAULT 0,
  availability_status  TEXT NOT NULL DEFAULT 'in_stock'
                         CHECK (availability_status IN ('in_stock','order_required','discontinued','backorder')),

  -- Approval
  client_approved      BOOLEAN NOT NULL DEFAULT false,
  approved_date        TIMESTAMPTZ,

  -- Workflow status
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','rejected','ordered','received','installed')),
  notes                TEXT NOT NULL DEFAULT '',

  -- Linked expense (set when upgrade cost is posted to project_expenses)
  -- No FK constraint here — project_expenses may not be registered with PostgREST
  linked_expense_id    UUID,

  -- Linked procurement task (set when order task is auto-created)
  linked_task_id       UUID,   -- references tasks(id) — no FK registered (tasks has no PostgREST FK)

  -- Audit
  created_by           UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_design_selections_project  ON design_selections(project_id);
CREATE INDEX IF NOT EXISTS idx_design_selections_company  ON design_selections(company_id);
CREATE INDEX IF NOT EXISTS idx_design_selections_status   ON design_selections(status);
CREATE INDEX IF NOT EXISTS idx_design_selections_category ON design_selections(category);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_design_selections_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_design_selections_updated_at ON design_selections;
CREATE TRIGGER trg_design_selections_updated_at
  BEFORE UPDATE ON design_selections
  FOR EACH ROW EXECUTE FUNCTION update_design_selections_updated_at();

-- ── Privileges ───────────────────────────────────────────────────────────────
-- Must be granted separately from RLS — table privileges and row-level policies
-- are two independent layers in Postgres.
GRANT SELECT, INSERT, UPDATE, DELETE ON design_selections TO authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE design_selections ENABLE ROW LEVEL SECURITY;

-- Members of the company can read
CREATE POLICY "company members can read design_selections"
  ON design_selections FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Members of the company can insert
CREATE POLICY "company members can insert design_selections"
  ON design_selections FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Members of the company can update
CREATE POLICY "company members can update design_selections"
  ON design_selections FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Members of the company can delete
CREATE POLICY "company members can delete design_selections"
  ON design_selections FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );
