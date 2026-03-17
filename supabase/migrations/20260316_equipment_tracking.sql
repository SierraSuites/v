-- Equipment Tracking System
-- Track tools, equipment, maintenance, and assignments

-- Equipment inventory table
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'power_tool', 'hand_tool', 'heavy_equipment', 'vehicle',
    'safety_equipment', 'surveying', 'scaffolding', 'ladder',
    'generator', 'compressor', 'pump', 'other'
  )),
  subcategory TEXT,
  manufacturer TEXT,
  model_number TEXT,
  serial_number TEXT,

  -- Ownership
  ownership_type TEXT DEFAULT 'owned' CHECK (ownership_type IN ('owned', 'rented', 'leased')),
  purchase_date DATE,
  purchase_cost DECIMAL(12, 2),
  current_value DECIMAL(12, 2),
  rental_company TEXT,
  rental_rate_per_day DECIMAL(10, 2),

  -- Status
  status TEXT DEFAULT 'available' CHECK (status IN (
    'available', 'in_use', 'maintenance', 'repair', 'retired', 'lost', 'stolen'
  )),
  condition TEXT DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'needs_repair')),

  -- Location
  current_location TEXT,
  current_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Maintenance
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_interval_days INTEGER DEFAULT 90,
  hours_used DECIMAL(10, 2) DEFAULT 0,
  hours_until_maintenance DECIMAL(10, 2),

  -- Specifications
  specifications JSONB DEFAULT '{}'::jsonb,
  attachments TEXT[], -- Photos, manuals, etc.
  notes TEXT,

  -- Tracking
  qr_code TEXT UNIQUE,
  barcode TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Equipment maintenance records
CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN (
    'routine', 'repair', 'inspection', 'calibration', 'cleaning', 'parts_replacement'
  )),

  description TEXT NOT NULL,
  performed_by UUID REFERENCES profiles(id),
  performed_by_external TEXT, -- External contractor name

  maintenance_date DATE NOT NULL,
  next_maintenance_due DATE,

  cost DECIMAL(10, 2),
  parts_replaced JSONB, -- Array of parts
  hours_spent DECIMAL(6, 2),

  before_condition TEXT,
  after_condition TEXT CHECK (after_condition IN ('excellent', 'good', 'fair', 'poor', 'needs_repair')),

  notes TEXT,
  attachments TEXT[], -- Photos, receipts

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment checkout/assignment log
CREATE TABLE IF NOT EXISTS equipment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  checked_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_out_by UUID REFERENCES profiles(id),
  expected_return_date DATE,

  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES profiles(id),

  condition_at_checkout TEXT CHECK (condition_at_checkout IN ('excellent', 'good', 'fair', 'poor', 'needs_repair')),
  condition_at_checkin TEXT CHECK (condition_at_checkin IN ('excellent', 'good', 'fair', 'poor', 'needs_repair')),

  hours_used DECIMAL(10, 2),
  fuel_used_gallons DECIMAL(8, 2),

  location_notes TEXT,
  damage_reported TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment inspection checklist
CREATE TABLE IF NOT EXISTS equipment_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  inspection_date DATE NOT NULL,
  inspector_id UUID NOT NULL REFERENCES profiles(id),
  inspection_type TEXT DEFAULT 'routine' CHECK (inspection_type IN ('pre_use', 'routine', 'annual', 'safety')),

  checklist_items JSONB NOT NULL, -- Array of check items with pass/fail
  overall_result TEXT NOT NULL CHECK (overall_result IN ('pass', 'pass_with_notes', 'fail')),

  issues_found TEXT[],
  corrective_actions_needed TEXT[],

  next_inspection_date DATE,

  notes TEXT,
  photos TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_project ON equipment(current_project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assigned ON equipment(assigned_to);
CREATE INDEX IF NOT EXISTS idx_equipment_qr ON equipment(qr_code);

CREATE INDEX IF NOT EXISTS idx_maintenance_equipment ON equipment_maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON equipment_maintenance(maintenance_date);

CREATE INDEX IF NOT EXISTS idx_assignments_equipment ON equipment_assignments(equipment_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON equipment_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assignments_project ON equipment_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_active ON equipment_assignments(checked_in_at) WHERE checked_in_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inspections_equipment ON equipment_inspections(equipment_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON equipment_inspections(inspection_date);

-- Row Level Security
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inspections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY equipment_company_isolation ON equipment
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY equipment_maintenance_company_isolation ON equipment_maintenance
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY equipment_assignments_company_isolation ON equipment_assignments
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY equipment_inspections_company_isolation ON equipment_inspections
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Function to update equipment status when assigned
CREATE OR REPLACE FUNCTION update_equipment_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.checked_in_at IS NULL THEN
    -- Equipment checked out
    UPDATE equipment
    SET status = 'in_use',
        current_project_id = NEW.project_id,
        assigned_to = NEW.assigned_to,
        updated_at = NOW()
    WHERE id = NEW.equipment_id;
  ELSE
    -- Equipment checked in
    UPDATE equipment
    SET status = 'available',
        assigned_to = NULL,
        condition = NEW.condition_at_checkin,
        hours_used = COALESCE(hours_used, 0) + COALESCE(NEW.hours_used, 0),
        updated_at = NOW()
    WHERE id = NEW.equipment_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipment_assignment_status_update
  AFTER INSERT OR UPDATE ON equipment_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_on_assignment();

-- Function to calculate next maintenance date
CREATE OR REPLACE FUNCTION calculate_next_maintenance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE equipment
  SET last_maintenance_date = NEW.maintenance_date,
      next_maintenance_date = NEW.maintenance_date + (maintenance_interval_days || ' days')::INTERVAL,
      condition = NEW.after_condition,
      updated_at = NOW()
  WHERE id = NEW.equipment_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipment_maintenance_update
  AFTER INSERT ON equipment_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION calculate_next_maintenance();
