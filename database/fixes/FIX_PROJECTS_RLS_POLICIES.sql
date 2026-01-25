-- ============================================================
-- FIX: Remove duplicate RLS policies causing infinite recursion
-- Run this to fix the "infinite recursion detected in policy" error
-- ============================================================

-- Drop ALL existing policies on projects table
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects where they are members" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Project members with edit permission can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

-- Also drop any policies from ESSENTIAL_SQL_SETUP.sql
DROP POLICY IF EXISTS "Enable read access for users" ON public.projects;
DROP POLICY IF EXISTS "Enable insert for users" ON public.projects;
DROP POLICY IF EXISTS "Enable update for users" ON public.projects;
DROP POLICY IF EXISTS "Enable delete for users" ON public.projects;

-- ============================================================
-- RECREATE CLEAN RLS POLICIES (no recursion)
-- ============================================================

-- Policy: Users can view their own projects
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own projects
CREATE POLICY "Users can insert their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own projects
CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own projects
CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- VERIFY RLS IS ENABLED
-- ============================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- COMPLETED!
-- The infinite recursion issue should now be fixed
-- Refresh your app and try creating a project
-- ============================================================
