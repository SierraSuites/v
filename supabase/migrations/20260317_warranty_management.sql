-- =====================================================
-- Module 25: Warranty Management
-- Features: Warranty tracking, claims, notifications
-- Date: 2026-03-17
-- =====================================================

-- =====================================================
-- 1. WARRANTIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Warranty Details
  warranty_name VARCHAR(255) NOT NULL,
  warranty_type VARCHAR(50) NOT NULL, -- manufacturer, contractor, extended, service_agreement
  description TEXT,

  -- Item/Product Information
  item_description TEXT NOT NULL,
  manufacturer VARCHAR(255),
  model_number VARCHAR(100),
  serial_number VARCHAR(100),
  installation_date DATE,
  installation_location TEXT,

  -- Coverage Details
  coverage_type VARCHAR(50) NOT NULL, -- parts_only, labor_only, parts_and_labor, full
  coverage_description TEXT,
  warranty_terms TEXT,

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_months INTEGER,

  -- Transferability
  is_transferable BOOLEAN DEFAULT false,
  transferred_to VARCHAR(255),
  transfer_date DATE,

  -- Vendor/Provider Information
  vendor_id UUID REFERENCES crm_contacts(id),
  vendor_name VARCHAR(255) NOT NULL,
  vendor_contact_name VARCHAR(255),
  vendor_email VARCHAR(255),
  vendor_phone VARCHAR(20),

  -- Documents
  warranty_certificate_url TEXT,
  document_urls TEXT[],

  -- Financial
  purchase_price DECIMAL(12,2),
  warranty_cost DECIMAL(12,2),

  -- Reminders
  reminder_sent_90_days BOOLEAN DEFAULT false,
  reminder_sent_60_days BOOLEAN DEFAULT false,
  reminder_sent_30_days BOOLEAN DEFAULT false,
  reminder_sent_7_days BOOLEAN DEFAULT false,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, expired, voided, transferred, claimed
  voided_reason TEXT,
  voided_date DATE,
  voided_by UUID REFERENCES auth.users(id),

  -- Assigned To
  responsible_person UUID REFERENCES auth.users(id),

  -- Notes
  notes TEXT,

  -- Timestamps
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_warranty_type CHECK (warranty_type IN ('manufacturer', 'contractor', 'extended', 'service_agreement')),
  CONSTRAINT valid_coverage_type CHECK (coverage_type IN ('parts_only', 'labor_only', 'parts_and_labor', 'full')),
  CONSTRAINT valid_warranty_status CHECK (status IN ('active', 'expired', 'voided', 'transferred', 'claimed'))
);

-- Indexes
CREATE INDEX idx_warranties_company ON warranties(company_id);
CREATE INDEX idx_warranties_project ON warranties(project_id);
CREATE INDEX idx_warranties_vendor ON warranties(vendor_id);
CREATE INDEX idx_warranties_end_date ON warranties(end_date);
CREATE INDEX idx_warranties_status ON warranties(status);
CREATE INDEX idx_warranties_active ON warranties(status) WHERE status = 'active';
CREATE INDEX idx_warranties_expiring ON warranties(end_date) WHERE end_date > CURRENT_DATE AND status = 'active';

-- =====================================================
-- 2. WARRANTY CLAIMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id UUID NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Claim Details
  claim_number VARCHAR(100) UNIQUE,
  claim_date DATE NOT NULL,
  issue_description TEXT NOT NULL,
  failure_date DATE,

  -- Classification
  claim_type VARCHAR(50) NOT NULL, -- defect, malfunction, damage, installation_error, other
  severity VARCHAR(20) NOT NULL, -- minor, moderate, major, critical

  -- Reported By
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  reported_date DATE NOT NULL,

  -- Assessment
  assessed_by UUID REFERENCES auth.users(id),
  assessment_date DATE,
  assessment_notes TEXT,
  is_warranty_covered BOOLEAN,
  denial_reason TEXT,

  -- Resolution
  resolution_description TEXT,
  resolution_date DATE,
  resolution_cost DECIMAL(12,2),
  reimbursement_amount DECIMAL(12,2),
  reimbursement_received BOOLEAN DEFAULT false,
  reimbursement_date DATE,

  -- Service Provider
  service_provider_name VARCHAR(255),
  service_provider_contact VARCHAR(255),
  service_date DATE,

  -- Documentation
  photos TEXT[],
  receipts TEXT[],
  correspondence TEXT[],
  repair_report_url TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'submitted', -- submitted, under_review, approved, denied, in_progress, resolved, closed
  closed_date DATE,
  closed_by UUID REFERENCES auth.users(id),

  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_claim_type CHECK (claim_type IN ('defect', 'malfunction', 'damage', 'installation_error', 'other')),
  CONSTRAINT valid_claim_severity CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),
  CONSTRAINT valid_claim_status CHECK (status IN ('submitted', 'under_review', 'approved', 'denied', 'in_progress', 'resolved', 'closed'))
);

-- Indexes
CREATE INDEX idx_warranty_claims_warranty ON warranty_claims(warranty_id);
CREATE INDEX idx_warranty_claims_company ON warranty_claims(company_id);
CREATE INDEX idx_warranty_claims_project ON warranty_claims(project_id);
CREATE INDEX idx_warranty_claims_status ON warranty_claims(status);
CREATE INDEX idx_warranty_claims_claim_number ON warranty_claims(claim_number);
CREATE INDEX idx_warranty_claims_claim_date ON warranty_claims(claim_date DESC);

-- =====================================================
-- 3. WARRANTY MAINTENANCE RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS warranty_maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id UUID NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Maintenance Details
  maintenance_date DATE NOT NULL,
  maintenance_type VARCHAR(50) NOT NULL, -- routine, preventive, inspection, repair
  description TEXT NOT NULL,
  performed_by VARCHAR(255) NOT NULL,

  -- Cost
  cost DECIMAL(12,2),
  covered_by_warranty BOOLEAN DEFAULT false,

  -- Documentation
  invoice_url TEXT,
  photos TEXT[],
  report_url TEXT,

  -- Next Maintenance
  next_maintenance_date DATE,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_maintenance_type CHECK (maintenance_type IN ('routine', 'preventive', 'inspection', 'repair'))
);

-- Indexes
CREATE INDEX idx_warranty_maintenance_warranty ON warranty_maintenance_records(warranty_id);
CREATE INDEX idx_warranty_maintenance_company ON warranty_maintenance_records(company_id);
CREATE INDEX idx_warranty_maintenance_date ON warranty_maintenance_records(maintenance_date DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_maintenance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Company-based access
CREATE POLICY "Users can view company warranties"
  ON warranties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = warranties.company_id
    )
  );

CREATE POLICY "Users can create warranties"
  ON warranties FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = warranties.company_id
    )
  );

CREATE POLICY "Users can update warranties"
  ON warranties FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = warranties.company_id
    )
  );

CREATE POLICY "Users can view company warranty claims"
  ON warranty_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = warranty_claims.company_id
    )
  );

CREATE POLICY "Users can create warranty claims"
  ON warranty_claims FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = warranty_claims.company_id
    )
  );

CREATE POLICY "Users can update warranty claims"
  ON warranty_claims FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = warranty_claims.company_id
    )
  );

CREATE POLICY "Users can view company maintenance records"
  ON warranty_maintenance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = warranty_maintenance_records.company_id
    )
  );

CREATE POLICY "Users can create maintenance records"
  ON warranty_maintenance_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = warranty_maintenance_records.company_id
    )
  );

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Function to check warranty expiration and send reminders
CREATE OR REPLACE FUNCTION check_warranty_expiration_reminders()
RETURNS VOID AS $$
DECLARE
  v_warranty RECORD;
  v_days_until_expiry INTEGER;
BEGIN
  FOR v_warranty IN
    SELECT * FROM warranties
    WHERE end_date >= CURRENT_DATE
    AND status = 'active'
    AND deleted_at IS NULL
  LOOP
    v_days_until_expiry := v_warranty.end_date - CURRENT_DATE;

    -- 90-day reminder
    IF v_days_until_expiry = 90 AND NOT v_warranty.reminder_sent_90_days THEN
      PERFORM create_notification(
        COALESCE(v_warranty.responsible_person, v_warranty.created_by),
        v_warranty.company_id,
        'warranty_expiring',
        'Warranty Expiring in 90 Days',
        v_warranty.warranty_name || ' for ' || v_warranty.item_description || ' expires on ' || v_warranty.end_date::TEXT,
        'warranty',
        v_warranty.id,
        '/warranties',
        'normal'
      );

      UPDATE warranties
      SET reminder_sent_90_days = true
      WHERE id = v_warranty.id;
    END IF;

    -- 60-day reminder
    IF v_days_until_expiry = 60 AND NOT v_warranty.reminder_sent_60_days THEN
      PERFORM create_notification(
        COALESCE(v_warranty.responsible_person, v_warranty.created_by),
        v_warranty.company_id,
        'warranty_expiring',
        'Warranty Expiring in 60 Days',
        v_warranty.warranty_name || ' for ' || v_warranty.item_description || ' expires on ' || v_warranty.end_date::TEXT,
        'warranty',
        v_warranty.id,
        '/warranties',
        'normal'
      );

      UPDATE warranties
      SET reminder_sent_60_days = true
      WHERE id = v_warranty.id;
    END IF;

    -- 30-day reminder
    IF v_days_until_expiry = 30 AND NOT v_warranty.reminder_sent_30_days THEN
      PERFORM create_notification(
        COALESCE(v_warranty.responsible_person, v_warranty.created_by),
        v_warranty.company_id,
        'warranty_expiring',
        'Warranty Expiring in 30 Days',
        v_warranty.warranty_name || ' for ' || v_warranty.item_description || ' expires on ' || v_warranty.end_date::TEXT,
        'warranty',
        v_warranty.id,
        '/warranties',
        'high'
      );

      UPDATE warranties
      SET reminder_sent_30_days = true
      WHERE id = v_warranty.id;
    END IF;

    -- 7-day reminder
    IF v_days_until_expiry = 7 AND NOT v_warranty.reminder_sent_7_days THEN
      PERFORM create_notification(
        COALESCE(v_warranty.responsible_person, v_warranty.created_by),
        v_warranty.company_id,
        'warranty_expiring',
        'URGENT: Warranty Expiring in 7 Days',
        v_warranty.warranty_name || ' for ' || v_warranty.item_description || ' expires on ' || v_warranty.end_date::TEXT,
        'warranty',
        v_warranty.id,
        '/warranties',
        'urgent'
      );

      UPDATE warranties
      SET reminder_sent_7_days = true
      WHERE id = v_warranty.id;
    END IF;

    -- Mark as expired
    IF v_days_until_expiry < 0 AND v_warranty.status = 'active' THEN
      UPDATE warranties
      SET status = 'expired'
      WHERE id = v_warranty.id;

      -- Create notification
      PERFORM create_notification(
        COALESCE(v_warranty.responsible_person, v_warranty.created_by),
        v_warranty.company_id,
        'warranty_expired',
        'Warranty Has Expired',
        v_warranty.warranty_name || ' for ' || v_warranty.item_description || ' expired on ' || v_warranty.end_date::TEXT,
        'warranty',
        v_warranty.id,
        '/warranties',
        'high'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate unique claim number
CREATE OR REPLACE FUNCTION generate_warranty_claim_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_claim_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- Get count of claims this year
  SELECT COUNT(*) INTO v_count
  FROM warranty_claims
  WHERE claim_date >= (CURRENT_DATE - INTERVAL '1 year')::DATE;

  v_count := v_count + 1;

  -- Format: WC-YYYY-NNNN
  v_claim_number := 'WC-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');

  RETURN v_claim_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update warranties.updated_at
CREATE OR REPLACE FUNCTION update_warranty_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_warranty_timestamp
  BEFORE UPDATE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION update_warranty_timestamp();

-- Trigger to auto-generate claim number
CREATE OR REPLACE FUNCTION auto_generate_claim_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.claim_number IS NULL THEN
    NEW.claim_number := generate_warranty_claim_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_claim_number
  BEFORE INSERT ON warranty_claims
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_claim_number();

-- Trigger to update warranty status when claim is filed
CREATE OR REPLACE FUNCTION update_warranty_on_claim()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE warranties
  SET status = 'claimed'
  WHERE id = NEW.warranty_id
  AND status = 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_warranty_on_claim
  AFTER INSERT ON warranty_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_warranty_on_claim();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
