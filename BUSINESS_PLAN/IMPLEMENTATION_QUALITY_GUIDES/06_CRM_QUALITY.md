# CRM MODULE - QUALITY IMPLEMENTATION GUIDE

**Module**: Customer Relationship Management (Sales Pipeline)
**Business Priority**: CRITICAL (Revenue Starts Here)
**Current Completion**: 40% Complete
**Target Completion**: 95% Production-Ready
**Estimated Revenue Impact**: CRITICAL - Direct impact on sales conversion and revenue growth

---

## EXECUTIVE SUMMARY

### Why This Module is Critical to Your Success

CRM is where **revenue starts**. Before quotes, before projects, before invoices - you need leads. Without a rock-solid CRM, leads slip through the cracks, follow-ups are missed, and deals are lost to competitors who are faster and more organized.

**The Problem**: Construction company gets 20 inquiries per week from website, referrals, and cold calls. Each inquiry represents $10K-$500K in potential revenue. Without proper CRM:
- **Leads get lost**: No centralized tracking → inquiries buried in emails
- **No follow-up**: Manual reminders fail → 60% of leads never get second contact
- **Can't prioritize**: All leads treated equally → time wasted on low-value prospects
- **No pipeline visibility**: Can't answer "How much revenue is coming in Q2?"
- **Lost relationships**: When client calls 6 months later, no record of previous conversations

**Real-World Impact**:
- Contractor loses $300K deal because they forgot to follow up after initial quote
- Sales rep wastes 5 hours/week chasing low-probability leads instead of hot prospects
- Company can't forecast revenue → can't plan hiring, equipment purchases, or growth

**The Solution**: Professional CRM with automation:
- **Never lose a lead**: Every inquiry captured, tracked, and followed up
- **Automated follow-ups**: "Quote not opened in 3 days? Send reminder automatically"
- **Lead scoring**: Know which prospects are hot (85/100 score) vs cold (20/100)
- **Pipeline forecasting**: "We have $2.4M in pipeline, weighted value $985K for Q1"
- **Complete history**: Click on contact → see every email, call, meeting, quote instantly

**Business Impact**:
- **15% higher conversion rate**: Automated follow-ups catch leads that would have been lost
- **2 hours/day saved**: No manual reminders, no forgotten tasks, automated workflows
- **Accurate forecasting**: Know with 90% confidence what revenue is coming next quarter
- **Better relationships**: Never forget a client's preferences, past projects, or conversations

**Revenue Impact**:
This module directly impacts top-line revenue:
- 100 leads/month × 15% conversion = 15 new clients/month
- Without CRM: 8% conversion (manual tracking fails) = 8 clients/month
- **Difference**: 7 extra clients/month × $50K avg = $350K/month = **$4.2M/year extra revenue**

**Competitive Advantage**:
- Salesforce: $125/user/month, enterprise-complex, not construction-specific
- HubSpot: $90/user/month, generic CRM, no quote/project integration
- **The Sierra Suites**: $99/month all-inclusive, construction-tuned, seamless quote→project→invoice flow

---

## DATABASE SCHEMA

### Core Tables Enhancement

#### `crm_contacts` (Enhanced Existing Table)

```sql
-- Enhance existing crm_contacts table with missing columns
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS lead_score INT DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS lead_source TEXT CHECK (
  lead_source IN ('website', 'referral', 'cold_call', 'event', 'partner', 'advertising', 'social_media', 'other')
);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS lead_source_detail TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS is_client BOOLEAN DEFAULT false;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS is_vendor BOOLEAN DEFAULT false;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT false;

-- Contact preferences
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email' CHECK (
  preferred_contact_method IN ('email', 'phone', 'text', 'any')
);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/New_York';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS best_contact_time TEXT; -- "9am-5pm weekdays"

-- Social & web
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS company_size INT; -- Number of employees
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS industry TEXT; -- "Commercial Real Estate", "Healthcare", etc.

-- Custom fields for construction-specific data
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Revenue tracking
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS project_count INT DEFAULT 0;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS quote_count INT DEFAULT 0;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS quote_win_rate NUMERIC(5, 2); -- Percentage

-- Communication preferences
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN DEFAULT true;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT false;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT true;

-- Deduplication
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES crm_contacts(id);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;

-- Last interaction tracking
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS last_email_at TIMESTAMPTZ;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMPTZ;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS last_meeting_at TIMESTAMPTZ;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_lead_score ON crm_contacts(lead_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON crm_contacts(assigned_to, lead_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_source ON crm_contacts(lead_source) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON crm_contacts USING GIN(tags) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON crm_contacts(last_contact_at DESC) WHERE deleted_at IS NULL;

-- Trigger to update last_contact_at when activity logged
CREATE OR REPLACE FUNCTION update_contact_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE crm_contacts
  SET last_contact_at = NEW.created_at
  WHERE id = NEW.contact_id;

  IF NEW.activity_type = 'email' THEN
    UPDATE crm_contacts SET last_email_at = NEW.created_at WHERE id = NEW.contact_id;
  ELSIF NEW.activity_type = 'call' THEN
    UPDATE crm_contacts SET last_call_at = NEW.created_at WHERE id = NEW.contact_id;
  ELSIF NEW.activity_type IN ('meeting', 'site_visit') THEN
    UPDATE crm_contacts SET last_meeting_at = NEW.created_at WHERE id = NEW.contact_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_activity_update
  AFTER INSERT ON crm_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_last_contact();

-- Trigger to update project_count and lifetime_value
CREATE OR REPLACE FUNCTION update_contact_revenue_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE crm_contacts
  SET
    project_count = (SELECT COUNT(*) FROM projects WHERE client_id = COALESCE(NEW.client_id, OLD.client_id)),
    lifetime_value = (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE client_id = COALESCE(NEW.client_id, OLD.client_id) AND status = 'paid')
  WHERE id = COALESCE(NEW.client_id, OLD.client_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_update_contact_stats
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_revenue_stats();
```

#### `crm_deals` (New Table)

```sql
CREATE TABLE crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Deal Info
  deal_name VARCHAR(255) NOT NULL,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  value NUMERIC(12, 2) NOT NULL DEFAULT 0,

  -- Pipeline Stage
  stage TEXT NOT NULL DEFAULT 'new' CHECK (
    stage IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'on_hold')
  ),

  -- Probability (0-100%)
  probability INT DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),

  -- Weighted value (auto-calculated)
  weighted_value NUMERIC(12, 2) GENERATED ALWAYS AS (value * probability / 100.0) STORED,

  -- Timeline
  expected_close_date DATE,
  actual_close_date DATE,
  days_in_pipeline INT GENERATED ALWAYS AS (
    EXTRACT(DAY FROM (COALESCE(actual_close_date, CURRENT_DATE) - created_at))::INT
  ) STORED,

  -- Assignment
  owner_id UUID NOT NULL REFERENCES auth.users(id),

  -- Products/Services (line items)
  line_items JSONB DEFAULT '[]',
  /* Example:
  [
    {
      "name": "Office Build-Out",
      "description": "Open floor plan with 20 workstations",
      "quantity": 1,
      "unit_price": 95000,
      "total": 95000
    }
  ]
  */

  -- Competition
  competitors TEXT[] DEFAULT '{}',
  our_strengths TEXT,
  our_weaknesses TEXT,

  -- Decision Makers
  decision_makers JSONB DEFAULT '[]',
  /* Example:
  [
    {
      "name": "John Smith",
      "role": "Facilities Director",
      "influence": "champion",
      "contacted": true,
      "notes": "Very supportive, will champion to CFO"
    },
    {
      "name": "Mary Johnson",
      "role": "CFO",
      "influence": "decision_maker",
      "contacted": false,
      "notes": "Final approval required"
    }
  ]
  */

  -- Next Steps
  next_steps TEXT,

  -- Outcome (for won/lost deals)
  outcome TEXT CHECK (outcome IN ('won', 'lost', 'no_decision', NULL)),
  loss_reason TEXT CHECK (
    loss_reason IN ('price', 'timing', 'competitor', 'no_budget', 'no_response', 'other', NULL)
  ),
  loss_notes TEXT,

  -- Win details
  win_notes TEXT,
  win_margin NUMERIC(12, 2), -- Actual profit on won deal

  -- Relationships
  quote_id UUID REFERENCES quotes(id),
  project_id UUID REFERENCES projects(id), -- Set when deal won and converted to project

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deals_stage ON crm_deals(company_id, stage, expected_close_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_owner ON crm_deals(owner_id, stage) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_contact ON crm_deals(contact_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_close_date ON crm_deals(expected_close_date) WHERE deleted_at IS NULL AND outcome IS NULL;

-- RLS Policies
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deals from their company" ON crm_deals
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage deals in their company" ON crm_deals
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_deal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deal_update_timestamp
  BEFORE UPDATE ON crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_timestamp();

-- Trigger to set probability based on stage
CREATE OR REPLACE FUNCTION auto_set_deal_probability()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-set default probability based on stage if not explicitly set
  IF NEW.stage != OLD.stage OR (OLD.stage IS NULL AND NEW.stage IS NOT NULL) THEN
    CASE NEW.stage
      WHEN 'new' THEN NEW.probability = COALESCE(NEW.probability, 10);
      WHEN 'contacted' THEN NEW.probability = COALESCE(NEW.probability, 20);
      WHEN 'qualified' THEN NEW.probability = COALESCE(NEW.probability, 40);
      WHEN 'proposal' THEN NEW.probability = COALESCE(NEW.probability, 60);
      WHEN 'negotiation' THEN NEW.probability = COALESCE(NEW.probability, 80);
      WHEN 'won' THEN NEW.probability = 100;
      WHEN 'lost' THEN NEW.probability = 0;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deal_auto_probability
  BEFORE INSERT OR UPDATE ON crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_deal_probability();
```

#### `crm_emails` (New Table)

```sql
CREATE TABLE crm_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE SET NULL,

  -- Email Details
  subject VARCHAR(500),
  from_email VARCHAR(255) NOT NULL,
  to_email VARCHAR(255)[] NOT NULL,
  cc_email VARCHAR(255)[] DEFAULT '{}',
  bcc_email VARCHAR(255)[] DEFAULT '{}',
  body_text TEXT,
  body_html TEXT,

  -- Direction
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),

  -- Tracking (for sent emails)
  delivered_at TIMESTAMPTZ,
  first_opened_at TIMESTAMPTZ,
  open_count INT DEFAULT 0,
  last_opened_at TIMESTAMPTZ,
  link_clicks JSONB DEFAULT '[]', -- Track which links were clicked
  reply_received BOOLEAN DEFAULT false,
  replied_at TIMESTAMPTZ,

  -- Metadata
  email_provider_id VARCHAR(255), -- ID from Gmail/Outlook API
  thread_id VARCHAR(255), -- For threading conversations
  attachments JSONB DEFAULT '[]',
  /* Example:
  [
    {
      "filename": "Quote.pdf",
      "size_bytes": 124800,
      "url": "https://..."
    }
  ]
  */

  -- Template (if sent from template)
  template_id UUID REFERENCES crm_email_templates(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emails_contact ON crm_emails(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_deal ON crm_emails(deal_id, created_at DESC) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emails_thread ON crm_emails(thread_id) WHERE thread_id IS NOT NULL;

-- RLS Policies
ALTER TABLE crm_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view emails from their company" ON crm_emails
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage emails in their company" ON crm_emails
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );
```

#### `crm_workflows` (New Table)

```sql
CREATE TABLE crm_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Workflow Info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Trigger
  trigger_type TEXT NOT NULL CHECK (
    trigger_type IN (
      'contact_created',
      'deal_stage_changed',
      'deal_created',
      'quote_sent',
      'email_opened',
      'no_activity_days',
      'manual'
    )
  ),

  trigger_conditions JSONB DEFAULT '{}',
  /* Example for deal_stage_changed:
  {
    "from_stage": "qualified",
    "to_stage": "proposal"
  }
  */

  -- Actions (sequential)
  actions JSONB NOT NULL,
  /* Example:
  [
    {
      "type": "send_email",
      "template_id": "uuid-here",
      "delay_hours": 0
    },
    {
      "type": "create_task",
      "title": "Follow up on quote",
      "assignee_id": "owner",
      "delay_hours": 48
    },
    {
      "type": "update_deal_field",
      "field": "next_steps",
      "value": "Waiting for client response",
      "delay_hours": 0
    }
  ]
  */

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Stats
  times_triggered INT DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_active ON crm_workflows(company_id, trigger_type) WHERE is_active = true;

-- RLS Policies
ALTER TABLE crm_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflows from their company" ON crm_workflows
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workflows in their company" ON crm_workflows
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );
```

#### `crm_workflow_runs` (New Table)

```sql
CREATE TABLE crm_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES crm_workflows(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE CASCADE,

  -- Execution Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
  ),

  -- Actions execution log
  actions_completed INT DEFAULT 0,
  total_actions INT NOT NULL,
  current_action JSONB,
  next_action_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_next_action ON crm_workflow_runs(next_action_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON crm_workflow_runs(workflow_id, created_at DESC);
```

#### `contact_relationships` (New Table)

```sql
CREATE TABLE contact_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  related_contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,

  -- Relationship Type
  relationship_type TEXT NOT NULL CHECK (
    relationship_type IN (
      'reports_to',
      'colleague',
      'spouse',
      'decision_maker',
      'influencer',
      'works_with',
      'referred_by',
      'other'
    )
  ),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(contact_id, related_contact_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_contact_relationships ON contact_relationships(contact_id);

-- RLS Policies
ALTER TABLE contact_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relationships from their company" ON contact_relationships
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage relationships in their company" ON contact_relationships
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );
```

---

## CORE COMPONENTS

### 1. Sales Pipeline (Kanban View)

```typescript
// app/crm/pipeline/page.tsx

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { toast } from 'sonner'

interface Deal {
  id: string
  deal_name: string
  value: number
  weighted_value: number
  stage: string
  probability: number
  expected_close_date: string
  contact: {
    name: string
    company: string
  }
  owner: {
    name: string
  }
  days_in_pipeline: number
  next_steps: string
}

const PIPELINE_STAGES = [
  { id: 'new', label: 'New', color: 'gray', probability: 10 },
  { id: 'contacted', label: 'Contacted', color: 'blue', probability: 20 },
  { id: 'qualified', label: 'Qualified', color: 'cyan', probability: 40 },
  { id: 'proposal', label: 'Proposal', color: 'yellow', probability: 60 },
  { id: 'negotiation', label: 'Negotiation', color: 'orange', probability: 80 }
]

export default function PipelinePage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [timeframe, setTimeframe] = useState<'all' | 'this_month' | 'this_quarter'>('this_quarter')

  // Fetch deals
  const { data: deals, isLoading } = useQuery({
    queryKey: ['crm_deals', timeframe],
    queryFn: async () => {
      let query = supabase
        .from('crm_deals')
        .select(`
          *,
          contact:contact_id(name, company),
          owner:owner_id(name)
        `)
        .is('deleted_at', null)
        .not('outcome', 'in', '("won","lost")')
        .order('value', { ascending: false })

      // Filter by timeframe
      if (timeframe === 'this_month') {
        const endOfMonth = new Date()
        endOfMonth.setMonth(endOfMonth.getMonth() + 1)
        query = query.lte('expected_close_date', endOfMonth.toISOString())
      } else if (timeframe === 'this_quarter') {
        const endOfQuarter = new Date()
        endOfQuarter.setMonth(Math.ceil((endOfQuarter.getMonth() + 1) / 3) * 3)
        query = query.lte('expected_close_date', endOfQuarter.toISOString())
      }

      const { data, error } = await query
      if (error) throw error
      return data as Deal[]
    }
  })

  // Calculate pipeline metrics
  const metrics = {
    totalValue: deals?.reduce((sum, d) => sum + d.value, 0) || 0,
    weightedValue: deals?.reduce((sum, d) => sum + d.weighted_value, 0) || 0,
    dealCount: deals?.length || 0,
    avgDealSize: deals?.length ? (deals.reduce((sum, d) => sum + d.value, 0) / deals.length) : 0,
    avgDaysInPipeline: deals?.length ? (deals.reduce((sum, d) => sum + d.days_in_pipeline, 0) / deals.length) : 0
  }

  // Move deal to new stage
  const moveDealMutation = useMutation({
    mutationFn: async ({ dealId, newStage }: { dealId: string; newStage: string }) => {
      const { error } = await supabase
        .from('crm_deals')
        .update({ stage: newStage })
        .eq('id', dealId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_deals'] })
      toast.success('Deal moved')
    }
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const dealId = active.id as string
    const newStage = over.id as string

    moveDealMutation.mutate({ dealId, newStage })
  }

  // Group deals by stage
  const dealsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.id] = deals?.filter(d => d.stage === stage.id) || []
    return acc
  }, {} as Record<string, Deal[]>)

  if (isLoading) return <div>Loading pipeline...</div>

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Sales Pipeline</h1>

        {/* Metrics */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Pipeline</p>
            <p className="text-2xl font-bold">${(metrics.totalValue / 1000).toFixed(0)}K</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Weighted Value</p>
            <p className="text-2xl font-bold text-green-600">${(metrics.weightedValue / 1000).toFixed(0)}K</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Deals</p>
            <p className="text-2xl font-bold">{metrics.dealCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Avg Deal</p>
            <p className="text-2xl font-bold">${(metrics.avgDealSize / 1000).toFixed(0)}K</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Avg Days</p>
            <p className="text-2xl font-bold">{metrics.avgDaysInPipeline.toFixed(0)}</p>
          </div>
        </div>

        {/* Timeframe Filter */}
        <div className="flex gap-2">
          {(['all', 'this_month', 'this_quarter'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded ${
                timeframe === tf
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              {tf === 'all' && 'All Deals'}
              {tf === 'this_month' && 'This Month'}
              {tf === 'this_quarter' && 'This Quarter'}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline Kanban */}
      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-5 gap-4">
          {PIPELINE_STAGES.map(stage => {
            const stageDeals = dealsByStage[stage.id]
            const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0)
            const stageWeighted = stageDeals.reduce((sum, d) => sum + d.weighted_value, 0)

            return (
              <div key={stage.id} className="flex flex-col">
                {/* Stage Header */}
                <div className="mb-3 bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold text-lg mb-1">{stage.label}</h3>
                  <p className="text-sm text-gray-600">
                    {stageDeals.length} deals • ${(stageValue / 1000).toFixed(0)}K
                  </p>
                  <p className="text-xs text-gray-500">
                    Weighted: ${(stageWeighted / 1000).toFixed(0)}K ({stage.probability}%)
                  </p>
                </div>

                {/* Deal Cards */}
                <div className="flex-1 space-y-3" style={{ minHeight: '500px' }}>
                  {stageDeals.map(deal => {
                    const isOverdue = deal.expected_close_date &&
                      new Date(deal.expected_close_date) < new Date()

                    return (
                      <div
                        key={deal.id}
                        className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition"
                        onClick={() => {/* Open deal detail modal */}}
                      >
                        {/* Deal Name */}
                        <h4 className="font-medium mb-2">{deal.deal_name}</h4>

                        {/* Value */}
                        <p className="text-lg font-bold text-green-600 mb-2">
                          ${(deal.value / 1000).toFixed(0)}K
                        </p>

                        {/* Contact */}
                        <p className="text-sm text-gray-600 mb-1">
                          {deal.contact.name}
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          {deal.contact.company}
                        </p>

                        {/* Close Date */}
                        {deal.expected_close_date && (
                          <p className={`text-sm mb-2 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                            Close: {new Date(deal.expected_close_date).toLocaleDateString()}
                            {isOverdue && ' (OVERDUE)'}
                          </p>
                        )}

                        {/* Days in Pipeline */}
                        <p className="text-xs text-gray-500 mb-2">
                          {deal.days_in_pipeline} days in pipeline
                        </p>

                        {/* Next Steps */}
                        {deal.next_steps && (
                          <p className="text-xs text-blue-600 border-t pt-2">
                            Next: {deal.next_steps}
                          </p>
                        )}

                        {/* Owner */}
                        <p className="text-xs text-gray-400 mt-2">
                          Owner: {deal.owner.name}
                        </p>
                      </div>
                    )
                  })}

                  {/* Add Deal Button */}
                  <button
                    onClick={() => {/* Open create deal modal with stage pre-selected */}}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600"
                  >
                    + Add Deal
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </DndContext>
    </div>
  )
}
```

### 2. Enhanced Contact Profile View

```typescript
// app/crm/contacts/[id]/page.tsx

'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface ContactDetail {
  id: string
  name: string
  email: string
  phone: string
  company: string
  title: string
  lead_score: number
  lead_source: string
  lifetime_value: number
  project_count: number
  quote_win_rate: number
  last_contact_at: string
  tags: string[]
  deals: Array<{
    id: string
    deal_name: string
    value: number
    stage: string
    probability: number
  }>
  activities: Array<{
    id: string
    activity_type: string
    subject: string
    notes: string
    created_at: string
  }>
  projects: Array<{
    id: string
    name: string
    status: string
    total_amount: number
  }>
}

export default function ContactDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: contact, isLoading } = useQuery({
    queryKey: ['crm_contact', params.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select(`
          *,
          deals:crm_deals(id, deal_name, value, stage, probability),
          activities:crm_activities(id, activity_type, subject, notes, created_at),
          projects:projects(id, name, status, total_amount)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      return data as ContactDetail
    }
  })

  if (isLoading) return <div>Loading contact...</div>
  if (!contact) return <div>Contact not found</div>

  const activeDeals = contact.deals?.filter(d => !['won', 'lost'].includes(d.stage)) || []
  const wonDeals = contact.deals?.filter(d => d.stage === 'won') || []

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{contact.name}</h1>
            {contact.title && <p className="text-gray-600 mb-1">{contact.title}</p>}
            {contact.company && <p className="text-gray-600 mb-3">{contact.company}</p>}

            <div className="flex gap-4 text-sm text-gray-600 mb-4">
              <span>📧 {contact.email}</span>
              {contact.phone && <span>📞 {contact.phone}</span>}
            </div>

            {/* Tags */}
            {contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {contact.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Lead Score */}
          <div className="text-center">
            <div className={`text-3xl font-bold ${
              contact.lead_score >= 80 ? 'text-red-600' :
              contact.lead_score >= 60 ? 'text-orange-600' :
              contact.lead_score >= 40 ? 'text-yellow-600' :
              'text-gray-600'
            }`}>
              {contact.lead_score}/100
            </div>
            <p className="text-sm text-gray-500">Lead Score</p>
            {contact.lead_score >= 80 && <span className="text-xs text-red-600">🔥 HOT</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column: Quick Stats & Actions */}
        <div className="col-span-1 space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Quick Stats</h3>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-xl font-bold text-green-600">
                  ${contact.lifetime_value.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Projects</p>
                <p className="text-lg font-semibold">{contact.project_count}</p>
              </div>

              {contact.quote_win_rate !== null && (
                <div>
                  <p className="text-sm text-gray-500">Quote Win Rate</p>
                  <p className="text-lg font-semibold">{contact.quote_win_rate}%</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500">Source</p>
                <p className="text-sm">{contact.lead_source}</p>
              </div>

              {contact.last_contact_at && (
                <div>
                  <p className="text-sm text-gray-500">Last Contact</p>
                  <p className="text-sm">
                    {new Date(contact.last_contact_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Actions</h3>

            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                📧 Send Email
              </button>
              <button className="w-full px-4 py-2 border rounded hover:bg-gray-50">
                📞 Log Call
              </button>
              <button className="w-full px-4 py-2 border rounded hover:bg-gray-50">
                📅 Schedule Meeting
              </button>
              <button className="w-full px-4 py-2 border rounded hover:bg-gray-50">
                💼 Create Quote
              </button>
              <button className="w-full px-4 py-2 border rounded hover:bg-gray-50">
                🏗️ Create Project
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="col-span-2 space-y-6">
          {/* Active Deals */}
          {activeDeals.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Active Deals ({activeDeals.length})</h3>

              <div className="space-y-3">
                {activeDeals.map(deal => (
                  <div key={deal.id} className="border rounded p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{deal.deal_name}</h4>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {deal.stage}
                      </span>
                    </div>

                    <p className="text-lg font-bold text-green-600 mb-1">
                      ${deal.value.toLocaleString()}
                    </p>

                    <p className="text-sm text-gray-600">
                      Probability: {deal.probability}% •
                      Weighted: ${((deal.value * deal.probability) / 100).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Recent Activity</h3>
              <button className="text-sm text-blue-600 hover:underline">
                View All ({contact.activities?.length || 0})
              </button>
            </div>

            <div className="space-y-4">
              {contact.activities?.slice(0, 5).map(activity => {
                const icon =
                  activity.activity_type === 'email' ? '📧' :
                  activity.activity_type === 'call' ? '📞' :
                  activity.activity_type === 'meeting' ? '📅' :
                  '📝'

                return (
                  <div key={activity.id} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium">
                        {icon} {activity.activity_type.toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>

                    {activity.subject && (
                      <p className="text-sm font-medium mb-1">{activity.subject}</p>
                    )}

                    {activity.notes && (
                      <p className="text-sm text-gray-600">{activity.notes}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Projects */}
          {contact.projects && contact.projects.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Projects ({contact.projects.length})</h3>

              <div className="space-y-3">
                {contact.projects.map(project => (
                  <div key={project.id} className="border rounded p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{project.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded ${
                        project.status === 'completed' ? 'bg-green-100 text-green-700' :
                        project.status === 'active' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {project.status}
                      </span>
                    </div>

                    <p className="text-lg font-bold text-green-600">
                      ${project.total_amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## BUSINESS LOGIC & FORMULAS

### Lead Scoring Algorithm

```typescript
// lib/crm/lead-scoring.ts

export interface LeadScoringFactors {
  companySize: number
  dealValue: number
  timeline: number
  engagement: number
  fit: number
  authority: number
}

export function calculateLeadScore(params: {
  contact: {
    company_size?: number
    industry?: string
  }
  deal?: {
    value: number
    expected_close_date?: Date
    decision_makers?: Array<{ role: string; contacted: boolean }>
  }
  activities: Array<{
    activity_type: string
    created_at: Date
  }>
  emailMetrics?: {
    open_count: number
    reply_count: number
  }
}): { score: number; factors: LeadScoringFactors } {
  const factors: LeadScoringFactors = {
    companySize: 0,
    dealValue: 0,
    timeline: 0,
    engagement: 0,
    fit: 0,
    authority: 0
  }

  // 1. Company Size (0-20 points)
  if (params.contact.company_size) {
    if (params.contact.company_size > 500) factors.companySize = 20
    else if (params.contact.company_size > 100) factors.companySize = 15
    else if (params.contact.company_size > 50) factors.companySize = 10
    else factors.companySize = 5
  }

  // 2. Deal Value (0-20 points)
  if (params.deal) {
    if (params.deal.value > 500000) factors.dealValue = 20
    else if (params.deal.value > 250000) factors.dealValue = 18
    else if (params.deal.value > 100000) factors.dealValue = 15
    else if (params.deal.value > 50000) factors.dealValue = 12
    else factors.dealValue = 8
  }

  // 3. Timeline Urgency (0-15 points)
  if (params.deal?.expected_close_date) {
    const daysUntil = Math.floor(
      (params.deal.expected_close_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    if (daysUntil < 30) factors.timeline = 15
    else if (daysUntil < 60) factors.timeline = 12
    else if (daysUntil < 90) factors.timeline = 8
    else factors.timeline = 5
  }

  // 4. Engagement Level (0-20 points)
  const recentActivities = params.activities.filter(a => {
    const daysSince = (Date.now() - a.created_at.getTime()) / (1000 * 60 * 60 * 24)
    return daysSince <= 30
  })

  const calls = recentActivities.filter(a => a.activity_type === 'call').length
  const meetings = recentActivities.filter(a => a.activity_type === 'meeting').length
  const emailOpens = params.emailMetrics?.open_count || 0
  const emailReplies = params.emailMetrics?.reply_count || 0

  if (emailOpens > 5) factors.engagement += 6
  else if (emailOpens > 2) factors.engagement += 4

  if (emailReplies > 3) factors.engagement += 6
  else if (emailReplies > 1) factors.engagement += 4

  if (calls > 2) factors.engagement += 4
  else if (calls > 0) factors.engagement += 2

  if (meetings > 1) factors.engagement += 4
  else if (meetings > 0) factors.engagement += 2

  // 5. Fit Score (0-15 points)
  // Construction-specific fit
  const idealIndustries = ['commercial_real_estate', 'healthcare', 'education', 'retail']
  if (params.contact.industry && idealIndustries.includes(params.contact.industry)) {
    factors.fit = 15
  } else {
    factors.fit = 8
  }

  // 6. Authority Level (0-10 points)
  if (params.deal?.decision_makers) {
    const contactedDMs = params.deal.decision_makers.filter(dm => dm.contacted)

    if (contactedDMs.some(dm => dm.role.toLowerCase().includes('ceo'))) {
      factors.authority = 10
    } else if (contactedDMs.some(dm => dm.role.toLowerCase().includes('cfo'))) {
      factors.authority = 8
    } else if (contactedDMs.some(dm =>
      dm.role.toLowerCase().includes('director') ||
      dm.role.toLowerCase().includes('manager')
    )) {
      factors.authority = 6
    } else {
      factors.authority = 3
    }
  }

  const totalScore = Math.min(100,
    factors.companySize +
    factors.dealValue +
    factors.timeline +
    factors.engagement +
    factors.fit +
    factors.authority
  )

  return { score: totalScore, factors }
}

// Recalculate lead score (call this after new activity, deal update, etc.)
export async function recalculateContactScore(
  supabase: any,
  contactId: string
): Promise<number> {
  // Fetch all relevant data
  const { data: contact } = await supabase
    .from('crm_contacts')
    .select('company_size, industry')
    .eq('id', contactId)
    .single()

  const { data: deals } = await supabase
    .from('crm_deals')
    .select('value, expected_close_date, decision_makers')
    .eq('contact_id', contactId)
    .not('outcome', 'in', '("won","lost")')
    .order('value', { ascending: false })
    .limit(1)

  const { data: activities } = await supabase
    .from('crm_activities')
    .select('activity_type, created_at')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: emails } = await supabase
    .from('crm_emails')
    .select('open_count')
    .eq('contact_id', contactId)
    .eq('direction', 'sent')

  const emailMetrics = {
    open_count: emails?.reduce((sum, e) => sum + (e.open_count || 0), 0) || 0,
    reply_count: emails?.filter(e => e.reply_received).length || 0
  }

  const { score } = calculateLeadScore({
    contact,
    deal: deals?.[0] ? {
      ...deals[0],
      expected_close_date: deals[0].expected_close_date ? new Date(deals[0].expected_close_date) : undefined
    } : undefined,
    activities: activities?.map(a => ({
      ...a,
      created_at: new Date(a.created_at)
    })) || [],
    emailMetrics
  })

  // Update contact with new score
  await supabase
    .from('crm_contacts')
    .update({ lead_score: score })
    .eq('id', contactId)

  return score
}
```

### Pipeline Forecasting

```typescript
// lib/crm/forecasting.ts

export interface PipelineForecast {
  month: string
  totalPipeline: number
  weightedValue: number
  expectedWins: number
  avgDealSize: number
  confidence: 'low' | 'medium' | 'high'
}

export async function forecastPipeline(
  supabase: any,
  months: number = 3
): Promise<PipelineForecast[]> {
  const forecasts: PipelineForecast[] = []

  for (let i = 0; i < months; i++) {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() + i)
    startDate.setDate(1)

    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)
    endDate.setDate(0)

    // Fetch deals expected to close this month
    const { data: deals } = await supabase
      .from('crm_deals')
      .select('value, weighted_value, probability, stage')
      .gte('expected_close_date', startDate.toISOString())
      .lte('expected_close_date', endDate.toISOString())
      .is('deleted_at', null)
      .not('outcome', 'in', '("won","lost")')

    if (!deals) continue

    const totalPipeline = deals.reduce((sum, d) => sum + d.value, 0)
    const weightedValue = deals.reduce((sum, d) => sum + d.weighted_value, 0)

    // Estimate number of expected wins based on probability
    const expectedWins = deals.reduce((sum, d) => sum + (d.probability / 100), 0)

    const avgDealSize = deals.length > 0 ? totalPipeline / deals.length : 0

    // Determine confidence based on deal stages
    const advancedStageDeals = deals.filter(d =>
      ['proposal', 'negotiation'].includes(d.stage)
    ).length

    const confidence: 'low' | 'medium' | 'high' =
      advancedStageDeals >= deals.length * 0.6 ? 'high' :
      advancedStageDeals >= deals.length * 0.3 ? 'medium' :
      'low'

    forecasts.push({
      month: startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      totalPipeline,
      weightedValue,
      expectedWins: Math.round(expectedWins),
      avgDealSize,
      confidence
    })
  }

  return forecasts
}
```

---

## EDGE FUNCTIONS

### Workflow Execution Engine

```typescript
// supabase/functions/execute-workflow/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { workflowRunId } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch workflow run
    const { data: workflowRun, error: runError } = await supabaseClient
      .from('crm_workflow_runs')
      .select(`
        *,
        workflow:workflow_id(*)
      `)
      .eq('id', workflowRunId)
      .single()

    if (runError) throw runError

    // Mark as running
    await supabaseClient
      .from('crm_workflow_runs')
      .update({ status: 'running' })
      .eq('id', workflowRunId)

    const actions = workflowRun.workflow.actions as Array<any>

    // Execute each action
    for (let i = workflowRun.actions_completed; i < actions.length; i++) {
      const action = actions[i]

      // Check if we need to delay
      if (action.delay_hours && action.delay_hours > 0) {
        const nextActionTime = new Date()
        nextActionTime.setHours(nextActionTime.getHours() + action.delay_hours)

        await supabaseClient
          .from('crm_workflow_runs')
          .update({
            next_action_at: nextActionTime.toISOString(),
            current_action: action
          })
          .eq('id', workflowRunId)

        // Schedule next execution
        // (This would integrate with a cron job or scheduler)
        return new Response(JSON.stringify({ scheduled: true }))
      }

      // Execute action
      try {
        switch (action.type) {
          case 'send_email':
            await executeEmailAction(supabaseClient, action, workflowRun)
            break

          case 'create_task':
            await executeTaskAction(supabaseClient, action, workflowRun)
            break

          case 'update_deal_field':
            await executeUpdateFieldAction(supabaseClient, action, workflowRun)
            break

          case 'send_notification':
            await executeNotificationAction(supabaseClient, action, workflowRun)
            break

          default:
            console.warn(`Unknown action type: ${action.type}`)
        }

        // Update progress
        await supabaseClient
          .from('crm_workflow_runs')
          .update({ actions_completed: i + 1 })
          .eq('id', workflowRunId)

      } catch (actionError) {
        // Log error and mark workflow as failed
        await supabaseClient
          .from('crm_workflow_runs')
          .update({
            status: 'failed',
            error_message: actionError.message,
            error_details: { action, error: actionError }
          })
          .eq('id', workflowRunId)

        throw actionError
      }
    }

    // Mark as completed
    await supabaseClient
      .from('crm_workflow_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', workflowRunId)

    return new Response(JSON.stringify({ success: true }))

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    )
  }
})

async function executeEmailAction(supabase: any, action: any, workflowRun: any) {
  // Send email using template
  // This would integrate with SendGrid, Resend, or similar
  console.log('Sending email:', action)
}

async function executeTaskAction(supabase: any, action: any, workflowRun: any) {
  // Determine assignee
  let assigneeId = action.assignee_id

  if (assigneeId === 'owner' && workflowRun.deal_id) {
    const { data: deal } = await supabase
      .from('crm_deals')
      .select('owner_id')
      .eq('id', workflowRun.deal_id)
      .single()

    assigneeId = deal?.owner_id
  }

  // Create task
  await supabase.from('tasks').insert({
    title: action.title,
    description: action.description,
    assignee_id: assigneeId,
    due_date: new Date(Date.now() + (action.due_in_hours || 24) * 60 * 60 * 1000).toISOString(),
    status: 'not_started',
    priority: action.priority || 'medium'
  })
}

async function executeUpdateFieldAction(supabase: any, action: any, workflowRun: any) {
  if (workflowRun.deal_id) {
    await supabase
      .from('crm_deals')
      .update({ [action.field]: action.value })
      .eq('id', workflowRun.deal_id)
  }
}

async function executeNotificationAction(supabase: any, action: any, workflowRun: any) {
  // Send notification (Slack, email, push, etc.)
  console.log('Sending notification:', action)
}
```

---

## PERFORMANCE REQUIREMENTS

### Response Time Targets

- **Pipeline Load**: < 1.2 seconds (with 200 deals)
- **Contact Profile Load**: < 800ms (with full history)
- **Lead Score Calculation**: < 100ms
- **Workflow Trigger**: < 300ms
- **Email Tracking Webhook**: < 50ms
- **Search Contacts**: < 400ms

### Optimization Strategies

1. **Database Indexes**
   - Composite indexes on `(company_id, stage, expected_close_date)` for pipeline queries
   - GIN index on tags array for tag filtering
   - Partial indexes for active deals only

2. **Caching**
   - Cache lead scores for 1 hour (recalculate on activity)
   - Cache pipeline metrics for 5 minutes
   - Use React Query with stale-while-revalidate

3. **Query Optimization**
   - Paginate activity history (20 per page)
   - Limit email fetch to last 50 emails
   - Use `select()` with specific columns

4. **Real-Time Updates**
   - Subscribe to deal updates only for active pipeline
   - Debounce search inputs by 300ms
   - Batch notification sends

---

## TESTING REQUIREMENTS

### Unit Tests

```typescript
// __tests__/crm/lead-scoring.test.ts

describe('Lead Scoring Algorithm', () => {
  it('should score hot lead correctly', () => {
    const { score, factors } = calculateLeadScore({
      contact: { company_size: 600, industry: 'commercial_real_estate' },
      deal: {
        value: 150000,
        expected_close_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
        decision_makers: [
          { role: 'CEO', contacted: true }
        ]
      },
      activities: [
        { activity_type: 'call', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { activity_type: 'meeting', created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
      ],
      emailMetrics: { open_count: 6, reply_count: 4 }
    })

    expect(score).toBeGreaterThanOrEqual(85)
    expect(factors.companySize).toBe(20)
    expect(factors.dealValue).toBe(15)
    expect(factors.timeline).toBe(15)
    expect(factors.authority).toBe(10)
  })

  it('should score cold lead correctly', () => {
    const { score } = calculateLeadScore({
      contact: { company_size: 10 },
      deal: {
        value: 5000,
        expected_close_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000) // 120 days
      },
      activities: [],
      emailMetrics: { open_count: 0, reply_count: 0 }
    })

    expect(score).toBeLessThanOrEqual(30)
  })
})
```

### Integration Tests

```typescript
// __tests__/crm/pipeline.test.ts

describe('Pipeline Management', () => {
  it('should move deal through stages correctly', async () => {
    const deal = await createDeal({
      deal_name: 'Test Deal',
      value: 100000,
      stage: 'new'
    })

    // Move to contacted
    await supabase
      .from('crm_deals')
      .update({ stage: 'contacted' })
      .eq('id', deal.id)

    const { data: updated } = await supabase
      .from('crm_deals')
      .select('stage, probability')
      .eq('id', deal.id)
      .single()

    expect(updated.stage).toBe('contacted')
    expect(updated.probability).toBe(20) // Auto-set by trigger
  })

  it('should calculate weighted value correctly', async () => {
    const deal = await createDeal({
      deal_name: 'Test Deal',
      value: 100000,
      stage: 'proposal',
      probability: 60
    })

    const { data } = await supabase
      .from('crm_deals')
      .select('weighted_value')
      .eq('id', deal.id)
      .single()

    expect(data.weighted_value).toBe(60000) // 100000 * 0.60
  })
})
```

### E2E Tests

```typescript
// e2e/crm-pipeline.spec.ts

test('should drag deal between pipeline stages', async ({ page }) => {
  await page.goto('/crm/pipeline')

  const deal = page.locator('[data-deal-id="deal-123"]')
  const proposalColumn = page.locator('[data-stage="proposal"]')

  await deal.dragTo(proposalColumn)

  // Verify stage updated
  await expect(page.locator('[data-deal-id="deal-123"]')).toHaveAttribute('data-stage', 'proposal')

  // Verify toast notification
  await expect(page.locator('.sonner-toast')).toHaveText(/Deal moved/)
})
```

---

## COMMON PITFALLS & SOLUTIONS

### Pitfall #1: Lead Score Becomes Stale

**Problem**: Lead scores calculated once never update, becoming inaccurate over time.

**Solution**:
- Recalculate score after every activity logged
- Run nightly batch job to recalculate all scores
- Cache scores for 1 hour max

### Pitfall #2: Workflow Infinite Loops

**Problem**: Workflow triggers another workflow which triggers the first workflow → infinite loop.

**Solution**:
```typescript
// Track workflow execution chain
CREATE TABLE workflow_execution_chain (
  workflow_run_id UUID,
  triggered_by_workflow_run_id UUID,
  depth INT
);

// Prevent depth > 5
IF depth > 5 THEN
  RAISE EXCEPTION 'Workflow chain too deep - possible infinite loop'
END IF;
```

### Pitfall #3: Email Tracking Privacy

**Problem**: Tracking pixel in emails blocked by privacy-focused email clients.

**Solution**:
- Don't rely solely on open tracking
- Use link clicks as stronger engagement signal
- Track replies as highest engagement
- Show "possibly opened" vs "definitely opened"

---

## PRE-LAUNCH CHECKLIST

### Database
- [ ] All tables created with correct schemas
- [ ] RLS policies enabled and tested
- [ ] Indexes created on high-traffic columns
- [ ] Triggers tested (lead score update, deal probability)
- [ ] Sample data populated (50 contacts, 20 deals, 100 activities)

### Features
- [ ] Pipeline Kanban drag-and-drop works
- [ ] Lead scoring calculates correctly
- [ ] Contact profile loads all data
- [ ] Email tracking (open/click) working
- [ ] Workflows execute correctly
- [ ] Deal forecasting accurate

### Performance
- [ ] Pipeline loads in < 1.2s with 200 deals
- [ ] Contact profile loads in < 800ms
- [ ] Lead score calculation < 100ms
- [ ] Search responds in < 400ms

### Testing
- [ ] Unit tests pass (lead scoring, forecasting)
- [ ] Integration tests pass (pipeline, workflows)
- [ ] E2E tests pass (drag-drop, contact creation)
- [ ] Mobile testing complete

---

## SUCCESS METRICS

### Conversion Metrics
- **Lead-to-Client**: Target 15% conversion
- **Quote-to-Project**: Target 35% win rate
- **Pipeline Accuracy**: < 10% variance forecast vs actual

### Usage Metrics
- **Daily Active Users**: 60% of sales team
- **Activities Logged**: 10+ per user per week
- **Workflow Adoption**: 40% of deals use automation

### Performance Metrics
- **First Response Time**: < 2 hours (from inquiry to contact)
- **Follow-up Consistency**: 90% of deals get 2+ follow-ups

---

## DEPLOYMENT PROCEDURE

### Pre-Deploy
1. Run full test suite
2. Create database migration scripts
3. Test migration on staging with production data clone
4. Create default workflows ("New Lead", "Quote Sent", "Deal Won")

### Deploy
1. **Database Migration**:
   ```sql
   -- Run all ALTER TABLE and CREATE TABLE statements
   -- Enable RLS policies
   -- Create triggers
   ```

2. **Edge Functions**:
   ```bash
   supabase functions deploy execute-workflow
   supabase functions deploy recalculate-lead-score
   ```

3. **Frontend Deployment**:
   ```bash
   npm run build
   npm run deploy
   ```

### Post-Deploy
1. Smoke test critical flows
2. Monitor error logs for 1 hour
3. Check performance metrics
4. Send announcement email

---

## WHAT TO PRESERVE (ALREADY WORKS)

✅ **Keep These - They're Great:**

1. **Basic Contact Management**: Create/edit contacts works well
2. **Lead Pipeline Stages**: 7-stage pipeline is construction-appropriate
3. **Activity Logging**: Manual call/email/meeting logging functional
4. **Search**: Contact and lead search works
5. **Email Templates**: Basic template system exists

## WHAT TO ADD (MISSING FEATURES)

🚀 **Add These - Fill the Gaps:**

1. **Lead Scoring**: Auto-rank leads by likelihood to close
2. **Deal Management**: Track complex multi-stakeholder deals
3. **Email Tracking**: Know when emails opened, links clicked
4. **Automated Workflows**: Auto-follow-ups when no response
5. **Pipeline Forecasting**: Predict Q1/Q2/Q3 revenue
6. **Enhanced Contact Profiles**: See complete relationship history
7. **Duplicate Detection**: Prevent duplicate contacts

## WHAT TO FIX (BROKEN/INCOMPLETE)

🔧 **Fix These - They're Broken:**

1. **No Email Integration**: Can't send/track emails from app → Add email sending and tracking
2. **Manual Everything**: No automation → Add workflow engine
3. **All Leads Equal**: No prioritization → Add lead scoring
4. **Limited Pipeline View**: Hard to visualize → Add Kanban drag-and-drop with metrics
5. **No Revenue Tracking**: Can't see lifetime value → Add auto-calculated LTV

---

**Next Steps**: Once CRM is complete, move to ReportCenter quality guide.

