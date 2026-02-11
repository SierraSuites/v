# COMPLIANCE & SAFETY - IMPLEMENTATION QUALITY GUIDE

**Module**: OSHA Compliance, Safety Management, Inspections, Certifications (Module 13)
**Business Purpose**: Worker safety, regulatory compliance, legal protection, insurance reduction
**Target Quality**: 98%+ before launch
**Priority**: CRITICAL - Legal liability and worker safety

---

## 1. CORE QUALITY REQUIREMENTS

### 1.1 Critical Feature: Safety Incident Reporting & OSHA 300 Log

**Standard**: Incident reports MUST be created within 2 minutes of submission. OSHA 300 Log MUST auto-calculate DART and TRIR rates accurately. All recordable incidents MUST be reported to OSHA within 24 hours. Form retention MUST comply with 5-year OSHA requirement.

**Why It Matters**: Wrong OSHA reporting = $156K fine per violation. Example: Worker injured on site. Contractor doesn't file OSHA 300 log entry. OSHA inspection 6 months later discovers unreported injury. Fine: $156K. Reputation damaged. Insurance premiums increase 40%. All because of missing a 5-minute form.

**Database Schema**:
```sql
-- Safety incidents and injury tracking
CREATE TABLE safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Incident identification
  incident_number VARCHAR(50) UNIQUE NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location TEXT NOT NULL,

  -- Severity classification
  severity TEXT NOT NULL CHECK (severity IN ('near_miss', 'first_aid', 'medical_treatment', 'recordable', 'lost_time', 'fatality')),

  -- OSHA recordability
  is_osha_recordable BOOLEAN DEFAULT false,
  is_dart_case BOOLEAN DEFAULT false, -- Days Away, Restricted, or Transferred
  days_away_from_work INT DEFAULT 0,
  days_job_transfer_restriction INT DEFAULT 0,

  -- Incident classification (OSHA categories)
  incident_type TEXT NOT NULL, -- 'injury', 'illness', 'near_miss'
  injury_type TEXT, -- 'amputation', 'fracture', 'laceration', 'burn', 'sprain', 'contusion', 'puncture', 'other'
  body_part_affected TEXT, -- 'hand', 'finger', 'foot', 'leg', 'arm', 'back', 'head', 'eye', 'multiple', 'other'

  -- How incident occurred
  event_type TEXT, -- 'fall_same_level', 'fall_elevation', 'struck_by', 'struck_against', 'caught_in_between', 'electrical', 'chemical_exposure', 'overexertion', 'repetitive_motion', 'other'

  -- Environmental factors
  weather_conditions TEXT,
  lighting_conditions TEXT,
  work_surface_condition TEXT,

  -- Injured person details
  employee_name VARCHAR(255),
  employee_id UUID REFERENCES auth.users(id),
  employee_job_title VARCHAR(255),
  employee_age INT,
  employee_experience_years DECIMAL(4, 1),
  employee_hire_date DATE,

  -- PPE status
  ppe_required TEXT[],
  ppe_worn TEXT[],
  ppe_adequate BOOLEAN,

  -- Incident description
  description TEXT NOT NULL,
  what_employee_doing TEXT, -- Task being performed when injured
  how_injury_occurred TEXT, -- Detailed sequence of events
  object_or_substance TEXT, -- What caused injury

  -- Medical treatment
  medical_treatment_provided TEXT, -- 'none', 'first_aid', 'emergency_room', 'hospitalized', 'physician_office'
  medical_facility_name VARCHAR(255),
  physician_name VARCHAR(255),
  diagnosis TEXT,
  treatment_notes TEXT,

  -- Return to work
  expected_return_date DATE,
  actual_return_date DATE,
  restrictions_on_return TEXT,

  -- Root cause analysis
  immediate_causes TEXT[], -- Unsafe acts, unsafe conditions
  root_causes TEXT[], -- Management system failures, lack of training, etc.
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

  -- Witnesses
  witnesses JSONB DEFAULT '[]',
  /* Example:
  [
    {
      "name": "John Doe",
      "user_id": "uuid",
      "statement": "I saw the incident...",
      "contact": "555-1234"
    }
  ]
  */

  -- Documentation
  photos TEXT[],
  documents TEXT[], -- Incident reports, medical records (redacted), diagrams
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
  osha_form_300_entry_id UUID, -- Reference to OSHA 300 log entry

  -- Follow-up
  follow_up_required BOOLEAN DEFAULT true,
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT false,
  follow_up_notes TEXT,

  -- Status tracking
  status TEXT DEFAULT 'open', -- 'open', 'investigating', 'pending_action', 'closed'
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),

  -- Metadata
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_safety_incidents_company ON safety_incidents(company_id, occurred_at DESC);
CREATE INDEX idx_safety_incidents_project ON safety_incidents(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_safety_incidents_severity ON safety_incidents(severity);
CREATE INDEX idx_safety_incidents_recordable ON safety_incidents(is_osha_recordable) WHERE is_osha_recordable = true;
CREATE INDEX idx_safety_incidents_status ON safety_incidents(status);
CREATE INDEX idx_safety_incidents_incident_number ON safety_incidents(incident_number);

-- OSHA 300 Log entries
CREATE TABLE osha_300_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES safety_incidents(id) ON DELETE CASCADE,

  -- OSHA Form 300 fields
  case_number VARCHAR(50) NOT NULL, -- Sequential within year
  year INT NOT NULL,

  -- Employee information (redacted in public postings)
  employee_name VARCHAR(255) NOT NULL,
  employee_job_title VARCHAR(255) NOT NULL,

  -- Incident details
  incident_date DATE NOT NULL,
  where_event_occurred TEXT NOT NULL,

  -- Injury/Illness classification
  injury_or_illness TEXT NOT NULL, -- 'injury', 'skin_disorder', 'respiratory', 'poisoning', 'hearing_loss', 'all_other_illness'
  description TEXT NOT NULL,

  -- OSHA classification checkboxes
  death BOOLEAN DEFAULT false,
  days_away_from_work BOOLEAN DEFAULT false,
  job_transfer_restriction BOOLEAN DEFAULT false,
  other_recordable_case BOOLEAN DEFAULT false,

  -- Days count
  number_of_days_away INT DEFAULT 0,
  number_of_days_job_transfer INT DEFAULT 0,

  -- Privacy case
  is_privacy_case BOOLEAN DEFAULT false, -- Don't include employee name if privacy case

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, case_number, year)
);

CREATE INDEX idx_osha_300_company_year ON osha_300_log(company_id, year DESC);
CREATE INDEX idx_osha_300_incident ON osha_300_log(incident_id);

-- Daily safety briefings (toolbox talks)
CREATE TABLE safety_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Briefing details
  briefing_date DATE NOT NULL,
  start_time TIME,
  duration_minutes INT,
  conducted_by UUID NOT NULL REFERENCES auth.users(id),
  location TEXT,

  -- Weather conditions
  temperature_f INT,
  weather_description TEXT, -- 'sunny', 'cloudy', 'rainy', 'snowy', 'windy'
  precipitation_percentage INT,
  weather_alerts TEXT[], -- Heat advisory, thunderstorm warning, etc.

  -- Work planned for the day
  work_description TEXT NOT NULL,
  work_locations TEXT[],
  equipment_in_use TEXT[],

  -- Hazards identified
  hazards_identified TEXT[] NOT NULL,
  /* Example: [
    "Working at heights (scaffolding 20ft)",
    "Power tools in use (circular saw, nail gun)",
    "Material deliveries (forklift operation)",
    "Confined space entry",
    "Electrical work (live circuits)"
  ] */

  -- Safety topics covered
  topics_covered TEXT[] NOT NULL,
  toolbox_talk_topic VARCHAR(255), -- Main focus topic
  toolbox_talk_duration_minutes INT,
  toolbox_talk_materials_used TEXT[], -- Handouts, videos, etc.

  -- PPE requirements
  ppe_required TEXT[] NOT NULL,
  /* Example: [
    "Hard hat",
    "Safety glasses",
    "High-visibility vest",
    "Steel-toe boots",
    "Fall protection harness",
    "Hearing protection",
    "Gloves"
  ] */

  -- Emergency information
  emergency_assembly_point TEXT,
  first_aid_station_location TEXT,
  fire_extinguisher_locations TEXT[],
  emergency_contact_numbers JSONB,

  -- Attendance
  attendees JSONB NOT NULL,
  /* Example: [
    {
      "user_id": "uuid",
      "name": "John Doe",
      "job_title": "Carpenter",
      "signature_url": "https://...",
      "signed_at": "2026-01-22T07:05:00Z",
      "confirmation": true
    }
  ] */
  total_attendees INT GENERATED ALWAYS AS (jsonb_array_length(attendees)) STORED,

  -- Documentation
  photos TEXT[], -- Group photo showing PPE compliance
  briefing_form_url TEXT, -- PDF of signed form
  notes TEXT,

  -- Acknowledgments
  all_workers_signed BOOLEAN DEFAULT false,
  missing_signatures TEXT[], -- Names of workers who didn't sign

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_safety_briefings_project ON safety_briefings(project_id, briefing_date DESC);
CREATE INDEX idx_safety_briefings_company ON safety_briefings(company_id, briefing_date DESC);
CREATE INDEX idx_safety_briefings_date ON safety_briefings(briefing_date DESC);
CREATE INDEX idx_safety_briefings_conducted_by ON safety_briefings(conducted_by);

-- Certifications and licenses tracking
CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Certification type
  certification_type TEXT NOT NULL CHECK (certification_type IN (
    'company_license', 'insurance', 'bond', 'osha_training',
    'equipment_cert', 'trade_license', 'professional_cert', 'other'
  )),

  -- Certification details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  issuing_authority VARCHAR(255), -- 'OSHA', 'State Board', 'Insurance Provider', etc.
  certification_number VARCHAR(100),

  -- Holder (who/what this certification belongs to)
  holder_type TEXT NOT NULL CHECK (holder_type IN ('company', 'employee', 'equipment', 'subcontractor')),
  holder_id UUID, -- user_id for employee, equipment_id, etc.
  holder_name VARCHAR(255), -- Display name

  -- Validity
  issue_date DATE,
  expiration_date DATE,
  renewal_required BOOLEAN DEFAULT true,
  renewal_period_days INT, -- How often to renew (e.g., 365 for annual)

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_expired BOOLEAN GENERATED ALWAYS AS (expiration_date < CURRENT_DATE) STORED,

  -- Cost
  cost DECIMAL(10, 2),
  renewal_cost DECIMAL(10, 2),

  -- Alerts and reminders
  alert_days_before INT DEFAULT 60, -- Alert 60 days before expiration
  alert_sent BOOLEAN DEFAULT false,
  alert_sent_at TIMESTAMPTZ,

  reminder_60_days BOOLEAN DEFAULT false,
  reminder_30_days BOOLEAN DEFAULT false,
  reminder_7_days BOOLEAN DEFAULT false,

  -- Requirements
  requirements TEXT, -- What's needed to obtain/renew
  training_required TEXT,
  exam_required BOOLEAN DEFAULT false,

  -- Documentation
  certificate_url TEXT,
  documents TEXT[], -- Supporting documents

  -- Compliance notes
  compliance_notes TEXT,
  required_for_projects BOOLEAN DEFAULT false, -- Is this required for bidding/working projects?

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_certifications_company ON certifications(company_id);
CREATE INDEX idx_certifications_holder ON certifications(holder_type, holder_id);
CREATE INDEX idx_certifications_expiration ON certifications(expiration_date) WHERE is_active = true;
CREATE INDEX idx_certifications_type ON certifications(certification_type);
CREATE INDEX idx_certifications_expired ON certifications(is_expired);

-- Inspection schedule and results
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Inspection details
  inspection_type TEXT NOT NULL, -- 'building_code', 'electrical', 'plumbing', 'mechanical', 'structural', 'fire_safety', 'osha', 'final', 'other'
  inspection_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ,

  -- Inspector information
  inspector_name VARCHAR(255),
  inspector_agency VARCHAR(255), -- 'Building Department', 'Fire Marshal', 'OSHA', etc.
  inspector_contact VARCHAR(255),
  inspector_email VARCHAR(255),
  inspector_phone VARCHAR(50),

  -- Requirements
  required_documentation TEXT[],
  required_on_site TEXT[], -- Permits, plans, etc. that must be on site
  prep_checklist JSONB, -- Checklist of items to prepare before inspection
  /* Example:
  [
    {"item": "Post permit on site", "completed": true},
    {"item": "Ensure all outlets have covers", "completed": false},
    {"item": "Have electrical plans available", "completed": true}
  ]
  */

  -- Status
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'passed', 'passed_with_conditions', 'failed', 'cancelled', 'rescheduled'

  -- Results
  inspection_date DATE, -- Actual date conducted
  result TEXT, -- 'passed', 'passed_with_conditions', 'failed', 'partial'
  inspector_notes TEXT,
  conditions_of_approval TEXT, -- If passed with conditions

  -- Deficiencies
  deficiencies JSONB DEFAULT '[]',
  /* Example:
  [
    {
      "item": "Missing GFCI outlet in bathroom",
      "location": "Floor 2, North Wing",
      "code_section": "NEC 210.8",
      "severity": "major",
      "corrected": false,
      "corrected_date": null,
      "photo": "https://..."
    }
  ]
  */

  -- Re-inspection
  reinspection_required BOOLEAN DEFAULT false,
  reinspection_deadline DATE,
  reinspection_scheduled_date DATE,
  reinspection_id UUID REFERENCES inspections(id), -- Link to re-inspection record

  -- Documentation
  inspection_report_url TEXT,
  photos TEXT[],
  documents TEXT[],
  certificate_of_occupancy_url TEXT, -- If final inspection

  -- Notifications
  notify_before_days INT DEFAULT 3,
  notifications_sent JSONB DEFAULT '[]',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inspections_project ON inspections(project_id, scheduled_date DESC);
CREATE INDEX idx_inspections_company ON inspections(company_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_scheduled_date ON inspections(scheduled_date);
CREATE INDEX idx_inspections_type ON inspections(inspection_type);

-- RLS Policies
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE osha_300_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Users can view incidents for their company
CREATE POLICY "Users can view company incidents"
  ON safety_incidents FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Users can report incidents
CREATE POLICY "Users can report incidents"
  ON safety_incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    AND reported_by = auth.uid()
  );

-- Safety managers can update incidents
CREATE POLICY "Safety managers can update incidents"
  ON safety_incidents FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND (
        r.permissions->>'projects'->>'edit' = 'true'
        OR r.name = 'Owner'
      )
    )
  );

-- OSHA 300 log - restricted access
CREATE POLICY "Admins can view OSHA 300 log"
  ON osha_300_log FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND (r.permissions->>'settings'->>'view' = 'true' OR r.name = 'Owner')
    )
  );

-- Everyone can view safety briefings for their projects
CREATE POLICY "Users can view project safety briefings"
  ON safety_briefings FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- Superintendents can create safety briefings
CREATE POLICY "Superintendents can create safety briefings"
  ON safety_briefings FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    AND conducted_by = auth.uid()
  );

-- Users can view company certifications
CREATE POLICY "Users can view company certifications"
  ON certifications FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Admins can manage certifications
CREATE POLICY "Admins can manage certifications"
  ON certifications FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND (r.permissions->>'settings'->>'edit' = 'true' OR r.name = 'Owner')
    )
  );

-- Users can view project inspections
CREATE POLICY "Users can view project inspections"
  ON inspections FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- Project managers can manage inspections
CREATE POLICY "Project managers can manage inspections"
  ON inspections FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'projects'->>'edit' = 'true'
    )
  );

-- Function to generate next incident number
CREATE OR REPLACE FUNCTION generate_incident_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_year VARCHAR(4);
  v_sequence INT;
  v_incident_number VARCHAR(50);
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(incident_number FROM '\d+$') AS INT)
  ), 0) + 1
  INTO v_sequence
  FROM safety_incidents
  WHERE company_id = p_company_id
  AND incident_number LIKE 'INC-' || v_year || '-%';

  v_incident_number := 'INC-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');

  RETURN v_incident_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate DART rate
CREATE OR REPLACE FUNCTION calculate_dart_rate(
  p_company_id UUID,
  p_year INT,
  p_total_hours_worked DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  v_dart_cases INT;
  v_dart_rate DECIMAL;
BEGIN
  -- Count DART cases (Days Away, Restricted, or Transferred)
  SELECT COUNT(*)
  INTO v_dart_cases
  FROM safety_incidents
  WHERE company_id = p_company_id
  AND EXTRACT(YEAR FROM occurred_at) = p_year
  AND is_dart_case = true;

  -- DART Rate = (Number of DART cases × 200,000) / Total hours worked
  IF p_total_hours_worked > 0 THEN
    v_dart_rate := (v_dart_cases * 200000.0) / p_total_hours_worked;
  ELSE
    v_dart_rate := 0;
  END IF;

  RETURN ROUND(v_dart_rate, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate TRIR (Total Recordable Incident Rate)
CREATE OR REPLACE FUNCTION calculate_trir(
  p_company_id UUID,
  p_year INT,
  p_total_hours_worked DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  v_recordable_cases INT;
  v_trir DECIMAL;
BEGIN
  -- Count all recordable cases
  SELECT COUNT(*)
  INTO v_recordable_cases
  FROM safety_incidents
  WHERE company_id = p_company_id
  AND EXTRACT(YEAR FROM occurred_at) = p_year
  AND is_osha_recordable = true;

  -- TRIR = (Number of recordable cases × 200,000) / Total hours worked
  IF p_total_hours_worked > 0 THEN
    v_trir := (v_recordable_cases * 200000.0) / p_total_hours_worked;
  ELSE
    v_trir := 0;
  END IF;

  RETURN ROUND(v_trir, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to check for expiring certifications
CREATE OR REPLACE FUNCTION get_expiring_certifications(
  p_company_id UUID,
  p_days_ahead INT DEFAULT 60
)
RETURNS TABLE(
  certification_id UUID,
  certification_name VARCHAR,
  holder_name VARCHAR,
  expiration_date DATE,
  days_until_expiration INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.holder_name,
    c.expiration_date,
    (c.expiration_date - CURRENT_DATE)::INT AS days_until_expiration
  FROM certifications c
  WHERE c.company_id = p_company_id
  AND c.is_active = true
  AND c.expiration_date <= CURRENT_DATE + p_days_ahead
  AND c.expiration_date >= CURRENT_DATE
  ORDER BY c.expiration_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate incident number
CREATE OR REPLACE FUNCTION set_incident_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.incident_number IS NULL THEN
    NEW.incident_number := generate_incident_number(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_incident_number_trigger
  BEFORE INSERT ON safety_incidents
  FOR EACH ROW
  EXECUTE FUNCTION set_incident_number();

-- Trigger to create OSHA 300 log entry for recordable incidents
CREATE OR REPLACE FUNCTION create_osha_300_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_case_number VARCHAR(50);
  v_year INT;
BEGIN
  IF NEW.is_osha_recordable = true AND OLD.is_osha_recordable IS DISTINCT FROM true THEN
    v_year := EXTRACT(YEAR FROM NEW.occurred_at)::INT;

    -- Generate case number for the year
    SELECT COALESCE(MAX(CAST(SUBSTRING(case_number FROM '\d+$') AS INT)), 0) + 1
    INTO v_case_number
    FROM osha_300_log
    WHERE company_id = NEW.company_id
    AND year = v_year;

    -- Insert OSHA 300 log entry
    INSERT INTO osha_300_log (
      company_id,
      incident_id,
      case_number,
      year,
      employee_name,
      employee_job_title,
      incident_date,
      where_event_occurred,
      injury_or_illness,
      description,
      death,
      days_away_from_work,
      job_transfer_restriction,
      other_recordable_case,
      number_of_days_away,
      number_of_days_job_transfer
    ) VALUES (
      NEW.company_id,
      NEW.id,
      v_year || '-' || LPAD(v_case_number::TEXT, 4, '0'),
      v_year,
      CASE WHEN NEW.employee_name IS NOT NULL THEN NEW.employee_name ELSE 'Redacted' END,
      COALESCE(NEW.employee_job_title, 'Unknown'),
      NEW.occurred_at::DATE,
      NEW.location,
      CASE WHEN NEW.incident_type = 'illness' THEN 'illness' ELSE 'injury' END,
      NEW.description,
      NEW.severity = 'fatality',
      NEW.days_away_from_work > 0,
      NEW.days_job_transfer_restriction > 0,
      NEW.days_away_from_work = 0 AND NEW.days_job_transfer_restriction = 0,
      NEW.days_away_from_work,
      NEW.days_job_transfer_restriction
    )
    RETURNING id INTO NEW.osha_form_300_entry_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_osha_300_entry_trigger
  AFTER INSERT OR UPDATE ON safety_incidents
  FOR EACH ROW
  EXECUTE FUNCTION create_osha_300_entry();
```

**API Implementation**:
```typescript
// app/api/safety/incidents/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createIncidentSchema = z.object({
  project_id: z.string().uuid().optional(),
  occurred_at: z.string().datetime(),
  location: z.string().min(1),
  severity: z.enum(['near_miss', 'first_aid', 'medical_treatment', 'recordable', 'lost_time', 'fatality']),
  incident_type: z.enum(['injury', 'illness', 'near_miss']),
  injury_type: z.string().optional(),
  body_part_affected: z.string().optional(),
  event_type: z.string(),
  employee_name: z.string().optional(),
  employee_id: z.string().uuid().optional(),
  employee_job_title: z.string().optional(),
  ppe_required: z.array(z.string()).optional(),
  ppe_worn: z.array(z.string()).optional(),
  description: z.string().min(10),
  what_employee_doing: z.string().optional(),
  how_injury_occurred: z.string().optional(),
  immediate_actions_taken: z.string().optional(),
  witnesses: z.array(z.object({
    name: z.string(),
    user_id: z.string().uuid().optional(),
    statement: z.string().optional(),
  })).optional(),
})

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await req.json()

    const validatedData = createIncidentSchema.parse(body)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    // Create incident (incident_number will be auto-generated)
    const { data: incident, error } = await supabase
      .from('safety_incidents')
      .insert({
        ...validatedData,
        company_id: profile.company_id,
        reported_by: user.id,
        reported_at: new Date().toISOString(),
        status: 'open',
      })
      .select()
      .single()

    if (error) throw error

    // Send notification to safety manager
    await sendSafetyIncidentNotification(incident, profile.company_id)

    return NextResponse.json({ incident })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Incident creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create incident report' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('safety_incidents')
      .select('*')
      .order('occurred_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: incidents, error } = await query

    if (error) throw error

    return NextResponse.json({ incidents })

  } catch (error) {
    console.error('Incidents fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch incidents' },
      { status: 500 }
    )
  }
}

async function sendSafetyIncidentNotification(incident: any, companyId: string) {
  // TODO: Implement notification logic
  // - Send email to safety manager
  // - Send SMS if severity is 'fatality' or 'lost_time'
  // - Create in-app notification
  // - Log to audit trail
}
```

**Safety Briefing Implementation**:
```typescript
// components/safety/DailyBriefingForm.tsx

'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ShieldCheckIcon, UsersIcon, AlertTriangleIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const PPE_OPTIONS = [
  'Hard hat',
  'Safety glasses',
  'High-visibility vest',
  'Steel-toe boots',
  'Fall protection harness',
  'Hearing protection',
  'Gloves',
  'Respirator',
  'Face shield',
]

const COMMON_HAZARDS = [
  'Working at heights',
  'Power tools in use',
  'Heavy machinery operation',
  'Electrical work',
  'Confined spaces',
  'Overhead work',
  'Excavation/trenching',
  'Chemical exposure',
  'Hot work (welding/cutting)',
  'Material deliveries',
]

export function DailyBriefingForm({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    briefing_date: new Date().toISOString().split('T')[0],
    work_description: '',
    hazards_identified: [] as string[],
    topics_covered: [] as string[],
    ppe_required: [] as string[],
    toolbox_talk_topic: '',
    emergency_assembly_point: '',
  })

  const [attendees, setAttendees] = useState<Array<{ name: string; signed: boolean }>>([])

  const createBriefingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/safety/briefings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create briefing')
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: 'Safety briefing saved',
        description: 'Daily safety briefing has been recorded.',
      })
      queryClient.invalidateQueries({ queryKey: ['safety-briefings', projectId] })
      // Reset form
      setFormData({
        briefing_date: new Date().toISOString().split('T')[0],
        work_description: '',
        hazards_identified: [],
        topics_covered: [],
        ppe_required: [],
        toolbox_talk_topic: '',
        emergency_assembly_point: '',
      })
      setAttendees([])
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const briefingData = {
      project_id: projectId,
      ...formData,
      attendees: attendees.map(a => ({
        name: a.name,
        signature_url: '', // Would be captured via signature pad
        signed_at: new Date().toISOString(),
        confirmation: a.signed,
      })),
    }

    createBriefingMutation.mutate(briefingData)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5" />
            Daily Safety Briefing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date */}
          <div>
            <Label htmlFor="briefing_date">Date</Label>
            <Input
              id="briefing_date"
              type="date"
              value={formData.briefing_date}
              onChange={(e) => setFormData({ ...formData, briefing_date: e.target.value })}
              required
            />
          </div>

          {/* Work Description */}
          <div>
            <Label htmlFor="work_description">Today's Work</Label>
            <Textarea
              id="work_description"
              placeholder="Describe the work planned for today..."
              value={formData.work_description}
              onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
              required
              rows={3}
            />
          </div>

          {/* Hazards Identified */}
          <div>
            <Label>Hazards Identified</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {COMMON_HAZARDS.map((hazard) => (
                <div key={hazard} className="flex items-center space-x-2">
                  <Checkbox
                    id={`hazard-${hazard}`}
                    checked={formData.hazards_identified.includes(hazard)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({
                          ...formData,
                          hazards_identified: [...formData.hazards_identified, hazard],
                        })
                      } else {
                        setFormData({
                          ...formData,
                          hazards_identified: formData.hazards_identified.filter(h => h !== hazard),
                        })
                      }
                    }}
                  />
                  <Label htmlFor={`hazard-${hazard}`} className="text-sm font-normal">
                    {hazard}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* PPE Required */}
          <div>
            <Label>PPE Required</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {PPE_OPTIONS.map((ppe) => (
                <div key={ppe} className="flex items-center space-x-2">
                  <Checkbox
                    id={`ppe-${ppe}`}
                    checked={formData.ppe_required.includes(ppe)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({
                          ...formData,
                          ppe_required: [...formData.ppe_required, ppe],
                        })
                      } else {
                        setFormData({
                          ...formData,
                          ppe_required: formData.ppe_required.filter(p => p !== ppe),
                        })
                      }
                    }}
                  />
                  <Label htmlFor={`ppe-${ppe}`} className="text-sm font-normal">
                    {ppe}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Toolbox Talk Topic */}
          <div>
            <Label htmlFor="toolbox_talk_topic">Toolbox Talk Topic</Label>
            <Input
              id="toolbox_talk_topic"
              placeholder="e.g., Fall Protection, Ladder Safety, Heat Stress"
              value={formData.toolbox_talk_topic}
              onChange={(e) => setFormData({ ...formData, toolbox_talk_topic: e.target.value })}
            />
          </div>

          {/* Emergency Assembly Point */}
          <div>
            <Label htmlFor="emergency_assembly_point">Emergency Assembly Point</Label>
            <Input
              id="emergency_assembly_point"
              placeholder="e.g., Parking lot, NW corner"
              value={formData.emergency_assembly_point}
              onChange={(e) => setFormData({ ...formData, emergency_assembly_point: e.target.value })}
              required
            />
          </div>

          {/* Attendees */}
          <div>
            <Label className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              Crew Attendance
            </Label>
            <div className="space-y-2 mt-2">
              {attendees.map((attendee, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={attendee.name}
                    onChange={(e) => {
                      const newAttendees = [...attendees]
                      newAttendees[index].name = e.target.value
                      setAttendees(newAttendees)
                    }}
                    placeholder="Worker name"
                  />
                  <Checkbox
                    checked={attendee.signed}
                    onCheckedChange={(checked) => {
                      const newAttendees = [...attendees]
                      newAttendees[index].signed = checked as boolean
                      setAttendees(newAttendees)
                    }}
                  />
                  <Label className="text-sm">Signed</Label>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAttendees([...attendees, { name: '', signed: false }])}
              >
                + Add Worker
              </Button>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={createBriefingMutation.isPending}
          >
            {createBriefingMutation.isPending ? 'Saving...' : 'Complete Safety Briefing'}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
```

**Testing Checklist**:
- [ ] Incident report created in <2 minutes
- [ ] Incident number auto-generated (INC-2026-001 format)
- [ ] OSHA 300 log entry auto-created for recordable incidents
- [ ] DART rate calculation matches OSHA formula
- [ ] TRIR calculation matches OSHA formula
- [ ] Safety briefing captures all attendees with signatures
- [ ] Certification expiration alerts sent at 60/30/7 days
- [ ] Inspection deficiencies tracked and closed
- [ ] Re-inspection automatically scheduled when inspection fails
- [ ] All 24-hour OSHA reporting deadlines are enforced
- [ ] Privacy cases properly redact employee names
- [ ] Near-miss incidents logged (not OSHA recordable)
- [ ] Root cause analysis captures immediate and systemic causes
- [ ] Corrective actions assigned to responsible parties
- [ ] Follow-up dates enforced for open incidents
- [ ] Photos upload and display correctly
- [ ] PDF export of OSHA 300 log matches official form
- [ ] Email notifications sent for critical incidents
- [ ] SMS alerts sent for fatalities within 5 minutes
- [ ] Audit trail captures all changes to incidents

**Success Metrics**:
- Zero OSHA recordable incidents (stretch goal)
- 100% daily safety briefings conducted
- <5.0 TRIR (industry average: 5.5)
- <2.0 DART rate (industry average: 3.2)
- Zero expired certifications
- 95%+ inspection pass rate
- <2 minutes to file incident report
- 100% incident follow-up completion within 30 days
- 90% user satisfaction with safety module

---

## 2. USER EXPERIENCE QUALITY STANDARDS

- **Loading states**: Skeleton for incident list, spinner for OSHA calculations
- **Empty states**: "No incidents reported this year - great safety record!" with green checkmark
- **Error states**: "Failed to submit incident. Check required fields and try again."
- **Mobile optimization**: Large touch targets for PPE checkboxes, quick photo capture
- **Keyboard navigation**: Tab through form fields, Enter to submit
- **Accessibility**: Screen reader announces incident severity, high contrast for critical alerts

---

## 3. PERFORMANCE REQUIREMENTS

- Incident form submission: <2 seconds
- OSHA 300 log generation: <1 second (for 100 incidents)
- DART/TRIR calculation: <500ms
- Safety briefing save: <1 second
- Certification expiration check: <200ms
- Inspection list load: <500ms
- Database queries: <100ms (indexed properly)

---

## 4. SECURITY REQUIREMENTS

- OSHA 300 log access restricted to admins only
- Employee names redacted for privacy cases
- Incident photos stored in private S3 bucket
- Only incident reporter and admins can edit incidents
- Audit log for all incident changes
- Medical information encrypted at rest
- Certification documents require authentication to view
- No PHI (Protected Health Information) stored without encryption

---

## 5. PRE-LAUNCH CHECKLIST

### Functional Testing (55 items)
- [ ] Create near-miss incident
- [ ] Create first-aid incident
- [ ] Create recordable incident (OSHA 300 entry auto-created)
- [ ] Create lost-time incident (DART case)
- [ ] Create fatality incident (24-hour notification triggered)
- [ ] Auto-generate incident number
- [ ] Calculate DART rate for current year
- [ ] Calculate TRIR for current year
- [ ] Verify OSHA 300 log format matches official form
- [ ] Export OSHA 300 log to PDF
- [ ] Export OSHA 300A summary
- [ ] Conduct daily safety briefing
- [ ] Capture crew signatures
- [ ] Upload group photo
- [ ] Mark PPE compliance
- [ ] Identify hazards from checklist
- [ ] Add custom hazard
- [ ] Complete toolbox talk
- [ ] Add company license certification
- [ ] Add insurance policy certification
- [ ] Add employee OSHA 30-hour certification
- [ ] Set certification expiration date
- [ ] Receive 60-day expiration alert
- [ ] Receive 30-day expiration alert
- [ ] Receive 7-day expiration alert
- [ ] Mark certification as expired (auto-calculated)
- [ ] Renew expired certification
- [ ] Upload certification document (PDF)
- [ ] Schedule building inspection
- [ ] Notify inspector
- [ ] Send reminder 3 days before inspection
- [ ] Mark inspection as passed
- [ ] Mark inspection as failed (with deficiencies)
- [ ] Schedule re-inspection
- [ ] Track deficiency corrections
- [ ] Upload inspection report PDF
- [ ] Assign root cause to incident
- [ ] Assign corrective actions
- [ ] Set action completion date
- [ ] Verify corrective action completed
- [ ] Close incident
- [ ] Reopen closed incident
- [ ] Add witness statement to incident
- [ ] Upload incident photos
- [ ] Link incident to project
- [ ] Filter incidents by severity
- [ ] Filter incidents by status
- [ ] Search incidents by keyword
- [ ] Generate annual safety report
- [ ] Compare DART rate to industry average
- [ ] Export safety dashboard to PDF
- [ ] Verify RLS policies (users see only their company data)
- [ ] Test multi-user concurrent incident creation
- [ ] Validate required fields on incident form
- [ ] Test incident timeline (chronological order)

### UX Testing (20 items)
- [ ] Incident form easy to complete on mobile
- [ ] Safety briefing form works on tablet
- [ ] OSHA 300 log readable on desktop
- [ ] Color coding accessible (severity levels)
- [ ] Tooltips explain OSHA terminology
- [ ] Empty state shows encouraging message
- [ ] Loading indicators don't block form
- [ ] Success message confirms submission
- [ ] Error messages are specific and actionable
- [ ] Certification expiration highlighted clearly
- [ ] Inspection calendar view is intuitive
- [ ] Drag-and-drop photo upload works
- [ ] Signature capture is smooth
- [ ] Forms auto-save as draft
- [ ] Navigation breadcrumbs are clear
- [ ] Mobile forms have appropriate keyboards (numeric, date)
- [ ] Touch targets 44x44px minimum
- [ ] Swipe gestures feel natural
- [ ] Print stylesheet formats correctly
- [ ] PDF exports are professional

### Performance Testing (8 items)
- [ ] Incident form loads in <500ms
- [ ] Incident submission completes in <2s
- [ ] OSHA log generates in <1s for 100 incidents
- [ ] Safety briefing saves in <1s
- [ ] Certification check runs in <200ms
- [ ] Dashboard loads in <1s
- [ ] No lag when scrolling large incident list
- [ ] Real-time updates don't cause UI jank

### Security Testing (12 items)
- [ ] OSHA 300 log only accessible to admins
- [ ] RLS prevents cross-company access
- [ ] API endpoints require authentication
- [ ] Zod validation rejects invalid severity
- [ ] Medical notes are encrypted
- [ ] Privacy cases redact names correctly
- [ ] File uploads scanned for malware
- [ ] Audit log captures incident edits
- [ ] Session timeout after inactivity
- [ ] HTTPS enforced
- [ ] SQL injection blocked
- [ ] XSS attempts sanitized

### Mobile Testing (8 items)
- [ ] Incident form works on iPhone
- [ ] Incident form works on Android
- [ ] Camera integration for photos
- [ ] Signature pad captures clearly
- [ ] Offline mode queues incident
- [ ] Push notification for critical incidents
- [ ] GPS captures incident location
- [ ] Touch targets appropriate size

### Accessibility Testing (10 items)
- [ ] Passes WAVE checker
- [ ] Passes axe DevTools
- [ ] Screen reader announces severity
- [ ] Keyboard navigation complete
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Form labels proper
- [ ] Error messages associated with fields
- [ ] Severity icons have text alternatives
- [ ] High contrast mode readable

---

## 6. SUCCESS METRICS

- **Incident Reporting**: <2 minutes average time to file
- **OSHA Compliance**: 100% recordable incidents logged within 24 hours
- **Safety Briefings**: 100% conducted before work starts
- **DART Rate**: <2.0 (industry average: 3.2)
- **TRIR**: <5.0 (industry average: 5.5)
- **Certifications**: Zero expired certifications
- **Inspections**: 95%+ pass rate on first attempt
- **User Adoption**: 90% of field workers complete safety briefings daily
- **Data Accuracy**: <1% error rate in OSHA calculations

---

## 7. COMPETITIVE EDGE

**vs Procore**: Basic safety module, no OSHA 300 log automation
**vs Buildertrend**: Manual incident tracking only
**vs Specialized Safety Software (iAuditor, SafetyCulture)**: We integrate with project management

**What Makes Us Better**:
1. Auto-generate OSHA 300 log (save 5 hours per year)
2. <2 minute incident reporting (vs. 10+ minutes elsewhere)
3. Real-time DART/TRIR calculation (no spreadsheets)
4. Integrated with project data (link incidents to tasks, photos)
5. Mobile-first (field workers use phones, not laptops)
6. Certification expiration tracking (never miss a renewal)
7. Inspection scheduling with reminders (pass first time)
8. AI recommendations (prevent similar incidents)

**Win Statement**: "The Sierra Suites safety module cut our incident reporting time from 15 minutes to under 2 minutes. Our TRIR dropped 30% because we could identify hazard patterns immediately. OSHA inspection? No problem - our 300 log is always up to date and accurate. Best part: our insurance premiums went down 25% due to our improved safety record."
