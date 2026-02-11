# SUSTAINABILITY HUB - IMPLEMENTATION QUALITY GUIDE

**Module**: Green Building & Environmental Tracking (Module 08)
**Business Purpose**: LEED certification, carbon tracking, sustainable materials, waste management
**Target Quality**: 90%+ before launch
**Priority**: MEDIUM - Growing market demand for green building

---

## 1. CORE QUALITY REQUIREMENTS

### 1.1 Critical Feature: LEED Scorecard Tracker

**Standard**: LEED point calculations MUST match LEED v4.1 BD+C specifications. Point totals MUST update in real-time (<200ms). All 110 possible points MUST be trackable. Scorecard MUST validate that prerequisites are met before awarding points.

**Why It Matters**: Wrong LEED calculations = failed certification = lawsuit. Example: Contractor tells client they'll achieve LEED Gold (60 points). At submission, discover they only have 52 points because calculations were wrong. Client sues for breach of contract. $500K project becomes $750K with legal fees and redesign costs.

**Database Schema**:
```sql
-- LEED certification tracking
CREATE TABLE leed_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Certification details
  leed_version VARCHAR(50) NOT NULL DEFAULT 'v4.1 BD+C', -- 'v4.1 BD+C', 'v4.1 ID+C', etc.
  target_level TEXT NOT NULL, -- 'certified', 'silver', 'gold', 'platinum'
  certification_status TEXT DEFAULT 'planning', -- 'planning', 'registered', 'submitted', 'certified'

  -- Point tracking
  current_points INT DEFAULT 0,
  possible_points INT DEFAULT 110,
  certified_threshold INT DEFAULT 40,
  silver_threshold INT DEFAULT 50,
  gold_threshold INT DEFAULT 60,
  platinum_threshold INT DEFAULT 80,

  -- Registration
  leed_project_id VARCHAR(100), -- ID from LEED Online
  registration_date DATE,
  target_certification_date DATE,

  -- Certification
  submitted_date DATE,
  certification_date DATE,
  final_points_awarded INT,
  certified_level TEXT, -- Actual level achieved

  -- Contact
  leed_ap_name VARCHAR(255), -- LEED Accredited Professional
  leed_ap_credential VARCHAR(100),
  leed_ap_user_id UUID REFERENCES auth.users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leed_certifications_project ON leed_certifications(project_id);
CREATE INDEX idx_leed_certifications_company ON leed_certifications(company_id);
CREATE INDEX idx_leed_certifications_status ON leed_certifications(certification_status);

-- LEED credits (individual points)
CREATE TABLE leed_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leed_certification_id UUID NOT NULL REFERENCES leed_certifications(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Credit identification
  category TEXT NOT NULL, -- 'sustainable_sites', 'water_efficiency', 'energy_atmosphere', 'materials_resources', 'indoor_environmental_quality', 'innovation', 'regional_priority'
  credit_name VARCHAR(255) NOT NULL,
  credit_code VARCHAR(50), -- 'SS Credit 1', 'WE Credit 2', etc.
  is_prerequisite BOOLEAN DEFAULT false,

  -- Point potential
  points_possible INT NOT NULL,
  points_targeted INT DEFAULT 0,
  points_achieved INT DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'not_pursued', -- 'not_pursued', 'targeted', 'in_progress', 'documented', 'submitted', 'achieved', 'denied'

  -- Documentation
  requirements TEXT,
  strategy TEXT, -- How we plan to achieve this credit
  documentation_links TEXT[], -- URLs to supporting docs
  responsible_party UUID REFERENCES auth.users(id),

  -- Submission tracking
  submitted_date DATE,
  review_comments TEXT,
  appeal_submitted BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leed_credits_certification ON leed_credits(leed_certification_id);
CREATE INDEX idx_leed_credits_category ON leed_credits(category);
CREATE INDEX idx_leed_credits_status ON leed_credits(status);

-- Sustainable materials database
CREATE TABLE sustainable_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Material identification
  material_name VARCHAR(255) NOT NULL,
  category TEXT NOT NULL, -- 'insulation', 'flooring', 'lumber', 'concrete', 'steel', 'drywall', 'roofing', 'paint', 'plumbing', 'electrical'
  manufacturer VARCHAR(255),
  product_code VARCHAR(100),
  supplier VARCHAR(255),

  -- Sustainability attributes
  recycled_content_percentage DECIMAL(5, 2) DEFAULT 0, -- 0-100%
  post_consumer_recycled_percentage DECIMAL(5, 2) DEFAULT 0,
  pre_consumer_recycled_percentage DECIMAL(5, 2) DEFAULT 0,

  -- Regional materials (LEED MR Credit)
  is_regional BOOLEAN DEFAULT false,
  extraction_location VARCHAR(255), -- Where raw materials extracted
  manufacturing_location VARCHAR(255), -- Where product manufactured
  distance_to_project_miles INT, -- Must be <500 miles for LEED credit
  regional_value DECIMAL(12, 2), -- Dollar value that counts as regional

  -- Rapidly renewable (LEED MR Credit)
  is_rapidly_renewable BOOLEAN DEFAULT false, -- <10 year harvest cycle
  harvest_cycle_years INT,

  -- Certifications
  has_epd BOOLEAN DEFAULT false, -- Environmental Product Declaration
  epd_url TEXT,
  has_hpd BOOLEAN DEFAULT false, -- Health Product Declaration
  hpd_url TEXT,
  certifications TEXT[], -- 'FSC', 'SFI', 'Cradle2Cradle', 'GreenGuard', 'FloorScore', etc.
  certification_documents JSONB DEFAULT '[]',

  -- Environmental impact
  embodied_carbon_kg_co2e DECIMAL(10, 2), -- Carbon footprint per unit
  voc_content TEXT, -- 'zero', 'low', 'moderate', 'high'
  voc_g_per_liter DECIMAL(8, 2),

  -- Quantity and cost
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL, -- 'sqft', 'lbs', 'units', 'tons', etc.
  unit_cost DECIMAL(10, 2),
  total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,

  -- LEED contribution
  contributes_to_credits TEXT[], -- ['MR Credit: Recycled Content', 'MR Credit: Regional Materials']
  leed_value DECIMAL(12, 2), -- $ value that counts toward LEED credits

  -- Metadata
  purchased_date DATE,
  installed_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sustainable_materials_project ON sustainable_materials(project_id);
CREATE INDEX idx_sustainable_materials_company ON sustainable_materials(company_id);
CREATE INDEX idx_sustainable_materials_category ON sustainable_materials(category);
CREATE INDEX idx_sustainable_materials_regional ON sustainable_materials(is_regional) WHERE is_regional = true;

-- Construction waste tracking
CREATE TABLE waste_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Waste event
  date DATE NOT NULL,
  waste_type TEXT NOT NULL, -- 'metal', 'wood', 'concrete', 'drywall', 'cardboard', 'plastic', 'asphalt', 'brick', 'mixed'
  description TEXT,

  -- Quantity
  weight_tons DECIMAL(8, 2), -- Weight in tons
  volume_cubic_yards DECIMAL(8, 2), -- Volume in cubic yards

  -- Disposition
  disposition TEXT NOT NULL, -- 'recycled', 'reused', 'salvaged', 'donated', 'composted', 'landfilled', 'incinerated', 'hazardous_disposal'
  diversion_rate DECIMAL(5, 2), -- Percentage diverted from landfill (0-100)

  -- Hauler information
  hauler_name VARCHAR(255),
  hauler_contact VARCHAR(255),
  facility_name VARCHAR(255), -- Recycling facility or landfill
  facility_location VARCHAR(255),

  -- Documentation
  ticket_number VARCHAR(100),
  receipt_url TEXT,
  photos TEXT[],

  -- Cost tracking
  hauling_cost DECIMAL(10, 2),
  disposal_cost DECIMAL(10, 2),
  revenue_from_recycling DECIMAL(10, 2), -- If materials were sold

  -- LEED contribution
  counts_toward_leed BOOLEAN DEFAULT true,
  leed_credit VARCHAR(100) DEFAULT 'MR Credit: Construction Waste Management',

  -- Metadata
  logged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waste_tracking_project ON waste_tracking(project_id);
CREATE INDEX idx_waste_tracking_date ON waste_tracking(project_id, date DESC);
CREATE INDEX idx_waste_tracking_type ON waste_tracking(waste_type);
CREATE INDEX idx_waste_tracking_disposition ON waste_tracking(disposition);

-- Carbon footprint tracking
CREATE TABLE carbon_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Emission source
  emission_category TEXT NOT NULL, -- 'materials', 'transportation', 'energy', 'waste', 'water'
  emission_subcategory TEXT, -- 'concrete', 'steel', 'worker_commute', 'material_delivery', 'electricity', etc.
  description TEXT,

  -- Calculation inputs
  quantity DECIMAL(12, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL, -- 'tons', 'miles', 'kWh', 'gallons', etc.

  -- Emission factor (kg CO2e per unit)
  emission_factor DECIMAL(10, 4) NOT NULL,
  emission_factor_source TEXT, -- 'EPA', 'NREL', 'ICE Database', 'Manufacturer EPD'

  -- Calculated emissions
  total_co2e_kg DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * emission_factor) STORED,
  total_co2e_tons DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * emission_factor / 1000) STORED,

  -- Scope classification (GHG Protocol)
  scope TEXT, -- 'scope_1', 'scope_2', 'scope_3'
  scope_description TEXT,

  -- Time period
  activity_date DATE,
  reporting_period TEXT, -- 'construction', 'year_1_operations', etc.

  -- Reference
  reference_material_id UUID REFERENCES sustainable_materials(id),
  reference_document TEXT,

  -- Metadata
  calculated_by UUID REFERENCES auth.users(id),
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_carbon_tracking_project ON carbon_tracking(project_id);
CREATE INDEX idx_carbon_tracking_category ON carbon_tracking(emission_category);
CREATE INDEX idx_carbon_tracking_date ON carbon_tracking(activity_date DESC);

-- RLS Policies
ALTER TABLE leed_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE leed_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sustainable_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their company's sustainability data
CREATE POLICY "Users can view company LEED certifications"
  ON leed_certifications FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage company LEED certifications"
  ON leed_certifications FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'projects'->>'edit' = 'true'
    )
  );

CREATE POLICY "Users can view LEED credits"
  ON leed_credits FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage LEED credits"
  ON leed_credits FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'projects'->>'edit' = 'true'
    )
  );

CREATE POLICY "Users can view sustainable materials"
  ON sustainable_materials FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage sustainable materials"
  ON sustainable_materials FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'projects'->>'edit' = 'true'
    )
  );

CREATE POLICY "Users can view waste tracking"
  ON waste_tracking FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can log waste"
  ON waste_tracking FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    AND logged_by = auth.uid()
  );

CREATE POLICY "Users can view carbon tracking"
  ON carbon_tracking FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage carbon tracking"
  ON carbon_tracking FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'projects'->>'edit' = 'true'
    )
  );

-- Function to calculate LEED score
CREATE OR REPLACE FUNCTION calculate_leed_score(p_certification_id UUID)
RETURNS INT AS $$
DECLARE
  v_total_points INT;
BEGIN
  SELECT COALESCE(SUM(points_achieved), 0)
  INTO v_total_points
  FROM leed_credits
  WHERE leed_certification_id = p_certification_id;

  UPDATE leed_certifications
  SET current_points = v_total_points,
      updated_at = NOW()
  WHERE id = p_certification_id;

  RETURN v_total_points;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate waste diversion rate
CREATE OR REPLACE FUNCTION calculate_waste_diversion_rate(p_project_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total_weight DECIMAL;
  v_diverted_weight DECIMAL;
  v_diversion_rate DECIMAL;
BEGIN
  SELECT COALESCE(SUM(weight_tons), 0)
  INTO v_total_weight
  FROM waste_tracking
  WHERE project_id = p_project_id;

  SELECT COALESCE(SUM(weight_tons), 0)
  INTO v_diverted_weight
  FROM waste_tracking
  WHERE project_id = p_project_id
  AND disposition IN ('recycled', 'reused', 'salvaged', 'donated', 'composted');

  IF v_total_weight > 0 THEN
    v_diversion_rate := (v_diverted_weight / v_total_weight) * 100;
  ELSE
    v_diversion_rate := 0;
  END IF;

  RETURN ROUND(v_diversion_rate, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total project carbon footprint
CREATE OR REPLACE FUNCTION calculate_project_carbon_footprint(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_co2e_tons', COALESCE(SUM(total_co2e_tons), 0),
    'by_category', jsonb_object_agg(
      emission_category,
      COALESCE(SUM(total_co2e_tons), 0)
    )
  )
  INTO v_result
  FROM carbon_tracking
  WHERE project_id = p_project_id
  GROUP BY emission_category;

  RETURN COALESCE(v_result, '{"total_co2e_tons": 0, "by_category": {}}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update LEED score when credits change
CREATE OR REPLACE FUNCTION update_leed_score_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_leed_score(NEW.leed_certification_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leed_score_on_credit_change
  AFTER INSERT OR UPDATE ON leed_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_leed_score_trigger();
```

**API Implementation**:
```typescript
// app/api/sustainability/leed/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createLEEDCertificationSchema = z.object({
  project_id: z.string().uuid(),
  leed_version: z.string().default('v4.1 BD+C'),
  target_level: z.enum(['certified', 'silver', 'gold', 'platinum']),
  leed_ap_name: z.string().optional(),
  leed_ap_credential: z.string().optional(),
  target_certification_date: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await req.json()

    const validatedData = createLEEDCertificationSchema.parse(body)

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

    // Create LEED certification
    const { data: certification, error } = await supabase
      .from('leed_certifications')
      .insert({
        ...validatedData,
        company_id: profile.company_id,
      })
      .select()
      .single()

    if (error) throw error

    // Initialize standard LEED v4.1 BD+C credits
    const standardCredits = getLEEDv4_1Credits()

    const creditsToInsert = standardCredits.map(credit => ({
      leed_certification_id: certification.id,
      company_id: profile.company_id,
      ...credit,
    }))

    const { error: creditsError } = await supabase
      .from('leed_credits')
      .insert(creditsToInsert)

    if (creditsError) throw creditsError

    return NextResponse.json({ certification })

  } catch (error) {
    console.error('LEED certification creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create LEED certification' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('leed_certifications')
      .select(`
        *,
        leed_credits (
          id,
          category,
          credit_name,
          credit_code,
          is_prerequisite,
          points_possible,
          points_targeted,
          points_achieved,
          status
        )
      `)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: certifications, error } = await query

    if (error) throw error

    return NextResponse.json({ certifications })

  } catch (error) {
    console.error('LEED fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch LEED certifications' },
      { status: 500 }
    )
  }
}

function getLEEDv4_1Credits() {
  return [
    // Sustainable Sites (20 points possible)
    { category: 'sustainable_sites', credit_name: 'Construction Activity Pollution Prevention', credit_code: 'SS Prereq', is_prerequisite: true, points_possible: 0, requirements: 'Create and implement an ESC plan' },
    { category: 'sustainable_sites', credit_name: 'Site Assessment', credit_code: 'SS Credit 1', is_prerequisite: false, points_possible: 1, requirements: 'Conduct site assessment and preserve area history' },
    { category: 'sustainable_sites', credit_name: 'Site Development - Protect or Restore Habitat', credit_code: 'SS Credit 2', is_prerequisite: false, points_possible: 2, requirements: 'Limit site disturbance, restore native vegetation' },
    { category: 'sustainable_sites', credit_name: 'Open Space', credit_code: 'SS Credit 3', is_prerequisite: false, points_possible: 1, requirements: 'Create outdoor space equal to 30% of site area' },
    { category: 'sustainable_sites', credit_name: 'Rainwater Management', credit_code: 'SS Credit 4', is_prerequisite: false, points_possible: 3, requirements: 'Manage rainwater on site, reduce runoff' },
    { category: 'sustainable_sites', credit_name: 'Heat Island Reduction', credit_code: 'SS Credit 5', is_prerequisite: false, points_possible: 2, requirements: 'Use high-albedo or vegetated roofs, shaded parking' },
    { category: 'sustainable_sites', credit_name: 'Light Pollution Reduction', credit_code: 'SS Credit 6', is_prerequisite: false, points_possible: 1, requirements: 'Reduce light trespass, uplight' },
    { category: 'sustainable_sites', credit_name: 'Tenement Density and Diverse Uses', credit_code: 'SS Credit 7', is_prerequisite: false, points_possible: 5, requirements: 'Build in dense areas with diverse uses nearby' },
    { category: 'sustainable_sites', credit_name: 'Access to Quality Transit', credit_code: 'SS Credit 8', is_prerequisite: false, points_possible: 5, requirements: 'Locate near public transit' },

    // Water Efficiency (11 points possible)
    { category: 'water_efficiency', credit_name: 'Outdoor Water Use Reduction', credit_code: 'WE Prereq 1', is_prerequisite: true, points_possible: 0, requirements: 'Reduce outdoor water use by 30%' },
    { category: 'water_efficiency', credit_name: 'Indoor Water Use Reduction', credit_code: 'WE Prereq 2', is_prerequisite: true, points_possible: 0, requirements: 'Reduce indoor water use by 20%' },
    { category: 'water_efficiency', credit_name: 'Building-Level Water Metering', credit_code: 'WE Prereq 3', is_prerequisite: true, points_possible: 0, requirements: 'Install water meters for whole building' },
    { category: 'water_efficiency', credit_name: 'Outdoor Water Use Reduction', credit_code: 'WE Credit 1', is_prerequisite: false, points_possible: 2, requirements: 'Additional outdoor water reduction' },
    { category: 'water_efficiency', credit_name: 'Indoor Water Use Reduction', credit_code: 'WE Credit 2', is_prerequisite: false, points_possible: 6, requirements: 'Additional indoor water reduction (30-50%)' },
    { category: 'water_efficiency', credit_name: 'Cooling Tower Water Use', credit_code: 'WE Credit 3', is_prerequisite: false, points_possible: 2, requirements: 'Reduce cooling tower water consumption' },
    { category: 'water_efficiency', credit_name: 'Water Metering', credit_code: 'WE Credit 4', is_prerequisite: false, points_possible: 1, requirements: 'Install sub-meters for water systems' },

    // Energy & Atmosphere (33 points possible)
    { category: 'energy_atmosphere', credit_name: 'Fundamental Commissioning and Verification', credit_code: 'EA Prereq 1', is_prerequisite: true, points_possible: 0, requirements: 'Commission building energy systems' },
    { category: 'energy_atmosphere', credit_name: 'Minimum Energy Performance', credit_code: 'EA Prereq 2', is_prerequisite: true, points_possible: 0, requirements: 'Meet minimum energy performance' },
    { category: 'energy_atmosphere', credit_name: 'Building-Level Energy Metering', credit_code: 'EA Prereq 3', is_prerequisite: true, points_possible: 0, requirements: 'Install energy meters' },
    { category: 'energy_atmosphere', credit_name: 'Fundamental Refrigerant Management', credit_code: 'EA Prereq 4', is_prerequisite: true, points_possible: 0, requirements: 'No CFCs in HVAC systems' },
    { category: 'energy_atmosphere', credit_name: 'Enhanced Commissioning', credit_code: 'EA Credit 1', is_prerequisite: false, points_possible: 6, requirements: 'Enhanced commissioning process' },
    { category: 'energy_atmosphere', credit_name: 'Optimize Energy Performance', credit_code: 'EA Credit 2', is_prerequisite: false, points_possible: 18, requirements: 'Exceed minimum energy performance (5-50% improvement)' },
    { category: 'energy_atmosphere', credit_name: 'Advanced Energy Metering', credit_code: 'EA Credit 3', is_prerequisite: false, points_possible: 1, requirements: 'Install advanced energy meters' },
    { category: 'energy_atmosphere', credit_name: 'Demand Response', credit_code: 'EA Credit 4', is_prerequisite: false, points_possible: 2, requirements: 'Participate in demand response program' },
    { category: 'energy_atmosphere', credit_name: 'Renewable Energy Production', credit_code: 'EA Credit 5', is_prerequisite: false, points_possible: 3, requirements: 'Generate renewable energy on-site' },
    { category: 'energy_atmosphere', credit_name: 'Enhanced Refrigerant Management', credit_code: 'EA Credit 6', is_prerequisite: false, points_possible: 1, requirements: 'Eliminate refrigerant use or use low-GWP refrigerants' },
    { category: 'energy_atmosphere', credit_name: 'Green Power and Carbon Offsets', credit_code: 'EA Credit 7', is_prerequisite: false, points_possible: 2, requirements: 'Purchase green power or carbon offsets' },

    // Materials & Resources (13 points possible)
    { category: 'materials_resources', credit_name: 'Storage and Collection of Recyclables', credit_code: 'MR Prereq 1', is_prerequisite: true, points_possible: 0, requirements: 'Provide recycling infrastructure' },
    { category: 'materials_resources', credit_name: 'Construction and Demolition Waste Management Planning', credit_code: 'MR Prereq 2', is_prerequisite: true, points_possible: 0, requirements: 'Create waste management plan' },
    { category: 'materials_resources', credit_name: 'Building Life-Cycle Impact Reduction', credit_code: 'MR Credit 1', is_prerequisite: false, points_possible: 5, requirements: 'Reuse existing building or use LCA' },
    { category: 'materials_resources', credit_name: 'Building Product Disclosure and Optimization - Environmental Product Declarations', credit_code: 'MR Credit 2', is_prerequisite: false, points_possible: 2, requirements: 'Use products with EPDs' },
    { category: 'materials_resources', credit_name: 'Building Product Disclosure and Optimization - Sourcing of Raw Materials', credit_code: 'MR Credit 3', is_prerequisite: false, points_possible: 2, requirements: 'Use responsibly sourced materials' },
    { category: 'materials_resources', credit_name: 'Building Product Disclosure and Optimization - Material Ingredients', credit_code: 'MR Credit 4', is_prerequisite: false, points_possible: 2, requirements: 'Use products with ingredient disclosure' },
    { category: 'materials_resources', credit_name: 'Construction and Demolition Waste Management', credit_code: 'MR Credit 5', is_prerequisite: false, points_possible: 2, requirements: 'Divert waste from landfill (50-75%)' },

    // Indoor Environmental Quality (16 points possible)
    { category: 'indoor_environmental_quality', credit_name: 'Minimum Indoor Air Quality Performance', credit_code: 'EQ Prereq 1', is_prerequisite: true, points_possible: 0, requirements: 'Meet minimum IAQ requirements' },
    { category: 'indoor_environmental_quality', credit_name: 'Environmental Tobacco Smoke Control', credit_code: 'EQ Prereq 2', is_prerequisite: true, points_possible: 0, requirements: 'Prohibit smoking in building' },
    { category: 'indoor_environmental_quality', credit_name: 'Enhanced Indoor Air Quality Strategies', credit_code: 'EQ Credit 1', is_prerequisite: false, points_possible: 2, requirements: 'Implement enhanced ventilation' },
    { category: 'indoor_environmental_quality', credit_name: 'Low-Emitting Materials', credit_code: 'EQ Credit 2', is_prerequisite: false, points_possible: 3, requirements: 'Use low-VOC materials' },
    { category: 'indoor_environmental_quality', credit_name: 'Construction Indoor Air Quality Management Plan', credit_code: 'EQ Credit 3', is_prerequisite: false, points_possible: 1, requirements: 'Protect IAQ during construction' },
    { category: 'indoor_environmental_quality', credit_name: 'Indoor Air Quality Assessment', credit_code: 'EQ Credit 4', is_prerequisite: false, points_possible: 2, requirements: 'Test IAQ before occupancy' },
    { category: 'indoor_environmental_quality', credit_name: 'Thermal Comfort', credit_code: 'EQ Credit 5', is_prerequisite: false, points_possible: 1, requirements: 'Design for thermal comfort' },
    { category: 'indoor_environmental_quality', credit_name: 'Interior Lighting', credit_code: 'EQ Credit 6', is_prerequisite: false, points_possible: 2, requirements: 'Provide quality lighting and controls' },
    { category: 'indoor_environmental_quality', credit_name: 'Daylight', credit_code: 'EQ Credit 7', is_prerequisite: false, points_possible: 3, requirements: 'Provide daylight to occupied spaces' },
    { category: 'indoor_environmental_quality', credit_name: 'Quality Views', credit_code: 'EQ Credit 8', is_prerequisite: false, points_possible: 1, requirements: 'Provide exterior views' },
    { category: 'indoor_environmental_quality', credit_name: 'Acoustic Performance', credit_code: 'EQ Credit 9', is_prerequisite: false, points_possible: 1, requirements: 'Design for acoustic comfort' },

    // Innovation (6 points possible)
    { category: 'innovation', credit_name: 'Innovation', credit_code: 'IN Credit 1', is_prerequisite: false, points_possible: 5, requirements: 'Achieve innovation in design or performance' },
    { category: 'innovation', credit_name: 'LEED Accredited Professional', credit_code: 'IN Credit 2', is_prerequisite: false, points_possible: 1, requirements: 'Have LEED AP on project team' },

    // Regional Priority (4 points possible)
    { category: 'regional_priority', credit_name: 'Regional Priority', credit_code: 'RP Credit 1', is_prerequisite: false, points_possible: 4, requirements: 'Earn regional priority credits for location' },
  ]
}
```

**Carbon Footprint Calculator**:
```typescript
// lib/sustainability/carbon-calculator.ts

import { createClient } from '@/lib/supabase/server'

interface CarbonCalculationInput {
  projectId: string
  category: 'materials' | 'transportation' | 'energy' | 'waste' | 'water'
  subcategory: string
  quantity: number
  unit: string
}

// Emission factors (kg CO2e per unit) - source: EPA, NREL, ICE Database
const EMISSION_FACTORS: Record<string, Record<string, number>> = {
  materials: {
    'concrete_per_ton': 410, // kg CO2e per ton
    'steel_virgin_per_ton': 1850,
    'steel_recycled_per_ton': 750,
    'lumber_per_bf': 0.45, // per board foot
    'drywall_per_sqft': 0.41,
    'insulation_fiberglass_per_sqft': 1.2,
    'asphalt_shingles_per_sqft': 0.92,
    'aluminum_per_lb': 9.8,
    'glass_per_sqft': 5.4,
    'paint_per_gallon': 6.5,
  },
  transportation: {
    'diesel_truck_per_mile': 2.7, // kg CO2e per mile
    'gasoline_car_per_mile': 0.89,
    'worker_commute_per_mile': 0.89,
    'material_delivery_per_ton_mile': 0.062, // per ton-mile
  },
  energy: {
    'electricity_per_kwh': 0.45, // US average grid
    'natural_gas_per_therm': 5.3,
    'diesel_per_gallon': 10.2,
    'gasoline_per_gallon': 8.9,
  },
  waste: {
    'landfill_per_ton': 50, // Methane emissions
    'incineration_per_ton': 33,
  },
  water: {
    'municipal_water_per_gallon': 0.0052, // Treatment and pumping
    'wastewater_per_gallon': 0.0066,
  },
}

export async function calculateCarbonEmissions(
  input: CarbonCalculationInput
): Promise<{ co2e_kg: number; emission_factor: number; source: string }> {
  const { category, subcategory, quantity, unit } = input

  // Get emission factor
  const emissionFactor = EMISSION_FACTORS[category]?.[`${subcategory}_per_${unit}`]

  if (!emissionFactor) {
    throw new Error(`No emission factor found for ${category} - ${subcategory} - ${unit}`)
  }

  const co2e_kg = quantity * emissionFactor

  return {
    co2e_kg,
    emission_factor: emissionFactor,
    source: 'EPA/NREL/ICE Database',
  }
}

export async function calculateMaterialCarbon(
  materialName: string,
  quantity: number,
  unit: string
): Promise<number> {
  // Map material names to emission factors
  const materialMap: Record<string, string> = {
    'concrete': 'concrete_per_ton',
    'steel': 'steel_virgin_per_ton',
    'recycled steel': 'steel_recycled_per_ton',
    'lumber': 'lumber_per_bf',
    'drywall': 'drywall_per_sqft',
    'insulation': 'insulation_fiberglass_per_sqft',
    'shingles': 'asphalt_shingles_per_sqft',
  }

  const materialKey = materialMap[materialName.toLowerCase()]
  if (!materialKey) {
    return 0 // Unknown material
  }

  const emissionFactor = EMISSION_FACTORS.materials[materialKey]
  return quantity * emissionFactor
}

export async function generateProjectCarbonReport(projectId: string) {
  const supabase = createClient()

  // Get all carbon tracking entries
  const { data: carbonData } = await supabase
    .from('carbon_tracking')
    .select('*')
    .eq('project_id', projectId)

  if (!carbonData || carbonData.length === 0) {
    return {
      total_co2e_tons: 0,
      by_category: {},
      recommendations: [],
    }
  }

  // Calculate totals by category
  const byCategory: Record<string, number> = {}
  let totalTons = 0

  carbonData.forEach(entry => {
    const category = entry.emission_category
    const tons = entry.total_co2e_tons || 0
    byCategory[category] = (byCategory[category] || 0) + tons
    totalTons += tons
  })

  // Generate recommendations
  const recommendations = generateCarbonReductionRecommendations(byCategory, totalTons)

  return {
    total_co2e_tons: totalTons,
    by_category: byCategory,
    percentage_breakdown: Object.fromEntries(
      Object.entries(byCategory).map(([cat, tons]) => [
        cat,
        ((tons / totalTons) * 100).toFixed(1) + '%'
      ])
    ),
    recommendations,
  }
}

function generateCarbonReductionRecommendations(
  byCategory: Record<string, number>,
  totalTons: number
): Array<{ recommendation: string; potential_reduction_tons: number }> {
  const recommendations = []

  // Materials-based recommendations
  const materialsTons = byCategory.materials || 0
  if (materialsTons > totalTons * 0.4) {
    recommendations.push({
      recommendation: 'Use recycled steel instead of virgin steel (-60% emissions)',
      potential_reduction_tons: materialsTons * 0.4, // Assume 40% is steel
    })
    recommendations.push({
      recommendation: 'Source materials locally (<500 miles) to reduce transportation',
      potential_reduction_tons: materialsTons * 0.1,
    })
  }

  // Transportation recommendations
  const transportTons = byCategory.transportation || 0
  if (transportTons > totalTons * 0.2) {
    recommendations.push({
      recommendation: 'Optimize delivery schedules to reduce trips',
      potential_reduction_tons: transportTons * 0.15,
    })
  }

  // Energy recommendations
  const energyTons = byCategory.energy || 0
  if (energyTons > totalTons * 0.1) {
    recommendations.push({
      recommendation: 'Use solar generators on-site during construction',
      potential_reduction_tons: energyTons * 0.3,
    })
  }

  return recommendations
}
```

**UI Implementation**:
```typescript
// components/sustainability/LEEDScorecard.tsx

'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { LeafIcon, CheckCircle2Icon, CircleIcon, AlertCircleIcon } from 'lucide-react'

interface LEEDCredit {
  id: string
  category: string
  credit_name: string
  credit_code: string
  is_prerequisite: boolean
  points_possible: number
  points_targeted: number
  points_achieved: number
  status: string
  requirements: string
}

interface LEEDCertification {
  id: string
  project_id: string
  target_level: string
  current_points: number
  possible_points: number
  leed_credits: LEEDCredit[]
}

export function LEEDScorecard({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['leed-certification', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/sustainability/leed?project_id=${projectId}`)
      if (!res.ok) throw new Error('Failed to fetch LEED data')
      const json = await res.json()
      return json.certifications[0] as LEEDCertification
    },
  })

  const updateCreditMutation = useMutation({
    mutationFn: async ({
      creditId,
      pointsAchieved,
      status,
    }: {
      creditId: string
      pointsAchieved: number
      status: string
    }) => {
      const res = await fetch(`/api/sustainability/leed/credits/${creditId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points_achieved: pointsAchieved, status }),
      })
      if (!res.ok) throw new Error('Failed to update credit')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leed-certification', projectId] })
    },
  })

  if (isLoading) {
    return <div>Loading LEED scorecard...</div>
  }

  if (!data) {
    return <div>No LEED certification found for this project</div>
  }

  const { current_points, possible_points, target_level, leed_credits } = data

  // Group credits by category
  const creditsByCategory = leed_credits.reduce((acc, credit) => {
    if (!acc[credit.category]) {
      acc[credit.category] = []
    }
    acc[credit.category].push(credit)
    return acc
  }, {} as Record<string, LEEDCredit[]>)

  // Calculate category totals
  const categoryTotals = Object.entries(creditsByCategory).map(([category, credits]) => ({
    category,
    possible: credits.reduce((sum, c) => sum + c.points_possible, 0),
    achieved: credits.reduce((sum, c) => sum + c.points_achieved, 0),
    credits,
  }))

  // Determine current level
  const getCurrentLevel = (points: number) => {
    if (points >= 80) return 'Platinum'
    if (points >= 60) return 'Gold'
    if (points >= 50) return 'Silver'
    if (points >= 40) return 'Certified'
    return 'Not Certified'
  }

  const currentLevel = getCurrentLevel(current_points)
  const progressToTarget = target_level === 'platinum' ? 80 :
    target_level === 'gold' ? 60 :
    target_level === 'silver' ? 50 : 40

  const pointsNeeded = Math.max(0, progressToTarget - current_points)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LeafIcon className="w-6 h-6 text-green-600" />
            LEED Certification Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">
                {current_points} / {possible_points} points
              </div>
              <div className="text-sm text-muted-foreground">
                Current Level: <Badge variant={currentLevel === 'Not Certified' ? 'destructive' : 'default'}>
                  {currentLevel}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">
                Target: {target_level.charAt(0).toUpperCase() + target_level.slice(1)}
              </div>
              <div className="text-sm text-muted-foreground">
                {pointsNeeded > 0 ? `${pointsNeeded} points needed` : 'Target achieved!'}
              </div>
            </div>
          </div>

          <Progress value={(current_points / progressToTarget) * 100} className="h-3" />

          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <div>
              <div className={`font-semibold ${current_points >= 40 ? 'text-green-600' : ''}`}>
                Certified
              </div>
              <div className="text-xs text-muted-foreground">40 pts</div>
            </div>
            <div>
              <div className={`font-semibold ${current_points >= 50 ? 'text-green-600' : ''}`}>
                Silver
              </div>
              <div className="text-xs text-muted-foreground">50 pts</div>
            </div>
            <div>
              <div className={`font-semibold ${current_points >= 60 ? 'text-green-600' : ''}`}>
                Gold
              </div>
              <div className="text-xs text-muted-foreground">60 pts</div>
            </div>
            <div>
              <div className={`font-semibold ${current_points >= 80 ? 'text-green-600' : ''}`}>
                Platinum
              </div>
              <div className="text-xs text-muted-foreground">80 pts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Tabs defaultValue="sustainable_sites">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="sustainable_sites">Sites</TabsTrigger>
          <TabsTrigger value="water_efficiency">Water</TabsTrigger>
          <TabsTrigger value="energy_atmosphere">Energy</TabsTrigger>
          <TabsTrigger value="materials_resources">Materials</TabsTrigger>
          <TabsTrigger value="indoor_environmental_quality">IEQ</TabsTrigger>
          <TabsTrigger value="innovation">Innovation</TabsTrigger>
          <TabsTrigger value="regional_priority">Regional</TabsTrigger>
        </TabsList>

        {categoryTotals.map(({ category, possible, achieved, credits }) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                  <Badge variant="outline">
                    {achieved} / {possible} points
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {credits.map((credit) => (
                    <AccordionItem key={credit.id} value={credit.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-2 text-left">
                          {credit.points_achieved > 0 ? (
                            <CheckCircle2Icon className="w-4 h-4 text-green-600 flex-shrink-0" />
                          ) : credit.status === 'targeted' ? (
                            <CircleIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          ) : (
                            <CircleIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">
                              {credit.credit_code}: {credit.credit_name}
                              {credit.is_prerequisite && (
                                <Badge variant="destructive" className="ml-2">Prerequisite</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {credit.points_achieved} / {credit.points_possible} points
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          <div>
                            <div className="text-sm font-semibold">Requirements:</div>
                            <div className="text-sm text-muted-foreground">{credit.requirements}</div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={credit.status === 'achieved' ? 'default' : 'outline'}
                              onClick={() => {
                                const newPoints = credit.status === 'achieved' ? 0 : credit.points_possible
                                const newStatus = credit.status === 'achieved' ? 'targeted' : 'achieved'
                                updateCreditMutation.mutate({
                                  creditId: credit.id,
                                  pointsAchieved: newPoints,
                                  status: newStatus,
                                })
                              }}
                            >
                              {credit.status === 'achieved' ? 'Mark Not Achieved' : 'Mark Achieved'}
                            </Button>

                            {credit.status !== 'achieved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  updateCreditMutation.mutate({
                                    creditId: credit.id,
                                    pointsAchieved: 0,
                                    status: credit.status === 'targeted' ? 'not_pursued' : 'targeted',
                                  })
                                }}
                              >
                                {credit.status === 'targeted' ? 'Remove from Target' : 'Add to Target'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Recommendations */}
      {pointsNeeded > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircleIcon className="w-5 h-5 text-amber-600" />
              Recommendations to Reach {target_level.charAt(0).toUpperCase() + target_level.slice(1)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">
                You need <strong>{pointsNeeded} more points</strong> to reach {target_level}. Here are the easiest credits to pursue:
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Construction IAQ Management Plan (EQ Credit 3) - 1 point - Easy to implement</li>
                <li>Regional Materials (MR Credit 3) - 2 points - Source materials locally</li>
                <li>Construction and Demolition Waste Management (MR Credit 5) - 2 points - Track waste diversion</li>
                <li>Enhanced Commissioning (EA Credit 1) - up to 6 points - Hire commissioning agent</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

**Testing Checklist**:
- [ ] LEED point calculations match official LEED v4.1 BD+C scorecard
- [ ] Scorecard updates in real-time (<200ms) when credits change
- [ ] Prerequisites are clearly marked and required for submission
- [ ] Point totals by category are accurate
- [ ] Progress bar correctly shows distance to certification levels
- [ ] Carbon footprint calculator accurate to ±0.1 metric tons
- [ ] Emission factors match EPA/NREL/ICE Database standards
- [ ] Material certifications (EPD, HPD, FSC) are validated
- [ ] Waste diversion rate calculation is accurate
- [ ] Regional materials distance calculation is correct (<500 miles)
- [ ] Recycled content percentages are validated (0-100%)
- [ ] VOC content measurements are accurate
- [ ] LEED credit recommendations are relevant and actionable
- [ ] Export to PDF maintains formatting
- [ ] All sustainability data is protected by RLS policies

**Success Metrics**:
- 30% of projects track sustainability data
- 5 LEED certifications achieved within first year
- Average carbon footprint reduction: 15% vs. baseline
- Waste diversion rate: >75% average across projects
- 90% of users find LEED tracker "easy to use" (CSAT)

---

## 2. USER EXPERIENCE QUALITY STANDARDS

- **Loading states**: Skeleton loaders for scorecard, shimmer for charts
- **Empty states**: "Start tracking sustainability by setting LEED target" with CTA button
- **Error states**: "Failed to calculate carbon footprint. Check emission factors and try again."
- **Mobile optimization**: Touch-friendly credit checkboxes, swipe to mark achieved
- **Keyboard navigation**: Tab through credits, Space to toggle achieved status
- **Accessibility**: Screen reader announces point changes, high contrast for color-blind users

---

## 3. PERFORMANCE REQUIREMENTS

- LEED scorecard load: <500ms
- Point calculation: <200ms after credit update
- Carbon footprint calculation: <1 second for 1000+ entries
- Material search: <300ms with fuzzy matching
- Waste report generation: <2 seconds
- Database queries: <100ms (indexed on project_id, category)

---

## 4. SECURITY REQUIREMENTS

- All sustainability data protected by RLS policies
- Only users with project edit permission can update LEED credits
- Waste tracking requires authentication
- Carbon data can be marked "verified" by authorized users only
- Material cost data visible only to users with budget permissions
- Audit log for all LEED credit changes
- Export reports watermarked with company name and date

---

## 5. PRE-LAUNCH CHECKLIST

### Functional Testing (50 items)
- [ ] Create LEED certification for project
- [ ] Initialize all 110 LEED v4.1 BD+C credits
- [ ] Mark credit as achieved (points update correctly)
- [ ] Mark prerequisite as not met (shows warning)
- [ ] Calculate current certification level (Certified/Silver/Gold/Platinum)
- [ ] Add sustainable material with EPD
- [ ] Add sustainable material with recycled content
- [ ] Calculate regional material eligibility (<500 miles)
- [ ] Track waste by type (metal, wood, concrete, etc.)
- [ ] Calculate waste diversion rate
- [ ] Log carbon emission - materials
- [ ] Log carbon emission - transportation
- [ ] Log carbon emission - energy
- [ ] Calculate total project carbon footprint
- [ ] Generate carbon reduction recommendations
- [ ] Export LEED scorecard to PDF
- [ ] Export carbon report to PDF
- [ ] Export waste tracking report
- [ ] Search materials database by certification
- [ ] Filter credits by category
- [ ] Filter credits by status (achieved, targeted, not pursued)
- [ ] Validate recycled content percentage (0-100%)
- [ ] Validate VOC content measurements
- [ ] Validate distance calculations for regional materials
- [ ] Check prerequisite dependencies
- [ ] Verify point totals match category subtotals
- [ ] Test real-time point updates
- [ ] Test multi-user concurrent editing
- [ ] Test material cost calculations
- [ ] Test waste tonnage to volume conversions
- [ ] Verify RLS policies (users can only see their company data)
- [ ] Test LEED AP credential validation
- [ ] Test certification status workflow (planning → registered → submitted → certified)
- [ ] Validate emission factor accuracy
- [ ] Test carbon offset recommendations
- [ ] Test waste hauler documentation upload
- [ ] Verify material certification document storage
- [ ] Test bulk material import from CSV
- [ ] Test LEED credit appeal tracking
- [ ] Test regional priority credit assignment
- [ ] Validate innovation credit documentation
- [ ] Test LEED submittal package generation
- [ ] Verify waste ticket photo upload
- [ ] Test material search autocomplete
- [ ] Validate embodied carbon calculations
- [ ] Test sustainability dashboard metrics
- [ ] Verify LEED version selection (v4, v4.1, etc.)
- [ ] Test project comparison (carbon footprint benchmarking)
- [ ] Validate material quantity unit conversions
- [ ] Test responsible party assignments for credits

### UX Testing (20 items)
- [ ] Scorecard displays clearly on desktop (1920x1080)
- [ ] Scorecard displays clearly on tablet (768x1024)
- [ ] Scorecard displays clearly on mobile (375x667)
- [ ] Credit accordion expands/collapses smoothly
- [ ] Progress bar animates when points change
- [ ] Tooltips explain LEED terminology
- [ ] Color coding is accessible (not relying on color alone)
- [ ] Empty states have clear CTAs
- [ ] Loading states don't block entire page
- [ ] Error messages are actionable
- [ ] Success messages confirm actions
- [ ] Forms have inline validation
- [ ] Large data sets (100+ materials) scroll smoothly
- [ ] Charts and graphs are readable
- [ ] PDF exports are formatted correctly
- [ ] Touch targets are 44x44px minimum
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces point changes
- [ ] High contrast mode is readable
- [ ] Print stylesheet formats nicely

### Performance Testing (10 items)
- [ ] Scorecard loads in <500ms
- [ ] Point calculation completes in <200ms
- [ ] Carbon calculation handles 1000+ entries in <1s
- [ ] Material search returns results in <300ms
- [ ] Waste report generates in <2s
- [ ] Database queries complete in <100ms
- [ ] Page remains responsive during calculations
- [ ] No memory leaks during extended use
- [ ] Optimistic updates feel instant
- [ ] Real-time sync doesn't lag

### Security Testing (15 items)
- [ ] RLS prevents cross-company data access
- [ ] API endpoints require authentication
- [ ] Zod validation rejects invalid inputs
- [ ] SQL injection attempts are blocked
- [ ] XSS attempts are sanitized
- [ ] File uploads are scanned for malware
- [ ] Rate limiting prevents abuse
- [ ] Sensitive data (costs) requires permissions
- [ ] Audit log captures all changes
- [ ] Session timeout after 24 hours
- [ ] CORS configured correctly
- [ ] HTTPS enforced
- [ ] API keys are not exposed client-side
- [ ] Uploaded files have unique, unpredictable names
- [ ] Database backups are encrypted

### Mobile Testing (10 items)
- [ ] LEED scorecard renders correctly on iOS Safari
- [ ] LEED scorecard renders correctly on Android Chrome
- [ ] Touch targets are appropriate size
- [ ] Swipe gestures work smoothly
- [ ] Forms are easy to fill on mobile
- [ ] Camera integration works for photos
- [ ] GPS location captures accurately
- [ ] Offline mode queues changes
- [ ] Push notifications work
- [ ] App doesn't drain battery excessively

### Accessibility Testing (10 items)
- [ ] Passes WAVE accessibility checker
- [ ] Passes axe DevTools audit
- [ ] Screen reader (NVDA) reads content correctly
- [ ] Keyboard navigation reaches all interactive elements
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1)
- [ ] Images have alt text
- [ ] Forms have proper labels
- [ ] Error messages are associated with inputs
- [ ] Headings are in logical order

---

## 6. SUCCESS METRICS

- **Adoption**: 30% of projects actively track sustainability
- **LEED Certifications**: 5 achieved in first year
- **Carbon Reduction**: Average 15% reduction vs. similar projects
- **Waste Diversion**: Average 75% diversion rate across projects
- **User Satisfaction**: 4.5/5 CSAT for sustainability module
- **Data Accuracy**: <1% error rate in LEED calculations
- **Time Savings**: 10 hours saved per LEED submission vs. manual process
- **Competitive Wins**: 20% of RFPs requiring sustainability documentation won

---

## 7. COMPETITIVE EDGE

**vs Procore**: No sustainability module at all
**vs Buildertrend**: Basic carbon calculator only, no LEED tracking
**vs Arcadis (specialty consultants)**: We integrate with project management, they don't

**What Makes Us Better**:
1. Integrated LEED scorecard (not separate spreadsheet)
2. Real-time carbon tracking (not post-construction analysis)
3. Actionable recommendations (not just data)
4. Material certification database (10,000+ products with EPDs)
5. Auto-generate LEED documentation (save 10+ hours per project)
6. ROI calculator (show financial benefits of green building)
7. Benchmarking (compare to similar projects)

**Win Statement**: "The Sierra Suites helped us achieve LEED Gold certification 3 weeks faster than our previous project, saving $15K in consultant fees. The integrated LEED tracker meant we didn't miss any easy credits, and the carbon calculator helped us choose lower-impact materials that also saved money."
