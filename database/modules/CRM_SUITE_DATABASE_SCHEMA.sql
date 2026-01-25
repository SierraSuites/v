-- ============================================================
-- CRM SUITE DATABASE SCHEMA
-- Complete customer relationship management for construction
-- ============================================================

-- ============================================================
-- 1. CRM CONTACTS (Clients, Prospects, Vendors, Subcontractors)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- CONTACT INFO
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(255) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),

  -- COMPANY INFO
  company VARCHAR(255),
  job_title VARCHAR(100),
  website VARCHAR(255),

  -- ADDRESS
  street_address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United States',

  -- CATEGORIZATION
  category VARCHAR(50) DEFAULT 'prospect', -- client, prospect, vendor, subcontractor, partner
  contact_type VARCHAR(50), -- homeowner, property_manager, developer, architect, gc
  lead_source VARCHAR(100), -- referral, website, trade_show, cold_call, advertisement
  tags TEXT[],

  -- CONSTRUCTION-SPECIFIC
  project_types_interested TEXT[], -- residential, commercial, renovation, new_construction
  preferred_contract_method VARCHAR(50), -- fixed_price, time_materials, cost_plus
  trade_specialties TEXT[], -- For subcontractors
  annual_volume DECIMAL(12,2), -- Estimated annual project volume
  territory VARCHAR(100),

  -- RELATIONSHIPS
  referred_by UUID REFERENCES public.crm_contacts(id),
  account_manager UUID REFERENCES auth.users(id),

  -- STATUS
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, do_not_contact
  is_favorite BOOLEAN DEFAULT false,
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 5), -- Lead quality rating

  -- COMMUNICATION PREFERENCES
  preferred_contact_method VARCHAR(20), -- email, phone, text, in_person
  best_time_to_contact VARCHAR(50),
  email_opt_in BOOLEAN DEFAULT true,
  sms_opt_in BOOLEAN DEFAULT false,

  -- FINANCIAL
  credit_limit DECIMAL(12,2),
  payment_terms VARCHAR(50), -- Net 30, Net 15, COD, etc.
  tax_id VARCHAR(50), -- EIN for businesses

  -- INTEGRATION
  integration_id UUID, -- Reference to user_integrations if synced from external system
  external_id VARCHAR(255), -- ID from QuickBooks, etc.
  sync_status VARCHAR(20), -- synced, pending, error
  last_sync_at TIMESTAMPTZ,

  -- METADATA
  notes TEXT,
  profile_image_url TEXT,
  social_media JSONB, -- {linkedin, facebook, instagram}
  custom_fields JSONB, -- Extensible for user-specific data

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- CONSTRAINTS
  UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_user ON public.crm_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON public.crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_category ON public.crm_contacts(category);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON public.crm_contacts(status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_company ON public.crm_contacts(company);

-- ============================================================
-- 2. CRM LEADS PIPELINE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,

  -- LEAD INFO
  title VARCHAR(255) NOT NULL, -- "Kitchen Remodel - Smith Residence"
  description TEXT,

  -- PIPELINE STAGE
  stage VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, proposal_sent, negotiation, won, lost
  stage_order INTEGER, -- For custom stage ordering
  stage_changed_at TIMESTAMPTZ DEFAULT NOW(),

  -- VALUE & PROBABILITY
  estimated_value DECIMAL(12,2),
  probability INTEGER DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
  weighted_value DECIMAL(12,2) GENERATED ALWAYS AS (estimated_value * probability / 100) STORED,

  -- CONSTRUCTION-SPECIFIC
  project_type VARCHAR(100), -- residential_remodel, commercial_build, new_construction
  project_size VARCHAR(50), -- small (<50k), medium (50k-250k), large (250k+)
  square_footage INTEGER,
  estimated_duration_days INTEGER,
  preferred_start_date DATE,

  -- TRACKING
  lead_source VARCHAR(100),
  source_campaign VARCHAR(100), -- For marketing attribution
  assigned_to UUID REFERENCES auth.users(id),

  -- TIMELINE
  first_contact_date DATE,
  last_contact_date DATE,
  expected_close_date DATE,
  actual_close_date DATE,

  -- OUTCOME
  won_reason TEXT, -- Why we won
  lost_reason TEXT, -- Why we lost
  lost_to_competitor VARCHAR(255), -- Which competitor

  -- LINKED RECORDS
  quote_id UUID REFERENCES public.quotes(id), -- From QuoteHub
  project_id UUID REFERENCES public.projects(id), -- If converted to project

  -- STATUS
  is_active BOOLEAN DEFAULT true,
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  confidence_level VARCHAR(20), -- low, medium, high

  -- FOLLOW-UP
  next_action VARCHAR(255),
  next_action_date DATE,
  reminder_set BOOLEAN DEFAULT false,

  -- METADATA
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_user ON public.crm_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_contact ON public.crm_leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON public.crm_leads(stage);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned ON public.crm_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON public.crm_leads(is_active);

-- ============================================================
-- 3. CRM ACTIVITIES (Calls, Emails, Meetings, Site Visits)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- ASSOCIATIONS
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  -- ACTIVITY TYPE
  activity_type VARCHAR(50) NOT NULL, -- call, email, meeting, site_visit, quote_sent, proposal_sent, contract_signed
  activity_subtype VARCHAR(50), -- inbound_call, outbound_call, cold_call, follow_up

  -- DETAILS
  subject VARCHAR(255),
  description TEXT,

  -- SCHEDULING
  scheduled_date TIMESTAMPTZ,
  scheduled_duration_minutes INTEGER,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  actual_duration_minutes INTEGER,

  -- STATUS
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- OUTCOME
  outcome VARCHAR(100), -- successful, unsuccessful, needs_follow_up, meeting_scheduled
  outcome_notes TEXT,
  sentiment VARCHAR(20), -- positive, neutral, negative

  -- FOLLOW-UP
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_assigned_to UUID REFERENCES auth.users(id),

  -- LOCATION (for site visits, meetings)
  location VARCHAR(255),
  location_coordinates POINT, -- GPS coordinates

  -- PARTICIPANTS
  participants JSONB, -- [{user_id, name, role}]
  attendees_count INTEGER,

  -- COMMUNICATION TRACKING
  email_message_id TEXT, -- If synced from email integration
  email_thread_id TEXT,
  call_recording_url TEXT,
  call_duration_seconds INTEGER,

  -- METADATA
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high
  is_billable BOOLEAN DEFAULT false,
  billable_amount DECIMAL(10,2),
  tags TEXT[],

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_user ON public.crm_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON public.crm_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_lead ON public.crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON public.crm_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_crm_activities_date ON public.crm_activities(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_crm_activities_status ON public.crm_activities(status);

-- ============================================================
-- 4. CRM OPPORTUNITIES (Converted Leads / Active Deals)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- SOURCE
  lead_id UUID REFERENCES public.crm_leads(id),
  contact_id UUID REFERENCES public.crm_contacts(id) NOT NULL,
  quote_id UUID REFERENCES public.quotes(id),

  -- OPPORTUNITY INFO
  opportunity_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- PROJECT DETAILS
  project_id UUID REFERENCES public.projects(id), -- When opportunity converts to active project
  project_type VARCHAR(100),
  scope_of_work TEXT,

  -- FINANCIAL
  contract_value DECIMAL(12,2) NOT NULL,
  estimated_costs DECIMAL(12,2),
  estimated_profit DECIMAL(12,2) GENERATED ALWAYS AS (contract_value - COALESCE(estimated_costs, 0)) STORED,
  profit_margin DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE WHEN contract_value > 0
    THEN (contract_value - COALESCE(estimated_costs, 0)) / contract_value
    ELSE 0 END
  ) STORED,

  -- TIMELINE
  start_date DATE,
  expected_completion_date DATE,
  actual_completion_date DATE,

  -- STATUS
  status VARCHAR(50) DEFAULT 'active', -- active, won, completed, on_hold, cancelled, lost
  stage VARCHAR(50), -- planning, permitting, construction, closeout
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),

  -- TEAM
  account_owner UUID REFERENCES auth.users(id),
  project_manager UUID REFERENCES auth.users(id),
  team_members UUID[],

  -- TRACKING
  win_date DATE,
  win_probability INTEGER CHECK (win_probability BETWEEN 0 AND 100),

  -- RISK FACTORS
  risk_level VARCHAR(20), -- low, medium, high
  risk_notes TEXT,

  -- METADATA
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_opportunities_user ON public.crm_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_contact ON public.crm_opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_lead ON public.crm_opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_status ON public.crm_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_project ON public.crm_opportunities(project_id);

-- ============================================================
-- 5. CRM EMAIL TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- TEMPLATE INFO
  template_name VARCHAR(255) NOT NULL,
  subject_line VARCHAR(500),
  body_html TEXT,
  body_plain TEXT,

  -- CATEGORIZATION
  category VARCHAR(50), -- follow_up, quote, proposal, thank_you, status_update
  is_system_template BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- USAGE
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- VARIABLES (for personalization)
  available_variables JSONB, -- {contact_name, project_name, quote_total, etc.}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_email_templates_user ON public.crm_email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_email_templates_category ON public.crm_email_templates(category);

-- ============================================================
-- 6. CRM NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- ASSOCIATIONS
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.crm_activities(id) ON DELETE CASCADE,

  -- NOTE CONTENT
  note_type VARCHAR(50) DEFAULT 'general', -- general, follow_up, meeting_notes, phone_call
  content TEXT NOT NULL,

  -- METADATA
  is_pinned BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false, -- Only visible to creator
  tags TEXT[],

  -- ATTACHMENTS
  attachments JSONB, -- [{filename, url, size, type}]

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_notes_contact ON public.crm_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_notes_lead ON public.crm_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_notes_created_by ON public.crm_notes(created_by);

-- ============================================================
-- 7. CRM PIPELINE STAGES (Customizable)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- STAGE INFO
  stage_name VARCHAR(100) NOT NULL,
  stage_key VARCHAR(50) NOT NULL, -- Unique identifier for queries
  description TEXT,

  -- CONFIGURATION
  stage_order INTEGER NOT NULL,
  probability_default INTEGER DEFAULT 50,

  -- VISUAL
  color VARCHAR(7), -- Hex color code
  icon VARCHAR(50),

  -- AUTOMATION
  auto_actions JSONB, -- Actions to take when lead enters this stage
  required_fields TEXT[], -- Fields that must be filled before moving to next stage

  -- STATUS
  is_active BOOLEAN DEFAULT true,
  is_system_stage BOOLEAN DEFAULT false, -- Can't be deleted

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, stage_key)
);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_user ON public.crm_pipeline_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_order ON public.crm_pipeline_stages(stage_order);

-- ============================================================
-- 8. CRM INTEGRATIONS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_integration_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- SYNC INFO
  integration_type VARCHAR(50), -- quickbooks, google_contacts, outlook, excel
  sync_direction VARCHAR(20), -- import, export, bidirectional

  -- RESULTS
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- STATUS
  status VARCHAR(20), -- running, completed, failed, partial
  error_message TEXT,
  error_details JSONB,

  -- TIMING
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- METADATA
  sync_config JSONB, -- Configuration used for this sync

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_sync_log_user ON public.crm_integration_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_log_type ON public.crm_integration_sync_log(integration_type);
CREATE INDEX IF NOT EXISTS idx_crm_sync_log_date ON public.crm_integration_sync_log(created_at DESC);

-- ============================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_integration_sync_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. RLS POLICIES
-- ============================================================

-- CONTACTS
DROP POLICY IF EXISTS "Users manage their contacts" ON public.crm_contacts;
CREATE POLICY "Users manage their contacts"
  ON public.crm_contacts FOR ALL
  USING (user_id = auth.uid());

-- LEADS
DROP POLICY IF EXISTS "Users manage their leads" ON public.crm_leads;
CREATE POLICY "Users manage their leads"
  ON public.crm_leads FOR ALL
  USING (user_id = auth.uid());

-- ACTIVITIES
DROP POLICY IF EXISTS "Users manage their activities" ON public.crm_activities;
CREATE POLICY "Users manage their activities"
  ON public.crm_activities FOR ALL
  USING (user_id = auth.uid());

-- OPPORTUNITIES
DROP POLICY IF EXISTS "Users manage their opportunities" ON public.crm_opportunities;
CREATE POLICY "Users manage their opportunities"
  ON public.crm_opportunities FOR ALL
  USING (user_id = auth.uid());

-- EMAIL TEMPLATES
DROP POLICY IF EXISTS "Users manage their templates" ON public.crm_email_templates;
CREATE POLICY "Users manage their templates"
  ON public.crm_email_templates FOR ALL
  USING (user_id = auth.uid() OR is_system_template = true);

-- NOTES
DROP POLICY IF EXISTS "Users view their notes" ON public.crm_notes;
CREATE POLICY "Users view their notes"
  ON public.crm_notes FOR SELECT
  USING (user_id = auth.uid() OR (created_by = auth.uid() AND is_private = false));

DROP POLICY IF EXISTS "Users create notes" ON public.crm_notes;
CREATE POLICY "Users create notes"
  ON public.crm_notes FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- PIPELINE STAGES
DROP POLICY IF EXISTS "Users manage their stages" ON public.crm_pipeline_stages;
CREATE POLICY "Users manage their stages"
  ON public.crm_pipeline_stages FOR ALL
  USING (user_id = auth.uid());

-- INTEGRATION LOG
DROP POLICY IF EXISTS "Users view sync log" ON public.crm_integration_sync_log;
CREATE POLICY "Users view sync log"
  ON public.crm_integration_sync_log FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- 11. GRANT PERMISSIONS
-- ============================================================
GRANT ALL ON public.crm_contacts TO authenticated;
GRANT ALL ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_opportunities TO authenticated;
GRANT ALL ON public.crm_email_templates TO authenticated;
GRANT ALL ON public.crm_notes TO authenticated;
GRANT ALL ON public.crm_pipeline_stages TO authenticated;
GRANT ALL ON public.crm_integration_sync_log TO authenticated;

-- ============================================================
-- 12. HELPER FUNCTIONS
-- ============================================================

-- Convert lead to opportunity
CREATE OR REPLACE FUNCTION convert_lead_to_opportunity(
  lead_id_param UUID,
  contract_value_param DECIMAL
)
RETURNS UUID AS $$
DECLARE
  opportunity_id UUID;
  lead_record RECORD;
BEGIN
  -- Get lead data
  SELECT * INTO lead_record
  FROM public.crm_leads
  WHERE id = lead_id_param;

  -- Create opportunity
  INSERT INTO public.crm_opportunities (
    user_id,
    lead_id,
    contact_id,
    quote_id,
    opportunity_name,
    description,
    project_type,
    contract_value,
    account_owner,
    win_date,
    status
  ) VALUES (
    lead_record.user_id,
    lead_record.id,
    lead_record.contact_id,
    lead_record.quote_id,
    lead_record.title,
    lead_record.description,
    lead_record.project_type,
    contract_value_param,
    lead_record.assigned_to,
    CURRENT_DATE,
    'won'
  ) RETURNING id INTO opportunity_id;

  -- Update lead
  UPDATE public.crm_leads
  SET
    stage = 'won',
    actual_close_date = CURRENT_DATE,
    is_active = false
  WHERE id = lead_id_param;

  RETURN opportunity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate pipeline metrics
CREATE OR REPLACE FUNCTION get_pipeline_metrics(user_id_param UUID)
RETURNS TABLE(
  total_leads INTEGER,
  total_value DECIMAL,
  weighted_value DECIMAL,
  avg_deal_size DECIMAL,
  win_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_leads,
    COALESCE(SUM(estimated_value), 0) as total_value,
    COALESCE(SUM(weighted_value), 0) as weighted_value,
    COALESCE(AVG(estimated_value), 0) as avg_deal_size,
    CASE
      WHEN COUNT(*) FILTER (WHERE stage IN ('won', 'lost')) > 0
      THEN COUNT(*) FILTER (WHERE stage = 'won')::DECIMAL / COUNT(*) FILTER (WHERE stage IN ('won', 'lost'))
      ELSE 0
    END as win_rate
  FROM public.crm_leads
  WHERE user_id = user_id_param
  AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 13. INSERT DEFAULT PIPELINE STAGES
-- ============================================================

-- These are inserted per user on account creation
-- For now, create a function to initialize stages

CREATE OR REPLACE FUNCTION initialize_crm_pipeline_stages(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.crm_pipeline_stages (user_id, stage_name, stage_key, stage_order, probability_default, color, is_system_stage)
  VALUES
    (user_id_param, 'New Lead', 'new', 1, 10, '#6B7280', true),
    (user_id_param, 'Contacted', 'contacted', 2, 20, '#3B82F6', true),
    (user_id_param, 'Qualified', 'qualified', 3, 40, '#8B5CF6', true),
    (user_id_param, 'Proposal Sent', 'proposal_sent', 4, 60, '#F59E0B', true),
    (user_id_param, 'Negotiation', 'negotiation', 5, 80, '#F97316', true),
    (user_id_param, 'Won', 'won', 6, 100, '#10B981', true),
    (user_id_param, 'Lost', 'lost', 7, 0, '#EF4444', true)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SETUP COMPLETE!
-- ============================================================

SELECT 'CRM Suite Database Schema Created Successfully!' as status,
       '8 tables created with construction-focused CRM capabilities' as details;
