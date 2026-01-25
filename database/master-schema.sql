-- ============================================================================
-- SIERRA SUITES - MASTER DATABASE SCHEMA
-- Complete Construction Management Platform
-- ============================================================================
-- Created: January 21, 2026
-- Purpose: Single source of truth for all database tables
-- Note: RLS policies will be added in Week 6 (security lockdown phase)
-- ============================================================================

-- ============================================================================
-- 1. ENABLE EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 Companies Table (Multi-tenant isolation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  size TEXT CHECK (size IN ('solo', 'small', 'medium', 'large')),
  website TEXT,
  address JSONB,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  subscription_tier TEXT CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')) DEFAULT 'starter',
  subscription_status TEXT CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled')) DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_subscription ON public.companies(subscription_tier, subscription_status);
CREATE INDEX idx_companies_stripe ON public.companies(stripe_customer_id);

-- ----------------------------------------------------------------------------
-- 2.2 User Profiles Table (Extends auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT CHECK (role IN ('owner', 'admin', 'project_manager', 'member', 'viewer')) DEFAULT 'member',

  -- Subscription (for backward compatibility with old schema)
  subscription_tier TEXT CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')) DEFAULT 'starter',
  stripe_customer_id TEXT,

  -- Settings
  timezone TEXT DEFAULT 'America/New_York',
  language TEXT DEFAULT 'en',
  notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_company ON public.user_profiles(company_id);
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);

-- ============================================================================
-- 3. PROJECT MANAGEMENT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 Projects Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Basic Information
  name TEXT NOT NULL,
  description TEXT,
  project_number TEXT,

  -- Client Information
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_company TEXT,

  -- Location
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'United States',
  gps_coordinates POINT,

  -- Project Type
  project_type TEXT CHECK (project_type IN ('residential', 'commercial', 'industrial', 'infrastructure', 'renovation', 'new_construction')),
  building_type TEXT,
  square_footage INTEGER,

  -- Status & Progress
  status TEXT CHECK (status IN ('planning', 'active', 'on-hold', 'completed', 'archived', 'canceled')) DEFAULT 'planning',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Timeline
  start_date DATE,
  due_date DATE,
  completion_date DATE,
  estimated_duration_days INTEGER,

  -- Budget & Financials
  budget DECIMAL(12,2),
  spent DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',

  -- Team
  project_manager_id UUID REFERENCES auth.users(id),

  -- Settings
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_company ON public.projects(company_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_created_by ON public.projects(created_by);
CREATE INDEX idx_projects_manager ON public.projects(project_manager_id);
CREATE INDEX idx_projects_due_date ON public.projects(due_date);

-- ----------------------------------------------------------------------------
-- 3.2 Project Expenses Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- Expense Details
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('materials', 'labor', 'equipment', 'permits', 'subcontractor', 'overhead', 'other')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',

  -- Documentation
  receipt_url TEXT,
  invoice_number TEXT,
  vendor TEXT,

  -- Tracking
  date DATE NOT NULL,
  paid BOOLEAN DEFAULT false,
  payment_method TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_expenses_project ON public.project_expenses(project_id);
CREATE INDEX idx_project_expenses_company ON public.project_expenses(company_id);
CREATE INDEX idx_project_expenses_date ON public.project_expenses(date DESC);
CREATE INDEX idx_project_expenses_category ON public.project_expenses(category);

-- ============================================================================
-- 4. TASKFLOW (Task Management)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 Tasks Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- Basic Information
  title TEXT NOT NULL,
  description TEXT,

  -- Construction Categorization
  phase TEXT CHECK (phase IN ('preconstruction', 'foundation', 'framing', 'mep', 'finishes', 'closeout', 'warranty')),
  trade TEXT CHECK (trade IN ('general', 'concrete', 'electrical', 'plumbing', 'hvac', 'carpentry', 'masonry', 'roofing', 'other')),
  location TEXT,
  zone TEXT,
  floor_level TEXT,

  -- Status & Priority
  status TEXT CHECK (status IN ('todo', 'in-progress', 'blocked', 'under-review', 'completed')) DEFAULT 'todo',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_team UUID[],

  -- Time Tracking
  start_date DATE,
  due_date DATE,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),

  -- Dependencies
  dependencies UUID[],
  blocks UUID[],

  -- Completion
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_company ON public.tasks(company_id);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);

-- ----------------------------------------------------------------------------
-- 4.2 Task Comments Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  mentions UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_user ON public.task_comments(user_id);

-- ============================================================================
-- 5. FIELDSNAP (Photo/Media Management)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 Media Assets Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id),

  -- File Information
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,

  -- Metadata
  caption TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Location
  gps_latitude DECIMAL(10,8),
  gps_longitude DECIMAL(11,8),
  location_name TEXT,

  -- Timestamps
  captured_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Status
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_assets_company ON public.media_assets(company_id);
CREATE INDEX idx_media_assets_project ON public.media_assets(project_id);
CREATE INDEX idx_media_assets_uploaded_by ON public.media_assets(uploaded_by);
CREATE INDEX idx_media_assets_captured_at ON public.media_assets(captured_at DESC);

-- ----------------------------------------------------------------------------
-- 5.2 Photo Annotations Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.photo_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  annotation_type TEXT CHECK (annotation_type IN ('point', 'rectangle', 'circle', 'polygon', 'arrow', 'text')),
  coordinates JSONB NOT NULL,
  content TEXT,
  category TEXT CHECK (category IN ('defect', 'safety', 'progress', 'note', 'issue')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photo_annotations_media ON public.photo_annotations(media_asset_id);

-- ============================================================================
-- 6. QUOTEHUB (Quote/Proposal Management)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1 Quotes Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),

  -- Quote Details
  quote_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Client Information
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_company TEXT,
  client_address JSONB,

  -- Status
  status TEXT CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')) DEFAULT 'draft',

  -- Pricing
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',

  -- Terms
  payment_terms TEXT,
  valid_until DATE,
  notes TEXT,
  terms_and_conditions TEXT,

  -- Tracking
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotes_company ON public.quotes(company_id);
CREATE INDEX idx_quotes_project ON public.quotes(project_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_number ON public.quotes(quote_number);

-- ----------------------------------------------------------------------------
-- 6.2 Quote Line Items Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,

  -- Item Details
  description TEXT NOT NULL,
  item_type TEXT CHECK (item_type IN ('labor', 'material', 'equipment', 'subcontractor', 'other')) DEFAULT 'other',
  category TEXT,

  -- Pricing
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'unit',
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  -- Order
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_line_items_quote ON public.quote_line_items(quote_id);

-- ============================================================================
-- 7. CRM (Customer Relationship Management)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7.1 CRM Contacts Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- Contact Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email TEXT,
  phone TEXT,
  mobile TEXT,

  -- Company Information
  company TEXT,
  job_title TEXT,
  website TEXT,

  -- Address
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'United States',

  -- Classification
  type TEXT CHECK (type IN ('lead', 'prospect', 'client', 'vendor', 'subcontractor')) DEFAULT 'lead',
  status TEXT CHECK (status IN ('active', 'inactive', 'do_not_contact')) DEFAULT 'active',
  lead_source TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Metadata
  notes TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_contacts_company ON public.crm_contacts(company_id);
CREATE INDEX idx_crm_contacts_type ON public.crm_contacts(type);
CREATE INDEX idx_crm_contacts_email ON public.crm_contacts(email);

-- ----------------------------------------------------------------------------
-- 7.2 CRM Deals Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),

  -- Deal Information
  title TEXT NOT NULL,
  description TEXT,

  -- Pipeline
  stage TEXT CHECK (stage IN ('lead', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')) DEFAULT 'lead',

  -- Value
  estimated_value DECIMAL(12,2),
  probability INTEGER CHECK (probability BETWEEN 0 AND 100) DEFAULT 50,

  -- Dates
  expected_close_date DATE,
  actual_close_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_deals_company ON public.crm_deals(company_id);
CREATE INDEX idx_crm_deals_contact ON public.crm_deals(contact_id);
CREATE INDEX idx_crm_deals_stage ON public.crm_deals(stage);

-- ============================================================================
-- 8. TEAMS & RBAC
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 8.1 Teams Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_company ON public.teams(company_id);

-- ----------------------------------------------------------------------------
-- 8.2 Team Members Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('lead', 'member')) DEFAULT 'member',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);

-- ----------------------------------------------------------------------------
-- 8.3 Team Invitations Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('owner', 'admin', 'project_manager', 'member', 'viewer')) DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_invitations_company ON public.team_invitations(company_id);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(invitation_token);

-- ============================================================================
-- 9. PUNCH LISTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 9.1 Punch List Items Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.punch_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- Item Details
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  trade TEXT,

  -- Status
  status TEXT CHECK (status IN ('open', 'in-progress', 'completed', 'verified', 'closed')) DEFAULT 'open',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),

  -- Dates
  due_date DATE,
  completed_at TIMESTAMPTZ,

  -- Media
  photo_id UUID REFERENCES public.media_assets(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_punch_list_items_project ON public.punch_list_items(project_id);
CREATE INDEX idx_punch_list_items_company ON public.punch_list_items(company_id);
CREATE INDEX idx_punch_list_items_status ON public.punch_list_items(status);
CREATE INDEX idx_punch_list_items_assigned_to ON public.punch_list_items(assigned_to);

-- ============================================================================
-- 10. SUSTAINABILITY HUB
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 10.1 Sustainability Metrics Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sustainability_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,

  -- Carbon Metrics
  carbon_emissions_kg DECIMAL(10,2),
  carbon_offset_kg DECIMAL(10,2),

  -- Waste Metrics
  waste_diverted_kg DECIMAL(10,2),
  waste_recycled_percent DECIMAL(5,2),

  -- Energy Metrics
  energy_saved_kwh DECIMAL(10,2),
  renewable_energy_percent DECIMAL(5,2),

  -- Water Metrics
  water_saved_gallons DECIMAL(10,2),

  -- Calculated Score
  sustainability_score INTEGER CHECK (sustainability_score BETWEEN 0 AND 100),

  -- Tracking
  recorded_date DATE NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sustainability_metrics_project ON public.sustainability_metrics(project_id);
CREATE INDEX idx_sustainability_metrics_company ON public.sustainability_metrics(company_id);

-- ============================================================================
-- 11. REPORT CENTER
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 11.1 Reports Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),

  -- Report Details
  title TEXT NOT NULL,
  report_type TEXT CHECK (report_type IN ('project_summary', 'financial', 'progress', 'safety', 'custom')) NOT NULL,
  description TEXT,

  -- Data
  data JSONB NOT NULL,
  filters JSONB DEFAULT '{}'::jsonb,

  -- Format
  format TEXT CHECK (format IN ('pdf', 'excel', 'json')) DEFAULT 'pdf',
  file_url TEXT,

  -- Scheduling
  is_scheduled BOOLEAN DEFAULT false,
  schedule_frequency TEXT CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_company ON public.reports(company_id);
CREATE INDEX idx_reports_project ON public.reports(project_id);
CREATE INDEX idx_reports_type ON public.reports(report_type);

-- ============================================================================
-- 12. ACTIVITIES & NOTIFICATIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 12.1 Activities Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Activity Details
  type TEXT NOT NULL CHECK (type IN ('project_created', 'project_updated', 'task_completed', 'photo_uploaded', 'quote_sent', 'milestone_reached', 'comment_added')),
  title TEXT NOT NULL,
  description TEXT,

  -- Related Resources
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_company ON public.activities(company_id);
CREATE INDEX idx_activities_user ON public.activities(user_id);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);

-- ----------------------------------------------------------------------------
-- 12.2 Notifications Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,

  -- Notification Content
  type TEXT CHECK (type IN ('info', 'success', 'warning', 'error', 'task_assignment', 'quote_update', 'comment_mention')) DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Action
  link TEXT,
  action_url TEXT,

  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_company ON public.notifications(company_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================================
-- 13. STORAGE CONFIGURATION
-- ============================================================================

-- Storage buckets need to be created via Supabase Dashboard:
-- 1. photos - Private bucket for project photos
-- 2. avatars - Public bucket for user avatars
-- 3. documents - Private bucket for project documents
-- 4. media - Private bucket for general media assets

-- ============================================================================
-- 14. TRIGGERS & FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 14.1 Updated At Trigger Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_expenses_updated_at BEFORE UPDATE ON public.project_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_media_assets_updated_at BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_photo_annotations_updated_at BEFORE UPDATE ON public.photo_annotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_contacts_updated_at BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_deals_updated_at BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_punch_list_items_updated_at BEFORE UPDATE ON public.punch_list_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sustainability_metrics_updated_at BEFORE UPDATE ON public.sustainability_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 14.2 Auto-Create User Profile on Signup
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create a new company for the user (owner)
  INSERT INTO public.companies (name, subscription_tier, subscription_status)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
    'starter',
    'trial'
  )
  RETURNING id INTO new_company_id;

  -- Create user profile linked to the new company
  INSERT INTO public.user_profiles (
    id,
    company_id,
    email,
    full_name,
    role,
    subscription_tier
  )
  VALUES (
    NEW.id,
    new_company_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'owner', -- First user is always owner
    'starter'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 14.3 Quote Number Generator
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  year TEXT;
  count INTEGER;
  new_number TEXT;
BEGIN
  year := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) + 1 INTO count
  FROM public.quotes
  WHERE company_id = NEW.company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  new_number := 'Q-' || year || '-' || LPAD(count::TEXT, 4, '0');
  NEW.quote_number := new_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_quote_number_trigger
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  WHEN (NEW.quote_number IS NULL)
  EXECUTE FUNCTION public.generate_quote_number();

-- ============================================================================
-- 15. PERFORMANCE INDEXES (Additional)
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_tasks_company_status ON public.tasks(company_id, status);
CREATE INDEX idx_tasks_project_status ON public.tasks(project_id, status);
CREATE INDEX idx_media_assets_company_project ON public.media_assets(company_id, project_id);
CREATE INDEX idx_quotes_company_status ON public.quotes(company_id, status);
CREATE INDEX idx_crm_contacts_company_type ON public.crm_contacts(company_id, type);

-- ============================================================================
-- SCHEMA DEPLOYMENT COMPLETE
-- ============================================================================

-- To verify deployment, run these queries:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- SELECT COUNT(*) as total_tables FROM pg_tables WHERE schemaname = 'public';
