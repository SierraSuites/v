-- ============================================================================
-- MODULE 13: COMPLIANCE & SAFETY MANAGEMENT
-- Sierra Suites Construction Management Platform
-- Created: February 17, 2026
-- ============================================================================
-- Features:
--   - Safety incident reporting (OSHA-compliant)
--   - OSHA 300 Log (auto-populated, exportable)
--   - Daily safety briefings (toolbox talks)
--   - Certification & license tracking (expiration alerts)
--   - Inspection scheduling (building, fire, OSHA)
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENSURE update_updated_at_column() EXISTS
-- (Already defined in earlier migrations, but redefined here for safety)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE 1: safety_incidents
-- Full OSHA-compliant incident tracking. Severity determines recordability.
-- 'near_miss' = not recordable | 'recordable'+ = goes on OSHA 300 log.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  -- Auto-generated: INC-2026-001, INC-2026-002, ... (scoped per company)
  incident_number VARCHAR(50),

  -- When it happened vs when reported
  occurred_at TIMESTAMPTZ NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location TEXT NOT NULL,

  -- OSHA severity ladder
  severity TEXT NOT NULL CHECK (severity IN (
    'near_miss',        -- Not recordable, but track for prevention
    'first_aid',        -- First aid only, not recordable
    'medical_treatment',-- Recordable
    'recordable',       -- OSHA 300 log required
    'lost_time',        -- DART case - days away from work
    'fatality'          -- Report to OSHA within 8 hours
  )),

  -- OSHA recordability
  is_osha_recordable BOOLEAN DEFAULT false,
  is_dart_case BOOLEAN DEFAULT false,
  days_away_from_work INT DEFAULT 0,
  days_job_transfer_restriction INT DEFAULT 0,

  -- Incident classification (OSHA Form 300 columns)
  incident_type TEXT NOT NULL CHECK (incident_type IN ('injury', 'illness', 'near_miss')),
  injury_type TEXT,         -- laceration, fracture, sprain, burn, etc.
  body_part_affected TEXT,  -- hand, back, head, eye, etc.
  event_type TEXT,          -- fall_same_level, struck_by, electrical, etc.

  -- Environmental context
  weather_conditions TEXT,
  lighting_conditions TEXT,
  work_surface_condition TEXT,

  -- Injured person
  employee_name VARCHAR(255),
  employee_id UUID REFERENCES auth.users(id),
  employee_job_title VARCHAR(255),
  employee_age INT,
  employee_experience_years DECIMAL(4,1),
  employee_hire_date DATE,

  -- PPE (critical for OSHA root cause analysis)
  ppe_required TEXT[],
  ppe_worn TEXT[],
  ppe_adequate BOOLEAN,

  -- Narrative
  description TEXT NOT NULL,
  what_employee_doing TEXT,
  how_injury_occurred TEXT,
  object_or_substance TEXT,

  -- Medical treatment
  medical_treatment_provided TEXT CHECK (medical_treatment_provided IN (
    'none', 'first_aid', 'emergency_room', 'hospitalized', 'physician_office'
  )),
  medical_facility_name VARCHAR(255),
  physician_name VARCHAR(255),
  diagnosis TEXT,
  treatment_notes TEXT,

  -- Return-to-work
  expected_return_date DATE,
  actual_return_date DATE,
  restrictions_on_return TEXT,

  -- Root cause analysis (5-Why / Fishbone)
  immediate_causes TEXT[],
  root_causes TEXT[],
  contributing_factors TEXT[],

  -- Corrective actions
  immediate_actions_taken TEXT,
  corrective_actions TEXT,
  preventive_measures TEXT,
  responsible_party UUID REFERENCES auth.users(id),
  action_completion_date DATE,
  action_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,

  -- Witnesses: [{name, user_id, statement, contact}]
  witnesses JSONB DEFAULT '[]'::jsonb,

  -- Documentation
  photos TEXT[],
  documents TEXT[],
  incident_report_url TEXT,

  -- Investigation
  investigated_by UUID REFERENCES auth.users(id),
  investigation_date DATE,
  investigation_notes TEXT,
  investigation_complete BOOLEAN DEFAULT false,

  -- OSHA reporting
  reported_to_osha BOOLEAN DEFAULT false,
  osha_report_date DATE,
  osha_case_number VARCHAR(100),
  osha_form_300_entry_id UUID,

  -- Follow-up
  follow_up_required BOOLEAN DEFAULT true,
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT false,
  follow_up_notes TEXT,

  -- Status lifecycle
  status TEXT DEFAULT 'open' CHECK (status IN (
    'open', 'investigating', 'pending_action', 'closed'
  )),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),

  -- Metadata
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Incident numbers are unique per company (not globally) to support multi-tenancy
  UNIQUE(company_id, incident_number)
);

CREATE INDEX IF NOT EXISTS idx_safety_incidents_company_date
  ON public.safety_incidents(company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_project
  ON public.safety_incidents(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_safety_incidents_severity
  ON public.safety_incidents(company_id, severity);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_recordable
  ON public.safety_incidents(company_id, is_osha_recordable);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_status
  ON public.safety_incidents(company_id, status);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_number
  ON public.safety_incidents(incident_number);

-- ============================================================================
-- TABLE 2: osha_300_log
-- The legal OSHA Form 300. Auto-populated from recordable incidents.
-- Must be retained 5 years per OSHA 29 CFR 1904.33.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.osha_300_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES public.safety_incidents(id) ON DELETE CASCADE,

  -- Sequential case number within year (OSHA requirement)
  case_number VARCHAR(50) NOT NULL,
  year INT NOT NULL,

  -- OSHA Form 300: Columns A/B - Employee info
  employee_name VARCHAR(255) NOT NULL,
  employee_job_title VARCHAR(255) NOT NULL,

  -- OSHA Form 300: Columns C/D - When/Where
  incident_date DATE NOT NULL,
  where_event_occurred TEXT NOT NULL,

  -- OSHA Form 300: Column E - Injury/Illness type
  injury_or_illness TEXT NOT NULL CHECK (injury_or_illness IN (
    'injury', 'skin_disorder', 'respiratory',
    'poisoning', 'hearing_loss', 'all_other_illness'
  )),
  description TEXT NOT NULL,

  -- OSHA Form 300: Columns F-J - Classification checkboxes
  death BOOLEAN DEFAULT false,
  days_away_from_work BOOLEAN DEFAULT false,
  job_transfer_restriction BOOLEAN DEFAULT false,
  other_recordable_case BOOLEAN DEFAULT false,

  -- OSHA Form 300: Columns K/L - Day counts
  number_of_days_away INT DEFAULT 0,
  number_of_days_job_transfer INT DEFAULT 0,

  -- Privacy case: certain injuries require name redaction
  is_privacy_case BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(company_id, case_number, year)
);

CREATE INDEX IF NOT EXISTS idx_osha_300_company_year
  ON public.osha_300_log(company_id, year DESC);
CREATE INDEX IF NOT EXISTS idx_osha_300_incident
  ON public.osha_300_log(incident_id);

-- ============================================================================
-- TABLE 3: safety_briefings
-- Daily pre-work safety meetings required on all OSHA construction sites.
-- Tracks topics, PPE, hazards, weather, crew attendance, and signatures.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.safety_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- When and who
  briefing_date DATE NOT NULL,
  start_time TIME,
  duration_minutes INT,
  conducted_by UUID NOT NULL REFERENCES auth.users(id),
  location TEXT,

  -- Weather context (affects PPE and hazard requirements)
  temperature_f INT,
  weather_description TEXT,
  weather_alerts TEXT[],

  -- Work plan
  work_description TEXT NOT NULL,
  work_locations TEXT[],
  equipment_in_use TEXT[],

  -- Safety content
  hazards_identified TEXT[] NOT NULL DEFAULT '{}',
  topics_covered TEXT[] NOT NULL DEFAULT '{}',
  toolbox_talk_topic VARCHAR(255),
  toolbox_talk_duration_minutes INT,
  toolbox_talk_materials_used TEXT[],

  -- PPE requirements for the day's work
  ppe_required TEXT[] NOT NULL DEFAULT '{}',

  -- Emergency info (verified daily)
  emergency_assembly_point TEXT,
  first_aid_station_location TEXT,
  fire_extinguisher_locations TEXT[],
  emergency_contact_numbers JSONB DEFAULT '{}'::jsonb,

  -- Attendance: [{user_id, name, job_title, signature_url, signed_at, confirmed}]
  attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_attendees INT DEFAULT 0,

  -- Documentation
  photos TEXT[],
  briefing_form_url TEXT,
  notes TEXT,

  -- Completion
  all_workers_signed BOOLEAN DEFAULT false,
  missing_signatures TEXT[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_briefings_project_date
  ON public.safety_briefings(project_id, briefing_date DESC);
CREATE INDEX IF NOT EXISTS idx_safety_briefings_company_date
  ON public.safety_briefings(company_id, briefing_date DESC);
CREATE INDEX IF NOT EXISTS idx_safety_briefings_date
  ON public.safety_briefings(briefing_date DESC);
CREATE INDEX IF NOT EXISTS idx_safety_briefings_conductor
  ON public.safety_briefings(conducted_by);

-- ============================================================================
-- TABLE 4: certifications
-- Tracks company licenses, insurance, employee OSHA training, equipment certs.
-- Sends expiration alerts at 60, 30, and 7 days before expiration.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Type of certification
  certification_type TEXT NOT NULL CHECK (certification_type IN (
    'company_license', 'insurance', 'bond', 'osha_training',
    'equipment_cert', 'trade_license', 'professional_cert', 'other'
  )),

  -- Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  issuing_authority VARCHAR(255),
  certification_number VARCHAR(100),

  -- Who holds this cert
  holder_type TEXT NOT NULL CHECK (holder_type IN (
    'company', 'employee', 'equipment', 'subcontractor'
  )),
  holder_id UUID,
  holder_name VARCHAR(255),

  -- Validity window
  issue_date DATE,
  expiration_date DATE,
  renewal_required BOOLEAN DEFAULT true,
  renewal_period_days INT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Cost tracking
  cost DECIMAL(10,2),
  renewal_cost DECIMAL(10,2),

  -- Alert thresholds (days before expiration)
  alert_days_before INT DEFAULT 60,
  alert_sent BOOLEAN DEFAULT false,
  alert_sent_at TIMESTAMPTZ,
  reminder_60_days BOOLEAN DEFAULT false,
  reminder_30_days BOOLEAN DEFAULT false,
  reminder_7_days BOOLEAN DEFAULT false,

  -- Renewal requirements
  requirements TEXT,
  training_required TEXT,
  exam_required BOOLEAN DEFAULT false,

  -- Documents
  certificate_url TEXT,
  documents TEXT[],

  -- Notes
  compliance_notes TEXT,
  required_for_projects BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_certifications_company
  ON public.certifications(company_id);
CREATE INDEX IF NOT EXISTS idx_certifications_holder
  ON public.certifications(company_id, holder_type, holder_id);
CREATE INDEX IF NOT EXISTS idx_certifications_expiration
  ON public.certifications(expiration_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_certifications_type
  ON public.certifications(company_id, certification_type);

-- ============================================================================
-- TABLE 5: inspections
-- Building department, fire marshal, OSHA inspections.
-- Includes prep checklists, deficiency tracking, re-inspection scheduling.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Type of inspection
  inspection_type TEXT NOT NULL CHECK (inspection_type IN (
    'building_code', 'electrical', 'plumbing', 'mechanical',
    'structural', 'fire_safety', 'osha', 'final', 'other'
  )),
  inspection_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Inspector info
  inspector_name VARCHAR(255),
  inspector_agency VARCHAR(255),
  inspector_contact VARCHAR(255),
  inspector_email VARCHAR(255),
  inspector_phone VARCHAR(50),

  -- Preparation
  required_documentation TEXT[],
  required_on_site TEXT[],
  -- prep_checklist: [{item: string, completed: boolean}]
  prep_checklist JSONB DEFAULT '[]'::jsonb,

  -- Status lifecycle
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'in_progress', 'passed',
    'passed_with_conditions', 'failed', 'cancelled', 'rescheduled'
  )),

  -- Results (filled in after inspection)
  inspection_date DATE,
  result TEXT CHECK (result IN (
    'passed', 'passed_with_conditions', 'failed', 'partial'
  )),
  inspector_notes TEXT,
  conditions_of_approval TEXT,

  -- Deficiencies: [{item, location, code_section, severity, corrected, corrected_date, photo}]
  deficiencies JSONB DEFAULT '[]'::jsonb,

  -- Re-inspection tracking
  reinspection_required BOOLEAN DEFAULT false,
  reinspection_deadline DATE,
  reinspection_scheduled_date DATE,
  reinspection_id UUID REFERENCES public.inspections(id),

  -- Documents
  inspection_report_url TEXT,
  photos TEXT[],
  documents TEXT[],
  certificate_of_occupancy_url TEXT,

  -- Notifications
  notify_before_days INT DEFAULT 3,
  notifications_sent JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspections_project_date
  ON public.inspections(project_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_company
  ON public.inspections(company_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status
  ON public.inspections(company_id, status);
CREATE INDEX IF NOT EXISTS idx_inspections_date
  ON public.inspections(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_inspections_type
  ON public.inspections(company_id, inspection_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Company-isolated: users only see data belonging to their company.
-- Pattern matches all other modules (financial, teams, etc.)
-- ============================================================================

ALTER TABLE public.safety_incidents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osha_300_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_briefings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections       ENABLE ROW LEVEL SECURITY;

-- safety_incidents policies
DROP POLICY IF EXISTS safety_incidents_select_policy ON public.safety_incidents;
CREATE POLICY safety_incidents_select_policy ON public.safety_incidents
  FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS safety_incidents_insert_policy ON public.safety_incidents;
CREATE POLICY safety_incidents_insert_policy ON public.safety_incidents
  FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS safety_incidents_update_policy ON public.safety_incidents;
CREATE POLICY safety_incidents_update_policy ON public.safety_incidents
  FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS safety_incidents_delete_policy ON public.safety_incidents;
CREATE POLICY safety_incidents_delete_policy ON public.safety_incidents
  FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

-- osha_300_log policies
DROP POLICY IF EXISTS osha_300_log_select_policy ON public.osha_300_log;
CREATE POLICY osha_300_log_select_policy ON public.osha_300_log
  FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS osha_300_log_insert_policy ON public.osha_300_log;
CREATE POLICY osha_300_log_insert_policy ON public.osha_300_log
  FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS osha_300_log_update_policy ON public.osha_300_log;
CREATE POLICY osha_300_log_update_policy ON public.osha_300_log
  FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

-- safety_briefings policies
DROP POLICY IF EXISTS safety_briefings_select_policy ON public.safety_briefings;
CREATE POLICY safety_briefings_select_policy ON public.safety_briefings
  FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS safety_briefings_insert_policy ON public.safety_briefings;
CREATE POLICY safety_briefings_insert_policy ON public.safety_briefings
  FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS safety_briefings_update_policy ON public.safety_briefings;
CREATE POLICY safety_briefings_update_policy ON public.safety_briefings
  FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS safety_briefings_delete_policy ON public.safety_briefings;
CREATE POLICY safety_briefings_delete_policy ON public.safety_briefings
  FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

-- certifications policies
DROP POLICY IF EXISTS certifications_select_policy ON public.certifications;
CREATE POLICY certifications_select_policy ON public.certifications
  FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS certifications_insert_policy ON public.certifications;
CREATE POLICY certifications_insert_policy ON public.certifications
  FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS certifications_update_policy ON public.certifications;
CREATE POLICY certifications_update_policy ON public.certifications
  FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS certifications_delete_policy ON public.certifications;
CREATE POLICY certifications_delete_policy ON public.certifications
  FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

-- inspections policies
DROP POLICY IF EXISTS inspections_select_policy ON public.inspections;
CREATE POLICY inspections_select_policy ON public.inspections
  FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS inspections_insert_policy ON public.inspections;
CREATE POLICY inspections_insert_policy ON public.inspections
  FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS inspections_update_policy ON public.inspections;
CREATE POLICY inspections_update_policy ON public.inspections
  FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS inspections_delete_policy ON public.inspections;
CREATE POLICY inspections_delete_policy ON public.inspections
  FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-generate sequential incident numbers: INC-YYYY-NNN
CREATE OR REPLACE FUNCTION generate_incident_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_year VARCHAR(4);
  v_seq  INT;
BEGIN
  -- Serialize concurrent calls for the same company to prevent duplicate numbers.
  -- pg_advisory_xact_lock is released automatically at transaction end.
  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::text || '_incidents'));

  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

  -- Extract trailing digits from existing incident numbers for this company/year.
  -- SUBSTRING with capturing group returns the matched group content.
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(incident_number FROM '(\d+)$') AS INT)), 0
  ) + 1
  INTO v_seq
  FROM public.safety_incidents
  WHERE company_id = p_company_id
    AND incident_number LIKE 'INC-' || v_year || '-%';

  RETURN 'INC-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger: assign incident number on INSERT
CREATE OR REPLACE FUNCTION set_incident_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.incident_number IS NULL OR NEW.incident_number = '' THEN
    NEW.incident_number := generate_incident_number(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_set_incident_number'
  ) THEN
    CREATE TRIGGER trg_set_incident_number
      BEFORE INSERT ON public.safety_incidents
      FOR EACH ROW
      EXECUTE FUNCTION set_incident_number();
  END IF;
END$$;

-- DART Rate = (DART cases × 200,000) / total hours worked
-- Industry average: 3.2 | Goal: < 2.0
CREATE OR REPLACE FUNCTION calculate_dart_rate(
  p_company_id         UUID,
  p_year               INT,
  p_total_hours_worked DECIMAL DEFAULT 200000
)
RETURNS DECIMAL AS $$
DECLARE
  v_dart_cases INT;
BEGIN
  SELECT COUNT(*) INTO v_dart_cases
  FROM public.safety_incidents
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM occurred_at) = p_year
    AND is_dart_case = true;

  IF p_total_hours_worked > 0 THEN
    RETURN ROUND((v_dart_cases * 200000.0) / p_total_hours_worked, 2);
  END IF;
  RETURN 0.00;
END;
$$ LANGUAGE plpgsql;

-- TRIR = (Recordable cases × 200,000) / total hours worked
-- Industry average: 5.5 | Goal: < 5.0
CREATE OR REPLACE FUNCTION calculate_trir(
  p_company_id         UUID,
  p_year               INT,
  p_total_hours_worked DECIMAL DEFAULT 200000
)
RETURNS DECIMAL AS $$
DECLARE
  v_recordable_cases INT;
BEGIN
  SELECT COUNT(*) INTO v_recordable_cases
  FROM public.safety_incidents
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM occurred_at) = p_year
    AND is_osha_recordable = true;

  IF p_total_hours_worked > 0 THEN
    RETURN ROUND((v_recordable_cases * 200000.0) / p_total_hours_worked, 2);
  END IF;
  RETURN 0.00;
END;
$$ LANGUAGE plpgsql;

-- Helper: certifications expiring within N days
CREATE OR REPLACE FUNCTION get_expiring_certifications(
  p_company_id UUID,
  p_days_ahead INT DEFAULT 60
)
RETURNS TABLE (
  certification_id      UUID,
  certification_name    VARCHAR,
  holder_name           VARCHAR,
  expiration_date       DATE,
  days_until_expiration INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.holder_name,
    c.expiration_date,
    (c.expiration_date - CURRENT_DATE)::INT
  FROM public.certifications c
  WHERE c.company_id = p_company_id
    AND c.is_active = true
    AND c.expiration_date <= CURRENT_DATE + p_days_ahead
    AND c.expiration_date >= CURRENT_DATE
  ORDER BY c.expiration_date ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS: updated_at timestamps
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_safety_incidents_updated_at'
  ) THEN
    CREATE TRIGGER trg_safety_incidents_updated_at
      BEFORE UPDATE ON public.safety_incidents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_osha_300_log_updated_at'
  ) THEN
    CREATE TRIGGER trg_osha_300_log_updated_at
      BEFORE UPDATE ON public.osha_300_log
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_safety_briefings_updated_at'
  ) THEN
    CREATE TRIGGER trg_safety_briefings_updated_at
      BEFORE UPDATE ON public.safety_briefings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_certifications_updated_at'
  ) THEN
    CREATE TRIGGER trg_certifications_updated_at
      BEFORE UPDATE ON public.certifications
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_inspections_updated_at'
  ) THEN
    CREATE TRIGGER trg_inspections_updated_at
      BEFORE UPDATE ON public.inspections
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

COMMIT;

-- ============================================================================
-- VERIFY
-- ============================================================================
SELECT
  'Module 13 - Compliance & Safety deployed successfully!' AS message,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN (
     'safety_incidents', 'osha_300_log', 'safety_briefings',
     'certifications', 'inspections'
   )
  ) AS tables_created;
