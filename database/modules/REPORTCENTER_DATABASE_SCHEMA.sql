-- ============================================================
-- REPORTCENTER DATABASE SCHEMA
-- Professional reporting system for construction contractors
-- ============================================================

-- ============================================================
-- 1. REPORTS MASTER TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- REPORT IDENTIFICATION
  report_number VARCHAR(50) UNIQUE NOT NULL,
  report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('daily', 'weekly_timesheet', 'budget', 'safety', 'progress', 'custom')),
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- SOURCE DATA (What this report is about)
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,

  -- GENERATION DETAILS
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_time_ms INTEGER, -- Track performance
  data_snapshot JSONB DEFAULT '{}'::jsonb, -- Raw data at generation time

  -- CONTENT & DELIVERY
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'sent', 'archived')),
  sent_to_client BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  client_viewed BOOLEAN DEFAULT false,
  client_viewed_at TIMESTAMPTZ,
  client_email VARCHAR(255),

  -- FILE STORAGE
  file_path TEXT, -- Supabase storage path
  pdf_url TEXT,
  excel_url TEXT,
  file_size_bytes INTEGER,

  -- REPORT CONTENT (Structured data)
  summary JSONB DEFAULT '{}'::jsonb, -- Key metrics/summary
  sections JSONB DEFAULT '[]'::jsonb, -- Report sections with data
  photos JSONB DEFAULT '[]'::jsonb, -- Photo references
  attachments JSONB DEFAULT '[]'::jsonb,

  -- METADATA
  tags TEXT[],
  notes TEXT,
  version INTEGER DEFAULT 1,
  parent_report_id UUID REFERENCES public.reports(id), -- For revisions
  is_template BOOLEAN DEFAULT false,

  -- WEATHER DATA (for daily reports)
  weather_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON public.reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON public.reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_date_range ON public.reports(date_range_start, date_range_end);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- ============================================================
-- 2. REPORT TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- TEMPLATE INFO
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('daily', 'weekly_timesheet', 'budget', 'safety', 'progress', 'custom')),
  category VARCHAR(50), -- client, internal, compliance, financial

  -- TEMPLATE STRUCTURE
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Structure: [{ id, type, title, fields, settings }]

  styling JSONB DEFAULT '{
    "primaryColor": "#2563EB",
    "accentColor": "#F97316",
    "fontFamily": "Inter",
    "showLogo": true,
    "showWatermark": false
  }'::jsonb,

  formulas JSONB DEFAULT '{}'::jsonb, -- Calculations between fields
  data_sources JSONB DEFAULT '{}'::jsonb, -- Which data to auto-pull

  -- USAGE & VISIBILITY
  is_default BOOLEAN DEFAULT false,
  is_system_template BOOLEAN DEFAULT false, -- Built-in templates
  is_public BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,

  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_templates_user_id ON public.report_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON public.report_templates(template_type);

-- ============================================================
-- 3. REPORT SCHEDULES (Automated reporting)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_id UUID REFERENCES public.report_templates(id),
  report_type VARCHAR(20) NOT NULL,

  -- SCHEDULING
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly')),
  day_of_week INTEGER, -- 0-6 (Sunday=0)
  day_of_month INTEGER, -- 1-31
  time_of_day TIME DEFAULT '17:00', -- 5 PM default
  timezone VARCHAR(50) DEFAULT 'America/New_York',

  -- DELIVERY
  delivery_method VARCHAR(20) DEFAULT 'email' CHECK (delivery_method IN ('email', 'download', 'portal', 'none')),
  recipients JSONB DEFAULT '[]'::jsonb, -- Array of emails
  cc_recipients JSONB DEFAULT '[]'::jsonb,

  include_pdf BOOLEAN DEFAULT true,
  include_excel BOOLEAN DEFAULT false,

  -- PROJECT FILTERS
  project_ids UUID[], -- Specific projects (empty = all active)
  active_projects_only BOOLEAN DEFAULT true,

  -- STATUS
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20), -- success, failed, skipped
  run_count INTEGER DEFAULT 0,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_user_id ON public.report_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_active ON public.report_schedules(is_active, next_run_at);

-- ============================================================
-- 4. TIMESHEET ENTRIES (For weekly timesheet reports)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.timesheet_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- WHO & WHERE
  employee_id UUID REFERENCES auth.users(id) NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  project_id UUID REFERENCES public.projects(id),

  -- WHEN
  work_date DATE NOT NULL,
  week_start_date DATE NOT NULL, -- Monday of the week

  -- HOURS
  regular_hours DECIMAL(5,2) DEFAULT 0 CHECK (regular_hours >= 0),
  overtime_hours DECIMAL(5,2) DEFAULT 0 CHECK (overtime_hours >= 0),
  total_hours DECIMAL(5,2) GENERATED ALWAYS AS (regular_hours + overtime_hours) STORED,

  -- RATES & COST
  hourly_rate DECIMAL(10,2),
  overtime_rate DECIMAL(10,2),
  total_cost DECIMAL(12,2) GENERATED ALWAYS AS (
    (regular_hours * COALESCE(hourly_rate, 0)) +
    (overtime_hours * COALESCE(overtime_rate, COALESCE(hourly_rate, 0) * 1.5))
  ) STORED,

  -- DETAILS
  task_description TEXT,
  trade VARCHAR(100), -- carpenter, electrician, plumber, etc.
  notes TEXT,

  -- APPROVAL
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,

  -- METADATA
  source VARCHAR(20) DEFAULT 'manual', -- manual, taskflow, imported
  synced_from_task_id UUID REFERENCES public.tasks(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timesheet_entries_user_id ON public.timesheet_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_employee ON public.timesheet_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_project ON public.timesheet_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_date ON public.timesheet_entries(work_date);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_week ON public.timesheet_entries(week_start_date);

-- ============================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_entries ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- REPORTS POLICIES
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own reports" ON public.reports;
CREATE POLICY "Users can create their own reports"
  ON public.reports FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own reports" ON public.reports;
CREATE POLICY "Users can update their own reports"
  ON public.reports FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own reports" ON public.reports;
CREATE POLICY "Users can delete their own reports"
  ON public.reports FOR DELETE
  USING (user_id = auth.uid());

-- TEMPLATES POLICIES
DROP POLICY IF EXISTS "Users can view templates" ON public.report_templates;
CREATE POLICY "Users can view templates"
  ON public.report_templates FOR SELECT
  USING (user_id = auth.uid() OR is_public = true OR is_system_template = true);

DROP POLICY IF EXISTS "Users can manage their templates" ON public.report_templates;
CREATE POLICY "Users can manage their templates"
  ON public.report_templates FOR ALL
  USING (user_id = auth.uid());

-- SCHEDULES POLICIES
DROP POLICY IF EXISTS "Users can manage schedules" ON public.report_schedules;
CREATE POLICY "Users can manage schedules"
  ON public.report_schedules FOR ALL
  USING (user_id = auth.uid());

-- TIMESHEET POLICIES
DROP POLICY IF EXISTS "Users can manage timesheet entries" ON public.timesheet_entries;
CREATE POLICY "Users can manage timesheet entries"
  ON public.timesheet_entries FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- 7. GRANT PERMISSIONS
-- ============================================================
GRANT ALL ON public.reports TO authenticated;
GRANT ALL ON public.report_templates TO authenticated;
GRANT ALL ON public.report_schedules TO authenticated;
GRANT ALL ON public.timesheet_entries TO authenticated;

-- ============================================================
-- 8. HELPER FUNCTIONS
-- ============================================================

-- Generate unique report number
CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix VARCHAR(4);
  type_prefix VARCHAR(10);
  sequence_num INTEGER;
  new_report_number VARCHAR(50);
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');

  type_prefix := CASE NEW.report_type
    WHEN 'daily' THEN 'DAILY'
    WHEN 'weekly_timesheet' THEN 'TIME'
    WHEN 'budget' THEN 'BUDG'
    WHEN 'safety' THEN 'SAFE'
    WHEN 'progress' THEN 'PROG'
    ELSE 'REPT'
  END;

  SELECT COALESCE(MAX(CAST(SUBSTRING(report_number FROM '\d+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.reports
  WHERE report_type = NEW.report_type
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND user_id = NEW.user_id;

  new_report_number := 'R-' || year_prefix || '-' || type_prefix || '-' || LPAD(sequence_num::TEXT, 3, '0');

  NEW.report_number := new_report_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_report_number ON public.reports;
CREATE TRIGGER trigger_generate_report_number
BEFORE INSERT ON public.reports
FOR EACH ROW
WHEN (NEW.report_number IS NULL OR NEW.report_number = '')
EXECUTE FUNCTION generate_report_number();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reports_timestamp ON public.reports;
CREATE TRIGGER trigger_update_reports_timestamp
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_templates_timestamp ON public.report_templates;
CREATE TRIGGER trigger_update_templates_timestamp
BEFORE UPDATE ON public.report_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 9. INSERT SYSTEM TEMPLATES
-- ============================================================

-- DAILY PROGRESS REPORT TEMPLATE
INSERT INTO public.report_templates (
  id,
  name,
  description,
  template_type,
  category,
  sections,
  is_system_template,
  is_default,
  is_public
) VALUES (
  gen_random_uuid(),
  'Daily Progress Report',
  'Professional daily update for clients with photos, tasks completed, and crew attendance',
  'daily',
  'client',
  '[
    {
      "id": "header",
      "type": "header",
      "title": "Report Header",
      "fields": ["project_name", "date", "weather", "supervisor", "report_number"]
    },
    {
      "id": "summary",
      "type": "summary",
      "title": "Today''s Summary",
      "fields": ["tasks_completed_count", "crew_size", "hours_worked", "progress_percent"]
    },
    {
      "id": "tasks",
      "type": "table",
      "title": "Tasks Completed Today",
      "fields": ["task_name", "assigned_to", "status", "notes"]
    },
    {
      "id": "photos",
      "type": "gallery",
      "title": "Today''s Progress Photos",
      "settings": {"maxPhotos": 6, "columns": 3}
    },
    {
      "id": "crew",
      "type": "table",
      "title": "Crew Attendance",
      "fields": ["crew_member", "trade", "hours_worked", "notes"]
    },
    {
      "id": "materials",
      "type": "list",
      "title": "Materials Delivered/Used",
      "fields": ["material", "quantity", "supplier", "notes"]
    },
    {
      "id": "issues",
      "type": "list",
      "title": "Issues & Concerns",
      "fields": ["issue_type", "description", "severity", "action_taken"]
    },
    {
      "id": "tomorrow",
      "type": "section",
      "title": "Tomorrow''s Plan",
      "fields": ["planned_tasks", "crew_needed", "materials_needed", "special_requirements"]
    }
  ]'::jsonb,
  true,
  true,
  true
) ON CONFLICT DO NOTHING;

-- WEEKLY TIMESHEET TEMPLATE
INSERT INTO public.report_templates (
  id,
  name,
  description,
  template_type,
  category,
  sections,
  is_system_template,
  is_default,
  is_public
) VALUES (
  gen_random_uuid(),
  'Weekly Timesheet Report',
  'Payroll-ready timesheet with project allocation and overtime calculations',
  'weekly_timesheet',
  'internal',
  '[
    {
      "id": "summary",
      "type": "summary",
      "title": "Week Summary",
      "fields": ["week_ending", "total_hours", "regular_hours", "overtime_hours", "total_cost", "employee_count"]
    },
    {
      "id": "by_employee",
      "type": "table",
      "title": "Hours by Employee",
      "fields": ["employee", "project", "mon", "tue", "wed", "thu", "fri", "sat", "sun", "total", "rate", "cost"]
    },
    {
      "id": "by_project",
      "type": "table",
      "title": "Labor Cost by Project",
      "fields": ["project", "total_hours", "regular_hours", "overtime_hours", "labor_cost", "budget_impact"]
    },
    {
      "id": "overtime",
      "type": "table",
      "title": "Overtime Analysis",
      "fields": ["employee", "overtime_hours", "ot_cost", "reason", "approved_by"]
    }
  ]'::jsonb,
  true,
  true,
  true
) ON CONFLICT DO NOTHING;

-- BUDGET REPORT TEMPLATE
INSERT INTO public.report_templates (
  id,
  name,
  description,
  template_type,
  category,
  sections,
  is_system_template,
  is_default,
  is_public
) VALUES (
  gen_random_uuid(),
  'Project Budget Report',
  'Comprehensive budget vs actual analysis with profit tracking',
  'budget',
  'financial',
  '[
    {
      "id": "executive",
      "type": "summary",
      "title": "Executive Summary",
      "fields": ["project", "client", "budget", "spent", "remaining", "percent_complete", "profit", "margin"]
    },
    {
      "id": "breakdown",
      "type": "chart",
      "title": "Cost Breakdown",
      "chartType": "pie",
      "fields": ["labor", "materials", "equipment", "subcontractors", "overhead", "other"]
    },
    {
      "id": "budget_actual",
      "type": "table",
      "title": "Budget vs Actual",
      "fields": ["category", "budgeted", "actual", "variance", "variance_percent", "status"]
    },
    {
      "id": "change_orders",
      "type": "table",
      "title": "Change Orders Impact",
      "fields": ["change_order_number", "description", "amount", "approved", "date", "impact"]
    },
    {
      "id": "forecast",
      "type": "section",
      "title": "Project Forecast",
      "fields": ["estimated_completion", "estimated_final_cost", "estimated_profit", "risks", "recommendations"]
    }
  ]'::jsonb,
  true,
  true,
  true
) ON CONFLICT DO NOTHING;

-- ============================================================
-- SETUP COMPLETE!
-- ============================================================

SELECT 'ReportCenter Database Schema Created Successfully!' as status;
