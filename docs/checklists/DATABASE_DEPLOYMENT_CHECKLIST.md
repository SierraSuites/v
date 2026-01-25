# 🗄️ DATABASE DEPLOYMENT CHECKLIST

**Date**: January 24, 2026
**Purpose**: Step-by-step guide to deploy missing database schemas to Supabase

---

## ⚠️ URGENT: MISSING SCHEMA

### Critical Missing Table: `custom_task_templates`

**Impact**: CustomTemplateManager component will not work without this table!

**File to Deploy**: `database/migrations/003-ADD-CUSTOM-TASK-TEMPLATES.sql`

**Deployed**: ❌ NO

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before deploying ANY SQL to Supabase:

- [ ] ✅ **Backup Current Database**
  - Go to Supabase Dashboard → Database → Backups
  - Create manual backup with description: "Before custom_task_templates deployment"
  - Note backup ID: _______________

- [ ] ✅ **Review SQL File**
  - Open `database/migrations/003-ADD-CUSTOM-TASK-TEMPLATES.sql`
  - Read through entire file
  - Understand what it does
  - Look for any DROP TABLE CASCADE statements (there are none in this file)

- [ ] ✅ **Check Dependencies**
  - Verify `auth.users` table exists (it should)
  - Verify `user_profiles` table exists with `company_id` column
  - Run: `SELECT column_name FROM information_schema.columns WHERE table_name = 'user_profiles';`

- [ ] ✅ **Have Rollback Plan**
  - Rollback script is included at bottom of migration file
  - Know how to restore from backup if needed

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: "The Sierra Suites"
3. Click "SQL Editor" in left sidebar
4. Click "New Query"

### Step 2: Copy Migration SQL

1. Open file: `c:\Users\as_ka\OneDrive\Desktop\new\database\migrations\003-ADD-CUSTOM-TASK-TEMPLATES.sql`
2. Select ALL text (Ctrl+A)
3. Copy (Ctrl+C)

### Step 3: Paste and Execute

1. Paste SQL into Supabase SQL Editor (Ctrl+V)
2. Review the SQL one more time
3. Click "Run" button
4. Wait for execution to complete

### Step 4: Verify Success

You should see output messages like:

```
✅ Table custom_task_templates created successfully!
✅ RLS enabled on custom_task_templates
✅ RLS policies created for custom_task_templates
Policy count: 5

====================================
✅ MIGRATION 003 COMPLETED
====================================
Table: custom_task_templates
Indexes: 5 created
RLS Policies: 5 created
Triggers: 1 created
Constraints: 2 created

🎉 Custom Task Templates feature is now ready!
```

### Step 5: Manual Verification

Run these queries to double-check:

```sql
-- 1. Check table exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'custom_task_templates';
-- Expected: 1 row returned

-- 2. Check columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'custom_task_templates'
ORDER BY ordinal_position;
-- Expected: 9 columns (id, user_id, company_id, name, description, category, icon, tasks, is_public, created_at, updated_at)

-- 3. Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'custom_task_templates';
-- Expected: rowsecurity = true

-- 4. Check RLS policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'custom_task_templates';
-- Expected: 5 policies

-- 5. Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'custom_task_templates';
-- Expected: 6 indexes (1 primary key + 5 created)

-- 6. Try inserting test data (DON'T RUN IN PRODUCTION)
-- This is just to verify the table works
```

### Step 6: Test in Application

1. Open app: https://your-app-url.com/taskflow
2. Look for "Custom Templates" section
3. Try to:
   - View custom templates
   - Create new template
   - Edit template
   - Delete template
4. Check browser console for errors
5. Check Supabase Dashboard → Logs for any RLS errors

---

## ✅ POST-DEPLOYMENT CHECKLIST

After successful deployment:

- [ ] ✅ **Update Documentation**
  - Mark `custom_task_templates` as ✅ DEPLOYED in `SQL_DATABASE_ANALYSIS_AND_REORGANIZATION.md`
  - Add deployment date to this checklist
  - Note any issues encountered

- [ ] ✅ **Update "current sql" Folder**
  - Add new file: `sql 20 - custom task templates`
  - Copy contents of `003-ADD-CUSTOM-TASK-TEMPLATES.sql`
  - Add header comment with deployment date

- [ ] ✅ **Test All CustomTemplateManager Features**
  - Create custom template ✅/❌
  - Edit template ✅/❌
  - Delete template ✅/❌
  - Share template with company ✅/❌
  - View shared templates ✅/❌
  - Apply template to project ✅/❌

- [ ] ✅ **Monitor for 24 Hours**
  - Check Supabase logs for RLS errors
  - Check for user complaints about templates
  - Monitor database performance

- [ ] ✅ **Communication**
  - Notify team that custom templates feature is live
  - Update release notes
  - Add to product changelog

---

## 🔒 SECURITY VERIFICATION

After deployment, verify security is working:

```sql
-- 1. Test RLS - User can only see own templates
-- Login as User A, create template
-- Login as User B, try to SELECT User A's template
-- Expected: User B should NOT see User A's private template

-- 2. Test RLS - Company public templates are visible
-- User A creates template with is_public = true
-- User B (same company) should see it
-- User C (different company) should NOT see it

-- 3. Test RLS - Cannot modify other user's templates
-- User B tries to UPDATE User A's template
-- Expected: Permission denied or no rows affected

-- 4. Test RLS - Cannot delete other user's templates
-- User B tries to DELETE User A's template
-- Expected: Permission denied or no rows affected
```

---

## ⚠️ TROUBLESHOOTING

### Issue: Migration fails with "relation already exists"

**Solution**: Table already exists. Check if it was partially deployed.
```sql
-- Check if table exists
SELECT * FROM custom_task_templates LIMIT 1;

-- If it exists but incomplete, drop and re-run migration
DROP TABLE IF EXISTS custom_task_templates CASCADE;
-- Then re-run migration
```

### Issue: RLS policies not working

**Solution**: Check if RLS is enabled and policies exist
```sql
-- Verify RLS enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'custom_task_templates';

-- If rowsecurity = false, enable it
ALTER TABLE custom_task_templates ENABLE ROW LEVEL SECURITY;

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'custom_task_templates';

-- If no policies, re-run STEP 4 from migration
```

### Issue: "company_id" column doesn't exist in user_profiles

**Solution**: Add company_id to user_profiles table first
```sql
-- Check if company_id exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'company_id';

-- If it doesn't exist, add it
ALTER TABLE user_profiles ADD COLUMN company_id UUID;

-- Then re-run migration
```

### Issue: Function update_updated_at_column() already exists

**Solution**: This is OK! The migration uses CREATE OR REPLACE, so it will update the function.

---

## 📊 DEPLOYMENT LOG

**Template**: Copy this for each deployment

```
===========================================
DEPLOYMENT: custom_task_templates
===========================================
Date: ____________________
Time: ____________________
Deployed by: ______________
Migration file: 003-ADD-CUSTOM-TASK-TEMPLATES.sql
Backup ID: ________________

Pre-checks:
- [ ] Backup created
- [ ] Dependencies verified
- [ ] SQL reviewed

Execution:
- [ ] SQL executed without errors
- [ ] Verification queries passed
- [ ] RLS policies working
- [ ] Application tested

Issues encountered:
(None / Describe issues here)

Rollback performed:
- [ ] No
- [ ] Yes - Reason: ___________

Status:
- [ ] ✅ Successfully deployed
- [ ] ⚠️  Partially deployed (describe)
- [ ] ❌ Failed (describe)

Notes:
(Any additional notes)
===========================================
```

---

## 🎯 NEXT DEPLOYMENTS

After custom_task_templates is deployed, consider these next:

### HIGH PRIORITY:
1. **Fix Security Policies** (Wide-open policies on tasks/projects)
   - File: `database/fixes/fix-permissive-rls-policies.sql`
   - Impact: Critical security issue

### MEDIUM PRIORITY:
2. **Punch List System**
   - File: `database/modules/punchlist.sql`
   - Check if feature is being used first

3. **Report Center**
   - File: `database/modules/reportcenter.sql`
   - Choose: Basic, Advanced, or Enterprise

4. **RBAC System**
   - File: `database/modules/rbac.sql`
   - If role-based permissions needed

### LOW PRIORITY (Future):
5. Sustainability Hub
6. AI Copilot (wait for real AI)
7. Client Communication Portal

---

## 📞 SUPPORT

If you encounter issues:

1. **Check Supabase Logs**
   - Dashboard → Logs → Query tab
   - Look for errors related to custom_task_templates

2. **Check Application Logs**
   - Browser console (F12)
   - Server logs (if applicable)

3. **Rollback if Necessary**
   - Use rollback script at bottom of migration file
   - Restore from backup if needed

4. **Contact Support**
   - Supabase Support: https://supabase.com/support
   - Review migration file with developer

---

## ✅ COMPLETION

When custom_task_templates deployment is complete:

**Date Deployed**: _______________
**Deployed By**: _______________
**Status**: ✅ SUCCESS / ⚠️ PARTIAL / ❌ FAILED
**Issues**: (None / Describe)

**Signature**: _______________

---

**CRITICAL**: This table is required for Enterprise Part 2 Custom Template Manager feature!

---

*End of Deployment Checklist*
