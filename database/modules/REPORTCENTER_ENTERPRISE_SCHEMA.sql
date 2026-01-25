-- ============================================================
-- REPORTCENTER ENTERPRISE FEATURES - PHASE 3
-- Automation, Client Portal, Compliance, and Security
-- ============================================================

-- ============================================================
-- 1. REPORT AUTOMATION WORKFLOWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- WORKFLOW INFO
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- reporting, compliance, client_updates, internal

  -- TRIGGER CONFIGURATION
  trigger_type VARCHAR(50) NOT NULL, -- schedule, event, threshold, manual
  trigger_config JSONB NOT NULL,
  -- Structure for schedule: {
  --   frequency: 'daily' | 'weekly' | 'monthly',
  --   time: '17:00',
  --   days: [1,2,3,4,5] (for weekly)
  -- }
  -- Structure for event: {
  --   event: 'project_milestone' | 'task_complete' | 'budget_threshold',
  --   conditions: {...}
  -- }
  -- Structure for threshold: {
  --   metric: 'budget_variance' | 'schedule_delay',
  --   operator: 'greater_than' | 'less_than',
  --   value: 0.15
  -- }

  -- ACTIONS TO EXECUTE
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Array of actions:
  -- [
  --   {type: 'generate_report', template_id: 'uuid', project_id: 'uuid'},
  --   {type: 'send_email', recipients: ['email'], subject: '...'},
  --   {type: 'create_task', task_details: {...}},
  --   {type: 'update_project', project_id: 'uuid', updates: {...}}
  -- ]

  -- CONDITIONS (When to run)
  conditions JSONB DEFAULT '{}'::jsonb,
  -- {
  --   project_status: ['active', 'in_progress'],
  --   client_types: ['premium', 'vip'],
  --   date_ranges: {...}
  -- }

  -- EXECUTION TRACKING
  last_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20), -- success, failed, partial, skipped
  last_run_log TEXT,
  next_run_at TIMESTAMPTZ,
  last_error TEXT,

  -- ERROR HANDLING
  retry_on_failure BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,
  retry_count INTEGER DEFAULT 0,
  notify_on_failure BOOLEAN DEFAULT true,
  notification_emails TEXT[],

  -- STATUS
  is_active BOOLEAN DEFAULT true,
  is_paused BOOLEAN DEFAULT false,
  run_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,

  -- METADATA
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_user ON public.report_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON public.report_workflows(is_active, next_run_at);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger ON public.report_workflows(trigger_type);

-- ============================================================
-- 2. WORKFLOW EXECUTION HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES public.report_workflows(id) ON DELETE CASCADE NOT NULL,

  -- EXECUTION DETAILS
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status VARCHAR(20), -- running, success, failed, cancelled

  -- TRIGGER INFO
  triggered_by VARCHAR(50), -- schedule, manual, event, threshold
  triggered_by_user UUID REFERENCES auth.users(id),

  -- EXECUTION CONTEXT
  execution_context JSONB DEFAULT '{}'::jsonb,
  -- {project_id, client_id, trigger_value, etc.}

  -- RESULTS
  actions_executed JSONB DEFAULT '[]'::jsonb,
  -- [{action: 'generate_report', status: 'success', report_id: 'uuid'}]

  reports_generated UUID[], -- Array of report IDs created
  emails_sent INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,

  -- ERROR TRACKING
  error_message TEXT,
  error_stack TEXT,
  retry_attempt INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_date ON public.workflow_executions(started_at DESC);

-- ============================================================
-- 3. CLIENT PORTAL ACCESS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_portal_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- CLIENT INFO
  client_email VARCHAR(255) UNIQUE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_company VARCHAR(255),
  client_phone VARCHAR(50),

  -- ACCESS CREDENTIALS
  portal_username VARCHAR(255) UNIQUE,
  portal_password_hash TEXT,
  temporary_password BOOLEAN DEFAULT true,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMPTZ,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,

  -- PERMISSIONS
  allowed_report_types TEXT[], -- Which report types can see
  allowed_projects UUID[], -- Which projects can access
  view_only BOOLEAN DEFAULT true,
  can_download BOOLEAN DEFAULT true,
  can_comment BOOLEAN DEFAULT true,
  can_approve BOOLEAN DEFAULT false,
  can_request_changes BOOLEAN DEFAULT true,

  -- ACTIVITY TRACKING
  first_login_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,

  -- SETTINGS
  email_notifications BOOLEAN DEFAULT true,
  notification_frequency VARCHAR(20) DEFAULT 'immediate', -- immediate, daily, weekly
  preferred_language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'America/New_York',

  -- STATUS
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  verification_sent_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_portal_email ON public.client_portal_access(client_email);
CREATE INDEX IF NOT EXISTS idx_client_portal_username ON public.client_portal_access(portal_username);
CREATE INDEX IF NOT EXISTS idx_client_portal_user ON public.client_portal_access(user_id);

-- ============================================================
-- 4. CLIENT PORTAL ACTIVITY LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_portal_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_access_id UUID REFERENCES public.client_portal_access(id) ON DELETE CASCADE NOT NULL,

  -- ACTIVITY INFO
  activity_type VARCHAR(50), -- login, logout, view_report, download, comment, approve
  activity_details TEXT,

  -- CONTEXT
  report_id UUID REFERENCES public.reports(id),
  project_id UUID REFERENCES public.projects(id),

  -- METADATA
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50), -- desktop, mobile, tablet
  location JSONB, -- {country, city, lat, lon}

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_activity_access ON public.client_portal_activity(portal_access_id);
CREATE INDEX IF NOT EXISTS idx_portal_activity_type ON public.client_portal_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_portal_activity_date ON public.client_portal_activity(created_at DESC);

-- ============================================================
-- 5. COMPLIANCE & AUDIT TRAIL
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compliance_audit_trail (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- WHAT WAS CHANGED
  entity_type VARCHAR(50) NOT NULL, -- report, template, workflow, portal_access
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- created, updated, deleted, viewed, exported, approved

  -- WHO MADE THE CHANGE
  actor_type VARCHAR(20), -- user, system, client, workflow
  actor_id UUID,
  actor_name VARCHAR(255),
  actor_email VARCHAR(255),

  -- WHEN
  action_timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- NETWORK CONTEXT
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,

  -- CHANGE DETAILS
  previous_values JSONB,
  new_values JSONB,
  changes_summary TEXT,

  -- BUSINESS CONTEXT
  project_id UUID REFERENCES public.projects(id),
  client_id UUID,
  reason TEXT, -- Why the change was made

  -- DATA INTEGRITY
  checksum TEXT, -- Hash of the data for integrity verification
  previous_checksum TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON public.compliance_audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_actor ON public.compliance_audit_trail(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_date ON public.compliance_audit_trail(action_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_project ON public.compliance_audit_trail(project_id);

-- ============================================================
-- 6. REPORT EXPORT HISTORY (For tracking downloads)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- EXPORT DETAILS
  export_type VARCHAR(20) NOT NULL, -- pdf, excel, csv, json, powerbi
  export_format VARCHAR(50), -- A4, letter, landscape, portrait
  file_size_bytes INTEGER,
  file_hash TEXT, -- SHA256 hash for integrity

  -- WHO EXPORTED
  exported_by_type VARCHAR(20), -- user, client, system
  exported_by_id UUID,
  exported_by_name VARCHAR(255),
  exported_by_email VARCHAR(255),

  -- WHEN & WHERE
  exported_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  -- CLIENT EXPORTS
  client_portal_access_id UUID REFERENCES public.client_portal_access(id),

  -- WATERMARKING
  watermarked BOOLEAN DEFAULT false,
  watermark_text TEXT,
  watermark_config JSONB,

  -- FILE STORAGE
  file_url TEXT,
  storage_path TEXT,
  expires_at TIMESTAMPTZ, -- For temporary download links

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_exports_report ON public.report_exports(report_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_user ON public.report_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_date ON public.report_exports(exported_at DESC);

-- ============================================================
-- 7. REPORT APPROVAL WORKFLOWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- WORKFLOW CONFIGURATION
  workflow_type VARCHAR(50) DEFAULT 'single', -- single, sequential, parallel
  required_approvers JSONB NOT NULL,
  -- [
  --   {user_id: 'uuid', role: 'project_manager', order: 1},
  --   {user_id: 'uuid', role: 'client', order: 2}
  -- ]

  current_step INTEGER DEFAULT 1,
  total_steps INTEGER,

  -- APPROVALS RECEIVED
  approvals JSONB DEFAULT '[]'::jsonb,
  -- [
  --   {user_id: 'uuid', approved: true, approved_at: '...', comments: '...', signature: '...'}
  -- ]

  rejections JSONB DEFAULT '[]'::jsonb,

  -- STATUS
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, expired
  final_decision_at TIMESTAMPTZ,
  final_decision_by UUID REFERENCES auth.users(id),
  final_comments TEXT,

  -- NOTIFICATIONS
  next_reminder_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  escalation_level INTEGER DEFAULT 0,

  -- DEADLINES
  due_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_approvals_report ON public.report_approvals(report_id);
CREATE INDEX IF NOT EXISTS idx_report_approvals_status ON public.report_approvals(status);
CREATE INDEX IF NOT EXISTS idx_report_approvals_due ON public.report_approvals(due_date);

-- ============================================================
-- 8. COMPLIANCE CERTIFICATIONS TRACKER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compliance_certifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- CERTIFICATION INFO
  certification_name VARCHAR(255) NOT NULL,
  certification_type VARCHAR(100), -- OSHA, LEED, EPA, ISO, etc.
  certification_number VARCHAR(100),
  issuing_authority VARCHAR(255),

  -- RESPONSIBLE PARTY
  responsible_person_id UUID REFERENCES auth.users(id),
  responsible_person_name VARCHAR(255),
  responsible_person_email VARCHAR(255),

  -- DATES
  issue_date DATE,
  expiry_date DATE,
  renewal_date DATE,
  last_verified_date DATE,

  -- STATUS
  status VARCHAR(20), -- valid, expiring_soon, expired, pending_renewal
  is_active BOOLEAN DEFAULT true,

  -- DOCUMENTATION
  certificate_url TEXT,
  document_path TEXT,
  verification_url TEXT,

  -- RENEWAL TRACKING
  renewal_notification_sent BOOLEAN DEFAULT false,
  renewal_notification_sent_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT false,

  -- PROJECTS REQUIRING THIS CERTIFICATION
  required_for_projects UUID[],

  -- METADATA
  notes TEXT,
  tags TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certifications_user ON public.compliance_certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_certifications_expiry ON public.compliance_certifications(expiry_date);
CREATE INDEX IF NOT EXISTS idx_certifications_status ON public.compliance_certifications(status);

-- ============================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.report_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_certifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. RLS POLICIES
-- ============================================================

-- WORKFLOWS
DROP POLICY IF EXISTS "Users manage their workflows" ON public.report_workflows;
CREATE POLICY "Users manage their workflows"
  ON public.report_workflows FOR ALL
  USING (user_id = auth.uid());

-- WORKFLOW EXECUTIONS
DROP POLICY IF EXISTS "Users view their executions" ON public.workflow_executions;
CREATE POLICY "Users view their executions"
  ON public.workflow_executions FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM public.report_workflows WHERE user_id = auth.uid()
    )
  );

-- CLIENT PORTAL ACCESS
DROP POLICY IF EXISTS "Users manage client portal" ON public.client_portal_access;
CREATE POLICY "Users manage client portal"
  ON public.client_portal_access FOR ALL
  USING (user_id = auth.uid());

-- CLIENT PORTAL ACTIVITY
DROP POLICY IF EXISTS "Users view portal activity" ON public.client_portal_activity;
CREATE POLICY "Users view portal activity"
  ON public.client_portal_activity FOR SELECT
  USING (
    portal_access_id IN (
      SELECT id FROM public.client_portal_access WHERE user_id = auth.uid()
    )
  );

-- AUDIT TRAIL
DROP POLICY IF EXISTS "Users view audit trail" ON public.compliance_audit_trail;
CREATE POLICY "Users view audit trail"
  ON public.compliance_audit_trail FOR SELECT
  USING (user_id = auth.uid());

-- EXPORTS
DROP POLICY IF EXISTS "Users view exports" ON public.report_exports;
CREATE POLICY "Users view exports"
  ON public.report_exports FOR SELECT
  USING (user_id = auth.uid());

-- APPROVALS
DROP POLICY IF EXISTS "Users manage approvals" ON public.report_approvals;
CREATE POLICY "Users manage approvals"
  ON public.report_approvals FOR ALL
  USING (user_id = auth.uid());

-- CERTIFICATIONS
DROP POLICY IF EXISTS "Users manage certifications" ON public.compliance_certifications;
CREATE POLICY "Users manage certifications"
  ON public.compliance_certifications FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- 11. GRANT PERMISSIONS
-- ============================================================
GRANT ALL ON public.report_workflows TO authenticated;
GRANT ALL ON public.workflow_executions TO authenticated;
GRANT ALL ON public.client_portal_access TO authenticated;
GRANT ALL ON public.client_portal_activity TO authenticated;
GRANT ALL ON public.compliance_audit_trail TO authenticated;
GRANT ALL ON public.report_exports TO authenticated;
GRANT ALL ON public.report_approvals TO authenticated;
GRANT ALL ON public.compliance_certifications TO authenticated;

-- ============================================================
-- 12. ENTERPRISE FUNCTIONS
-- ============================================================

-- Execute workflow
CREATE OR REPLACE FUNCTION execute_workflow(workflow_id_param UUID)
RETURNS UUID AS $$
DECLARE
  execution_id UUID;
  workflow_record RECORD;
  action JSONB;
  report_id UUID;
BEGIN
  -- Get workflow
  SELECT * INTO workflow_record
  FROM public.report_workflows
  WHERE id = workflow_id_param
  AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workflow not found or inactive';
  END IF;

  -- Create execution record
  INSERT INTO public.workflow_executions (
    workflow_id,
    triggered_by,
    status
  ) VALUES (
    workflow_id_param,
    'manual',
    'running'
  ) RETURNING id INTO execution_id;

  -- Execute each action
  FOR action IN SELECT * FROM jsonb_array_elements(workflow_record.actions)
  LOOP
    -- Handle different action types
    IF action->>'type' = 'generate_report' THEN
      -- Generate report logic would go here
      -- For now, just log the action
      UPDATE public.workflow_executions
      SET actions_executed = actions_executed || jsonb_build_object(
        'action', 'generate_report',
        'status', 'success',
        'timestamp', NOW()
      )
      WHERE id = execution_id;
    END IF;
  END LOOP;

  -- Mark execution as complete
  UPDATE public.workflow_executions
  SET
    status = 'success',
    completed_at = NOW(),
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
  WHERE id = execution_id;

  -- Update workflow stats
  UPDATE public.report_workflows
  SET
    last_run_at = NOW(),
    last_run_status = 'success',
    run_count = run_count + 1,
    success_count = success_count + 1
  WHERE id = workflow_id_param;

  RETURN execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log audit trail
CREATE OR REPLACE FUNCTION log_audit_trail(
  entity_type_param VARCHAR,
  entity_id_param UUID,
  action_param VARCHAR,
  previous_values_param JSONB DEFAULT NULL,
  new_values_param JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.compliance_audit_trail (
    user_id,
    entity_type,
    entity_id,
    action,
    actor_type,
    actor_id,
    previous_values,
    new_values
  ) VALUES (
    auth.uid(),
    entity_type_param,
    entity_id_param,
    action_param,
    'user',
    auth.uid(),
    previous_values_param,
    new_values_param
  ) RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check certification expiry
CREATE OR REPLACE FUNCTION check_certification_expiry()
RETURNS TABLE(
  certification_id UUID,
  certification_name VARCHAR,
  expiry_date DATE,
  days_until_expiry INTEGER,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    certification_name,
    expiry_date,
    (expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry,
    CASE
      WHEN expiry_date < CURRENT_DATE THEN 'expired'
      WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
      ELSE 'valid'
    END::VARCHAR as status
  FROM public.compliance_certifications
  WHERE is_active = true
  AND user_id = auth.uid()
  ORDER BY expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SETUP COMPLETE!
-- ============================================================

SELECT 'ReportCenter Enterprise Schema Created Successfully!' as status,
       'Phase 3: Automation, Client Portal, Compliance, and Security' as phase;
