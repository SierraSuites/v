-- =====================================================
-- Module 19: Advanced Reporting & Analytics
-- Features: Custom reports, dashboards, KPIs, scheduled reports
-- Date: 2026-03-17
-- =====================================================

-- =====================================================
-- 1. CUSTOM REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Report Details
  report_name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL, -- financial, project, timesheet, safety, custom
  category VARCHAR(50), -- P&L, cash_flow, schedule_variance, etc.

  -- Configuration
  data_sources TEXT[] NOT NULL, -- Tables/views to pull data from
  filters JSONB, -- Filter conditions
  grouping JSONB, -- Group by fields
  sorting JSONB, -- Sort order
  columns JSONB NOT NULL, -- Column definitions with calculations

  -- Visualization
  chart_type VARCHAR(50), -- bar, line, pie, table, mixed
  chart_config JSONB, -- Chart-specific configuration

  -- Date Range
  date_range_type VARCHAR(50) DEFAULT 'custom', -- custom, today, this_week, this_month, this_quarter, this_year, last_30_days
  start_date DATE,
  end_date DATE,

  -- Access Control
  is_public BOOLEAN DEFAULT false,
  shared_with UUID[], -- User IDs with access
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Favorites
  is_favorite BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_run_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_report_type CHECK (report_type IN ('financial', 'project', 'timesheet', 'safety', 'custom')),
  CONSTRAINT valid_date_range_type CHECK (date_range_type IN ('custom', 'today', 'this_week', 'this_month', 'this_quarter', 'this_year', 'last_30_days', 'last_90_days', 'year_to_date'))
);

-- Indexes
CREATE INDEX idx_custom_reports_company ON custom_reports(company_id);
CREATE INDEX idx_custom_reports_type ON custom_reports(report_type);
CREATE INDEX idx_custom_reports_creator ON custom_reports(created_by);
CREATE INDEX idx_custom_reports_favorites ON custom_reports(is_favorite) WHERE is_favorite = true;

-- =====================================================
-- 2. REPORT SCHEDULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,

  -- Schedule Details
  schedule_name VARCHAR(255) NOT NULL,
  frequency VARCHAR(20) NOT NULL, -- daily, weekly, monthly, quarterly
  day_of_week INTEGER, -- 0-6 for weekly (0 = Sunday)
  day_of_month INTEGER, -- 1-31 for monthly
  time_of_day TIME NOT NULL DEFAULT '09:00:00',

  -- Recipients
  recipients JSONB NOT NULL, -- Array of {email, user_id}
  cc_recipients TEXT[],

  -- Format
  export_format VARCHAR(20) NOT NULL DEFAULT 'pdf', -- pdf, xlsx, csv
  include_charts BOOLEAN DEFAULT true,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20), -- success, failed
  last_run_error TEXT,

  -- Created By
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_frequency CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
  CONSTRAINT valid_export_format CHECK (export_format IN ('pdf', 'xlsx', 'csv')),
  CONSTRAINT valid_day_of_week CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  CONSTRAINT valid_day_of_month CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31))
);

-- Indexes
CREATE INDEX idx_report_schedules_company ON report_schedules(company_id);
CREATE INDEX idx_report_schedules_report ON report_schedules(report_id);
CREATE INDEX idx_report_schedules_active ON report_schedules(is_active) WHERE is_active = true;
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_active = true;

-- =====================================================
-- 3. DASHBOARDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Dashboard Details
  dashboard_name VARCHAR(255) NOT NULL,
  description TEXT,
  dashboard_type VARCHAR(50) NOT NULL, -- executive, project_manager, financial, safety, custom

  -- Layout
  layout JSONB NOT NULL, -- Grid layout configuration
  widgets JSONB NOT NULL, -- Widget configurations

  -- Refresh Settings
  auto_refresh BOOLEAN DEFAULT false,
  refresh_interval_seconds INTEGER DEFAULT 300, -- 5 minutes

  -- Access Control
  is_default BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  shared_with UUID[], -- User IDs with access
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_dashboard_type CHECK (dashboard_type IN ('executive', 'project_manager', 'financial', 'safety', 'custom'))
);

-- Indexes
CREATE INDEX idx_dashboards_company ON dashboards(company_id);
CREATE INDEX idx_dashboards_type ON dashboards(dashboard_type);
CREATE INDEX idx_dashboards_creator ON dashboards(created_by);
CREATE INDEX idx_dashboards_default ON dashboards(is_default) WHERE is_default = true;

-- =====================================================
-- 4. KPI DEFINITIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS kpi_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- KPI Details
  kpi_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- financial, operational, safety, quality, schedule

  -- Calculation
  calculation_method VARCHAR(50) NOT NULL, -- sql_query, formula, aggregation
  sql_query TEXT,
  formula TEXT,
  data_source VARCHAR(100),

  -- Targets
  target_value DECIMAL(15,2),
  target_operator VARCHAR(10), -- >, <, >=, <=, =, between
  warning_threshold DECIMAL(15,2),
  critical_threshold DECIMAL(15,2),

  -- Units
  unit VARCHAR(50), -- $, %, days, count, etc.
  format VARCHAR(20) DEFAULT 'number', -- number, currency, percentage, decimal

  -- Frequency
  update_frequency VARCHAR(20) DEFAULT 'daily', -- real_time, hourly, daily, weekly, monthly

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Created By
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_kpi_category CHECK (category IN ('financial', 'operational', 'safety', 'quality', 'schedule')),
  CONSTRAINT valid_calculation_method CHECK (calculation_method IN ('sql_query', 'formula', 'aggregation')),
  CONSTRAINT valid_update_frequency CHECK (update_frequency IN ('real_time', 'hourly', 'daily', 'weekly', 'monthly'))
);

-- Indexes
CREATE INDEX idx_kpi_definitions_company ON kpi_definitions(company_id);
CREATE INDEX idx_kpi_definitions_category ON kpi_definitions(category);
CREATE INDEX idx_kpi_definitions_active ON kpi_definitions(is_active) WHERE is_active = true;

-- =====================================================
-- 5. KPI VALUES TABLE (Historical Data)
-- =====================================================
CREATE TABLE IF NOT EXISTS kpi_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Value
  value DECIMAL(15,2) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Context
  project_id UUID REFERENCES projects(id),
  period_start DATE,
  period_end DATE,

  -- Status
  status VARCHAR(20), -- on_target, warning, critical

  -- Metadata
  metadata JSONB,

  CONSTRAINT valid_kpi_status CHECK (status IN ('on_target', 'warning', 'critical'))
);

-- Indexes
CREATE INDEX idx_kpi_values_kpi ON kpi_values(kpi_id, timestamp DESC);
CREATE INDEX idx_kpi_values_company ON kpi_values(company_id);
CREATE INDEX idx_kpi_values_project ON kpi_values(project_id);
CREATE INDEX idx_kpi_values_timestamp ON kpi_values(timestamp DESC);

-- =====================================================
-- 6. REPORT EXPORTS TABLE (History)
-- =====================================================
CREATE TABLE IF NOT EXISTS report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_id UUID REFERENCES custom_reports(id) ON DELETE SET NULL,
  schedule_id UUID REFERENCES report_schedules(id) ON DELETE SET NULL,

  -- Export Details
  export_name VARCHAR(255) NOT NULL,
  export_format VARCHAR(20) NOT NULL, -- pdf, xlsx, csv
  file_url TEXT NOT NULL,
  file_size BIGINT,

  -- Parameters Used
  parameters JSONB,
  date_range_start DATE,
  date_range_end DATE,

  -- Status
  status VARCHAR(20) NOT NULL, -- pending, completed, failed
  error_message TEXT,

  -- Export Time
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- For temporary exports

  CONSTRAINT valid_export_format CHECK (export_format IN ('pdf', 'xlsx', 'csv')),
  CONSTRAINT valid_export_status CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX idx_report_exports_company ON report_exports(company_id);
CREATE INDEX idx_report_exports_report ON report_exports(report_id);
CREATE INDEX idx_report_exports_schedule ON report_exports(schedule_id);
CREATE INDEX idx_report_exports_generated ON report_exports(generated_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Company-based access
CREATE POLICY "Users can view company reports"
  ON custom_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = custom_reports.company_id
    )
    AND (
      is_public = true
      OR created_by = auth.uid()
      OR auth.uid() = ANY(shared_with)
    )
  );

CREATE POLICY "Users can create reports"
  ON custom_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = custom_reports.company_id
    )
  );

CREATE POLICY "Users can update own reports"
  ON custom_reports FOR UPDATE
  USING (created_by = auth.uid());

-- Similar policies for other tables
CREATE POLICY "Users can view company dashboards"
  ON dashboards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = dashboards.company_id
    )
  );

CREATE POLICY "Users can manage dashboards"
  ON dashboards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = dashboards.company_id
    )
  );

CREATE POLICY "Users can view company KPIs"
  ON kpi_definitions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = kpi_definitions.company_id
    )
  );

CREATE POLICY "Users can view KPI values"
  ON kpi_values FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = kpi_values.company_id
    )
  );

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Function to calculate next run time for scheduled reports
CREATE OR REPLACE FUNCTION calculate_next_run_time(
  p_frequency VARCHAR,
  p_day_of_week INTEGER,
  p_day_of_month INTEGER,
  p_time_of_day TIME
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next_run TIMESTAMPTZ;
  v_base_date DATE;
  v_current_day INTEGER;
BEGIN
  v_base_date := CURRENT_DATE;

  CASE p_frequency
    WHEN 'daily' THEN
      v_next_run := (v_base_date + INTERVAL '1 day')::TIMESTAMPTZ + p_time_of_day;
    WHEN 'weekly' THEN
      v_current_day := EXTRACT(DOW FROM v_base_date);
      IF v_current_day <= p_day_of_week THEN
        v_next_run := (v_base_date + (p_day_of_week - v_current_day) * INTERVAL '1 day')::TIMESTAMPTZ + p_time_of_day;
      ELSE
        v_next_run := (v_base_date + (7 + p_day_of_week - v_current_day) * INTERVAL '1 day')::TIMESTAMPTZ + p_time_of_day;
      END IF;
    WHEN 'monthly' THEN
      v_next_run := DATE_TRUNC('month', v_base_date) + (p_day_of_month - 1) * INTERVAL '1 day' + INTERVAL '1 month' + p_time_of_day;
    WHEN 'quarterly' THEN
      v_next_run := DATE_TRUNC('quarter', v_base_date) + INTERVAL '3 months' + (p_day_of_month - 1) * INTERVAL '1 day' + p_time_of_day;
    ELSE
      v_next_run := NULL;
  END CASE;

  RETURN v_next_run;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to calculate next_run_at when schedule is created or updated
CREATE OR REPLACE FUNCTION update_schedule_next_run()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active THEN
    NEW.next_run_at := calculate_next_run_time(
      NEW.frequency,
      NEW.day_of_week,
      NEW.day_of_month,
      NEW.time_of_day
    );
  ELSE
    NEW.next_run_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_schedule_next_run
  BEFORE INSERT OR UPDATE ON report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_next_run();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
