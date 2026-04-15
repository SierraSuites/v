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
| `20260414_design_selections.sql` | 2026-04-14 | ✅ Applied | design_selections table with RLS. Integrates with project_expenses (budget) and tasks (procurement automation) |

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
  ADD COLUMN IF NOT EXISTS two_factor_verified_at TIMESTAMPTZ,
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

### `user_profiles.plan` column (2026-04-09) ✅

Added `plan` column to `user_profiles` to support storage limits and feature gating per tier. Used by `/api/dashboard/stats` to determine storage quota.

```sql
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'starter'
  CHECK (plan IN ('starter', 'professional', 'enterprise'));
```

### Quotes — add + backfill `company_id` (2026-04-09) ✅

`quotes` table had no `company_id` column. Added it and backfilled from `user_profiles`. Also fixed `createQuote` insert in `lib/supabase/quotes.ts` to write `company_id` going forward. Fixed wrong column name `total_price` → `total_amount` in `/api/dashboard/stats`.

```sql
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

UPDATE public.quotes q
SET company_id = up.company_id
FROM public.user_profiles up
WHERE q.user_id = up.id
  AND q.company_id IS NULL;
```

### Tasks — add + backfill `company_id` (2026-04-09) ✅

`tasks` table had no `company_id` column. Added it and backfilled from `user_profiles`. Fixed `createTask` insert in `lib/supabase/tasks.ts` to write `company_id` going forward. Also added `company_id` to the `Task` type.

```sql
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

UPDATE public.tasks t
SET company_id = up.company_id
FROM public.user_profiles up
WHERE t.user_id = up.id
  AND t.company_id IS NULL;
```

### Dropped `project_members` table — migrated to `project_team_members` (2026-04-09) ✅

`project_members` was redundant with `project_team_members` (which has `company_id`, `added_by`, `project_role`). Migrated all code references in `lib/supabase/projects.ts`, `lib/permissions.ts`, `lib/api-permissions.ts`, and `lib/projects/get-project-details.ts`. Dropped dependent RLS policies on `project_phases`, `project_milestones`, `project_expenses`, `project_documents`, and `storage.objects`, recreated them using `project_team_members`, then dropped the table:

```sql
-- Drop dependent policies
DROP POLICY IF EXISTS "Users can view phases of their projects" ON public.project_phases;
DROP POLICY IF EXISTS "Users can view project milestones" ON public.project_milestones;
DROP POLICY IF EXISTS "Users can view project expenses" ON public.project_expenses;
DROP POLICY IF EXISTS "Project members can add expenses" ON public.project_expenses;
DROP POLICY IF EXISTS "Users can view project documents" ON public.project_documents;
DROP POLICY IF EXISTS "Project members can upload documents" ON public.project_documents;
DROP POLICY IF EXISTS "Project members can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can view files" ON storage.objects;

-- Recreate using project_team_members
CREATE POLICY "Users can view phases of their projects" ON public.project_phases FOR SELECT
USING (project_id IN (SELECT project_id FROM public.project_team_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view project milestones" ON public.project_milestones FOR SELECT
USING (project_id IN (SELECT project_id FROM public.project_team_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view project expenses" ON public.project_expenses FOR SELECT
USING (project_id IN (SELECT project_id FROM public.project_team_members WHERE user_id = auth.uid()));

CREATE POLICY "Project members can add expenses" ON public.project_expenses FOR INSERT
WITH CHECK (project_id IN (SELECT project_id FROM public.project_team_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view project documents" ON public.project_documents FOR SELECT
USING (project_id IN (SELECT project_id FROM public.project_team_members WHERE user_id = auth.uid()));

CREATE POLICY "Project members can upload documents" ON public.project_documents FOR INSERT
WITH CHECK (project_id IN (SELECT project_id FROM public.project_team_members WHERE user_id = auth.uid()));

CREATE POLICY "Project members can view files" ON storage.objects FOR SELECT
USING (bucket_id = 'project-files' AND (storage.foldername(name))[1] IN (SELECT project_id::text FROM public.project_team_members WHERE user_id = auth.uid()));

CREATE POLICY "Project members can upload files" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-files' AND (storage.foldername(name))[1] IN (SELECT project_id::text FROM public.project_team_members WHERE user_id = auth.uid()));

DROP TABLE public.project_members;
```

### `project_team_members` — grant permissions (2026-04-09) ✅

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_team_members TO authenticated;
```

### `project_team_members` — backfill project creators (2026-04-09) ✅

Project cards showed company members (wrong — used all `user_profiles` by `company_id`) while the project detail Team tab showed 0 (queried empty `project_members` table). Fixed both to use `project_team_members` for per-project assignments. Auto-add creator on `createProject`. Backfilled existing projects:

```sql
INSERT INTO public.project_team_members (project_id, user_id, company_id, project_role, added_by)
SELECT p.id, p.user_id, p.company_id, 'owner', p.user_id
FROM public.projects p
WHERE p.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.project_team_members ptm
    WHERE ptm.project_id = p.id AND ptm.user_id = p.user_id
  );
```

### `notifications` table — grant permissions (2026-04-09) ✅

The `authenticated` role had no privileges on `notifications`, causing `42501 permission denied`. RLS policies already existed. Fixed with:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
```

### Projects — backfill `company_id` (2026-04-09) ✅

`createProject` was only writing `user_id` and omitting `company_id`, so projects were invisible to all company-scoped queries (dashboard recent, stats, `/projects` page). Fixed the insert in `lib/supabase/projects.ts` to write both fields. Run this once to backfill existing projects:

```sql
UPDATE public.projects p
SET company_id = up.company_id
FROM public.user_profiles up
WHERE p.user_id = up.id
  AND p.company_id IS NULL;
```

### Tasks — add FK constraint to projects + clean orphans (2026-04-14) ✅

`tasks.project_id` had no foreign key constraint, so deleting a project left orphaned tasks. Cleaned up orphaned rows first, then added the constraint with `ON DELETE SET NULL` (tasks are company-scoped and can exist without a project).

`project_change_orders` and `project_rfis` were investigated — confirmed they do not exist as tables in the database yet (queries in `get-project-details.ts` silently return empty arrays). No constraint needed.

```sql
-- Clean up orphaned tasks from previously deleted projects
UPDATE public.tasks
SET project_id = NULL, project_name = NULL
WHERE project_id IS NOT NULL
  AND project_id NOT IN (SELECT id FROM public.projects);

-- Add FK so future project deletes null out task references
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
```

---

## Complete Schema Reference

Verified from live Supabase on **2026-04-09**. All column names are authoritative.

### Scoping Reference

| Table | Scope Column | Notes |
|-------|-------------|-------|
| `projects` | `company_id` + `user_id` | Both present; query by `company_id` |
| `tasks` | `company_id` + `user_id` | Both present; query by `company_id` |
| `quotes` | `company_id` + `user_id` | Both present; query by `company_id` |
| `companies` | `id` = company itself | RLS via `get_my_company_id()` |
| `user_profiles` | `company_id` | FK → companies |
| `certifications` | `company_id` | |
| `inspections` | `company_id` + `project_id` | |
| `safety_incidents` | `company_id` + `project_id` | |
| `safety_briefings` | `company_id` + `project_id` | |
| `osha_300_log` | `company_id` | |
| `api_keys` | `company_id` | |
| `audit_logs` | `company_id` + `user_id` | |
| `integrations` | `company_id` | |
| `integration_sync_logs` | `company_id` | |
| `project_team_members` | `company_id` + `project_id` | |
| `team_invitations` | `company_id` | |
| `custom_roles` | `company_id` | |
| `user_role_assignments` | `company_id` + `user_id` | |
| `custom_task_templates` | `company_id` + `user_id` | |
| `contacts` | `user_id` only | No company_id |
| `activities` | `user_id` only | No company_id |
| `notifications` | `user_id` only | No company_id |
| `crm_*` tables | `user_id` only | No company_id |
| `photos` | `user_id` only | No company_id |
| `media_assets` | `user_id` only | No company_id |
| `reports` | `user_id` only | No company_id |
| `team_members` | `user_id` only | No company_id |
| `storage_usage` | `user_id` only | No company_id |

---

### Core Tables

#### `user_profiles`
Scope: `company_id` (FK → companies)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | FK → auth.users |
| `full_name` | text | Display name |
| `name` | text | Secondary name field |
| `email` | text | |
| `phone` | text | |
| `country` | text | |
| `avatar_url` | text | Supabase Storage URL |
| `company_id` | uuid | FK → companies |
| `role` | text | `owner\|admin\|superintendent\|project_manager\|field_engineer\|viewer\|accountant\|subcontractor` |
| `plan` | text | `starter\|professional\|enterprise` — used for storage limits |
| `subscription_tier` | text | Legacy/redundant with plan |
| `subscription_status` | text | |
| `timezone` | text | Default `America/New_York` |
| `is_active` | boolean | |
| `two_factor_enabled` | boolean | |
| `two_factor_secret` | text | TOTP secret (encrypted) |
| `two_factor_verified_at` | timestamptz | |
| `backup_codes` | text[] | Hashed backup codes (SHA-256, dashes stripped before hashing) |
| `failed_login_attempts` | integer | |
| `locked_until` | timestamptz | |
| `oauth_provider` | text | |
| `created_at` / `updated_at` | timestamptz | |

#### `companies`
Scope: self (`id`)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `name` | text | |
| `industry` | text | |
| `size` | text | |
| `website` | text | |
| `address` | jsonb | |
| `phone` | text | |
| `email` | text | |
| `logo_url` | text | |
| `subscription_tier` | text | `starter` default — on companies table (not user_profiles) |
| `subscription_status` | text | `trial` default |
| `trial_ends_at` | timestamptz | |
| `stripe_customer_id` | text | |
| `stripe_subscription_id` | text | |
| `settings` | jsonb | |
| `created_at` / `updated_at` | timestamptz | |

---

### Project Tables

#### `projects`
Scope: `company_id` + `user_id`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `user_id` | uuid | |
| `company_id` | uuid | FK → companies |
| `name` | text | |
| `client` | text | **Not** `client_name` |
| `address` | text | |
| `city` / `state` / `zip_code` / `country` | text | |
| `type` | text | `residential` default |
| `description` | text | |
| `status` | text | `planning` default |
| `progress` | integer | |
| `start_date` / `end_date` | date | **Not** `estimated_end_date` |
| `estimated_budget` | numeric | |
| `spent` | numeric | Auto-updated by trigger on project_expenses |
| `currency` | text | `USD` default |
| `project_manager_id` | uuid | |
| `equipment` | text[] | |
| `certifications_required` | text[] | |
| `document_categories` | text[] | |
| `notification_settings` | jsonb | |
| `client_visibility` | boolean | |
| `is_favorite` | boolean | |
| `thumbnail` | text | |
| `created_at` / `updated_at` | timestamptz | |

#### `project_phases`
Scope: via `project_id`
Columns: `id`, `project_id`, `name`, `start_date`, `end_date`, `status` (`pending` default), `progress`, `created_at`, `updated_at`

#### `project_milestones`
Scope: via `project_id`
Columns: `id`, `project_id`, `phase_id` (FK → project_phases), `name`, `description`, `due_date`, `completed_at`, `status` (`pending` default), `created_at`, `updated_at`

#### `project_expenses`
Scope: via `project_id`
Columns: `id`, `project_id`, `category`, `description`, `amount`, `currency`, `date`, `vendor`, `invoice_number`, `payment_status` (`pending` default), `created_by`, `created_at`
**Trigger**: `update_project_spent_on_expense_change` → recalculates `projects.spent`

#### `project_documents`
Scope: via `project_id`
Columns: `id`, `project_id`, `uploaded_by` (FK → user_profiles), `name`, `category`, `file_path`, `file_size`, `file_type`, `description`, `tags[]`, `uploaded_at`

#### `project_members`
Scope: via `project_id`
Columns: `id`, `project_id`, `user_id`, `role`, `permissions[]` (default `['view']`), `added_at`

#### `project_team_members`
Scope: `company_id` + `project_id`
Columns: `id`, `project_id`, `user_id`, `company_id`, `project_role`, `custom_permissions` (jsonb), `added_at`, `added_by`

---

### Task Tables

#### `tasks`
Scope: `company_id` + `user_id`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `user_id` | uuid | |
| `company_id` | uuid | FK → companies (added 2026-04-09) |
| `title` | text | |
| `description` | text | |
| `project_id` | uuid | nullable |
| `project_name` | text | denormalized |
| `trade` | text | `general` default |
| `phase` | text | `pre-construction` default |
| `status` | text | `not-started` default (**hyphenated**, not underscore) |
| `priority` | text | `medium` default |
| `assignee_id` | uuid | |
| `assignee_name` | text | denormalized |
| `assignee_avatar` | text | |
| `start_date` / `due_date` | date | |
| `duration` | integer | days |
| `progress` | integer | |
| `estimated_hours` | numeric | |
| `actual_hours` | numeric | |
| `dependencies` | text[] | |
| `attachments` | integer | count |
| `comments` | integer | count |
| `location` | text | |
| `weather_dependent` | boolean | |
| `inspection_required` | boolean | |
| `crew_size` | integer | |
| `equipment` / `materials` / `certifications` / `safety_protocols` / `quality_standards` / `documentation` | text[] | |
| `client_visibility` | boolean | |
| `completed_at` | timestamptz | Set by trigger `set_task_completed_at` |
| `created_at` / `updated_at` | timestamptz | |

**Status values**: `not-started`, `in-progress`, `completed`, `blocked` (use hyphens, not underscores)

#### `task_comments`
Columns: `id`, `task_id`, `user_id`, `comment`, `created_at`, `updated_at`

#### `task_attachments`
Columns: `id`, `task_id`, `user_id`, `file_name`, `file_url`, `file_size`, `file_type`, `created_at`

---

### Quote Tables

#### `quotes`
Scope: `company_id` + `user_id`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `user_id` | uuid | |
| `company_id` | uuid | FK → companies (added 2026-04-09) |
| `quote_number` | varchar | Auto-generated by trigger |
| `quote_type` | varchar | `proposal` default |
| `client_id` | uuid | FK → contacts |
| `project_id` | uuid | FK → projects |
| `title` | varchar | |
| `status` | varchar | `draft` default |
| `subtotal` | numeric | |
| `tax_rate` / `tax_amount` | numeric | |
| `discount_type` / `discount_value` / `discount_amount` | numeric | |
| `total_amount` | numeric | **Not** `total_price` |
| `total_cost` | numeric | |
| `profit_margin` | numeric | |
| `deposit_required` / `deposit_amount` | numeric | |
| `currency` | varchar | `USD` default |
| `quote_date` | date | |
| `valid_until` | date | |
| `sent_at` / `first_viewed_at` / `last_viewed_at` | timestamptz | |
| `client_approved_at` / `client_rejected_at` | timestamptz | |
| `view_count` / `revision_count` | integer | |
| `notes` / `internal_notes` / `terms_conditions` / `payment_terms` | text | |
| `branding` | jsonb | |
| `converted_to_project_id` | uuid | FK → projects |
| `created_at` / `updated_at` | timestamptz | |

#### `quote_items`
Columns: `id`, `quote_id`, `item_number`, `category`, `description`, `detailed_description`, `benefits`, `quantity`, `unit`, `unit_price`, `cost_price`, `markup_percentage`, `margin`, `tax_rate`, `tax_amount`, `is_taxable`, `line_total`, `is_optional`, `is_allowance`, `sort_order`, `notes`, `convert_to_task`, `created_task_id`, `created_at`, `updated_at`
**Triggers**: `trigger_update_line_item_totals`, `trigger_update_quote_totals`

#### `quote_templates`
Scope: `user_id`
Columns: `id`, `user_id`, `name`, `description`, `template_type`, `category`, `content` (jsonb), `default_items` (jsonb), `default_terms`, `default_payment_terms`, `default_tax_rate`, `default_valid_days`, `use_count`, `last_used_at`, `is_public`, `is_system_template`, `is_favorite`, `created_by`, `created_at`, `updated_at`

#### `quote_activities`
Columns: `id`, `quote_id`, `activity_type`, `user_id`, `client_name`, `description`, `metadata` (jsonb), `created_at`

#### `quote_client_interactions`
Columns: `id`, `quote_id`, `interaction_type`, `target_type`, `target_id`, `content`, `client_name`, `client_email`, `resolved`, `resolved_by`, `resolved_at`, `resolution_notes`, `created_at`

#### `quote_analytics` (view)
Columns: `user_id`, `quote_type`, `status`, `month`, `quote_count`, `total_value`, `avg_value`, `avg_margin`, `approved_count`, `rejected_count`, `converted_count`, `avg_days_to_approval`

---

### Team & Roles

#### `team_members`
Scope: `user_id`
Columns: `id`, `user_id`, `name`, `avatar`, `role`, `trades[]`, `created_at`, `updated_at`

#### `team_invitations`
Scope: `company_id`
Columns: `id`, `company_id`, `email`, `name`, `role_id` (FK → custom_roles), `project_ids[]`, `invitation_token`, `invited_by`, `invited_at`, `expires_at`, `status` (`pending` default), `accepted_at`, `accepted_by`, `onboarding_completed`, `onboarding_buddy`

#### `custom_roles`
Scope: `company_id`
Columns: `id`, `company_id`, `role_name`, `role_slug`, `description`, `color`, `icon`, `permissions` (jsonb), `is_active`, `is_system_role`, `created_at`, `updated_at`, `created_by`

#### `user_role_assignments`
Scope: `company_id` + `user_id`
Columns: `id`, `user_id`, `role_id` (FK → custom_roles), `company_id`, `project_ids[]`, `expires_at`, `assigned_by`, `assigned_at`, `assignment_reason`

#### `contacts`
Scope: `user_id` only
Columns: `id`, `user_id`, `company_name`, `contact_name`, `email`, `phone`, `address`, `city`, `state`, `zip`, `country`, `contact_type` (`client` default), `notes`, `created_at`, `updated_at`

---

### CRM Tables

All CRM tables scope by `user_id` only (no `company_id`).

#### `crm_contacts`
Columns: `id`, `user_id`, `first_name`, `last_name`, `full_name`, `email`, `phone`, `mobile`, `company`, `job_title`, `website`, `street_address`, `city`, `state`, `zip_code`, `country`, `category` (`prospect` default), `contact_type`, `lead_source`, `tags[]`, `status` (`active` default), `is_favorite`, `quality_score`, `email_opt_in`, `sms_opt_in`, `credit_limit`, `payment_terms`, `tax_id`, `notes`, `profile_image_url`, `social_media` (jsonb), `custom_fields` (jsonb), `created_at`, `updated_at`

#### `crm_leads`
Columns: `id`, `user_id`, `contact_id`, `title`, `description`, `stage` (`new` default), `estimated_value`, `probability`, `weighted_value`, `project_type`, `lead_source`, `assigned_to`, `expected_close_date`, `quote_id`, `project_id`, `is_active`, `priority`, `next_action`, `next_action_date`, `notes`, `tags[]`, `custom_fields` (jsonb), `created_at`, `updated_at`

#### `crm_opportunities`
Columns: `id`, `user_id`, `lead_id`, `contact_id`, `quote_id`, `opportunity_name`, `description`, `project_id`, `contract_value`, `estimated_costs`, `estimated_profit`, `profit_margin`, `start_date`, `expected_completion_date`, `status` (`active` default), `stage`, `completion_percentage`, `account_owner`, `project_manager`, `team_members[]`, `win_probability`, `risk_level`, `notes`, `tags[]`, `custom_fields` (jsonb), `created_at`, `updated_at`

#### `crm_activities`
Columns: `id`, `user_id`, `contact_id`, `lead_id`, `project_id`, `activity_type`, `activity_subtype`, `subject`, `description`, `scheduled_date`, `status` (`scheduled` default), `is_completed`, `completed_at`, `outcome`, `follow_up_required`, `follow_up_date`, `priority`, `is_billable`, `billable_amount`, `tags[]`, `created_by`, `created_at`, `updated_at`

#### `crm_notes`
Columns: `id`, `user_id`, `contact_id`, `lead_id`, `opportunity_id`, `activity_id`, `note_type` (`general` default), `content`, `is_pinned`, `is_private`, `tags[]`, `attachments` (jsonb), `created_by`, `created_at`, `updated_at`

#### `crm_pipeline_stages`
Columns: `id`, `user_id`, `stage_name`, `stage_key`, `description`, `stage_order`, `probability_default`, `color`, `icon`, `auto_actions` (jsonb), `required_fields[]`, `is_active`, `is_system_stage`, `created_at`, `updated_at`

#### `crm_email_templates`
Columns: `id`, `user_id`, `template_name`, `subject_line`, `body_html`, `body_plain`, `category`, `is_system_template`, `is_active`, `use_count`, `available_variables` (jsonb), `created_at`, `updated_at`

#### `crm_integration_sync_log`
Columns: `id`, `user_id`, `integration_type`, `sync_direction`, `records_processed`, `records_created`, `records_updated`, `records_failed`, `status`, `error_message`, `error_details` (jsonb), `started_at`, `completed_at`, `duration_seconds`, `sync_config` (jsonb), `created_at`

---

### Safety & Compliance

#### `safety_incidents`
Scope: `company_id` + `project_id`
Columns: `id`, `company_id`, `project_id`, `incident_number`, `occurred_at`, `reported_at`, `location`, `severity`, `is_osha_recordable`, `is_dart_case`, `days_away_from_work`, `incident_type`, `injury_type`, `body_part_affected`, `employee_name`, `employee_id`, `description`, `immediate_causes[]`, `root_causes[]`, `corrective_actions`, `status` (`open` default), `reported_by`, `investigated_by`, `investigation_complete`, `reported_to_osha`, `osha_case_number`, `created_at`, `updated_at`

#### `safety_briefings`
Scope: `company_id` + `project_id`
Columns: `id`, `project_id`, `company_id`, `briefing_date`, `conducted_by`, `work_description`, `hazards_identified[]`, `topics_covered[]`, `ppe_required[]`, `attendees` (jsonb), `total_attendees`, `all_workers_signed`, `missing_signatures[]`, `photos[]`, `created_at`, `updated_at`

#### `osha_300_log`
Scope: `company_id`
Columns: `id`, `company_id`, `incident_id` (FK → safety_incidents), `case_number`, `year`, `employee_name`, `employee_job_title`, `incident_date`, `where_event_occurred`, `injury_or_illness`, `description`, `death`, `days_away_from_work`, `number_of_days_away`, `is_privacy_case`, `created_at`, `updated_at`

#### `inspections`
Scope: `company_id` + `project_id`
Columns: `id`, `project_id`, `company_id`, `inspection_type`, `inspection_name`, `description`, `scheduled_date`, `requested_by`, `inspector_name`, `inspector_agency`, `status` (`scheduled` default), `result`, `deficiencies` (jsonb), `reinspection_required`, `reinspection_id`, `photos[]`, `documents[]`, `created_at`, `updated_at`

#### `certifications`
Scope: `company_id`
Columns: `id`, `company_id`, `certification_type`, `name`, `certification_number`, `issuing_authority`, `holder_type`, `holder_id`, `holder_name`, `issue_date`, `expiration_date`, `renewal_required`, `is_active`, `cost`, `renewal_cost`, `alert_days_before`, `certificate_url`, `required_for_projects`, `created_at`, `updated_at`, `created_by`

#### `compliance_certifications`
Scope: `user_id`
Columns: `id`, `user_id`, `certification_name`, `certification_type`, `certification_number`, `issuing_authority`, `responsible_person_id`, `issue_date`, `expiry_date`, `renewal_date`, `status`, `is_active`, `certificate_url`, `auto_renew`, `required_for_projects[]`, `notes`, `tags[]`, `created_at`, `updated_at`

#### `compliance_audit_trail`
Scope: `user_id`
Columns: `id`, `user_id`, `entity_type`, `entity_id`, `action`, `actor_type`, `actor_id`, `actor_name`, `actor_email`, `action_timestamp`, `ip_address`, `previous_values` (jsonb), `new_values` (jsonb), `changes_summary`, `project_id`, `client_id`, `checksum`, `created_at`

---

### Media & Photos

#### `photos`
Scope: `user_id`
Columns: `id`, `project_id`, `user_id`, `url`, `caption`, `size_bytes`, `width`, `height`, `created_at`

#### `media_assets`
Scope: `user_id`
Columns: `id`, `user_id`, `project_id`, `url`, `thumbnail_url`, `filename`, `file_size`, `mime_type`, `width`, `height`, `captured_at`, `uploaded_at`, `capture_source` (`mobile` default), `gps_latitude`, `gps_longitude`, `description`, `tags[]`, `ai_tags[]`, `ai_analysis` (jsonb), `ai_processing_status` (`pending` default), `quality_score`, `safety_issues` (jsonb), `defects_detected` (jsonb), `compliance_status`, `status`, `reviewed_by`, `album_ids[]`, `is_favorite`, `is_archived`, `exif_data` (jsonb), `created_at`, `updated_at`

#### `photo_annotations`
Columns: `id`, `media_asset_id`, `created_by`, `annotation_type`, `coordinates` (jsonb), `color`, `text_content`, `measurement_value`, `measurement_unit`, `is_issue`, `issue_type`, `issue_severity`, `assigned_to`, `due_date`, `resolved_at`, `resolved_by`, `created_at`, `updated_at`

#### `photo_comments`
Columns: `id`, `media_asset_id`, `user_id`, `parent_comment_id`, `comment_text`, `mentions[]`, `created_at`, `updated_at`

#### `smart_albums`
Scope: `user_id`
Columns: `id`, `user_id`, `project_id`, `name`, `description`, `album_type` (`manual` default), `rules` (jsonb), `cover_image_url`, `is_public`, `is_shared`, `shared_with[]`, `photo_count`, `created_at`, `updated_at`

#### `visual_analytics`
Scope: via `project_id`
Columns: `id`, `project_id`, `metric_type`, `metric_date`, `metric_value`, `metric_data` (jsonb), `calculated_at`

#### `ai_analysis_history`
Scope: via `media_asset_id`
Columns: `id`, `media_asset_id`, `analysis_type`, `model_version`, `input_params` (jsonb), `results` (jsonb), `confidence`, `processing_time_ms`, `processing_cost`, `created_at`

---

### Reports

All report tables scope by `user_id` only.

#### `reports`
Columns: `id`, `user_id`, `report_number` (auto-generated), `report_type`, `title`, `description`, `project_id`, `quote_id`, `date_range_start`, `date_range_end`, `generated_by`, `generated_at`, `data_snapshot` (jsonb), `status` (`draft` default), `sent_to_client`, `sent_at`, `client_viewed`, `pdf_url`, `excel_url`, `file_path`, `summary` (jsonb), `sections` (jsonb), `photos` (jsonb), `attachments` (jsonb), `tags[]`, `version`, `parent_report_id`, `created_at`, `updated_at`

#### `report_templates`
Columns: `id`, `user_id`, `name`, `description`, `template_type`, `category`, `sections` (jsonb), `styling` (jsonb), `formulas` (jsonb), `data_sources` (jsonb), `is_default`, `is_system_template`, `is_public`, `requires_approval`, `use_count`, `created_by`, `created_at`, `updated_at`

#### `report_schedules`
Columns: `id`, `user_id`, `name`, `description`, `template_id`, `report_type`, `frequency`, `day_of_week`, `day_of_month`, `time_of_day`, `timezone`, `delivery_method`, `recipients` (jsonb), `include_pdf`, `include_excel`, `project_ids[]`, `is_active`, `last_run_at`, `next_run_at`, `run_count`, `created_by`, `created_at`, `updated_at`

#### `report_alerts`
Columns: `id`, `user_id`, `name`, `alert_type`, `condition` (jsonb), `action`, `action_config` (jsonb), `check_frequency`, `last_triggered_at`, `is_active`, `trigger_count`, `created_by`, `created_at`, `updated_at`

#### `report_analytics`
Columns: `id`, `report_id`, `user_id`, `generation_time_ms`, `file_size_bytes`, `client_opened`, `client_opened_at`, `client_open_count`, `client_downloaded`, `client_time_spent_seconds`, `rating`, `feedback`, `was_useful`, `created_at`

#### `report_approvals`
Columns: `id`, `report_id`, `user_id`, `workflow_type`, `required_approvers` (jsonb), `current_step`, `approvals` (jsonb), `rejections` (jsonb), `status` (`pending` default), `final_decision_at`, `final_decision_by`, `due_date`, `expires_at`, `created_at`, `updated_at`

#### `report_exports`
Columns: `id`, `report_id`, `user_id`, `export_type`, `export_format`, `file_size_bytes`, `exported_by_name`, `exported_by_email`, `exported_at`, `ip_address`, `client_portal_access_id`, `watermarked`, `file_url`, `storage_path`, `expires_at`, `created_at`

#### `report_workflows`
Columns: `id`, `user_id`, `name`, `description`, `trigger_type`, `trigger_config` (jsonb), `actions` (jsonb), `conditions` (jsonb), `last_run_at`, `last_run_status`, `next_run_at`, `is_active`, `is_paused`, `run_count`, `success_count`, `failure_count`, `created_by`, `created_at`, `updated_at`

#### `custom_report_saves`
Scope: `user_id`
Columns: `id`, `user_id`, `name`, `description`, `category`, `config` (jsonb), `data_sources` (jsonb), `filters` (jsonb), `visualizations` (jsonb), `use_count`, `is_favorite`, `shared_with_team`, `shared_with_users[]`, `is_public`, `created_at`, `updated_at`

---

### Integrations

#### `integrations`
Scope: `company_id`
Columns: `id`, `company_id`, `connected_by`, `integration_type`, `is_active`, `is_connected`, `connection_status` (`disconnected` default), `access_token`, `refresh_token`, `token_type`, `expires_at`, `scope`, `external_company_id`, `external_user_id`, `settings` (jsonb), `last_sync_at`, `last_sync_status`, `total_syncs`, `successful_syncs`, `failed_syncs`, `connected_at`, `created_at`, `updated_at`

#### `integration_sync_logs`
Scope: `company_id`
Columns: `id`, `integration_id`, `company_id`, `sync_type`, `direction`, `trigger`, `entity_type`, `entity_id`, `status`, `attempt_number`, `started_at`, `completed_at`, `duration_ms`, `error_code`, `error_message`, `error_details` (jsonb), `request_payload` (jsonb), `response_payload` (jsonb), `created_at`

---

### Auth & Security

#### `auth_audit_logs`
Scope: `user_id`
Columns: `id`, `user_id`, `email`, `event_type`, `ip_address`, `user_agent`, `device_fingerprint`, `location`, `metadata` (jsonb), `success`, `error_message`, `created_at`

#### `audit_logs`
Scope: `company_id` + `user_id` (immutable — no UPDATE/DELETE)
Columns: `id`, `company_id`, `user_id`, `user_name`, `user_email`, `user_role`, `timestamp`, `action`, `entity_type`, `entity_id`, `entity_name`, `old_values` (jsonb), `new_values` (jsonb), `changes` (jsonb), `ip_address`, `session_id`, `is_critical`, `requires_approval`, `retention_period` (7 years default)

#### `user_sessions`
Scope: `user_id`
Columns: `id`, `user_id`, `device_name`, `browser`, `os`, `ip_address`, `is_current`, `last_active_at`, `revoked_at`, `created_at`

#### `rate_limit_records`
Columns: `id`, `identifier`, `count`, `window_start`, `lock_until`, `updated_at`

#### `api_keys`
Scope: `company_id`
Columns: `id`, `company_id`, `created_by`, `key_name`, `key_value`, `key_prefix`, `key_type` (`secret` default), `environment` (`production` default), `permissions` (jsonb), `rate_limit_per_hour`, `rate_limit_per_day`, `total_requests`, `is_active`, `expires_at`, `revoked_at`, `created_at`

---

### Client Portal

#### `client_portal_access`
Scope: `user_id`
Columns: `id`, `user_id`, `client_email`, `client_name`, `client_company`, `client_phone`, `portal_username`, `portal_password_hash`, `two_factor_enabled`, `allowed_report_types[]`, `allowed_projects[]`, `view_only`, `can_download`, `can_comment`, `can_approve`, `can_request_changes`, `first_login_at`, `last_login_at`, `login_count`, `failed_login_attempts`, `locked_until`, `is_active`, `is_verified`, `created_by`, `created_at`, `updated_at`

#### `client_portal_activity`
Scope: via `portal_access_id`
Columns: `id`, `portal_access_id` (FK → client_portal_access), `activity_type`, `activity_details`, `report_id`, `project_id`, `ip_address`, `device_type`, `location` (jsonb), `created_at`

---

### Other Tables

#### `activities`
Scope: `user_id` only — **no company_id, no action/entity_type/entity_id columns**
Columns: `id`, `user_id`, `type`, `title`, `description`, `metadata` (jsonb), `created_at`

#### `notifications`
Scope: `user_id`
Columns: `id`, `user_id`, `type` (`info` default), `title`, `message`, `read`, `action_url`, `created_at`

#### `storage_usage`
Scope: `user_id`
Columns: `id`, `user_id`, `total_bytes`, `photo_count`, `video_count`, `document_count`, `last_calculated_at`
**Trigger**: `update_storage_on_media_change` (INSERT/DELETE on media_assets)

#### `timesheet_entries`
Scope: `user_id`
Columns: `id`, `user_id`, `employee_id`, `employee_name`, `project_id`, `work_date`, `week_start_date`, `regular_hours`, `overtime_hours`, `total_hours`, `hourly_rate`, `total_cost`, `task_description`, `trade`, `approved`, `approved_by`, `source` (`manual` default), `synced_from_task_id`, `created_at`, `updated_at`

#### `financial_metrics_cache`
Scope: `user_id`
Columns: `id`, `user_id`, `period_type`, `period_start`, `period_end`, `project_id`, `total_revenue`, `completed_revenue`, `pending_revenue`, `total_costs`, `labor_costs`, `material_costs`, `gross_profit`, `gross_margin`, `active_projects_count`, `completed_projects_count`, `avg_project_value`, `total_hours_worked`, `regular_hours`, `overtime_hours`, `calculated_at`, `is_stale`, `created_at`, `updated_at`

#### `custom_task_templates`
Scope: `company_id` + `user_id`
Columns: `id`, `user_id`, `company_id`, `name`, `description`, `category`, `icon`, `tasks` (jsonb), `is_public`, `created_at`, `updated_at`

#### `workflow_executions`
Scope: via `workflow_id`
Columns: `id`, `workflow_id` (FK → report_workflows), `started_at`, `completed_at`, `duration_ms`, `status`, `triggered_by`, `triggered_by_user`, `execution_context` (jsonb), `actions_executed` (jsonb), `reports_generated[]`, `emails_sent`, `tasks_created`, `error_message`, `retry_attempt`, `created_at`

---

### Triggers Reference

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| `update_project_spent_on_expense_change` | `project_expenses` | INSERT/UPDATE/DELETE | `update_project_spent()` |
| `trigger_update_line_item_totals` | `quote_items` | INSERT/UPDATE | `update_line_item_totals()` |
| `trigger_update_quote_totals` | `quote_items` | INSERT/UPDATE/DELETE | `update_quote_totals()` |
| `trigger_generate_quote_number` | `quotes` | INSERT | `generate_quote_number()` |
| `trigger_log_quote_activity` | `quotes` | INSERT/UPDATE | `log_quote_activity()` |
| `trigger_auto_convert_on_approval` | `quotes` | UPDATE | `auto_convert_on_approval()` |
| `trigger_generate_report_number` | `reports` | INSERT | `generate_report_number()` |
| `set_task_completed_at` | `tasks` | UPDATE | `set_completed_at()` |
| `trg_set_incident_number` | `safety_incidents` | INSERT | `set_incident_number()` |
| `update_storage_on_media_change` | `media_assets` | INSERT/DELETE | `update_storage_usage()` |
| `update_updated_at_column` | many tables | UPDATE | `update_updated_at_column()` |

---

---

## Permission System (Code-Only — No SQL Required)

Implemented 2026-04-09. No database changes needed — all enforced in application code.

### Two-Tier Role Architecture

**Tier 1 — Company roles** (`user_profiles.role`): `owner | admin | member | viewer`
App-wide. Assigned at invite time. Company `owner`/`admin` bypass ALL project permission checks.

**Tier 2 — Project roles** (`project_team_members.project_role`): 8 roles
Per-project. Assigned in the Team tab. A user can have different roles on different projects.

### Permission Matrix

| Permission | owner | admin | pm | super | fe | sub | acct | viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| viewProject | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| editProject | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| deleteProject | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| viewTeam | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| manageTeam | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| changeRoles | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| viewTasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| createEditTasks | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| deleteTasks | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| assignTasks | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| viewTimeline | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| manageTimeline | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| viewBudget | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| manageBudget | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| viewDocuments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| uploadDocuments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| deleteDocuments | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| viewChangeOrders | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| manageChangeOrders | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| approveChangeOrders | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| viewRFIs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| createRFIs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| respondToRFIs | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Key Files Changed

- `lib/permissions.ts` — Added `ProjectPermissionSet`, `ProjectRole`, `PROJECT_ROLE_PERMISSIONS`, `getProjectPermissions()`
- `lib/api-permissions.ts` — Added `requireProjectPermission(projectId, permission)`, updated `requireProjectAccess` with owner/admin bypass
- `lib/projects/get-project-details.ts` — Added `currentUserRole` and `currentUserCompanyRole` to `ProjectDetails`
- `lib/hooks/useProjectPermissions.ts` — New client hook
- All 7 routes under `app/api/projects/[id]/` updated to use `requireProjectPermission`

### Adding Permissions to a New Route

```ts
const auth = await requireProjectPermission(projectId, 'permissionName')
if (!auth.authorized) return auth.error
// auth.userId available for DB inserts
```

### Hiding UI Controls by Permission

```ts
const perms = useProjectPermissions(project.currentUserRole, project.currentUserCompanyRole)
{perms.manageTeam && <button>Add Member</button>}
```

---

## Environment Variables Required

| Variable | Where to find |
|----------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (service_role key) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for dev, your domain for prod |
| `RESEND_API_KEY` | resend.com (used for invoice/quote emails — not required for invites) |
