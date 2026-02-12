# Module 10 Deployment SQL Files

These files were used to deploy Module 10 (Teams & RBAC) to Supabase on **February 10, 2026**.

## Deployment Order

Run these files **in order** in the Supabase SQL Editor:

### Step 1: Create Companies Table
**File:** `01-create-companies-first.sql`

Creates the base `companies` table that other tables depend on.

**What it does:**
- Creates `companies` table with all fields
- Adds indexes for performance
- Creates a default company if none exists

**Result:** You should see a company ID and name displayed.

---

### Step 2: Add Missing Columns to user_profiles
**File:** `02-add-missing-columns.sql`

Adds required columns to the existing `user_profiles` table.

**What it does:**
- Adds `company_id` column (foreign key to companies)
- Adds `full_name` and `name` columns
- Adds `is_active` column
- Syncs data between name columns
- Shows final column list

**Result:** You should see a list of all columns in `user_profiles` including the new ones.

---

### Step 3: Deploy Module 10 (Teams & RBAC)
**File:** `03-module10-teams-rbac.sql`

Complete Module 10 implementation with all tables, functions, and security policies.

**What it creates:**

**5 New Tables:**
- `custom_roles` - 7 system roles + custom role support
- `user_role_assignments` - Assigns roles to users
- `project_team_members` - Project-level team assignments
- `audit_logs` - Immutable audit trail for compliance
- `team_invitations` - Team invitation system

**5 Database Functions:**
- `user_has_permission()` - Check if user has specific permission
- `get_user_highest_role()` - Get user's primary role
- `get_user_permissions()` - Get merged permissions from all roles
- `create_audit_log()` - Create audit log entries
- `get_role_member_count()` - Count members with a role

**Row-Level Security (RLS):**
- All tables have RLS enabled
- Company-based data isolation
- Permission-based access control

**7 System Roles Seeded:**
1. **Admin** 👑 - Full system access
2. **Superintendent** 🔧 - Field operations
3. **Project Manager** 📋 - Project & budget management
4. **Field Engineer** 🏗️ - Technical field work
5. **Viewer** 👁️ - View-only access (clients)
6. **Accountant** 💰 - Financial management
7. **Subcontractor** 🔨 - Limited contractor access

**Result:** You should see "Module 10 deployed successfully!" with role count = 7.

---

## Verification Queries

After running all 3 files, run these queries to verify:

```sql
-- Check all tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('companies', 'custom_roles', 'user_role_assignments',
                   'project_team_members', 'audit_logs', 'team_invitations')
ORDER BY table_name;

-- Check system roles
SELECT role_name, role_slug, color, icon, is_system_role
FROM custom_roles
WHERE is_system_role = true
ORDER BY
  CASE role_slug
    WHEN 'admin' THEN 1
    WHEN 'project_manager' THEN 2
    WHEN 'superintendent' THEN 3
    WHEN 'accountant' THEN 4
    WHEN 'field_engineer' THEN 5
    WHEN 'subcontractor' THEN 6
    WHEN 'viewer' THEN 7
  END;

-- Check user_profiles has company_id
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name IN ('company_id', 'full_name', 'name', 'is_active')
ORDER BY column_name;
```

Expected results:
- ✅ 6 tables listed
- ✅ 7 system roles with correct names and icons
- ✅ 4 columns in user_profiles

---

## Troubleshooting

### Error: "relation 'companies' does not exist"
**Solution:** Run Step 1 first (`01-create-companies-first.sql`)

### Error: "column 'company_id' does not exist"
**Solution:** Run Step 2 first (`02-add-missing-columns.sql`)

### Error: "functions in index predicate must be marked IMMUTABLE"
**Solution:** This error is already fixed in the final version (`03-module10-teams-rbac.sql`)

---

## Next Steps After Deployment

1. **Test the UI:** Navigate to `/settings/team` in your application
2. **Assign roles:** Use the Team Directory to assign roles to users
3. **Test permissions:** Verify that role-based access control works
4. **Review audit logs:** Check that actions are being logged

---

## Module 10 Status

✅ **Phase 1:** Planning & Documentation - COMPLETE
✅ **Phase 2:** Database Schema - COMPLETE (deployed)
✅ **Phase 3:** Backend APIs - COMPLETE
✅ **Phase 4:** Frontend Components - COMPLETE
⏳ **Phase 5:** Integration & Testing - PENDING
⏳ **Phase 6:** Documentation - PENDING

**Overall Progress:** 80% complete

---

**Deployment Date:** February 10, 2026
**Deployed By:** Claude Code Assistant
**Database:** Supabase PostgreSQL
