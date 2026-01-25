-- ============================================================
-- TEST DATABASE CONNECTION
-- Run this to verify your database is set up correctly
-- ============================================================

-- Check if user_profiles table exists and has data
SELECT 'User Profiles' as table_name, COUNT(*) as record_count FROM user_profiles;

-- Check if tasks table exists
SELECT 'Tasks' as table_name, COUNT(*) as record_count FROM tasks;

-- Check if projects table exists
SELECT 'Projects' as table_name, COUNT(*) as record_count FROM projects;

-- Check current authenticated user (if any)
SELECT auth.uid() as current_user_id;

-- Check if you have a profile
SELECT * FROM user_profiles WHERE id = auth.uid();

-- Try to select your tasks (should return empty but no error)
SELECT * FROM tasks WHERE user_id = auth.uid();

-- ============================================================
-- If all these queries work without errors, your database is set up correctly!
-- The empty results are normal for a new account
-- ============================================================
