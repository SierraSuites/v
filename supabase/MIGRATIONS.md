# Supabase Migrations

Status tracker for all database migrations. Run these in order in **Supabase Dashboard → SQL Editor**.

---

## Migration Status

| File | Date | Status | Description |
|------|------|--------|-------------|
| `20260209_module10_teams_rbac.sql` | 2026-02-09 | ✅ Applied | Teams, RBAC, custom roles, user_role_assignments, team_invitations |
| `20260209_module10_teams_rbac_fixed.sql` | 2026-02-09 | ✅ Applied | Fixes to module 10 (IF NOT EXISTS guards, policy corrections) |
| `20260209_module10_final.sql` | 2026-02-09 | ✅ Applied | Final adjustments to module 10 |
| `20260217_module13_compliance_safety.sql` | 2026-02-17 | ✅ Applied | Compliance and safety tables |
| `20260217_module14_integrations.sql` | 2026-02-17 | ✅ Applied | Integrations tables |
| `20260314_handle_new_user_roles.sql` | 2026-03-14 | ⚠️ Superseded | Broken trigger — wrong column names. Replaced by `20260321_fix_handle_new_user_trigger.sql` |
| `20260314_auth_rate_limit_tables.sql` | 2026-03-14 | ✅ Applied | Auth rate limiting tables |
| `20260316_task_dependencies_gantt.sql` | 2026-03-16 | ✅ Applied | Task dependencies and Gantt chart support |
| `20260316_client_portal.sql` | 2026-03-16 | ✅ Applied | Client portal tables |
| `20260316_documents_system.sql` | 2026-03-16 | ✅ Applied | Document management tables |
| `20260316_equipment_tracking.sql` | 2026-03-16 | ✅ Applied | Equipment tracking tables |
| `20260317_safety_compliance.sql` | 2026-03-17 | ✅ Applied | Safety compliance tables |
| `20260317_integrations.sql` | 2026-03-17 | ✅ Applied | Integration webhook tables |
| `20260317_realtime_collaboration.sql` | 2026-03-17 | ✅ Applied | Realtime collaboration tables |
| `20260317_warranty_management.sql` | 2026-03-17 | ✅ Applied | Warranty management tables |
| `20260317_advanced_reporting.sql` | 2026-03-17 | ✅ Applied | Advanced reporting tables |
| `20260321_fix_handle_new_user_trigger.sql` | 2026-03-21 | ✅ Applied | Restored working trigger, backfilled missing profiles/companies |
| `20260405_invite_aware_trigger.sql` | 2026-04-05 | ✅ Applied | Invite-aware trigger — joins invited users to existing company instead of creating new one |

---

## Manual SQL Applied Directly in Supabase

These were run directly in the SQL Editor and are **not** in a migration file.

### Updated `get_my_company_id()` — added `SET search_path` (2026-04-05) ✅

Re-ran the function definition with `SET search_path = public` to ensure correct table resolution inside the `SECURITY DEFINER` context:

```sql
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
$$;
```

### RLS Fix — `user_profiles` infinite recursion (2026-04-05) ✅

The "Users can view company members" policy caused infinite recursion because it queried `user_profiles` inside a policy on `user_profiles`. Fixed by:

1. Creating a `SECURITY DEFINER` helper function that bypasses RLS:

```sql
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
$$;
```

2. Dropping and recreating the policy to use the function:

```sql
DROP POLICY "Users can view company members" ON public.user_profiles;

CREATE POLICY "Users can view company members"
ON public.user_profiles
FOR SELECT
USING (
  company_id = public.get_my_company_id()
);
```

### Role constraint fix (2026-04-05) ✅

The `user_profiles.role` column had a constraint that included `member` which is not a valid app role. Updated constraint and fixed existing user:

```sql
UPDATE public.user_profiles
SET role = 'owner'
WHERE email = 'your@email.com';

ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_role_check
CHECK (role IN ('owner', 'admin', 'superintendent', 'project_manager', 'field_engineer', 'viewer', 'accountant', 'subcontractor'));
```

### `companies` table — grants and RLS (2026-04-05) ✅

The `authenticated` role had no privileges on `companies`, causing `42501 permission denied` before RLS even evaluated. Fixed with:

```sql
GRANT SELECT ON public.companies TO authenticated;
GRANT UPDATE ON public.companies TO authenticated;
```

### `companies` table — RLS policies (2026-04-05) ✅

Enabled RLS on `companies` and added SELECT/UPDATE policies:

```sql
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own company"
ON public.companies
FOR SELECT
TO authenticated
USING (id = public.get_my_company_id());

CREATE POLICY "Admins can update their company"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  id = public.get_my_company_id()
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

### `avatars` storage bucket — RLS policies (2026-04-05) ✅

Created the `avatars` bucket (set to **Public**) and added RLS policies on `storage.objects`. Deleted pre-existing duplicate policies that used the `public` role for INSERT/UPDATE (security risk — allowed unauthenticated writes).

```sql
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND name LIKE (auth.uid()::text || '-%')
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND name LIKE (auth.uid()::text || '-%')
);

CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

Deleted old duplicate policies: "Anyone can view avatars" (SELECT, public), "Users can update own avatar" (UPDATE, public), "Users can upload own avatar" (INSERT, public).

### Removed `company_name` column from `user_profiles` (2026-04-05) ✅

The `company_name` column was a legacy denormalized field leftover from before the `companies` table existed. Company name is now read from `companies.name` via the `company_id` FK.

```sql
ALTER TABLE user_profiles DROP COLUMN company_name;
```

### `user_role_assignments` — grant permissions (2026-04-05) ✅

The `authenticated` role had no privileges on `user_role_assignments`, causing `42501 permission denied` when opening the role editor for a team member.

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_role_assignments TO authenticated;
```

### 2FA columns + `user_sessions` table (2026-04-05) ✅

Added columns to `user_profiles` required for two-factor authentication, and created `user_sessions` for active session tracking on the Security settings page.

```sql
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
  ADD COLUMN IF NOT EXISTS backup_codes TEXT[];

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT,
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  is_current BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
ON public.user_sessions
USING (user_id = auth.uid());
```

---

## Current Schema Notes

### `user_profiles` columns (relevant)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | FK → `auth.users.id` |
| `company_id` | UUID | FK → `companies.id` |
| `full_name` | TEXT | |
| `avatar_url` | TEXT | Supabase Storage public URL |
| `phone` | TEXT | |
| `role` | TEXT | `owner\|admin\|superintendent\|project_manager\|field_engineer\|viewer\|accountant\|subcontractor` |
| `two_factor_enabled` | BOOLEAN | Default `false` |
| `two_factor_secret` | TEXT | TOTP secret |
| `backup_codes` | TEXT[] | Remaining 2FA backup codes |

### `user_profiles` RLS Policies
| Policy | Command | Rule |
|--------|---------|------|
| Users can insert own profile | INSERT | (no restriction) |
| Users can update own profile | UPDATE | `auth.uid() = id` |
| Users can view own profile | SELECT | `auth.uid() = id` |
| Users can view company members | SELECT | `company_id = get_my_company_id()` |

---

## Environment Variables Required

| Variable | Where to find |
|----------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (service_role key) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for dev, your domain for prod |
| `RESEND_API_KEY` | resend.com (used for invoice/quote emails — not required for invites) |
