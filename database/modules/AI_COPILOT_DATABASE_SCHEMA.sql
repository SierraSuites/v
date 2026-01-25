-- ============================================================================
-- AI CONSTRUCTION CO-PILOT - DATABASE SCHEMA
-- ============================================================================
-- The most advanced AI construction management system ever created
-- Supports: Predictions, Estimating, Blueprint Analysis, Safety, Materials,
--           Site Intelligence, Contract Review, and Machine Learning
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. AI PREDICTIONS & ANALYTICS
-- ============================================================================

-- Project predictions and risk analysis
CREATE TABLE IF NOT EXISTS public.ai_predictions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Prediction details
  prediction_type VARCHAR(100) NOT NULL, -- 'schedule_delay', 'cost_overrun', 'safety_risk', 'quality_issue'
  severity VARCHAR(50) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  confidence_score DECIMAL(5,2) NOT NULL, -- 0-100 confidence percentage

  -- Prediction data
  title TEXT NOT NULL,
  description TEXT,
  predicted_impact JSONB, -- { delay_days: 12, cost_impact: 48200, ... }
  risk_factors JSONB, -- Array of contributing factors

  -- Recommendations
  preventive_actions JSONB, -- Array of recommended actions
  estimated_prevention_cost DECIMAL(12,2),
  estimated_savings DECIMAL(12,2),
  roi_percentage DECIMAL(8,2),

  -- Outcome tracking
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'addressed', 'occurred', 'avoided', 'dismissed'
  actual_outcome TEXT,
  outcome_date TIMESTAMP WITH TIME ZONE,
  was_accurate BOOLEAN,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- AI learning feedback
CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prediction_id UUID REFERENCES public.ai_predictions(id) ON DELETE CASCADE,

  -- Feedback details
  feedback_type VARCHAR(50) NOT NULL, -- 'accuracy', 'helpfulness', 'correction'
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  was_accurate BOOLEAN,
  was_helpful BOOLEAN,

  -- User corrections
  what_was_wrong TEXT,
  what_actually_happened TEXT,
  suggestions TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. SMART ESTIMATOR / QUOTE WIZARD
-- ============================================================================

-- AI-generated estimates
CREATE TABLE IF NOT EXISTS public.ai_estimates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  -- Project description
  project_description TEXT NOT NULL,
  project_type VARCHAR(100), -- 'residential', 'commercial', 'industrial', 'civil'
  square_footage INTEGER,
  location VARCHAR(255),

  -- AI clarifications
  clarifying_questions JSONB, -- Questions AI asked
  user_answers JSONB, -- User's responses

  -- Estimate results
  total_estimate_min DECIMAL(12,2) NOT NULL,
  total_estimate_max DECIMAL(12,2) NOT NULL,
  breakdown JSONB NOT NULL, -- Line items with min/max

  -- Market intelligence
  market_comparison JSONB, -- How it compares to local averages
  material_optimizations JSONB, -- Suggested material swaps
  cost_savings_opportunities JSONB,

  -- Confidence and basis
  confidence_score DECIMAL(5,2), -- 0-100
  based_on_projects INTEGER, -- Number of similar projects analyzed
  similar_projects JSONB, -- Array of similar past project IDs

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'reviewed', 'sent', 'accepted', 'rejected'
  converted_to_quote_id UUID,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Historical estimating patterns (for AI learning)
CREATE TABLE IF NOT EXISTS public.estimating_patterns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Pattern details
  project_type VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'foundation', 'framing', 'electrical', etc.

  -- Cost patterns
  avg_cost_per_sqft DECIMAL(10,2),
  min_cost_per_sqft DECIMAL(10,2),
  max_cost_per_sqft DECIMAL(10,2),

  -- Time patterns
  avg_days_duration INTEGER,
  labor_hours_per_sqft DECIMAL(8,2),

  -- Based on data
  sample_size INTEGER, -- Number of projects this is based on
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  region VARCHAR(100),
  notes TEXT
);

-- ============================================================================
-- 3. BLUEPRINT ANALYZER
-- ============================================================================

-- Blueprint analysis results
CREATE TABLE IF NOT EXISTS public.blueprint_analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Blueprint details
  blueprint_name VARCHAR(255) NOT NULL,
  blueprint_url TEXT, -- Storage URL for uploaded blueprint
  blueprint_type VARCHAR(100), -- 'architectural', 'structural', 'electrical', 'plumbing', 'mechanical'
  page_count INTEGER,

  -- AI analysis results
  findings JSONB, -- Array of issues found
  clash_detections JSONB, -- Array of conflicts between systems
  material_takeoff JSONB, -- Extracted material quantities

  -- Risk summary
  critical_issues_count INTEGER DEFAULT 0,
  warning_issues_count INTEGER DEFAULT 0,
  opportunity_count INTEGER DEFAULT 0,

  estimated_cost_impact DECIMAL(12,2), -- Total potential cost of issues
  estimated_savings_opportunities DECIMAL(12,2),

  -- Status
  analysis_status VARCHAR(50) DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  analysis_started_at TIMESTAMP WITH TIME ZONE,
  analysis_completed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blueprint findings (detailed issues)
CREATE TABLE IF NOT EXISTS public.blueprint_findings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  analysis_id UUID REFERENCES public.blueprint_analyses(id) ON DELETE CASCADE NOT NULL,

  -- Finding details
  finding_type VARCHAR(50) NOT NULL, -- 'critical', 'warning', 'opportunity'
  category VARCHAR(100) NOT NULL, -- 'structural_conflict', 'missing_detail', 'code_violation', 'value_engineering'

  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Location
  page_number INTEGER,
  detail_reference VARCHAR(255),
  location_coordinates JSONB, -- { x, y } for highlighting

  -- Impact
  cost_impact DECIMAL(12,2),
  time_impact_days INTEGER,

  -- Solution
  recommended_solution TEXT,
  alternative_options JSONB,

  -- Status
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'reviewing', 'resolved', 'dismissed'
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. SAFETY SENTINEL
-- ============================================================================

-- Safety risk predictions
CREATE TABLE IF NOT EXISTS public.safety_predictions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Risk assessment
  risk_type VARCHAR(100) NOT NULL, -- 'fall', 'electrical', 'struck_by', 'caught_between', 'environmental'
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  probability_percentage DECIMAL(5,2), -- Probability this week/month

  -- Risk factors
  contributing_factors JSONB, -- Array of factors increasing risk
  current_conditions JSONB, -- Weather, crew experience, work type, etc.

  -- Prediction details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  predicted_timeframe VARCHAR(100), -- 'this_week', 'this_month', 'next_phase'

  -- Prevention
  prevention_actions JSONB, -- Array of recommended preventive measures
  prevention_cost DECIMAL(10,2),
  average_accident_cost DECIMAL(12,2),
  roi_percentage DECIMAL(8,2),

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'prevented', 'occurred', 'expired'
  outcome_date TIMESTAMP WITH TIME ZONE,
  outcome_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Site photo safety analysis
CREATE TABLE IF NOT EXISTS public.site_photo_analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Photo details
  photo_url TEXT NOT NULL,
  photo_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location VARCHAR(255),

  -- AI analysis
  safety_findings JSONB, -- Array of safety issues detected
  quality_findings JSONB, -- Array of quality issues
  progress_analysis JSONB, -- What work is visible/complete
  material_tracking JSONB, -- Materials visible in photo

  -- Risk summary
  critical_safety_issues INTEGER DEFAULT 0,
  minor_safety_issues INTEGER DEFAULT 0,
  osha_violations INTEGER DEFAULT 0,

  analysis_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. MATERIAL OPTIMIZER
-- ============================================================================

-- Material optimization recommendations
CREATE TABLE IF NOT EXISTS public.material_optimizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Optimization type
  optimization_type VARCHAR(100) NOT NULL, -- 'bulk_ordering', 'supplier_switch', 'material_substitution', 'timing'
  category VARCHAR(100) NOT NULL, -- 'lumber', 'concrete', 'steel', etc.

  -- Current state
  current_material VARCHAR(255),
  current_supplier VARCHAR(255),
  current_cost DECIMAL(12,2),
  current_quantity DECIMAL(10,2),
  current_unit VARCHAR(50),

  -- Recommended change
  recommended_material VARCHAR(255),
  recommended_supplier VARCHAR(255),
  recommended_cost DECIMAL(12,2),
  recommended_quantity DECIMAL(10,2),

  -- Savings
  cost_savings DECIMAL(12,2) NOT NULL,
  time_savings_days INTEGER,
  waste_reduction_percentage DECIMAL(5,2),

  -- Details
  explanation TEXT,
  trade_offs JSONB, -- Any disadvantages to consider
  supplier_rating DECIMAL(3,2), -- Supplier reliability score

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'implemented'
  implemented_date TIMESTAMP WITH TIME ZONE,
  actual_savings DECIMAL(12,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Market intelligence for materials
CREATE TABLE IF NOT EXISTS public.material_market_intel (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Material details
  material_category VARCHAR(100) NOT NULL,
  material_name VARCHAR(255),

  -- Price trends
  current_price_per_unit DECIMAL(10,2),
  price_trend VARCHAR(50), -- 'rising', 'falling', 'stable'
  predicted_change_percentage DECIMAL(5,2),
  predicted_timeframe VARCHAR(100), -- 'next_30_days', 'next_60_days', 'next_quarter'

  -- Supply status
  supply_status VARCHAR(50), -- 'abundant', 'normal', 'shortage', 'critical_shortage'
  lead_time_days INTEGER,

  -- Alerts
  alert_type VARCHAR(50), -- 'price_increase', 'price_decrease', 'shortage', 'availability'
  alert_severity VARCHAR(50), -- 'info', 'warning', 'urgent'
  alert_message TEXT,

  -- Geographic scope
  region VARCHAR(100),

  -- Data freshness
  data_source VARCHAR(255),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 6. CONTRACT GUARDIAN
-- ============================================================================

-- Contract analyses
CREATE TABLE IF NOT EXISTS public.contract_analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  -- Contract details
  contract_name VARCHAR(255) NOT NULL,
  contract_type VARCHAR(100), -- 'construction_agreement', 'subcontractor', 'supplier', 'service'
  contract_value DECIMAL(12,2),
  contract_url TEXT, -- Storage URL for uploaded contract

  -- AI analysis results
  overall_risk_score INTEGER CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
  risk_sections JSONB, -- Array of risky clauses
  opportunity_sections JSONB, -- Array of favorable clauses
  missing_protections JSONB, -- Array of missing standard protections

  -- Recommendations
  redline_suggestions JSONB, -- Suggested changes to contract
  negotiation_tips JSONB, -- How to negotiate changes

  -- Summary counts
  critical_risks_count INTEGER DEFAULT 0,
  medium_risks_count INTEGER DEFAULT 0,
  opportunities_count INTEGER DEFAULT 0,

  -- Status
  analysis_status VARCHAR(50) DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  analysis_completed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract risk findings
CREATE TABLE IF NOT EXISTS public.contract_findings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  analysis_id UUID REFERENCES public.contract_analyses(id) ON DELETE CASCADE NOT NULL,

  -- Finding details
  finding_type VARCHAR(50) NOT NULL, -- 'risk', 'opportunity', 'missing_protection'
  severity VARCHAR(50) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  category VARCHAR(100) NOT NULL, -- 'indemnification', 'payment', 'termination', 'liability', 'warranty'

  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Contract reference
  clause_text TEXT,
  section_reference VARCHAR(255),
  page_number INTEGER,

  -- Impact
  financial_impact DECIMAL(12,2),
  risk_explanation TEXT,

  -- Recommendations
  recommendation TEXT NOT NULL,
  alternative_language TEXT,
  industry_standard TEXT, -- What's typical in the industry
  negotiation_strategy TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'negotiated', 'accepted', 'dismissed'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 7. AI TRAINING & LEARNING
-- ============================================================================

-- User's historical project data for AI training
CREATE TABLE IF NOT EXISTS public.ai_training_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Project characteristics
  project_type VARCHAR(100) NOT NULL,
  project_size_sqft INTEGER,
  project_value DECIMAL(12,2),
  location VARCHAR(255),

  -- Actual outcomes
  actual_duration_days INTEGER,
  actual_cost DECIMAL(12,2),
  cost_variance_percentage DECIMAL(5,2),
  schedule_variance_days INTEGER,

  -- Quality metrics
  change_orders_count INTEGER,
  change_orders_value DECIMAL(12,2),
  rework_percentage DECIMAL(5,2),

  -- Safety metrics
  safety_incidents_count INTEGER,
  lost_time_incidents INTEGER,

  -- Client satisfaction
  client_satisfaction_score INTEGER CHECK (client_satisfaction_score >= 1 AND client_satisfaction_score <= 10),
  would_recommend BOOLEAN,

  -- Lessons learned
  what_went_well TEXT,
  what_went_wrong TEXT,
  key_learnings TEXT,

  -- Metadata
  project_completed_date DATE,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI model performance tracking
CREATE TABLE IF NOT EXISTS public.ai_model_performance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Model details
  model_type VARCHAR(100) NOT NULL, -- 'schedule_predictor', 'cost_predictor', 'safety_predictor'
  model_version VARCHAR(50),

  -- Performance metrics
  accuracy_percentage DECIMAL(5,2),
  precision_percentage DECIMAL(5,2),
  recall_percentage DECIMAL(5,2),

  -- Training data
  training_samples_count INTEGER,
  last_trained_at TIMESTAMP WITH TIME ZONE,

  -- User-specific performance
  predictions_made INTEGER DEFAULT 0,
  predictions_accurate INTEGER DEFAULT 0,
  false_positives INTEGER DEFAULT 0,
  false_negatives INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 8. AI RECOMMENDATIONS ENGINE
-- ============================================================================

-- AI-generated recommendations
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Recommendation details
  recommendation_type VARCHAR(100) NOT NULL, -- 'scheduling', 'purchasing', 'staffing', 'quality', 'safety'
  priority VARCHAR(50) NOT NULL, -- 'critical', 'high', 'medium', 'low'

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reasoning TEXT, -- Why AI is making this recommendation

  -- Impact
  estimated_savings DECIMAL(12,2),
  estimated_time_savings_days INTEGER,
  risk_reduction_percentage DECIMAL(5,2),

  -- Action
  recommended_action TEXT NOT NULL,
  action_deadline TIMESTAMP WITH TIME ZONE,
  one_click_action JSONB, -- Data needed to execute with one click

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'implemented', 'expired'
  user_response TEXT,
  implemented_at TIMESTAMP WITH TIME ZONE,

  -- Outcome tracking
  actual_outcome TEXT,
  actual_savings DECIMAL(12,2),
  was_helpful BOOLEAN,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- AI Predictions
CREATE INDEX idx_ai_predictions_user ON public.ai_predictions(user_id);
CREATE INDEX idx_ai_predictions_project ON public.ai_predictions(project_id);
CREATE INDEX idx_ai_predictions_status ON public.ai_predictions(status);
CREATE INDEX idx_ai_predictions_severity ON public.ai_predictions(severity);
CREATE INDEX idx_ai_predictions_created ON public.ai_predictions(created_at DESC);

-- AI Estimates
CREATE INDEX idx_ai_estimates_user ON public.ai_estimates(user_id);
CREATE INDEX idx_ai_estimates_project ON public.ai_estimates(project_id);
CREATE INDEX idx_ai_estimates_status ON public.ai_estimates(status);
CREATE INDEX idx_ai_estimates_created ON public.ai_estimates(created_at DESC);

-- Blueprint Analyses
CREATE INDEX idx_blueprint_analyses_user ON public.blueprint_analyses(user_id);
CREATE INDEX idx_blueprint_analyses_project ON public.blueprint_analyses(project_id);
CREATE INDEX idx_blueprint_analyses_status ON public.blueprint_analyses(analysis_status);

-- Safety Predictions
CREATE INDEX idx_safety_predictions_user ON public.safety_predictions(user_id);
CREATE INDEX idx_safety_predictions_project ON public.safety_predictions(project_id);
CREATE INDEX idx_safety_predictions_status ON public.safety_predictions(status);
CREATE INDEX idx_safety_predictions_risk ON public.safety_predictions(risk_score DESC);

-- Material Optimizations
CREATE INDEX idx_material_optimizations_user ON public.material_optimizations(user_id);
CREATE INDEX idx_material_optimizations_project ON public.material_optimizations(project_id);
CREATE INDEX idx_material_optimizations_status ON public.material_optimizations(status);
CREATE INDEX idx_material_optimizations_savings ON public.material_optimizations(cost_savings DESC);

-- Contract Analyses
CREATE INDEX idx_contract_analyses_user ON public.contract_analyses(user_id);
CREATE INDEX idx_contract_analyses_project ON public.contract_analyses(project_id);
CREATE INDEX idx_contract_analyses_risk ON public.contract_analyses(overall_risk_score DESC);

-- AI Recommendations
CREATE INDEX idx_ai_recommendations_user ON public.ai_recommendations(user_id);
CREATE INDEX idx_ai_recommendations_project ON public.ai_recommendations(project_id);
CREATE INDEX idx_ai_recommendations_status ON public.ai_recommendations(status);
CREATE INDEX idx_ai_recommendations_priority ON public.ai_recommendations(priority);
CREATE INDEX idx_ai_recommendations_created ON public.ai_recommendations(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimating_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_photo_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY "Users can view own predictions" ON public.ai_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own predictions" ON public.ai_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own predictions" ON public.ai_predictions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own predictions" ON public.ai_predictions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON public.ai_feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feedback" ON public.ai_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own estimates" ON public.ai_estimates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own estimates" ON public.ai_estimates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own estimates" ON public.ai_estimates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own estimates" ON public.ai_estimates FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own patterns" ON public.estimating_patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own patterns" ON public.estimating_patterns FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own blueprint analyses" ON public.blueprint_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own blueprint analyses" ON public.blueprint_analyses FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view blueprint findings" ON public.blueprint_findings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.blueprint_analyses WHERE id = blueprint_findings.analysis_id AND user_id = auth.uid()));

CREATE POLICY "Users can view own safety predictions" ON public.safety_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own safety predictions" ON public.safety_predictions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own site photo analyses" ON public.site_photo_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own site photo analyses" ON public.site_photo_analyses FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own material optimizations" ON public.material_optimizations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own material optimizations" ON public.material_optimizations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own contract analyses" ON public.contract_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own contract analyses" ON public.contract_analyses FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view contract findings" ON public.contract_findings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.contract_analyses WHERE id = contract_findings.analysis_id AND user_id = auth.uid()));

CREATE POLICY "Users can view own training data" ON public.ai_training_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own training data" ON public.ai_training_data FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own model performance" ON public.ai_model_performance FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own recommendations" ON public.ai_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own recommendations" ON public.ai_recommendations FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.ai_predictions IS 'AI-generated predictions for project delays, cost overruns, and risks';
COMMENT ON TABLE public.ai_estimates IS 'AI-generated project estimates and quotes';
COMMENT ON TABLE public.blueprint_analyses IS 'AI analysis of construction blueprints and drawings';
COMMENT ON TABLE public.safety_predictions IS 'AI predictions of safety risks and accident prevention';
COMMENT ON TABLE public.material_optimizations IS 'AI recommendations for material cost optimization';
COMMENT ON TABLE public.contract_analyses IS 'AI analysis of construction contracts for risk identification';
COMMENT ON TABLE public.ai_recommendations IS 'Real-time AI recommendations for project optimization';

-- ============================================================================
-- SAMPLE DATA FOR DEMO (Optional)
-- ============================================================================

-- Note: In production, this would be populated by actual AI analysis
-- For demo purposes, you can insert sample predictions to show the UI

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
