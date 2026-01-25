-- ============================================================
-- COMPREHENSIVE PERMISSIONS FIX
-- Run this to fix all permission issues
-- ============================================================

-- First, ensure the public schema has proper permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant ALL permissions on projects table
GRANT ALL ON public.projects TO anon;
GRANT ALL ON public.projects TO authenticated;

-- Grant permissions on related tables
GRANT ALL ON public.project_phases TO anon, authenticated;
GRANT ALL ON public.project_members TO anon, authenticated;
GRANT ALL ON public.project_documents TO anon, authenticated;
GRANT ALL ON public.project_milestones TO anon, authenticated;
GRANT ALL ON public.project_expenses TO anon, authenticated;

-- Grant permissions on tasks and related tables
GRANT ALL ON public.tasks TO anon, authenticated;
GRANT ALL ON public.team_members TO anon, authenticated;
GRANT ALL ON public.task_comments TO anon, authenticated;
GRANT ALL ON public.task_attachments TO anon, authenticated;

-- Grant permissions on user_profiles
GRANT ALL ON public.user_profiles TO anon, authenticated;

-- Grant sequence permissions (for auto-incrementing IDs if any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================
-- VERIFY PERMISSIONS
-- ============================================================

-- Check if permissions were granted successfully
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'projects'
ORDER BY grantee, privilege_type;

-- ============================================================
-- COMPLETED!
-- All permissions have been granted
-- ============================================================
