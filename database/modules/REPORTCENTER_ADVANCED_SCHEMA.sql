-- ============================================================
-- REPORTCENTER ADVANCED ANALYTICS - PHASE 2
-- Business intelligence, custom reporting, and automation
-- ============================================================

-- ============================================================
-- 1. REPORT ANALYTICS (Track usage and value)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- GENERATION METRICS
  generation_time_ms INTEGER,
  file_size_bytes INTEGER,
  data_points_count INTEGER,

  -- CLIENT INTERACTION
  client_opened BOOLEAN DEFAULT false,
  client_opened_at TIMESTAMPTZ,
  client_open_count INTEGER DEFAULT 0,
  client_downloaded BOOLEAN DEFAULT false,
  client_downloaded_at TIMESTAMPTZ,
  client_time_spent_seconds INTEGER,

  -- BUSINESS IMPACT
  led_to_action BOOLEAN DEFAULT false,
  action_type VARCHAR(50), -- approval, payment, change_order, contract_signed
  action_value DECIMAL(12,2), -- Estimated value of action taken

  -- FEEDBACK
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  was_useful BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_analytics_report ON public.report_analytics(report_id);
CREATE INDEX IF NOT EXISTS idx_report_analytics_user ON public.report_analytics(user_id);

-- ============================================================
-- 2. CUSTOM REPORT BUILDER SAVES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.custom_report_saves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- REPORT INFO
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- financial, operational, client, custom

  -- REPORT CONFIGURATION (Full JSON config)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Structure: {
  --   sections: [{ id, type, title, dataSource, fields, visualization }],
  --   filters: { dateRange, projects, clients },
  --   styling: { colors, fonts, layout }
  -- }

  data_sources JSONB DEFAULT '[]'::jsonb,
  -- Which data to include: ['projects', 'tasks', 'financial', 'crew']

  filters JSONB DEFAULT '{}'::jsonb,
  -- Saved filter state

  visualizations JSONB DEFAULT '[]'::jsonb,
  -- Chart configurations

  -- USAGE TRACKING
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  avg_generation_time_ms INTEGER,

  -- SHARING
  is_favorite BOOLEAN DEFAULT false,
  shared_with_team BOOLEAN DEFAULT false,
  shared_with_users UUID[],
  is_public BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_reports_user ON public.custom_report_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_reports_favorite ON public.custom_report_saves(is_favorite);

-- ============================================================
-- 3. REPORT ALERTS & NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- ALERT CONFIG
  name VARCHAR(255) NOT NULL,
  description TEXT,
  alert_type VARCHAR(50) NOT NULL, -- budget, schedule, safety, quality, financial

  -- CONDITION (JSONB for flexibility)
  condition JSONB NOT NULL,
  -- Structure: {
  --   metric: 'budget_variance',
  --   operator: 'greater_than',
  --   threshold: 0.15,
  --   scope: 'project' | 'company' | 'client'
  -- }

  -- ACTION CONFIGURATION
  action VARCHAR(50) NOT NULL, -- email, notification, generate_report, create_task
  action_config JSONB DEFAULT '{}'::jsonb,
  -- Structure: {
  --   recipients: ['user_id', 'email'],
  --   template_id: 'uuid',
  --   priority: 'high' | 'medium' | 'low'
  -- }

  -- SCHEDULING
  check_frequency VARCHAR(20) DEFAULT 'daily', -- hourly, daily, weekly, realtime
  last_checked_at TIMESTAMPTZ,
  last_triggered_at TIMESTAMPTZ,
  next_check_at TIMESTAMPTZ,

  -- STATUS
  is_active BOOLEAN DEFAULT true,
  trigger_count INTEGER DEFAULT 0,
  false_positive_count INTEGER DEFAULT 0,

  -- METADATA
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_alerts_user ON public.report_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_report_alerts_active ON public.report_alerts(is_active, next_check_at);

-- ============================================================
-- 4. ALERT TRIGGERS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alert_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID REFERENCES public.report_alerts(id) ON DELETE CASCADE NOT NULL,

  -- TRIGGER DETAILS
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  actual_value DECIMAL(12,2),
  threshold_value DECIMAL(12,2),
  variance DECIMAL(12,2),

  -- CONTEXT
  related_project_id UUID REFERENCES public.projects(id),
  related_quote_id UUID REFERENCES public.quotes(id),
  context JSONB DEFAULT '{}'::jsonb,

  -- ACTION TAKEN
  action_taken VARCHAR(50),
  action_status VARCHAR(20), -- sent, failed, acknowledged, resolved
  action_result JSONB,

  -- RESOLUTION
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_triggers_alert ON public.alert_triggers(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_project ON public.alert_triggers(related_project_id);

-- ============================================================
-- 5. FINANCIAL METRICS CACHE (For fast dashboard loading)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_metrics_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- PERIOD
  period_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly, quarterly, yearly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- PROJECT SCOPE (null = all projects)
  project_id UUID REFERENCES public.projects(id),

  -- REVENUE METRICS
  total_revenue DECIMAL(12,2) DEFAULT 0,
  completed_revenue DECIMAL(12,2) DEFAULT 0,
  pending_revenue DECIMAL(12,2) DEFAULT 0,
  change_order_revenue DECIMAL(12,2) DEFAULT 0,

  -- COST METRICS
  total_costs DECIMAL(12,2) DEFAULT 0,
  labor_costs DECIMAL(12,2) DEFAULT 0,
  material_costs DECIMAL(12,2) DEFAULT 0,
  equipment_costs DECIMAL(12,2) DEFAULT 0,
  subcontractor_costs DECIMAL(12,2) DEFAULT 0,
  overhead_costs DECIMAL(12,2) DEFAULT 0,

  -- PROFIT METRICS
  gross_profit DECIMAL(12,2) GENERATED ALWAYS AS (total_revenue - total_costs) STORED,
  gross_margin DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE WHEN total_revenue > 0
    THEN (total_revenue - total_costs) / total_revenue
    ELSE 0 END
  ) STORED,

  -- PROJECT METRICS
  active_projects_count INTEGER DEFAULT 0,
  completed_projects_count INTEGER DEFAULT 0,
  avg_project_value DECIMAL(12,2),
  avg_project_margin DECIMAL(5,4),

  -- CREW METRICS
  total_hours_worked DECIMAL(10,2) DEFAULT 0,
  regular_hours DECIMAL(10,2) DEFAULT 0,
  overtime_hours DECIMAL(10,2) DEFAULT 0,
  avg_hourly_cost DECIMAL(10,2),

  -- CACHE METADATA
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  is_stale BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, period_type, period_start, period_end, project_id)
);

CREATE INDEX IF NOT EXISTS idx_financial_cache_user_period ON public.financial_metrics_cache(user_id, period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_financial_cache_project ON public.financial_metrics_cache(project_id);

-- ============================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.report_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_report_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_metrics_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. RLS POLICIES
-- ============================================================

-- REPORT ANALYTICS
DROP POLICY IF EXISTS "Users manage their analytics" ON public.report_analytics;
CREATE POLICY "Users manage their analytics"
  ON public.report_analytics FOR ALL
  USING (user_id = auth.uid());

-- CUSTOM REPORT SAVES
DROP POLICY IF EXISTS "Users manage their custom reports" ON public.custom_report_saves;
CREATE POLICY "Users manage their custom reports"
  ON public.custom_report_saves FOR ALL
  USING (user_id = auth.uid());

-- REPORT ALERTS
DROP POLICY IF EXISTS "Users manage their alerts" ON public.report_alerts;
CREATE POLICY "Users manage their alerts"
  ON public.report_alerts FOR ALL
  USING (user_id = auth.uid());

-- ALERT TRIGGERS
DROP POLICY IF EXISTS "Users view their alert triggers" ON public.alert_triggers;
CREATE POLICY "Users view their alert triggers"
  ON public.alert_triggers FOR SELECT
  USING (
    alert_id IN (
      SELECT id FROM public.report_alerts WHERE user_id = auth.uid()
    )
  );

-- FINANCIAL METRICS CACHE
DROP POLICY IF EXISTS "Users access their financial cache" ON public.financial_metrics_cache;
CREATE POLICY "Users access their financial cache"
  ON public.financial_metrics_cache FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- 8. GRANT PERMISSIONS
-- ============================================================
GRANT ALL ON public.report_analytics TO authenticated;
GRANT ALL ON public.custom_report_saves TO authenticated;
GRANT ALL ON public.report_alerts TO authenticated;
GRANT ALL ON public.alert_triggers TO authenticated;
GRANT ALL ON public.financial_metrics_cache TO authenticated;

-- ============================================================
-- 9. ADVANCED FUNCTIONS
-- ============================================================

-- Calculate financial metrics for a period
CREATE OR REPLACE FUNCTION calculate_financial_metrics(
  user_id_param UUID,
  period_start_param DATE,
  period_end_param DATE,
  project_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
  total_revenue DECIMAL(12,2),
  total_costs DECIMAL(12,2),
  gross_profit DECIMAL(12,2),
  gross_margin DECIMAL(5,4),
  project_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(p.budget), 0) as total_revenue,
    COALESCE(SUM(
      (SELECT SUM(te.total_cost)
       FROM public.timesheet_entries te
       WHERE te.project_id = p.id
       AND te.work_date BETWEEN period_start_param AND period_end_param)
    ), 0) as total_costs,
    COALESCE(SUM(p.budget), 0) - COALESCE(SUM(
      (SELECT SUM(te.total_cost)
       FROM public.timesheet_entries te
       WHERE te.project_id = p.id
       AND te.work_date BETWEEN period_start_param AND period_end_param)
    ), 0) as gross_profit,
    CASE
      WHEN COALESCE(SUM(p.budget), 0) > 0
      THEN (COALESCE(SUM(p.budget), 0) - COALESCE(SUM(
        (SELECT SUM(te.total_cost)
         FROM public.timesheet_entries te
         WHERE te.project_id = p.id
         AND te.work_date BETWEEN period_start_param AND period_end_param)
      ), 0)) / COALESCE(SUM(p.budget), 0)
      ELSE 0
    END as gross_margin,
    COUNT(*)::INTEGER as project_count
  FROM public.projects p
  WHERE p.created_by = user_id_param
    AND p.created_at BETWEEN period_start_param AND period_end_param
    AND (project_id_param IS NULL OR p.id = project_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh financial metrics cache
CREATE OR REPLACE FUNCTION refresh_financial_cache(
  user_id_param UUID,
  period_type_param VARCHAR(20),
  period_start_param DATE,
  period_end_param DATE
)
RETURNS VOID AS $$
DECLARE
  metrics RECORD;
BEGIN
  -- Calculate metrics
  SELECT * INTO metrics
  FROM calculate_financial_metrics(
    user_id_param,
    period_start_param,
    period_end_param,
    NULL
  );

  -- Upsert into cache
  INSERT INTO public.financial_metrics_cache (
    user_id,
    period_type,
    period_start,
    period_end,
    total_revenue,
    total_costs,
    calculated_at,
    is_stale
  ) VALUES (
    user_id_param,
    period_type_param,
    period_start_param,
    period_end_param,
    metrics.total_revenue,
    metrics.total_costs,
    NOW(),
    false
  )
  ON CONFLICT (user_id, period_type, period_start, period_end, project_id)
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_costs = EXCLUDED.total_costs,
    calculated_at = NOW(),
    is_stale = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check alert conditions
CREATE OR REPLACE FUNCTION check_alert_conditions()
RETURNS VOID AS $$
DECLARE
  alert_record RECORD;
  should_trigger BOOLEAN;
  metric_value DECIMAL(12,2);
BEGIN
  -- Loop through active alerts that need checking
  FOR alert_record IN
    SELECT * FROM public.report_alerts
    WHERE is_active = true
    AND (next_check_at IS NULL OR next_check_at <= NOW())
  LOOP
    -- Evaluate condition (simplified - expand based on condition type)
    should_trigger := false;

    -- Example: Budget variance check
    IF alert_record.alert_type = 'budget' THEN
      -- Get actual budget variance for user's projects
      SELECT AVG(
        CASE
          WHEN p.budget > 0
          THEN ABS(p.budget - COALESCE(p.actual_cost, 0)) / p.budget
          ELSE 0
        END
      ) INTO metric_value
      FROM public.projects p
      WHERE p.created_by = alert_record.user_id
      AND p.status = 'active';

      -- Check if exceeds threshold
      IF metric_value > (alert_record.condition->>'threshold')::DECIMAL THEN
        should_trigger := true;
      END IF;
    END IF;

    -- If should trigger, log it
    IF should_trigger THEN
      INSERT INTO public.alert_triggers (
        alert_id,
        actual_value,
        threshold_value,
        variance,
        action_status
      ) VALUES (
        alert_record.id,
        metric_value,
        (alert_record.condition->>'threshold')::DECIMAL,
        metric_value - (alert_record.condition->>'threshold')::DECIMAL,
        'sent'
      );

      -- Update alert stats
      UPDATE public.report_alerts
      SET
        last_triggered_at = NOW(),
        trigger_count = trigger_count + 1
      WHERE id = alert_record.id;
    END IF;

    -- Update next check time
    UPDATE public.report_alerts
    SET
      last_checked_at = NOW(),
      next_check_at = NOW() + CASE check_frequency
        WHEN 'hourly' THEN INTERVAL '1 hour'
        WHEN 'daily' THEN INTERVAL '1 day'
        WHEN 'weekly' THEN INTERVAL '1 week'
        ELSE INTERVAL '1 day'
      END
    WHERE id = alert_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. INSERT ADVANCED TEMPLATES
-- ============================================================

-- PROFIT & LOSS TEMPLATE
INSERT INTO public.report_templates (
  name,
  description,
  template_type,
  category,
  sections,
  is_system_template,
  is_default,
  is_public
) VALUES (
  'Profit & Loss Statement',
  'Comprehensive P&L with project allocation and trend analysis',
  'budget',
  'financial',
  '[
    {
      "id": "executive_summary",
      "type": "summary",
      "title": "Executive Summary",
      "fields": ["period", "total_revenue", "total_costs", "gross_profit", "net_profit", "margin"]
    },
    {
      "id": "revenue_breakdown",
      "type": "table",
      "title": "Revenue by Project",
      "fields": ["project", "client", "contract_value", "change_orders", "total_revenue", "percent_of_total"]
    },
    {
      "id": "cost_breakdown",
      "type": "chart",
      "title": "Cost Breakdown",
      "chartType": "pie",
      "fields": ["labor", "materials", "equipment", "subcontractors", "overhead"]
    },
    {
      "id": "profitability",
      "type": "table",
      "title": "Project Profitability",
      "fields": ["project", "revenue", "costs", "profit", "margin", "roi"]
    }
  ]'::jsonb,
  true,
  true,
  true
) ON CONFLICT DO NOTHING;

-- CREW PRODUCTIVITY TEMPLATE
INSERT INTO public.report_templates (
  name,
  description,
  template_type,
  category,
  sections,
  is_system_template,
  is_default,
  is_public
) VALUES (
  'Crew Productivity Analysis',
  'Track crew efficiency and performance metrics',
  'progress',
  'operational',
  '[
    {
      "id": "summary",
      "type": "summary",
      "title": "Productivity Summary",
      "fields": ["period", "total_hours", "avg_productivity", "top_performer"]
    },
    {
      "id": "crew_ranking",
      "type": "table",
      "title": "Crew Performance",
      "fields": ["crew", "hours", "tasks_completed", "productivity_score", "quality_score"]
    },
    {
      "id": "trends",
      "type": "chart",
      "title": "Productivity Trends",
      "chartType": "line",
      "fields": ["week", "productivity", "hours"]
    }
  ]'::jsonb,
  true,
  true,
  true
) ON CONFLICT DO NOTHING;

-- CLIENT PORTFOLIO TEMPLATE
INSERT INTO public.report_templates (
  name,
  description,
  template_type,
  category,
  sections,
  is_system_template,
  is_default,
  is_public
) VALUES (
  'Client Portfolio Analysis',
  'Client profitability and value analysis',
  'custom',
  'sales',
  '[
    {
      "id": "portfolio_summary",
      "type": "summary",
      "title": "Portfolio Summary",
      "fields": ["total_clients", "active_clients", "total_revenue", "avg_value", "retention_rate"]
    },
    {
      "id": "top_clients",
      "type": "table",
      "title": "Top Clients",
      "fields": ["client", "revenue", "margin", "projects", "years_active", "score"]
    },
    {
      "id": "client_distribution",
      "type": "chart",
      "title": "Client Distribution",
      "chartType": "pie",
      "fields": ["platinum", "gold", "silver", "bronze"]
    }
  ]'::jsonb,
  true,
  true,
  true
) ON CONFLICT DO NOTHING;

-- ============================================================
-- SETUP COMPLETE!
-- ============================================================

SELECT 'ReportCenter Advanced Analytics Schema Created Successfully!' as status,
       'Phase 2: Business Intelligence, Custom Reporting, and Automation' as phase;
