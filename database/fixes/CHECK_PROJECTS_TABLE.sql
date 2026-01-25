-- ============================================================
-- CHECK IF PROJECTS TABLE EXISTS AND HAS CORRECT SCHEMA
-- Run this in Supabase SQL Editor to verify your table structure
-- ============================================================

-- 1. Check if projects table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'projects'
) as projects_table_exists;

-- 2. List all columns in projects table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'projects'
ORDER BY ordinal_position;

-- 3. Check if required columns exist
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'name') as has_name,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'client') as has_client,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'address') as has_address,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'type') as has_type,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'start_date') as has_start_date,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'end_date') as has_end_date,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'is_favorite') as has_is_favorite;

-- ============================================================
-- RESULTS INTERPRETATION:
--
-- If projects_table_exists = false:
--   → You need to run ESSENTIAL_SQL_SETUP.sql first
--
-- If any required column shows 'false':
--   → You need to run UPGRADE_PROJECTS_TABLE.sql
--   → The basic table exists but doesn't have all required columns
--
-- If all columns show 'true':
--   → Table schema is correct, the issue is elsewhere
-- ============================================================
