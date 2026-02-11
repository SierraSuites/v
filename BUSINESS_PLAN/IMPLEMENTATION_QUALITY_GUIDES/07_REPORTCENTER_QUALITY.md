# REPORTCENTER MODULE - QUALITY IMPLEMENTATION GUIDE

**Module**: Analytics & Reporting
**Business Priority**: HIGH (Data-Driven Decisions)
**Current Completion**: 35% Complete
**Target Completion**: 95% Production-Ready
**Estimated Revenue Impact**: HIGH - Better insights = better margins, faster growth

---

## EXECUTIVE SUMMARY

### Why This Module is Critical to Your Success

ReportCenter is the **intelligence layer** of The Sierra Suites. Without it, contractors are flying blind - making gut decisions instead of data-driven decisions. This leads to:
- **Unprofitable projects**: Can't identify which project types make money
- **Cash flow crises**: No visibility into upcoming cash needs
- **Missed opportunities**: Don't know which services are most profitable
- **Lost clients**: Can't prove value with concrete metrics
- **Slow growth**: Can't identify what's working to double down on it

**The Problem**: It's Sunday night. Contractor meets banker tomorrow for credit line increase. Needs:
- YTD revenue and profit margins
- Project profitability by type
- Cash flow projections
- Backlog value

Then Thursday presents to client showing safety stats, quality scores, on-time completion rate.

**Without ReportCenter**: 4 hours in spreadsheets exporting data, building pivot tables, fighting with Excel formulas, creating charts manually. Misses deadline. Banker meeting postponed.

**With ReportCenter**: One click → Executive Dashboard PDF generated in 2 seconds. Click "Client Progress Report" → Branded PDF ready to send. Total time: 30 seconds.

**Business Impact**:
- **Better Margins**: Identify profitable project types → focus there → 15% margin becomes 20%
- **Faster Decisions**: Executive dashboard shows cash flow tight → delay equipment purchase → avoid overdraft
- **Client Retention**: Weekly progress reports show value → clients trust you → 20% higher referral rate
- **Growth**: Know which marketing channels bring profitable leads → double down → 30% more revenue

**Revenue Impact**:
- Company with $3M revenue and 15% margin = $450K profit
- With data insights: Focus on profitable projects → margin improves to 18%
- **Difference**: $540K profit = **$90K more profit** from same revenue

**Competitive Advantage**:
- Most contractors use Excel → slow, error-prone, inconsistent
- The Sierra Suites → one-click reports, scheduled delivery, always accurate
- **Edge**: Win more bids by showing professional, data-backed proposals

---

## DATABASE SCHEMA

### Core Tables Enhancement

#### `saved_reports` (New Table)

```sql
CREATE TABLE saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Report Configuration
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (
    report_type IN (
      'executive_dashboard',
      'project_performance',
      'financial_pl',
      'financial_cashflow',
      'project_profitability',
      'kpi_dashboard',
      'client_progress',
      'custom'
    )
  ),

  -- Query Definition (for custom reports)
  data_source TEXT, -- 'projects', 'tasks', 'quotes', 'contacts', 'financials', 'time_entries'
  selected_fields JSONB DEFAULT '[]',
  /* Example:
  [
    {"field": "name", "label": "Project Name", "type": "string"},
    {"field": "total_amount", "label": "Revenue", "type": "currency"},
    {"field": "profit_margin", "label": "Margin %", "type": "percentage"}
  ]
  */

  filters JSONB DEFAULT '[]',
  /* Example:
  [
    {"field": "status", "operator": "eq", "value": "completed"},
    {"field": "end_date", "operator": "gte", "value": "2025-01-01"}
  ]
  */

  grouping JSONB,
  /* Example:
  {
    "field": "project_type",
    "aggregations": [
      {"field": "total_amount", "function": "sum"},
      {"field": "profit_margin", "function": "avg"}
    ]
  }
  */

  sorting JSONB DEFAULT '[]',
  /* Example:
  [
    {"field": "profit_margin", "direction": "desc"}
  ]
  */

  -- Visualization
  chart_type TEXT CHECK (
    chart_type IN ('table', 'bar', 'line', 'pie', 'gauge', 'area', 'scatter')
  ),
  chart_config JSONB DEFAULT '{}',
  /* Example:
  {
    "xAxis": "project_name",
    "yAxis": "profit_margin",
    "colorBy": "project_type"
  }
  */

  -- Scheduling
  is_scheduled BOOLEAN DEFAULT false,
  schedule_frequency TEXT CHECK (
    schedule_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', NULL)
  ),
  schedule_day INT, -- Day of week (1-7) or day of month (1-31)
  schedule_time TIME DEFAULT '08:00:00',
  email_recipients TEXT[] DEFAULT '{}',
  email_subject VARCHAR(255),
  email_body TEXT,

  -- Access Control
  is_public BOOLEAN DEFAULT false, -- Visible to all company users
  shared_with UUID[] DEFAULT '{}', -- Specific user IDs
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Usage Stats
  last_run_at TIMESTAMPTZ,
  run_count INT DEFAULT 0,
  avg_execution_time_ms INT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_company ON saved_reports(company_id, report_type);
CREATE INDEX IF NOT EXISTS idx_reports_scheduled ON saved_reports(company_id, is_scheduled) WHERE is_scheduled = true;
CREATE INDEX IF NOT EXISTS idx_reports_creator ON saved_reports(created_by);

-- RLS Policies
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports from their company" ON saved_reports
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own reports" ON saved_reports
  FOR ALL USING (
    created_by = auth.uid() OR
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_update_timestamp
  BEFORE UPDATE ON saved_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_report_timestamp();
```

#### `report_runs` (New Table)

```sql
CREATE TABLE report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Run Info
  executed_by UUID REFERENCES auth.users(id), -- NULL if scheduled
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  execution_time_ms INT,

  -- Parameters (for parameterized reports)
  parameters JSONB DEFAULT '{}',
  /* Example:
  {
    "start_date": "2026-01-01",
    "end_date": "2026-01-31",
    "project_id": "uuid-here"
  }
  */

  -- Results
  row_count INT,
  result_data JSONB, -- For small datasets
  result_url TEXT, -- For large datasets saved to storage

  -- Status
  status TEXT NOT NULL DEFAULT 'success' CHECK (
    status IN ('success', 'failed', 'running')
  ),
  error_message TEXT,
  error_details JSONB,

  -- Delivery
  delivered_to TEXT[], -- Email addresses
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_report_runs_report ON report_runs(report_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_runs_company ON report_runs(company_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_runs_status ON report_runs(status) WHERE status = 'running';

-- RLS Policies
ALTER TABLE report_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view report runs from their company" ON report_runs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );
```

#### `kpi_targets` (New Table)

```sql
CREATE TABLE kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- KPI Definition
  kpi_name VARCHAR(255) NOT NULL,
  kpi_category TEXT CHECK (
    kpi_category IN ('financial', 'operations', 'sales', 'quality', 'safety', 'custom')
  ),

  -- Target Values
  target_value NUMERIC(12, 2) NOT NULL,
  min_acceptable NUMERIC(12, 2), -- Yellow threshold
  max_acceptable NUMERIC(12, 2), -- For metrics where higher is bad

  -- Measurement
  unit TEXT, -- 'percentage', 'currency', 'days', 'count', etc.
  calculation_method TEXT, -- How to calculate current value
  data_source TEXT, -- Which table/view to query

  -- Period
  measurement_period TEXT CHECK (
    measurement_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')
  ),

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, kpi_name)
);

CREATE INDEX IF NOT EXISTS idx_kpi_targets_company ON kpi_targets(company_id, kpi_category) WHERE is_active = true;

-- RLS Policies
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view KPIs from their company" ON kpi_targets
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage KPIs in their company" ON kpi_targets
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );
```

#### Materialized Views for Performance

```sql
-- Project Performance Summary (refreshed hourly)
CREATE MATERIALIZED VIEW project_performance_summary AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.client_id,
  p.status,
  p.budget,
  p.actual_cost,
  p.total_amount AS revenue,

  -- Financial Metrics
  (p.total_amount - p.actual_cost) AS profit,
  CASE
    WHEN p.total_amount > 0 THEN
      ((p.total_amount - p.actual_cost) / p.total_amount * 100)
    ELSE 0
  END AS profit_margin_percentage,

  CASE
    WHEN p.budget > 0 THEN
      (p.actual_cost / p.budget * 100)
    ELSE 0
  END AS budget_used_percentage,

  -- Schedule Metrics
  p.start_date,
  p.end_date,
  p.actual_completion_date,
  CASE
    WHEN p.actual_completion_date IS NOT NULL AND p.end_date IS NOT NULL THEN
      (p.actual_completion_date - p.end_date)
    ELSE NULL
  END AS days_variance,

  -- Task Stats
  (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) AS total_tasks,
  (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'completed') AS completed_tasks,

  -- Quality Metrics
  (SELECT COUNT(*) FROM project_inspections WHERE project_id = p.id AND result = 'passed') AS inspections_passed,
  (SELECT COUNT(*) FROM project_inspections WHERE project_id = p.id AND result = 'failed') AS inspections_failed,
  (SELECT COUNT(*) FROM punch_list_items WHERE project_id = p.id AND status = 'open') AS open_punch_items,

  -- Timestamps
  p.created_at,
  p.updated_at

FROM projects p
WHERE p.deleted_at IS NULL;

CREATE UNIQUE INDEX idx_project_perf_summary_id ON project_performance_summary(project_id);
CREATE INDEX idx_project_perf_summary_status ON project_performance_summary(status);
CREATE INDEX idx_project_perf_summary_margin ON project_performance_summary(profit_margin_percentage DESC);

-- Financial Summary by Month (refreshed daily)
CREATE MATERIALIZED VIEW financial_summary_monthly AS
SELECT
  DATE_TRUNC('month', i.created_at) AS month,
  i.company_id,

  -- Revenue
  SUM(CASE WHEN i.invoice_type = 'invoice' THEN i.total_amount ELSE 0 END) AS total_revenue,
  SUM(CASE WHEN i.invoice_type = 'invoice' AND i.status = 'paid' THEN i.total_amount ELSE 0 END) AS paid_revenue,

  -- Expenses
  SUM(CASE WHEN i.invoice_type = 'bill' THEN i.total_amount ELSE 0 END) AS total_expenses,
  SUM(CASE WHEN i.invoice_type = 'bill' AND i.status = 'paid' THEN i.total_amount ELSE 0 END) AS paid_expenses,

  -- Profit
  SUM(CASE WHEN i.invoice_type = 'invoice' THEN i.total_amount ELSE 0 END) -
  SUM(CASE WHEN i.invoice_type = 'bill' THEN i.total_amount ELSE 0 END) AS net_profit,

  -- Count
  COUNT(CASE WHEN i.invoice_type = 'invoice' THEN 1 END) AS invoice_count,
  COUNT(CASE WHEN i.invoice_type = 'bill' THEN 1 END) AS bill_count

FROM invoices i
WHERE i.deleted_at IS NULL
GROUP BY DATE_TRUNC('month', i.created_at), i.company_id;

CREATE UNIQUE INDEX idx_financial_summary_month_company ON financial_summary_monthly(month, company_id);
CREATE INDEX idx_financial_summary_month ON financial_summary_monthly(month DESC);

-- Refresh function (called by cron)
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_performance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY financial_summary_monthly;
END;
$$ LANGUAGE plpgsql;
```

---

## CORE COMPONENTS

### 1. Executive Dashboard

```typescript
// app/reports/executive/page.tsx

'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { TrendIndicator } from '@/components/reports/TrendIndicator'
import { ProgressBar } from '@/components/reports/ProgressBar'

interface ExecutiveDashboardData {
  financial: {
    mtd_revenue: number
    mtd_expenses: number
    mtd_profit: number
    mtd_margin: number
    ytd_revenue: number
    ytd_profit: number
    ytd_margin: number
    trends: {
      revenue_change: number
      profit_change: number
      margin_change: number
    }
  }
  operations: {
    active_projects: number
    on_track: number
    behind: number
    ahead: number
    avg_completion: number
    on_time_rate: number
    overdue_tasks: number
    due_today: number
    due_this_week: number
  }
  sales: {
    pipeline_value: number
    weighted_value: number
    quotes_out: number
    pending_response: number
    win_rate: number
    avg_close_days: number
    forecast_q1: number
    confidence: string
  }
  team: {
    utilization_rate: number
    overallocated_count: number
    available_hours: number
    safety_incidents_30d: number
    days_since_incident: number
  }
  quality: {
    nps_score: number
    quality_score: number
    avg_punch_items: number
    avg_resolution_days: number
  }
  alerts: Array<{
    level: 'critical' | 'warning' | 'info' | 'success'
    message: string
  }>
}

export default function ExecutiveDashboardPage() {
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['executive_dashboard'],
    queryFn: async () => {
      // Call Edge Function to calculate dashboard
      const response = await fetch('/api/reports/executive-dashboard', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })

      if (!response.ok) throw new Error('Failed to load dashboard')
      return response.json() as Promise<ExecutiveDashboardData>
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
  })

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return <div>Error loading dashboard</div>

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Executive Dashboard</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 border rounded hover:bg-gray-50">
            Export PDF
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Schedule Email
          </button>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {data.alerts.map((alert, idx) => {
            const bgColors = {
              critical: 'bg-red-50 border-red-500 text-red-800',
              warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
              info: 'bg-blue-50 border-blue-500 text-blue-800',
              success: 'bg-green-50 border-green-500 text-green-800'
            }

            return (
              <div key={idx} className={`p-4 border-l-4 rounded ${bgColors[alert.level]}`}>
                {alert.message}
              </div>
            )
          })}
        </div>
      )}

      {/* Financial Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">MTD Revenue</p>
              <p className="text-2xl font-bold">
                ${data.financial.mtd_revenue.toLocaleString()}
              </p>
              <TrendIndicator value={data.financial.trends.revenue_change} suffix="vs Last Month" />
            </div>

            <div>
              <p className="text-sm text-gray-500">MTD Expenses</p>
              <p className="text-2xl font-bold">
                ${data.financial.mtd_expenses.toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">MTD Net Profit</p>
              <p className="text-2xl font-bold text-green-600">
                ${data.financial.mtd_profit.toLocaleString()}
              </p>
              <TrendIndicator value={data.financial.trends.profit_change} suffix="vs Last Month" />
            </div>

            <div>
              <p className="text-sm text-gray-500">Profit Margin</p>
              <p className="text-2xl font-bold">
                {data.financial.mtd_margin.toFixed(1)}%
              </p>
              <TrendIndicator value={data.financial.trends.margin_change} suffix="pts" />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">YTD Revenue</p>
              <p className="text-xl font-bold">
                ${(data.financial.ytd_revenue / 1000000).toFixed(1)}M
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">YTD Net Profit</p>
              <p className="text-xl font-bold text-green-600">
                ${(data.financial.ytd_profit / 1000).toFixed(0)}K
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">YTD Margin</p>
              <p className="text-xl font-bold">
                {data.financial.ytd_margin.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Active Projects: {data.operations.active_projects}</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>On Track: {data.operations.on_track}</span>
                    <span className="font-semibold">
                      {((data.operations.on_track / data.operations.active_projects) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <ProgressBar
                    value={data.operations.on_track}
                    max={data.operations.active_projects}
                    color="green"
                  />

                  {data.operations.behind > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span>Behind: {data.operations.behind}</span>
                        <span className="font-semibold text-yellow-600">
                          {((data.operations.behind / data.operations.active_projects) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <ProgressBar
                        value={data.operations.behind}
                        max={data.operations.active_projects}
                        color="yellow"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">Avg Completion</p>
                <p className="text-xl font-bold">{data.operations.avg_completion}%</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">On-Time Rate</p>
                <p className="text-xl font-bold">{data.operations.on_time_rate}%</p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500 mb-2">Tasks</p>
                <div className="space-y-1 text-sm">
                  {data.operations.overdue_tasks > 0 && (
                    <div className="flex justify-between">
                      <span className="text-red-600">Overdue:</span>
                      <span className="font-semibold text-red-600">{data.operations.overdue_tasks}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Due Today:</span>
                    <span className="font-semibold">{data.operations.due_today}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Due This Week:</span>
                    <span className="font-semibold">{data.operations.due_this_week}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Pipeline Value</p>
                <p className="text-2xl font-bold">
                  ${(data.sales.pipeline_value / 1000000).toFixed(1)}M
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Weighted (Probability-Adjusted)</p>
                <p className="text-xl font-bold text-green-600">
                  ${(data.sales.weighted_value / 1000).toFixed(0)}K
                </p>
              </div>

              <div className="pt-4 border-t grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Quotes Out</p>
                  <p className="text-lg font-semibold">{data.sales.quotes_out}</p>
                  <p className="text-xs text-gray-500">{data.sales.pending_response} pending</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Win Rate</p>
                  <p className="text-lg font-semibold">{data.sales.win_rate}%</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Avg Close Time</p>
                <p className="text-lg font-semibold">{data.sales.avg_close_days} days</p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">Q1 Forecast</p>
                <p className="text-xl font-bold text-blue-600">
                  ${(data.sales.forecast_q1 / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-gray-500">
                  {data.sales.confidence} confidence
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team & Resources */}
        <Card>
          <CardHeader>
            <CardTitle>Team & Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Team Utilization</p>
                <p className="text-2xl font-bold">{data.team.utilization_rate}%</p>
                <p className="text-xs text-gray-500">
                  {data.team.utilization_rate >= 70 && data.team.utilization_rate <= 90 ? '✅ Optimal range' : '⚠️ Outside optimal'}
                </p>
              </div>

              {data.team.overallocated_count > 0 && (
                <div>
                  <p className="text-sm text-red-600">Overallocated</p>
                  <p className="text-lg font-semibold text-red-600">
                    {data.team.overallocated_count} people
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500">Available Capacity</p>
                <p className="text-lg font-semibold">{data.team.available_hours} hours/week</p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500 mb-2">Safety</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Incidents (30d):</span>
                    <span className={`font-semibold ${data.team.safety_incidents_30d === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {data.team.safety_incidents_30d} {data.team.safety_incidents_30d === 0 && '✅'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Days Since Incident:</span>
                    <span className="font-semibold text-green-600">{data.team.days_since_incident} ✅</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quality & Satisfaction */}
        <Card>
          <CardHeader>
            <CardTitle>Quality & Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Client NPS</p>
                <p className="text-2xl font-bold">{data.quality.nps_score}</p>
                <p className="text-xs text-gray-500">
                  {data.quality.nps_score >= 70 ? '✅ Excellent' :
                   data.quality.nps_score >= 50 ? '✅ Good' :
                   data.quality.nps_score >= 30 ? '⚠️ Fair' :
                   '🔴 Needs Improvement'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Quality Score</p>
                <p className="text-2xl font-bold">{data.quality.quality_score}/100</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Avg Punch Items</p>
                <p className="text-lg font-semibold">{data.quality.avg_punch_items} per project</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Avg Resolution Time</p>
                <p className="text-lg font-semibold">{data.quality.avg_resolution_days} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

## EDGE FUNCTIONS

### Executive Dashboard Data Aggregation

```typescript
// supabase/functions/executive-dashboard/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get company from auth
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) throw new Error('Unauthorized')

    // Aggregate all dashboard data in parallel
    const [financial, operations, sales, team, quality] = await Promise.all([
      getFinancialMetrics(supabaseClient, user.id),
      getOperationsMetrics(supabaseClient, user.id),
      getSalesMetrics(supabaseClient, user.id),
      getTeamMetrics(supabaseClient, user.id),
      getQualityMetrics(supabaseClient, user.id)
    ])

    return new Response(
      JSON.stringify({
        financial,
        operations,
        sales,
        team,
        quality,
        alerts: generateAlerts({ financial, operations, sales, team })
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})

async function getFinancialMetrics(supabase: any, userId: string) {
  // Query financial summary materialized view
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [mtd, prevMonth, ytd] = await Promise.all([
    supabase.from('financial_summary_monthly').select('*').gte('month', thisMonth.toISOString()).single(),
    supabase.from('financial_summary_monthly').select('*').eq('month', lastMonth.toISOString()).single(),
    supabase.from('financial_summary_monthly').select('*').gte('month', new Date(now.getFullYear(), 0, 1).toISOString())
  ])

  return {
    mtd_revenue: mtd.data?.total_revenue || 0,
    mtd_expenses: mtd.data?.total_expenses || 0,
    mtd_profit: mtd.data?.net_profit || 0,
    mtd_margin: mtd.data?.total_revenue > 0 ? (mtd.data.net_profit / mtd.data.total_revenue) * 100 : 0,
    ytd_revenue: ytd.data?.reduce((sum: number, m: any) => sum + m.total_revenue, 0) || 0,
    ytd_profit: ytd.data?.reduce((sum: number, m: any) => sum + m.net_profit, 0) || 0,
    ytd_margin: 0, // Calculate
    trends: {
      revenue_change: calculateChange(mtd.data?.total_revenue, prevMonth.data?.total_revenue),
      profit_change: calculateChange(mtd.data?.net_profit, prevMonth.data?.net_profit),
      margin_change: 0
    }
  }
}

function calculateChange(current: number, previous: number): number {
  if (!previous || previous === 0) return 0
  return ((current - previous) / previous) * 100
}
```

---

## PERFORMANCE REQUIREMENTS

- **Executive Dashboard Load**: < 2.0 seconds (cached 5 min)
- **Report Generation**: < 3.0 seconds (for 1-year dataset)
- **Custom Query Execution**: < 5.0 seconds (complex aggregations)
- **Export to PDF**: < 4.0 seconds (10-page report)
- **Chart Rendering**: < 500ms (all charts on page)

---

## TESTING REQUIREMENTS

### Unit Tests

```typescript
describe('Report Calculations', () => {
  it('should calculate profit margin correctly', () => {
    expect(calculateMargin(100000, 80000)).toBe(20)
  })

  it('should handle zero revenue', () => {
    expect(calculateMargin(0, 50000)).toBe(0)
  })
})
```

---

## PRE-LAUNCH CHECKLIST

- [ ] Materialized views created and auto-refreshing
- [ ] All dashboards load in < 2s
- [ ] PDF export works for all report types
- [ ] Scheduled reports deliver on time
- [ ] Executive dashboard shows accurate data

---

## WHAT TO PRESERVE

✅ **Keep These:**
1. Basic dashboard with financial summaries
2. Date filtering functionality
3. Export to CSV capability

## WHAT TO ADD

🚀 **Add These:**
1. Executive dashboard (one-page business overview)
2. Scheduled reports (auto-email weekly/monthly)
3. Custom report builder (drag-and-drop)
4. Interactive charts with drill-down
5. KPI tracking and targets

## WHAT TO FIX

🔧 **Fix These:**
1. Slow loading (> 10s) → Use materialized views
2. Static reports → Add customization
3. No comparisons → Add period-over-period analysis

---

**Next Steps**: Move to remaining modules (Sustainability, AI Copilot, Teams/RBAC, Punch List, Compliance, Integrations, Mobile).

