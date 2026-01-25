# 🗄️ Database Deployment Guide - Step by Step

**Date:** January 22, 2026
**Database:** Supabase (PostgreSQL 15+)
**Status:** Ready for Deployment
**Estimated Time:** 30-45 minutes

---

## 📋 TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Step 1: Deploy Master Schema](#step-1-deploy-master-schema)
4. [Step 2: Deploy RLS Policies](#step-2-deploy-rls-policies)
5. [Step 3: Deploy Functions & Triggers](#step-3-deploy-functions--triggers)
6. [Step 4: Verification](#step-4-verification)
7. [Step 5: Storage Buckets](#step-5-storage-buckets)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Plan](#rollback-plan)

---

## 🔧 PREREQUISITES

### Required Access
- ✅ Supabase account with project created
- ✅ Project dashboard access (admin role)
- ✅ SQL Editor permissions
- ✅ Storage permissions

### Required Files
These files are in your `database/` directory:
- ✅ `master-schema.sql` (creates all tables)
- ✅ `rls-policies.sql` (security policies)
- ✅ `functions-and-triggers.sql` (business logic)

### Environment Variables
Ensure these are set in your `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (KEEP SECRET!)
```

---

## ✅ PRE-DEPLOYMENT CHECKLIST

Before deploying, verify:

- [ ] You have admin access to Supabase project
- [ ] You have the 3 SQL files ready
- [ ] You have a backup plan (Supabase auto-backups enabled)
- [ ] You're deploying to the correct project (dev/staging/production)
- [ ] No users are currently active (for production deployments)
- [ ] You've read this guide completely

**⚠️ WARNING:** These migrations will:
- Create 30+ tables
- Enable Row Level Security
- Create database functions
- Add triggers to tables
- This is IRREVERSIBLE without manual rollback

---

## 📦 STEP 1: DEPLOY MASTER SCHEMA

### What This Does
Creates all database tables, relationships, indexes, and constraints.

### Tables Created (30+)
- Authentication: `user_profiles`, `companies`, `invitations`
- Projects: `projects`, `tasks`, `milestones`
- Documents: `project_documents`, `photos`
- Budget: `project_expenses`, `budget_categories`
- QuoteHub: `quotes`, `quote_line_items`, `quote_templates`
- CRM: `crm_contacts`, `crm_leads`, `crm_activities`
- Sustainability: `carbon_footprint`, `material_waste`, `certifications`
- Reports: `reports`, `report_sections`, `report_recipients`
- Punch List: `punch_items`, `punch_comments`
- And more...

### Deployment Steps

#### 1. Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **+ New query**

#### 2. Copy Master Schema
1. Open `database/master-schema.sql` in your code editor
2. Select ALL content (Ctrl+A / Cmd+A)
3. Copy to clipboard (Ctrl+C / Cmd+C)

#### 3. Paste and Run
1. Paste into Supabase SQL Editor
2. Review the query (scroll through)
3. Click **Run** (or press F5)
4. Wait 30-60 seconds

#### 4. Verify Success
You should see:
```
Success. No rows returned
```

If you see errors, **STOP** and check [Troubleshooting](#troubleshooting).

#### 5. Confirm Tables Created
1. Click **Table Editor** in left sidebar
2. You should see 30+ new tables
3. Click on `companies` table - should have columns: `id`, `name`, `subscription_tier`, etc.
4. Click on `user_profiles` - should have columns: `id`, `company_id`, `role`, etc.

---

## 🔒 STEP 2: DEPLOY RLS POLICIES

### What This Does
Enables Row Level Security (RLS) on all tables and creates policies for multi-tenant data isolation.

### Critical Security Features
- **Multi-Tenant Isolation:** Company A cannot see Company B's data
- **Role-Based Access:** Admins see all company data, members see assigned data
- **Helper Functions:** `get_user_company_id()`, `is_company_admin()`
- **50+ Policies:** One or more for each table

### Deployment Steps

#### 1. Open New SQL Query
1. In SQL Editor, click **+ New query** (don't reuse the previous one)
2. Clear the editor

#### 2. Copy RLS Policies
1. Open `database/rls-policies.sql`
2. Select ALL content
3. Copy to clipboard

#### 3. Paste and Run
1. Paste into SQL Editor
2. **Important:** Review the `get_user_company_id()` function - this is critical
3. Click **Run**
4. Wait 20-30 seconds

#### 4. Verify Success
You should see:
```
Success. No rows returned
```

#### 5. Confirm RLS Enabled
1. Click **Authentication** → **Policies** in left sidebar
2. You should see 50+ policies listed
3. Click on `projects` table - should see policies like:
   - "Users can view company projects"
   - "Users can create company projects"
   - "Users can update company projects"
   - "Users can delete company projects"

#### 6. Test Helper Function
Run this test query in SQL Editor:
```sql
-- Test get_user_company_id function
SELECT public.get_user_company_id();
-- Should return NULL (no authenticated user yet)

-- Check function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'get_user_company_id';
-- Should return 1 row
```

---

## ⚙️ STEP 3: DEPLOY FUNCTIONS & TRIGGERS

### What This Does
Creates database functions and triggers that automate business logic:
- Auto-update timestamps
- Budget calculations
- Project health scores
- Storage quota checks
- Activity logging
- Notification triggers

### Deployment Steps

#### 1. Open New SQL Query
1. Click **+ New query**
2. Clear the editor

#### 2. Copy Functions & Triggers
1. Open `database/functions-and-triggers.sql`
2. Select ALL content
3. Copy to clipboard

#### 3. Paste and Run
1. Paste into SQL Editor
2. Click **Run**
3. Wait 15-20 seconds

#### 4. Verify Success
```
Success. No rows returned
```

#### 5. Confirm Functions Created
Run this verification query:
```sql
-- List all custom functions
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

You should see functions like:
- `calculate_budget_variance`
- `calculate_project_health`
- `can_upload_file`
- `get_storage_usage`
- `get_user_company_id`
- `handle_updated_at`
- `is_company_admin`
- And more...

#### 6. Confirm Triggers Created
Run this verification query:
```sql
-- List all triggers
SELECT
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

You should see triggers on tables like `projects`, `tasks`, `user_profiles`, etc.

---

## ✅ STEP 4: VERIFICATION

### Run Complete Verification Script

Copy and run this comprehensive verification query:

```sql
-- ========================================
-- COMPREHENSIVE DATABASE VERIFICATION
-- ========================================

-- 1. Check Tables Created
SELECT
  'Tables' as check_type,
  COUNT(*) as count,
  'Expected: 30+' as expected
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- 2. Check RLS Enabled
SELECT
  'RLS Enabled' as check_type,
  COUNT(*) as count,
  'Expected: 30+' as expected
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

-- 3. Check Policies Created
SELECT
  'Policies' as check_type,
  COUNT(*) as count,
  'Expected: 50+' as expected
FROM pg_policies
WHERE schemaname = 'public';

-- 4. Check Functions Created
SELECT
  'Functions' as check_type,
  COUNT(*) as count,
  'Expected: 10+' as expected
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION';

-- 5. Check Triggers Created
SELECT
  'Triggers' as check_type,
  COUNT(*) as count,
  'Expected: 20+' as expected
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- 6. Check Foreign Keys
SELECT
  'Foreign Keys' as check_type,
  COUNT(*) as count,
  'Expected: 40+' as expected
FROM information_schema.table_constraints
WHERE constraint_schema = 'public'
  AND constraint_type = 'FOREIGN KEY';

-- 7. Check Indexes
SELECT
  'Indexes' as check_type,
  COUNT(*) as count,
  'Expected: 50+' as expected
FROM pg_indexes
WHERE schemaname = 'public';

-- 8. Check Enums
SELECT
  'Enums' as check_type,
  COUNT(*) as count,
  'Expected: 10+' as expected
FROM pg_type
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND typtype = 'e';
```

### Expected Results
All counts should meet or exceed the "Expected" values. If any are significantly lower, review the deployment steps.

### Critical Tables to Verify
Run these individual checks:

```sql
-- Check companies table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'companies'
ORDER BY ordinal_position;

-- Check user_profiles table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check projects table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- Check RLS policies on projects
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'projects';
```

---

## 📦 STEP 5: STORAGE BUCKETS

### What This Does
Creates Supabase Storage buckets for file uploads with proper policies.

### Buckets to Create

#### 1. project-documents
1. Go to **Storage** in Supabase dashboard
2. Click **New bucket**
3. Settings:
   - **Name:** `project-documents`
   - **Public:** ✅ Yes
   - **File size limit:** 52428800 (50MB)
   - **Allowed MIME types:**
     ```
     application/pdf
     application/msword
     application/vnd.openxmlformats-officedocument.wordprocessingml.document
     application/vnd.ms-excel
     application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
     image/*
     application/dwg
     application/dxf
     ```

4. Click **Create bucket**

#### 2. Add Storage Policies for project-documents

Go to bucket **Policies** tab and run:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-documents');

-- Allow users to read files
CREATE POLICY "Users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-documents');

-- Allow users to delete files
CREATE POLICY "Users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-documents');

-- Allow users to update files
CREATE POLICY "Users can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-documents');
```

#### 3. fieldsnap-photos
1. Click **New bucket**
2. Settings:
   - **Name:** `fieldsnap-photos`
   - **Public:** ✅ Yes
   - **File size limit:** 52428800 (50MB)
   - **Allowed MIME types:**
     ```
     image/jpeg
     image/png
     image/gif
     image/webp
     image/heic
     ```

3. Click **Create bucket**

#### 4. Add Storage Policies for fieldsnap-photos

```sql
-- Same 4 policies as above, but replace 'project-documents' with 'fieldsnap-photos'
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fieldsnap-photos');

CREATE POLICY "Users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'fieldsnap-photos');

CREATE POLICY "Users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'fieldsnap-photos');

CREATE POLICY "Users can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'fieldsnap-photos');
```

#### 5. user-avatars
1. Click **New bucket**
2. Settings:
   - **Name:** `user-avatars`
   - **Public:** ✅ Yes
   - **File size limit:** 5242880 (5MB)
   - **Allowed MIME types:**
     ```
     image/jpeg
     image/png
     image/gif
     image/webp
     ```

3. Click **Create bucket**

#### 6. Add Storage Policies for user-avatars

```sql
-- Same 4 policies
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-avatars');

CREATE POLICY "Users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-avatars');
```

---

## 🐛 TROUBLESHOOTING

### Error: "relation already exists"
**Cause:** Tables already created
**Fix:** Either drop existing tables or use a fresh database project

### Error: "function get_user_company_id() does not exist"
**Cause:** RLS policies deployed before functions
**Fix:** Deploy in correct order: Schema → RLS → Functions

### Error: "permission denied for table"
**Cause:** RLS policies too restrictive
**Fix:** Review policies, ensure `authenticated` role has access

### Error: "policy ... already exists"
**Cause:** Policies already created
**Fix:** Safe to ignore if rerunning, or drop policies first

### Error: "column does not exist"
**Cause:** Schema not fully deployed
**Fix:** Rerun master-schema.sql

### RLS Testing Fails
**Symptom:** Users can see other companies' data
**Fix:**
1. Verify `get_user_company_id()` function exists
2. Check `user_profiles` table has `company_id` column
3. Ensure policies use `get_user_company_id()` correctly

---

## 🔄 ROLLBACK PLAN

### If Deployment Fails

#### Option 1: Drop All Tables (Nuclear Option)
```sql
-- ⚠️ DANGER: This deletes ALL data
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

#### Option 2: Drop Specific Objects
```sql
-- Drop all policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename || ' CASCADE';
    END LOOP;
END $$;

-- Drop all functions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public')
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || r.routine_name || ' CASCADE';
    END LOOP;
END $$;

-- Drop all tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || r.tablename || ' CASCADE';
    END LOOP;
END $$;
```

### Supabase Project Backups
Supabase Pro/Team plans include automatic backups:
1. Go to **Database** → **Backups**
2. Restore to a point before deployment
3. Redeploy with fixes

---

## ✅ POST-DEPLOYMENT CHECKLIST

After successful deployment:

- [ ] All tables created (30+)
- [ ] RLS enabled on all tables
- [ ] Policies created (50+)
- [ ] Functions created (10+)
- [ ] Triggers created (20+)
- [ ] Storage buckets created (3)
- [ ] Storage policies added (12 total)
- [ ] Verification script passed
- [ ] Test user registration works
- [ ] Test multi-tenant isolation

---

## 🎉 SUCCESS CRITERIA

You'll know deployment succeeded when:

1. ✅ Verification script shows all expected counts
2. ✅ No SQL errors in any step
3. ✅ Storage buckets visible in dashboard
4. ✅ Can register a new user (creates company + profile)
5. ✅ User can create a project
6. ✅ User cannot see other companies' data

---

## 📞 NEED HELP?

### Common Resources
- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- PostgreSQL Docs: https://www.postgresql.org/docs/

### Debug Queries
```sql
-- Check what user is authenticated
SELECT auth.uid();

-- Check user's company
SELECT get_user_company_id();

-- Check user's role
SELECT role FROM user_profiles WHERE id = auth.uid();

-- Test policy on specific table
SELECT * FROM projects; -- Should only show user's company projects
```

---

**Deployment Guide Version:** 1.0
**Last Updated:** January 22, 2026
**Maintained By:** Sierra Suites Development Team
