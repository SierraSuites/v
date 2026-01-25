-- ============================================
-- PROJECTS DATABASE SETUP FOR SUPABASE
-- ============================================
-- This script creates all necessary tables and policies for the Projects feature

-- ============================================
-- 1. PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Basic Information
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  type TEXT CHECK (type IN ('residential', 'commercial', 'industrial', 'infrastructure', 'renovation')) DEFAULT 'residential',
  description TEXT,

  -- Status & Progress
  status TEXT CHECK (status IN ('planning', 'active', 'on-hold', 'completed', 'cancelled')) DEFAULT 'planning',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Timeline
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Budget
  estimated_budget DECIMAL(15, 2) DEFAULT 0,
  spent DECIMAL(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',

  -- Team & Resources
  project_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  equipment TEXT[], -- Array of equipment names
  certifications_required TEXT[], -- Array of required certifications

  -- Settings
  document_categories TEXT[], -- Array of document categories
  notification_settings JSONB DEFAULT '{"emailUpdates": true, "milestoneAlerts": true, "budgetAlerts": true, "teamNotifications": true}'::jsonb,
  client_visibility BOOLEAN DEFAULT false,

  -- Metadata
  is_favorite BOOLEAN DEFAULT false,
  thumbnail TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects(status);
CREATE INDEX IF NOT EXISTS projects_type_idx ON public.projects(type);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON public.projects(created_at DESC);

-- ============================================
-- 2. PROJECT PHASES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_phases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'in-progress', 'completed')) DEFAULT 'pending',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_phase_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS project_phases_project_id_idx ON public.project_phases(project_id);

-- ============================================
-- 3. PROJECT MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  role TEXT NOT NULL, -- e.g., 'Architect', 'Superintendent', 'Foreman'
  permissions TEXT[] DEFAULT ARRAY['view'], -- e.g., ['view', 'edit', 'delete']

  added_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON public.project_members(user_id);

-- ============================================
-- 4. PROJECT DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., 'Plans & Blueprints', 'Permits', 'Invoices'
  file_path TEXT NOT NULL, -- Storage bucket path
  file_size BIGINT, -- Size in bytes
  file_type TEXT, -- MIME type

  description TEXT,
  tags TEXT[],

  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, file_path)
);

CREATE INDEX IF NOT EXISTS project_documents_project_id_idx ON public.project_documents(project_id);
CREATE INDEX IF NOT EXISTS project_documents_category_idx ON public.project_documents(category);

-- ============================================
-- 5. PROJECT MILESTONES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled')) DEFAULT 'pending',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_milestones_project_id_idx ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS project_milestones_due_date_idx ON public.project_milestones(due_date);

-- ============================================
-- 6. BUDGET TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,

  category TEXT NOT NULL, -- e.g., 'Labor', 'Materials', 'Equipment', 'Permits'
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',

  date DATE NOT NULL,
  vendor TEXT,
  invoice_number TEXT,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_expenses_project_id_idx ON public.project_expenses(project_id);
CREATE INDEX IF NOT EXISTS project_expenses_category_idx ON public.project_expenses(category);
CREATE INDEX IF NOT EXISTS project_expenses_date_idx ON public.project_expenses(date DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROJECTS TABLE POLICIES
-- ============================================

-- Users can view their own projects
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view projects where they are members
CREATE POLICY "Users can view projects where they are members"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  );

-- Users can insert their own projects
CREATE POLICY "Users can insert their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

-- Users with edit permissions can update projects
CREATE POLICY "Project members with edit permission can update projects"
  ON public.projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
      AND 'edit' = ANY(project_members.permissions)
    )
  );

-- Users can delete their own projects
CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PROJECT PHASES POLICIES
-- ============================================

CREATE POLICY "Users can view phases of their projects"
  ON public.project_phases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_phases.project_id
      AND (projects.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Project owners can manage phases"
  ON public.project_phases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_phases.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================
-- PROJECT MEMBERS POLICIES
-- ============================================

CREATE POLICY "Users can view project members"
  ON public.project_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_members.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can manage members"
  ON public.project_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_members.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================
-- PROJECT DOCUMENTS POLICIES
-- ============================================

CREATE POLICY "Users can view project documents"
  ON public.project_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_documents.project_id
      AND (projects.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Project members can upload documents"
  ON public.project_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_documents.project_id
      AND (projects.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Project owners can manage documents"
  ON public.project_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_documents.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================
-- PROJECT MILESTONES POLICIES
-- ============================================

CREATE POLICY "Users can view project milestones"
  ON public.project_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_milestones.project_id
      AND (projects.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Project owners can manage milestones"
  ON public.project_milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_milestones.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================
-- PROJECT EXPENSES POLICIES
-- ============================================

CREATE POLICY "Users can view project expenses"
  ON public.project_expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_expenses.project_id
      AND (projects.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Project members can add expenses"
  ON public.project_expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_expenses.project_id
      AND (projects.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Project owners can manage expenses"
  ON public.project_expenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_expenses.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for projects table
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for project_phases table
CREATE TRIGGER update_project_phases_updated_at
  BEFORE UPDATE ON public.project_phases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for project_milestones table
CREATE TRIGGER update_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-update project spent amount when expenses change
CREATE OR REPLACE FUNCTION update_project_spent()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.projects
  SET spent = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.project_expenses
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
  )
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update spent when expense is added/updated/deleted
CREATE TRIGGER update_project_spent_on_expense_change
  AFTER INSERT OR UPDATE OR DELETE ON public.project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_project_spent();

-- ============================================
-- STORAGE BUCKET SETUP (Run in Supabase Dashboard > Storage)
-- ============================================
-- Create a storage bucket for project documents
-- Name: project-documents
-- Public: false
-- File size limit: 50MB
-- Allowed MIME types: application/pdf, image/*, application/vnd.*, text/*

-- Storage policies (to be created in Supabase Dashboard):
-- 1. "Project members can upload files"
-- 2. "Project members can view files"
-- 3. "Project owners can delete files"

-- ============================================
-- COMPLETE!
-- ============================================
-- Copy and paste this entire script into the Supabase SQL Editor
-- Run it to create all tables, policies, and triggers
-- Then create the storage bucket manually in the Storage section
