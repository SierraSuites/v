-- ============================================================
-- FIX: Grant permissions to authenticated users for projects table
-- Run this to fix "permission denied for table projects" error
-- ============================================================

-- Grant necessary permissions to authenticated users
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.projects TO anon;

-- Also grant permissions for related tables (if they exist)
GRANT ALL ON public.project_phases TO authenticated;
GRANT ALL ON public.project_members TO authenticated;
GRANT ALL ON public.project_documents TO authenticated;
GRANT ALL ON public.project_milestones TO authenticated;
GRANT ALL ON public.project_expenses TO authenticated;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- ============================================================
-- COMPLETED!
-- Permissions have been granted
-- Refresh your app and the "permission denied" error should be gone
-- ============================================================
