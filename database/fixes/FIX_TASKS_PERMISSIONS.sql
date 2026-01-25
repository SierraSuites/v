-- ============================================================
-- FIX: Grant permissions for tasks table and related tables
-- Run this to fix "Error fetching tasks" permission errors
-- ============================================================

-- Grant permissions on tasks table
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO anon;

-- Grant permissions on related tables
GRANT ALL ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO anon;

GRANT ALL ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO anon;

GRANT ALL ON public.task_attachments TO authenticated;
GRANT ALL ON public.task_attachments TO anon;

-- ============================================================
-- COMPLETED!
-- Tasks permissions have been granted
-- You can now use TaskFlow without permission errors
-- ============================================================
