-- =====================================================
-- Module 24: Enhanced Safety & Compliance
-- Features: Incident reporting, OSHA logs, certifications
-- Date: 2026-03-17
-- =====================================================

-- =====================================================
-- 1. SAFETY INCIDENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Incident Details
  incident_date TIMESTAMPTZ NOT NULL,
  incident_time TIME NOT NULL,
  location_description TEXT NOT NULL,
  incident_type VARCHAR(50) NOT NULL, -- injury, near_miss, property_damage, environmental, vehicle
  severity VARCHAR(20) NOT NULL, -- minor, moderate, serious, critical, fatal

  -- People Involved
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  injured_person_name VARCHAR(255),
  injured_person_role VARCHAR(100),
  injured_person_company VARCHAR(255), -- Could be subcontractor

  -- Incident Description
  description TEXT NOT NULL,
  immediate_cause TEXT,
  root_cause TEXT,
  contributing_factors TEXT[],

  -- Injury Details (if applicable)
  injury_type VARCHAR(100), -- cut, bruise, fracture, burn, etc.
  body_part_affected VARCHAR(100),
  treatment_provided TEXT,
  medical_facility VARCHAR(255),
  days_away_from_work INTEGER DEFAULT 0,
  days_of_restricted_work INTEGER DEFAULT 0,

  -- OSHA Recordability
  is_osha_recordable BOOLEAN DEFAULT false,
  osha_case_number VARCHAR(50),
  osha_classification VARCHAR(50), -- days_away, restricted_work, medical_treatment, fatality

  -- Witness Information
  witnesses JSONB, -- Array of {name, contact, statement}

  -- Documentation
  photos TEXT[], -- Array of photo URLs
  documents TEXT[], -- Array of document URLs

  -- Corrective Actions
  immediate_actions_taken TEXT,
  preventive_measures TEXT[],
  responsible_person UUID REFERENCES auth.users(id),
  corrective_action_due_date DATE,
  corrective_action_completed_date DATE,
  corrective_action_status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, overdue

  -- Investigation
  investigated_by UUID REFERENCES auth.users(id),
  investigation_date DATE,
  investigation_notes TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, under_investigation, closed
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_incident_type CHECK (incident_type IN ('injury', 'near_miss', 'property_damage', 'environmental', 'vehicle')),
  CONSTRAINT valid_severity CHECK (severity IN ('minor', 'moderate', 'serious', 'critical', 'fatal')),
  CONSTRAINT valid_status CHECK (status IN ('open', 'under_investigation', 'closed')),
  CONSTRAINT valid_corrective_action_status CHECK (corrective_action_status IN ('pending', 'in_progress', 'completed', 'overdue'))
);

-- Indexes
CREATE INDEX idx_safety_incidents_company ON safety_incidents(company_id);
CREATE INDEX idx_safety_incidents_project ON safety_incidents(project_id);
CREATE INDEX idx_safety_incidents_date ON safety_incidents(incident_date DESC);
CREATE INDEX idx_safety_incidents_type ON safety_incidents(incident_type);
CREATE INDEX idx_safety_incidents_severity ON safety_incidents(severity);
CREATE INDEX idx_safety_incidents_osha ON safety_incidents(is_osha_recordable) WHERE is_osha_recordable = true;

-- =====================================================
-- 2. SAFETY BRIEFINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS safety_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Briefing Details
  briefing_date DATE NOT NULL,
  briefing_time TIME NOT NULL,
  topic VARCHAR(255) NOT NULL,
  description TEXT,
  conducted_by UUID NOT NULL REFERENCES auth.users(id),
  location VARCHAR(255),

  -- Topics Covered
  topics_covered TEXT[],
  hazards_discussed TEXT[],
  ppe_requirements TEXT[],

  -- Attendance
  attendees JSONB NOT NULL, -- Array of {user_id, name, signature_url, signed_at}
  total_attendees INTEGER NOT NULL DEFAULT 0,

  -- Documentation
  photos TEXT[],
  documents TEXT[],

  -- Weather (if relevant)
  weather_conditions VARCHAR(100),
  temperature_fahrenheit INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_safety_briefings_company ON safety_briefings(company_id);
CREATE INDEX idx_safety_briefings_project ON safety_briefings(project_id);
CREATE INDEX idx_safety_briefings_date ON safety_briefings(briefing_date DESC);

-- =====================================================
-- 3. CERTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS worker_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Certification Details
  certification_name VARCHAR(255) NOT NULL,
  certification_type VARCHAR(100) NOT NULL, -- osha, first_aid, forklift, crane, scaffold, confined_space, etc.
  issuing_organization VARCHAR(255) NOT NULL,
  certification_number VARCHAR(100),

  -- Dates
  issue_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  reminder_sent_60_days BOOLEAN DEFAULT false,
  reminder_sent_30_days BOOLEAN DEFAULT false,
  reminder_sent_7_days BOOLEAN DEFAULT false,

  -- Verification
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, verified, expired, revoked
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,

  -- Documentation
  certificate_url TEXT,
  document_urls TEXT[],

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_verification_status CHECK (verification_status IN ('pending', 'verified', 'expired', 'revoked'))
);

-- Indexes
CREATE INDEX idx_worker_certifications_company ON worker_certifications(company_id);
CREATE INDEX idx_worker_certifications_user ON worker_certifications(user_id);
CREATE INDEX idx_worker_certifications_expiration ON worker_certifications(expiration_date);
CREATE INDEX idx_worker_certifications_expired ON worker_certifications(expiration_date) WHERE expiration_date < CURRENT_DATE;

-- =====================================================
-- 4. SAFETY INSPECTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS safety_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Inspection Details
  inspection_date DATE NOT NULL,
  inspection_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly, annual, incident_follow_up, osha
  inspector_id UUID NOT NULL REFERENCES auth.users(id),

  -- Checklist
  checklist_template VARCHAR(100), -- Which template was used
  checklist_items JSONB NOT NULL, -- Array of {item, status: pass/fail/na, notes, photo_url}

  -- Results
  total_items INTEGER NOT NULL,
  items_passed INTEGER NOT NULL,
  items_failed INTEGER NOT NULL,
  items_na INTEGER NOT NULL,
  pass_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_items > 0
    THEN (items_passed::DECIMAL / total_items::DECIMAL * 100)
    ELSE 0
    END
  ) STORED,

  -- Issues Found
  issues_found TEXT[],
  immediate_hazards_identified BOOLEAN DEFAULT false,
  work_stopped BOOLEAN DEFAULT false,

  -- Corrective Actions
  corrective_actions_required BOOLEAN DEFAULT false,
  corrective_actions TEXT[],
  corrective_action_due_date DATE,
  corrective_actions_completed BOOLEAN DEFAULT false,
  corrective_actions_completed_date DATE,

  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT false,

  -- Documentation
  photos TEXT[],
  signature_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_inspection_type CHECK (inspection_type IN ('daily', 'weekly', 'monthly', 'annual', 'incident_follow_up', 'osha'))
);

-- Indexes
CREATE INDEX idx_safety_inspections_company ON safety_inspections(company_id);
CREATE INDEX idx_safety_inspections_project ON safety_inspections(project_id);
CREATE INDEX idx_safety_inspections_date ON safety_inspections(inspection_date DESC);
CREATE INDEX idx_safety_inspections_follow_up ON safety_inspections(follow_up_required) WHERE follow_up_required = true;

-- =====================================================
-- 5. OSHA 300 LOG (Annual Summary)
-- =====================================================
CREATE TABLE IF NOT EXISTS osha_300_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Year
  log_year INTEGER NOT NULL,

  -- Company Info
  establishment_name VARCHAR(255) NOT NULL,
  establishment_address TEXT NOT NULL,
  industry_description VARCHAR(255),
  naics_code VARCHAR(10),

  -- Statistics (auto-calculated from incidents)
  total_recordable_cases INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  total_days_away_from_work_cases INTEGER DEFAULT 0,
  total_days_of_job_transfer_restriction INTEGER DEFAULT 0,
  total_other_recordable_cases INTEGER DEFAULT 0,

  -- Calculated Rates
  total_hours_worked DECIMAL(12,2) NOT NULL,
  dart_rate DECIMAL(10,2), -- Days Away, Restricted, or Transferred Rate
  trir DECIMAL(10,2), -- Total Recordable Incident Rate

  -- Certification
  certified_by UUID REFERENCES auth.users(id),
  certification_date DATE,
  certification_title VARCHAR(255),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, certified, posted, archived
  posted_date DATE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_log_status CHECK (status IN ('draft', 'certified', 'posted', 'archived')),
  UNIQUE(company_id, log_year)
);

-- Indexes
CREATE INDEX idx_osha_300_log_company ON osha_300_log(company_id);
CREATE INDEX idx_osha_300_log_year ON osha_300_log(log_year DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE osha_300_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Company-based access (same pattern for all tables)
CREATE POLICY "Users can view company safety incidents"
  ON safety_incidents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = safety_incidents.company_id
    )
  );

CREATE POLICY "Users can create safety incidents"
  ON safety_incidents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = safety_incidents.company_id
    )
  );

CREATE POLICY "Users can update safety incidents"
  ON safety_incidents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = safety_incidents.company_id
    )
  );

-- Similar policies for other tables (briefings, certifications, inspections, osha_log)
CREATE POLICY "Users can view company safety briefings"
  ON safety_briefings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = safety_briefings.company_id
    )
  );

CREATE POLICY "Users can create safety briefings"
  ON safety_briefings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = safety_briefings.company_id
    )
  );

CREATE POLICY "Users can view company certifications"
  ON worker_certifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = worker_certifications.company_id
    )
  );

CREATE POLICY "Users can manage certifications"
  ON worker_certifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = worker_certifications.company_id
    )
  );

CREATE POLICY "Users can view company inspections"
  ON safety_inspections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = safety_inspections.company_id
    )
  );

CREATE POLICY "Users can manage inspections"
  ON safety_inspections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = safety_inspections.company_id
    )
  );

CREATE POLICY "Users can view company OSHA logs"
  ON osha_300_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = osha_300_log.company_id
    )
  );

CREATE POLICY "Users can manage OSHA logs"
  ON osha_300_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = osha_300_log.company_id
    )
  );

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Function to calculate DART rate
CREATE OR REPLACE FUNCTION calculate_dart_rate(
  p_days_away_cases INTEGER,
  p_restricted_cases INTEGER,
  p_total_hours_worked DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  IF p_total_hours_worked = 0 THEN
    RETURN 0;
  END IF;

  -- DART Rate = (Days Away + Restricted Cases) x 200,000 / Total Hours Worked
  RETURN ((p_days_away_cases + p_restricted_cases) * 200000.0) / p_total_hours_worked;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate TRIR
CREATE OR REPLACE FUNCTION calculate_trir(
  p_total_recordable_cases INTEGER,
  p_total_hours_worked DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  IF p_total_hours_worked = 0 THEN
    RETURN 0;
  END IF;

  -- TRIR = Total Recordable Cases x 200,000 / Total Hours Worked
  RETURN (p_total_recordable_cases * 200000.0) / p_total_hours_worked;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to send certification expiration reminders
CREATE OR REPLACE FUNCTION check_certification_expiration_reminders()
RETURNS VOID AS $$
DECLARE
  v_cert RECORD;
  v_days_until_expiry INTEGER;
BEGIN
  FOR v_cert IN
    SELECT * FROM worker_certifications
    WHERE expiration_date >= CURRENT_DATE
    AND verification_status = 'verified'
    AND deleted_at IS NULL
  LOOP
    v_days_until_expiry := v_cert.expiration_date - CURRENT_DATE;

    -- 60-day reminder
    IF v_days_until_expiry = 60 AND NOT v_cert.reminder_sent_60_days THEN
      -- Create notification
      PERFORM create_notification(
        v_cert.user_id,
        v_cert.company_id,
        'certification_expiring',
        'Certification Expiring in 60 Days',
        v_cert.certification_name || ' expires on ' || v_cert.expiration_date::TEXT,
        'certification',
        v_cert.id,
        '/compliance/certifications',
        'normal'
      );

      UPDATE worker_certifications
      SET reminder_sent_60_days = true
      WHERE id = v_cert.id;
    END IF;

    -- 30-day reminder
    IF v_days_until_expiry = 30 AND NOT v_cert.reminder_sent_30_days THEN
      PERFORM create_notification(
        v_cert.user_id,
        v_cert.company_id,
        'certification_expiring',
        'Certification Expiring in 30 Days',
        v_cert.certification_name || ' expires on ' || v_cert.expiration_date::TEXT,
        'certification',
        v_cert.id,
        '/compliance/certifications',
        'high'
      );

      UPDATE worker_certifications
      SET reminder_sent_30_days = true
      WHERE id = v_cert.id;
    END IF;

    -- 7-day reminder
    IF v_days_until_expiry = 7 AND NOT v_cert.reminder_sent_7_days THEN
      PERFORM create_notification(
        v_cert.user_id,
        v_cert.company_id,
        'certification_expiring',
        'URGENT: Certification Expiring in 7 Days',
        v_cert.certification_name || ' expires on ' || v_cert.expiration_date::TEXT,
        'certification',
        v_cert.id,
        '/compliance/certifications',
        'urgent'
      );

      UPDATE worker_certifications
      SET reminder_sent_7_days = true
      WHERE id = v_cert.id;
    END IF;

    -- Mark as expired
    IF v_days_until_expiry < 0 AND v_cert.verification_status = 'verified' THEN
      UPDATE worker_certifications
      SET verification_status = 'expired'
      WHERE id = v_cert.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update safety_incidents.updated_at
CREATE OR REPLACE FUNCTION update_safety_incident_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_safety_incident_timestamp
  BEFORE UPDATE ON safety_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_safety_incident_timestamp();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
