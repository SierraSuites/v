-- ============================================================================
-- SUSTAINABILITY HUB - COMPLETE DATABASE SCHEMA
-- The Sierra Suites Construction SaaS Platform
-- Pro & Enterprise Feature
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. SUSTAINABILITY PROJECTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sustainability_projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Certification Targets
  target_certification VARCHAR(100), -- LEED Gold, WELL Platinum, BREEAM Excellent
  certification_level VARCHAR(50), -- Certified, Silver, Gold, Platinum
  target_score DECIMAL(5,2),
  current_score DECIMAL(5,2),

  -- Assessment Tracking
  last_assessment_date DATE,
  next_assessment_date DATE,
  assessor_id UUID REFERENCES auth.users(id),

  -- Goals
  carbon_reduction_goal DECIMAL(10,2), -- Percentage reduction target
  waste_diversion_goal DECIMAL(5,2), -- Percentage to divert from landfill
  water_reduction_goal DECIMAL(10,2), -- Gallons to save

  -- Status
  status VARCHAR(50) DEFAULT 'planning', -- planning, in_progress, submitted, certified
  certification_cost DECIMAL(10,2),
  roi_estimate DECIMAL(10,2),

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. CARBON FOOTPRINT TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.carbon_footprint (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Date Tracking
  date DATE NOT NULL,
  reporting_period VARCHAR(50), -- daily, weekly, monthly, quarterly

  -- Scope 1: Direct Emissions (equipment, vehicles)
  scope_1_total DECIMAL(10,2) DEFAULT 0, -- kg CO2e
  scope_1_diesel DECIMAL(10,2) DEFAULT 0,
  scope_1_gasoline DECIMAL(10,2) DEFAULT 0,
  scope_1_natural_gas DECIMAL(10,2) DEFAULT 0,
  scope_1_refrigerants DECIMAL(10,2) DEFAULT 0,

  -- Scope 2: Indirect Emissions (purchased energy)
  scope_2_total DECIMAL(10,2) DEFAULT 0, -- kg CO2e
  scope_2_electricity DECIMAL(10,2) DEFAULT 0,
  scope_2_heating DECIMAL(10,2) DEFAULT 0,
  scope_2_cooling DECIMAL(10,2) DEFAULT 0,

  -- Scope 3: Value Chain Emissions
  scope_3_total DECIMAL(10,2) DEFAULT 0, -- kg CO2e
  scope_3_materials DECIMAL(10,2) DEFAULT 0,
  scope_3_transportation DECIMAL(10,2) DEFAULT 0,
  scope_3_waste DECIMAL(10,2) DEFAULT 0,
  scope_3_business_travel DECIMAL(10,2) DEFAULT 0,
  scope_3_employee_commute DECIMAL(10,2) DEFAULT 0,

  -- Total Calculation
  total_emissions DECIMAL(10,2) GENERATED ALWAYS AS (
    COALESCE(scope_1_total, 0) + COALESCE(scope_2_total, 0) + COALESCE(scope_3_total, 0)
  ) STORED,

  -- Detailed Breakdown (JSONB for flexibility)
  source_breakdown JSONB, -- {concrete: 1200, steel: 800, lumber: 400}

  -- Targets & Reductions
  reduction_target DECIMAL(10,2), -- Target for next period
  reduction_achieved DECIMAL(10,2), -- Actual reduction vs baseline
  offset_credits DECIMAL(10,2), -- Carbon credits purchased

  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP,

  notes TEXT,
  attachments TEXT[], -- Supporting documents
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 3. MATERIAL WASTE TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.material_waste (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Material Details
  material_type VARCHAR(100) NOT NULL, -- concrete, lumber, drywall, steel, etc.
  material_category VARCHAR(50), -- structural, finishing, mechanical, electrical
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL, -- tons, cubic yards, square feet, linear feet

  -- Waste Classification
  waste_type VARCHAR(50) NOT NULL, -- landfill, recycled, reused, donated, composted
  diversion_rate DECIMAL(5,2), -- Percentage diverted from landfill

  -- Financial Impact
  cost_per_unit DECIMAL(10,2),
  cost_lost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * COALESCE(cost_per_unit, 0)) STORED,
  disposal_cost DECIMAL(10,2),
  recovery_value DECIMAL(10,2), -- Money from selling recyclables

  -- Location & Documentation
  location_on_site TEXT,
  photo_url TEXT,

  -- Cause Analysis
  waste_reason VARCHAR(100), -- overordering, damage, rework, design_change, theft
  preventable BOOLEAN DEFAULT false,
  prevention_notes TEXT,

  -- Tracking
  reported_by UUID REFERENCES auth.users(id),
  reported_date DATE DEFAULT CURRENT_DATE,

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 4. WATER MONITORING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.water_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Usage Tracking
  date DATE NOT NULL,
  usage_type VARCHAR(50), -- potable, non_potable, recycled
  gallons_used DECIMAL(10,2) NOT NULL,

  -- Usage Category
  category VARCHAR(50), -- dust_control, concrete_mixing, landscaping, domestic
  source VARCHAR(50), -- municipal, well, rainwater_harvesting, greywater

  -- Conservation
  conservation_method VARCHAR(100), -- low_flow_fixtures, rainwater_capture, etc.
  gallons_saved DECIMAL(10,2),

  -- Costs
  cost_per_gallon DECIMAL(6,4),
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (gallons_used * COALESCE(cost_per_gallon, 0)) STORED,

  -- Compliance
  permit_required BOOLEAN DEFAULT false,
  permit_number VARCHAR(100),

  meter_reading DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 5. SUSTAINABLE MATERIALS DATABASE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sustainable_materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Material Identification
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL, -- insulation, flooring, roofing, concrete, steel
  subcategory VARCHAR(100),
  manufacturer VARCHAR(200),
  model_number VARCHAR(100),

  -- Environmental Data
  epd_url TEXT, -- Environmental Product Declaration
  hpd_url TEXT, -- Health Product Declaration
  declare_label_url TEXT, -- Living Building Challenge Declare label

  -- Carbon Impact
  embodied_carbon DECIMAL(10,2), -- kg CO2e per unit
  carbon_unit VARCHAR(20), -- per ton, per sqft, etc.

  -- Sustainability Metrics
  recycled_content DECIMAL(5,2), -- Percentage
  recyclable BOOLEAN DEFAULT false,
  renewable BOOLEAN DEFAULT false,
  biodegradable BOOLEAN DEFAULT false,
  voc_content DECIMAL(6,2), -- g/L for VOC emissions

  -- Sourcing
  local_sourcing BOOLEAN DEFAULT false,
  local_sourcing_distance INTEGER, -- miles from project
  regional_materials BOOLEAN DEFAULT false, -- Within 500 miles

  -- Certifications
  certifications TEXT[], -- FSC, Cradle2Cradle, GreenGuard, etc.
  third_party_verified BOOLEAN DEFAULT false,

  -- Economic Data
  cost_per_unit DECIMAL(10,2),
  cost_unit VARCHAR(20),
  cost_premium DECIMAL(5,2), -- % above conventional alternative

  -- Certification Points
  leed_points INTEGER DEFAULT 0,
  well_points INTEGER DEFAULT 0,
  breeam_points INTEGER DEFAULT 0,
  living_building_challenge BOOLEAN DEFAULT false,

  -- Availability
  lead_time_days INTEGER,
  minimum_order DECIMAL(10,2),
  available_regions TEXT[],

  -- Performance
  durability_years INTEGER,
  maintenance_requirements TEXT,
  warranty_years INTEGER,

  -- Approval Status
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 6. CERTIFICATION REQUIREMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.certification_requirements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Certification Details
  certification_type VARCHAR(100) NOT NULL, -- LEED, WELL, BREEAM, Living Building
  version VARCHAR(50), -- LEED v4.1, WELL v2, etc.
  rating_system VARCHAR(100), -- BD+C, ID+C, O+M, etc.

  -- Requirement Details
  category VARCHAR(100), -- Energy, Water, Materials, IEQ, etc.
  requirement_code VARCHAR(50), -- LEED EQc4.1, WELL L01, etc.
  requirement_name VARCHAR(200),
  requirement_text TEXT,

  -- Points
  points_possible INTEGER,
  points_targeted INTEGER,
  points_achieved INTEGER DEFAULT 0,
  is_prerequisite BOOLEAN DEFAULT false,

  -- Documentation
  documentation_required TEXT[], -- List of required documents
  documentation_uploaded TEXT[], -- URLs to uploaded docs
  submittal_template_url TEXT,

  -- Timeline
  deadline DATE,
  submitted_date DATE,
  review_date DATE,
  approval_date DATE,

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  responsible_party VARCHAR(100), -- Architect, GC, MEP, etc.

  -- Status
  status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_progress, ready, submitted, approved, denied
  completion_percentage DECIMAL(5,2) DEFAULT 0,

  -- Review Feedback
  reviewer_comments TEXT,
  clarification_requests TEXT[],

  -- Budget
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 7. ESG METRICS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.esg_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Reporting Period
  reporting_period VARCHAR(50), -- Q1 2024, FY 2024, etc.
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- ENVIRONMENTAL
  total_carbon_emissions DECIMAL(10,2), -- tons CO2e
  carbon_intensity DECIMAL(10,4), -- CO2e per sqft
  waste_generated DECIMAL(10,2), -- tons
  waste_diverted DECIMAL(5,2), -- percentage
  water_consumed DECIMAL(10,2), -- gallons
  energy_consumed DECIMAL(10,2), -- kWh
  renewable_energy_percentage DECIMAL(5,2),

  -- SOCIAL
  total_workers INTEGER,
  local_workers INTEGER,
  minority_workers INTEGER,
  women_workers INTEGER,
  safety_incidents INTEGER,
  safety_training_hours DECIMAL(10,2),
  community_investment DECIMAL(10,2), -- dollars
  local_procurement_percentage DECIMAL(5,2),

  -- GOVERNANCE
  sustainability_policies_count INTEGER,
  supplier_audits_completed INTEGER,
  ethics_training_completed BOOLEAN DEFAULT false,
  board_diversity_score DECIMAL(5,2),

  -- Certifications & Compliance
  active_certifications TEXT[],
  compliance_violations INTEGER DEFAULT 0,

  -- Financial Impact
  sustainability_investment DECIMAL(12,2),
  cost_savings_from_efficiency DECIMAL(12,2),
  green_premium_revenue DECIMAL(12,2),

  -- External Reporting
  gri_aligned BOOLEAN DEFAULT false, -- Global Reporting Initiative
  sasb_aligned BOOLEAN DEFAULT false, -- Sustainability Accounting Standards Board
  tcfd_aligned BOOLEAN DEFAULT false, -- Task Force on Climate-related Financial Disclosures

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 8. SUSTAINABILITY TARGETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sustainability_targets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Target Details
  target_name VARCHAR(200) NOT NULL,
  target_type VARCHAR(50), -- carbon, waste, water, energy, social
  category VARCHAR(100),

  -- Baseline & Goal
  baseline_value DECIMAL(10,2),
  baseline_date DATE,
  target_value DECIMAL(10,2) NOT NULL,
  target_date DATE NOT NULL,
  unit VARCHAR(50),

  -- Progress Tracking
  current_value DECIMAL(10,2),
  last_updated DATE,
  percentage_complete DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN baseline_value IS NULL OR baseline_value = target_value THEN 0
      ELSE ((current_value - baseline_value) / (target_value - baseline_value)) * 100
    END
  ) STORED,

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, achieved, at_risk, missed
  on_track BOOLEAN DEFAULT true,

  -- Strategy
  action_plan TEXT,
  responsible_party UUID REFERENCES auth.users(id),
  budget_allocated DECIMAL(10,2),

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 9. GREEN BUILDING INCENTIVES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.green_building_incentives (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Incentive Details
  incentive_name VARCHAR(200) NOT NULL,
  incentive_type VARCHAR(50), -- tax_credit, rebate, grant, accelerated_depreciation
  program_name VARCHAR(200),
  administering_agency VARCHAR(200),

  -- Financial
  estimated_value DECIMAL(12,2),
  actual_value DECIMAL(12,2),

  -- Eligibility
  eligibility_requirements TEXT[],
  required_certifications TEXT[], -- LEED Gold, ENERGY STAR, etc.
  eligible BOOLEAN DEFAULT false,

  -- Application
  application_deadline DATE,
  application_submitted BOOLEAN DEFAULT false,
  submission_date DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'researching', -- researching, eligible, applied, approved, received, denied
  approval_date DATE,
  payment_date DATE,

  -- Documentation
  required_documents TEXT[],
  submitted_documents TEXT[],

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.sustainability_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_footprint ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_waste ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sustainable_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esg_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sustainability_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.green_building_incentives ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own sustainability_projects" ON public.sustainability_projects;
DROP POLICY IF EXISTS "Users can insert own sustainability_projects" ON public.sustainability_projects;
DROP POLICY IF EXISTS "Users can update own sustainability_projects" ON public.sustainability_projects;
DROP POLICY IF EXISTS "Users can delete own sustainability_projects" ON public.sustainability_projects;

-- Sustainability Projects Policies
CREATE POLICY "Users can view own sustainability_projects"
  ON public.sustainability_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sustainability_projects"
  ON public.sustainability_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sustainability_projects"
  ON public.sustainability_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sustainability_projects"
  ON public.sustainability_projects FOR DELETE
  USING (auth.uid() = user_id);

-- Apply same pattern to all other tables (abbreviated for brevity)
-- Carbon Footprint
CREATE POLICY "Users can manage own carbon_footprint" ON public.carbon_footprint FOR ALL USING (auth.uid() = user_id);

-- Material Waste
CREATE POLICY "Users can manage own material_waste" ON public.material_waste FOR ALL USING (auth.uid() = user_id);

-- Water Usage
CREATE POLICY "Users can manage own water_usage" ON public.water_usage FOR ALL USING (auth.uid() = user_id);

-- Sustainable Materials
CREATE POLICY "Users can manage own sustainable_materials" ON public.sustainable_materials FOR ALL USING (auth.uid() = user_id);

-- Certification Requirements
CREATE POLICY "Users can manage own certification_requirements" ON public.certification_requirements FOR ALL USING (auth.uid() = user_id);

-- ESG Metrics
CREATE POLICY "Users can manage own esg_metrics" ON public.esg_metrics FOR ALL USING (auth.uid() = user_id);

-- Sustainability Targets
CREATE POLICY "Users can manage own sustainability_targets" ON public.sustainability_targets FOR ALL USING (auth.uid() = user_id);

-- Green Building Incentives
CREATE POLICY "Users can manage own green_building_incentives" ON public.green_building_incentives FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sustainability_projects_user ON public.sustainability_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_sustainability_projects_project ON public.sustainability_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_carbon_footprint_project_date ON public.carbon_footprint(project_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_material_waste_project ON public.material_waste(project_id);
CREATE INDEX IF NOT EXISTS idx_water_usage_project_date ON public.water_usage(project_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sustainable_materials_category ON public.sustainable_materials(category);
CREATE INDEX IF NOT EXISTS idx_certification_requirements_project ON public.certification_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_certification_requirements_status ON public.certification_requirements(status);
CREATE INDEX IF NOT EXISTS idx_esg_metrics_project_period ON public.esg_metrics(project_id, start_date DESC);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Sustainability Hub Database Schema Created Successfully!';
  RAISE NOTICE '📊 9 tables created with full RLS policies';
  RAISE NOTICE '🔒 All data protected by Row Level Security';
  RAISE NOTICE '⚡ Performance indexes added';
  RAISE NOTICE '🌱 Ready for green building tracking!';
END $$;
