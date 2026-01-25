-- =====================================================
-- CLIENT COMMUNICATION TOOLS - DATABASE SCHEMA
-- =====================================================
-- Comprehensive database schema for contractor-facing
-- client communication and document generation tools
-- =====================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CLIENT REPORT TEMPLATES
-- =====================================================
-- Template library for generating client reports
-- Templates can be shared across company or kept private

CREATE TABLE IF NOT EXISTS public.client_report_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'weekly_update', 'financial_summary', 'project_completion', 'progress_report', 'custom'
  template_type VARCHAR(50) NOT NULL, -- 'report', 'proposal', 'presentation'

  -- Template content and structure
  content JSONB NOT NULL, -- Drag-and-drop layout configuration
  default_sections JSONB, -- Pre-configured sections
  branding JSONB, -- Colors, logos, fonts

  -- Sharing and visibility
  is_public BOOLEAN DEFAULT false,
  is_system_template BOOLEAN DEFAULT false, -- Built-in templates

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_client_report_templates_user ON public.client_report_templates(user_id);
CREATE INDEX idx_client_report_templates_company ON public.client_report_templates(company_id);
CREATE INDEX idx_client_report_templates_category ON public.client_report_templates(category);
CREATE INDEX idx_client_report_templates_public ON public.client_report_templates(is_public) WHERE is_public = true;

-- RLS Policies
ALTER TABLE public.client_report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates and public templates"
  ON public.client_report_templates FOR SELECT
  USING (user_id = auth.uid() OR is_public = true OR is_system_template = true);

CREATE POLICY "Users can create templates"
  ON public.client_report_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON public.client_report_templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON public.client_report_templates FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 2. GENERATED CLIENT DOCUMENTS
-- =====================================================
-- Tracks all documents generated for clients
-- Stores export URLs and sharing history

CREATE TABLE IF NOT EXISTS public.client_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.client_report_templates(id) ON DELETE SET NULL,

  -- Document details
  document_type VARCHAR(50) NOT NULL, -- 'report', 'proposal', 'presentation', 'selection_board', 'turnover_package'
  document_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Content and configuration
  content JSONB NOT NULL, -- Final document content
  configuration JSONB, -- Generation settings

  -- Export and sharing
  export_format VARCHAR(20), -- 'pdf', 'docx', 'pptx', 'jpg', 'png'
  export_url TEXT, -- Signed URL to exported file
  export_file_size BIGINT, -- File size in bytes

  -- Tracking
  generated_at TIMESTAMP DEFAULT NOW(),
  shared_at TIMESTAMP,
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP,

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'generated', 'shared', 'archived'

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_client_documents_user ON public.client_documents(user_id);
CREATE INDEX idx_client_documents_project ON public.client_documents(project_id);
CREATE INDEX idx_client_documents_template ON public.client_documents(template_id);
CREATE INDEX idx_client_documents_type ON public.client_documents(document_type);
CREATE INDEX idx_client_documents_status ON public.client_documents(status);

-- RLS Policies
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON public.client_documents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create documents"
  ON public.client_documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own documents"
  ON public.client_documents FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own documents"
  ON public.client_documents FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 3. DESIGN SELECTIONS
-- =====================================================
-- Material and design selections for client approval
-- Tracks client decisions on finishes, fixtures, etc.

CREATE TABLE IF NOT EXISTS public.design_selections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,

  -- Selection details
  category VARCHAR(100) NOT NULL, -- 'flooring', 'cabinets', 'countertops', 'fixtures', 'paint', 'tile', etc.
  room_location VARCHAR(100), -- 'kitchen', 'master_bath', 'living_room', etc.

  -- Product information
  option_name VARCHAR(200) NOT NULL,
  manufacturer VARCHAR(200),
  model VARCHAR(100),
  sku VARCHAR(100),
  color VARCHAR(100),
  finish VARCHAR(100),

  -- Pricing and availability
  price DECIMAL(12,2),
  upgrade_cost DECIMAL(12,2), -- Cost vs base option
  lead_time_days INTEGER,
  availability_status VARCHAR(50), -- 'in_stock', 'order_required', 'discontinued', 'backorder'

  -- Product details
  description TEXT,
  specifications JSONB,
  image_urls JSONB, -- Array of product image URLs
  brochure_url TEXT,

  -- Client decision tracking
  client_approved BOOLEAN DEFAULT false,
  approved_date DATE,
  approved_by VARCHAR(200), -- Client name
  decision_notes TEXT,

  -- Alternative options considered
  alternatives JSONB, -- Array of alternative products considered

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'ordered', 'received', 'installed'

  -- Installation details
  installation_date DATE,
  installer VARCHAR(200),

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_design_selections_user ON public.design_selections(user_id);
CREATE INDEX idx_design_selections_project ON public.design_selections(project_id);
CREATE INDEX idx_design_selections_category ON public.design_selections(category);
CREATE INDEX idx_design_selections_status ON public.design_selections(status);
CREATE INDEX idx_design_selections_approved ON public.design_selections(client_approved);

-- RLS Policies
ALTER TABLE public.design_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own selections"
  ON public.design_selections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create selections"
  ON public.design_selections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own selections"
  ON public.design_selections FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own selections"
  ON public.design_selections FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 4. CLIENT APPROVALS
-- =====================================================
-- Tracks approval requests and client signatures
-- Digital approval workflow for changes, selections, etc.

CREATE TABLE IF NOT EXISTS public.client_approvals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,

  -- Approval details
  approval_type VARCHAR(50) NOT NULL, -- 'change_order', 'design_selection', 'payment', 'schedule_change', 'scope_change', 'final_walkthrough'
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- Document reference
  document_url TEXT, -- PDF or image of document requiring approval
  related_entity_type VARCHAR(50), -- 'change_order', 'design_selection', 'quote', etc.
  related_entity_id UUID,

  -- Financial impact
  cost_impact DECIMAL(12,2),
  schedule_impact_days INTEGER,

  -- Approval workflow
  requested_from VARCHAR(200) NOT NULL, -- Client name/email
  requested_at TIMESTAMP DEFAULT NOW(),
  due_date DATE,

  -- Response tracking
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
  responded_at TIMESTAMP,
  response_notes TEXT,

  -- Digital signature
  signature_data TEXT, -- Base64 signature image or digital signature token
  signature_ip_address INET,
  signature_timestamp TIMESTAMP,

  -- Annotations and comments
  annotations JSONB, -- Client markups/comments on document

  -- Reminder tracking
  reminder_sent_at TIMESTAMP,
  reminder_count INTEGER DEFAULT 0,

  -- Audit trail
  approved_by VARCHAR(200),
  approval_method VARCHAR(50), -- 'digital_signature', 'email_confirmation', 'in_person'

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_client_approvals_user ON public.client_approvals(user_id);
CREATE INDEX idx_client_approvals_project ON public.client_approvals(project_id);
CREATE INDEX idx_client_approvals_type ON public.client_approvals(approval_type);
CREATE INDEX idx_client_approvals_status ON public.client_approvals(status);
CREATE INDEX idx_client_approvals_pending ON public.client_approvals(status) WHERE status = 'pending';

-- RLS Policies
ALTER TABLE public.client_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own approvals"
  ON public.client_approvals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create approval requests"
  ON public.client_approvals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own approvals"
  ON public.client_approvals FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own approvals"
  ON public.client_approvals FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 5. PROJECT TURNOVER PACKAGES
-- =====================================================
-- Final project delivery documentation
-- Warranties, manuals, as-builts, maintenance schedules

CREATE TABLE IF NOT EXISTS public.project_turnover_packages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,

  -- Package details
  package_name VARCHAR(200) NOT NULL,
  package_type VARCHAR(50) DEFAULT 'complete', -- 'complete', 'interim', 'warranty_only'

  -- Document sections
  warranty_documents JSONB, -- Array of warranty docs
  maintenance_schedules JSONB, -- Maintenance calendar
  asbuilt_drawings JSONB, -- As-built documentation
  owner_manuals JSONB, -- Product manuals
  inspection_reports JSONB, -- Final inspection docs
  permits_certificates JSONB, -- Building permits, certificates of occupancy

  -- Contact information
  emergency_contacts JSONB,
  subcontractor_contacts JSONB,
  supplier_contacts JSONB,

  -- Customization
  custom_sections JSONB, -- Additional custom sections
  branding JSONB, -- Company branding

  -- Export and delivery
  generated_pdf_url TEXT,
  package_size_bytes BIGINT,

  -- Delivery tracking
  delivered_to VARCHAR(200), -- Client name
  delivered_at TIMESTAMP,
  delivery_method VARCHAR(50), -- 'email', 'usb_drive', 'cloud_link', 'printed_binder'
  delivery_signature TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'review', 'approved', 'delivered'

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_turnover_packages_user ON public.project_turnover_packages(user_id);
CREATE INDEX idx_turnover_packages_project ON public.project_turnover_packages(project_id);
CREATE INDEX idx_turnover_packages_status ON public.project_turnover_packages(status);

-- RLS Policies
ALTER TABLE public.project_turnover_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own turnover packages"
  ON public.project_turnover_packages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create turnover packages"
  ON public.project_turnover_packages FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own turnover packages"
  ON public.project_turnover_packages FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own turnover packages"
  ON public.project_turnover_packages FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 6. COMMUNICATION TEMPLATES
-- =====================================================
-- Reusable email and communication templates
-- For client updates, meeting agendas, etc.

CREATE TABLE IF NOT EXISTS public.communication_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID,

  -- Template details
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'email', 'meeting_agenda', 'presentation', 'update', 'feedback_form'

  -- Content
  subject_line VARCHAR(500), -- For email templates
  body_content TEXT NOT NULL,
  html_content TEXT, -- Rich HTML version

  -- Personalization
  merge_fields JSONB, -- Available merge fields (project_name, client_name, etc.)

  -- Scheduling
  is_scheduled_template BOOLEAN DEFAULT false,
  schedule_frequency VARCHAR(50), -- 'weekly', 'biweekly', 'monthly', 'milestone_based'

  -- Sharing
  is_public BOOLEAN DEFAULT false,
  is_system_template BOOLEAN DEFAULT false,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,

  -- Attachments
  default_attachments JSONB, -- Array of default attachment references

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_communication_templates_user ON public.communication_templates(user_id);
CREATE INDEX idx_communication_templates_company ON public.communication_templates(company_id);
CREATE INDEX idx_communication_templates_category ON public.communication_templates(category);
CREATE INDEX idx_communication_templates_public ON public.communication_templates(is_public) WHERE is_public = true;

-- RLS Policies
ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates and public templates"
  ON public.communication_templates FOR SELECT
  USING (user_id = auth.uid() OR is_public = true OR is_system_template = true);

CREATE POLICY "Users can create templates"
  ON public.communication_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON public.communication_templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON public.communication_templates FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 7. CLIENT COMMUNICATIONS LOG
-- =====================================================
-- Tracks all communications sent to clients
-- Audit trail and engagement analytics

CREATE TABLE IF NOT EXISTS public.client_communications_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.communication_templates(id) ON DELETE SET NULL,

  -- Communication details
  communication_type VARCHAR(50) NOT NULL, -- 'email', 'meeting', 'phone_call', 'site_visit', 'presentation'
  subject VARCHAR(500),
  content TEXT,

  -- Recipients
  sent_to JSONB NOT NULL, -- Array of recipient emails/names
  cc JSONB, -- CC recipients

  -- Engagement tracking
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  replied_at TIMESTAMP,

  -- Attachments
  attachments JSONB, -- Array of attachment references

  -- Follow-up
  requires_followup BOOLEAN DEFAULT false,
  followup_date DATE,
  followup_completed BOOLEAN DEFAULT false,

  -- Response
  client_response TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'sent', -- 'draft', 'scheduled', 'sent', 'delivered', 'failed'

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_communications_log_user ON public.client_communications_log(user_id);
CREATE INDEX idx_communications_log_project ON public.client_communications_log(project_id);
CREATE INDEX idx_communications_log_type ON public.client_communications_log(communication_type);
CREATE INDEX idx_communications_log_sent_at ON public.client_communications_log(sent_at DESC);

-- RLS Policies
ALTER TABLE public.client_communications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own communications"
  ON public.client_communications_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create communications"
  ON public.client_communications_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own communications"
  ON public.client_communications_log FOR UPDATE
  USING (user_id = auth.uid());

-- =====================================================
-- 8. PROPOSAL SECTIONS
-- =====================================================
-- Reusable proposal sections and content blocks
-- Build professional proposals from modular sections

CREATE TABLE IF NOT EXISTS public.proposal_sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID,

  -- Section details
  section_name VARCHAR(200) NOT NULL,
  section_type VARCHAR(50) NOT NULL, -- 'cover_page', 'team_intro', 'project_approach', 'timeline', 'investment', 'terms', 'testimonials', 'custom'

  -- Content
  content TEXT NOT NULL,
  html_content TEXT,

  -- Layout
  layout_config JSONB, -- Column layout, image placement, etc.

  -- Media
  images JSONB, -- Array of image references
  videos JSONB, -- Array of video references

  -- Sharing
  is_public BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false, -- Default section for this type

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_proposal_sections_user ON public.proposal_sections(user_id);
CREATE INDEX idx_proposal_sections_company ON public.proposal_sections(company_id);
CREATE INDEX idx_proposal_sections_type ON public.proposal_sections(section_type);

-- RLS Policies
ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sections and public sections"
  ON public.proposal_sections FOR SELECT
  USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can create sections"
  ON public.proposal_sections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sections"
  ON public.proposal_sections FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sections"
  ON public.proposal_sections FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 9. BRAND ASSETS
-- =====================================================
-- Company branding assets for white-label documents
-- Enterprise tier feature

CREATE TABLE IF NOT EXISTS public.brand_assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID NOT NULL,

  -- Asset details
  asset_type VARCHAR(50) NOT NULL, -- 'logo', 'letterhead', 'color_scheme', 'font_set', 'email_signature'
  asset_name VARCHAR(200) NOT NULL,

  -- Files
  file_url TEXT,
  thumbnail_url TEXT,
  file_size BIGINT,
  file_format VARCHAR(20),

  -- Design properties
  colors JSONB, -- Primary, secondary, accent colors
  fonts JSONB, -- Font families for different uses

  -- Usage settings
  is_primary BOOLEAN DEFAULT false,
  usage_context JSONB, -- Where this asset is used (proposals, reports, emails, etc.)

  -- Dimensions (for images)
  width INTEGER,
  height INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_brand_assets_user ON public.brand_assets(user_id);
CREATE INDEX idx_brand_assets_company ON public.brand_assets(company_id);
CREATE INDEX idx_brand_assets_type ON public.brand_assets(asset_type);
CREATE INDEX idx_brand_assets_primary ON public.brand_assets(is_primary) WHERE is_primary = true;

-- RLS Policies
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's brand assets"
  ON public.brand_assets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create brand assets"
  ON public.brand_assets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their company's brand assets"
  ON public.brand_assets FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their company's brand assets"
  ON public.brand_assets FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_client_report_templates_updated_at BEFORE UPDATE ON public.client_report_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_documents_updated_at BEFORE UPDATE ON public.client_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_design_selections_updated_at BEFORE UPDATE ON public.design_selections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_approvals_updated_at BEFORE UPDATE ON public.client_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_turnover_packages_updated_at BEFORE UPDATE ON public.project_turnover_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communication_templates_updated_at BEFORE UPDATE ON public.communication_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proposal_sections_updated_at BEFORE UPDATE ON public.proposal_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brand_assets_updated_at BEFORE UPDATE ON public.brand_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL SYSTEM TEMPLATES
-- =====================================================
-- Insert default templates for common use cases

-- Weekly Progress Report Template
INSERT INTO public.client_report_templates (user_id, name, description, category, template_type, content, is_system_template, is_public) VALUES
(
  '00000000-0000-0000-0000-000000000000'::uuid, -- System user
  'Weekly Progress Report',
  'Standard weekly update with photos, schedule, and budget summary',
  'weekly_update',
  'report',
  '{
    "sections": [
      {"type": "header", "title": "Weekly Progress Report"},
      {"type": "summary", "label": "Executive Summary"},
      {"type": "photos", "label": "Progress Photos", "count": 6},
      {"type": "schedule", "label": "Schedule Update"},
      {"type": "budget", "label": "Budget Summary"},
      {"type": "upcoming", "label": "Next Week''s Activities"}
    ]
  }'::jsonb,
  true,
  true
)
ON CONFLICT DO NOTHING;

-- Financial Summary Template
INSERT INTO public.client_report_templates (user_id, name, description, category, template_type, content, is_system_template, is_public) VALUES
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Financial Summary',
  'Detailed financial report with budget breakdown and change orders',
  'financial_summary',
  'report',
  '{
    "sections": [
      {"type": "header", "title": "Project Financial Summary"},
      {"type": "budget_overview", "label": "Budget Overview"},
      {"type": "change_orders", "label": "Change Orders"},
      {"type": "payment_schedule", "label": "Payment Schedule"},
      {"type": "cost_breakdown", "label": "Cost Breakdown by Category"}
    ]
  }'::jsonb,
  true,
  true
)
ON CONFLICT DO NOTHING;

-- Project Completion Report Template
INSERT INTO public.client_report_templates (user_id, name, description, category, template_type, content, is_system_template, is_public) VALUES
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Project Completion Report',
  'Final project summary with before/after photos and final financials',
  'project_completion',
  'report',
  '{
    "sections": [
      {"type": "header", "title": "Project Completion Report"},
      {"type": "before_after", "label": "Before & After"},
      {"type": "final_photos", "label": "Final Photos", "count": 12},
      {"type": "final_budget", "label": "Final Budget Summary"},
      {"type": "timeline_review", "label": "Timeline Review"},
      {"type": "warranty_info", "label": "Warranty Information"}
    ]
  }'::jsonb,
  true,
  true
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- View for document generation statistics
CREATE OR REPLACE VIEW public.document_generation_stats AS
SELECT
  user_id,
  document_type,
  COUNT(*) as total_documents,
  COUNT(CASE WHEN status = 'shared' THEN 1 END) as shared_documents,
  SUM(download_count) as total_downloads,
  AVG(export_file_size) as avg_file_size,
  MAX(generated_at) as last_generated
FROM public.client_documents
GROUP BY user_id, document_type;

-- View for approval workflow metrics
CREATE OR REPLACE VIEW public.approval_metrics AS
SELECT
  user_id,
  project_id,
  approval_type,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  AVG(EXTRACT(EPOCH FROM (responded_at - requested_at))/86400) as avg_response_days
FROM public.client_approvals
GROUP BY user_id, project_id, approval_type;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.client_report_templates IS 'Template library for generating professional client reports and documents';
COMMENT ON TABLE public.client_documents IS 'Generated client-facing documents with export and sharing tracking';
COMMENT ON TABLE public.design_selections IS 'Material and design selections for client approval workflow';
COMMENT ON TABLE public.client_approvals IS 'Digital approval requests and signature tracking';
COMMENT ON TABLE public.project_turnover_packages IS 'Final project delivery documentation packages';
COMMENT ON TABLE public.communication_templates IS 'Reusable email and communication templates';
COMMENT ON TABLE public.client_communications_log IS 'Audit trail of all client communications';
COMMENT ON TABLE public.proposal_sections IS 'Modular sections for building professional proposals';
COMMENT ON TABLE public.brand_assets IS 'Company branding assets for white-label documents';

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLIENT COMMUNICATION TOOLS SCHEMA';
  RAISE NOTICE 'Installation Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables Created: 9';
  RAISE NOTICE 'Indexes Created: 40+';
  RAISE NOTICE 'RLS Policies: Enabled on all tables';
  RAISE NOTICE 'System Templates: 3 installed';
  RAISE NOTICE 'Views: 2 reporting views';
  RAISE NOTICE '========================================';
END $$;
