-- Fix handle_new_user trigger
-- The 20260314_handle_new_user_roles migration broke the working Feb 11 version
-- by using wrong column names (company_name, country, plan) and missing email (NOT NULL).
-- This restores the complete version with OAuth, RBAC, audit logging, and trial periods.
-- Error handling uses RAISE WARNING (not EXCEPTION) so failures never block user creation.

-- Ensure all expected columns exist on user_profiles
-- (Original table was created from ESSENTIAL_SQL_SETUP.sql with minimal columns)
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('owner', 'admin', 'project_manager', 'member', 'viewer')) DEFAULT 'member';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')) DEFAULT 'starter';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS oauth_provider TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS oauth_provider_id TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS oauth_connected_at TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Backfill email for existing rows from auth.users
UPDATE public.user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.id = au.id AND up.email IS NULL;

-- Backfill company_id for existing rows that have none
-- Creates a company from the legacy company_name text column (or default)
DO $$
DECLARE
  r RECORD;
  v_company_id UUID;
BEGIN
  FOR r IN
    SELECT up.id, up.company_name
    FROM public.user_profiles up
    WHERE up.company_id IS NULL
  LOOP
    INSERT INTO public.companies (name, subscription_tier, subscription_status)
    VALUES (
      COALESCE(r.company_name, 'My Company'),
      'starter',
      'trial'
    )
    RETURNING id INTO v_company_id;

    UPDATE public.user_profiles
    SET company_id = v_company_id,
        role = COALESCE(role, 'owner')
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- Replace the broken trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
  provider TEXT;
  admin_role_id UUID;
BEGIN
  provider := NEW.raw_app_meta_data->>'provider';

  -- Create company
  INSERT INTO public.companies (
    name,
    subscription_tier,
    subscription_status,
    trial_ends_at
  )
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
    COALESCE(NEW.raw_user_meta_data->>'selected_plan', 'starter'),
    'trial',
    NOW() + INTERVAL '14 days'
  )
  RETURNING id INTO new_company_id;

  -- Create user profile
  INSERT INTO public.user_profiles (
    id,
    company_id,
    email,
    full_name,
    phone,
    role,
    subscription_tier,
    oauth_provider,
    oauth_provider_id,
    oauth_connected_at,
    terms_accepted_at,
    privacy_accepted_at,
    email_verified_at,
    timezone,
    is_active,
    created_at
  )
  VALUES (
    NEW.id,
    new_company_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    'owner',
    COALESCE(NEW.raw_user_meta_data->>'selected_plan', 'starter'),
    provider,
    CASE WHEN provider IS NOT NULL THEN NEW.id::text ELSE NULL END,
    CASE WHEN provider IS NOT NULL THEN NOW() ELSE NULL END,
    NOW(),
    NOW(),
    NEW.email_confirmed_at,
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'America/New_York'),
    true,
    NOW()
  );

  -- Assign admin role from custom_roles if it exists (RBAC)
  SELECT id INTO admin_role_id
  FROM public.custom_roles
  WHERE role_slug = 'admin' AND is_system_role = true
  LIMIT 1;

  IF admin_role_id IS NOT NULL THEN
    INSERT INTO public.user_role_assignments (
      user_id,
      role_id,
      company_id,
      assigned_by,
      assignment_reason
    )
    VALUES (
      NEW.id,
      admin_role_id,
      new_company_id,
      NEW.id,
      'Initial registration as company owner'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Log registration event
  INSERT INTO public.auth_audit_logs (
    user_id,
    email,
    event_type,
    success,
    metadata
  )
  VALUES (
    NEW.id,
    NEW.email,
    'registration',
    true,
    jsonb_build_object(
      'provider', provider,
      'registration_method', CASE WHEN provider IS NOT NULL THEN 'oauth' ELSE 'email' END,
      'company_id', new_company_id
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block user creation even if trigger fails
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing user_profiles for existing users whose trigger silently failed
DO $$
DECLARE
  r RECORD;
  v_company_id UUID;
BEGIN
  FOR r IN
    SELECT * FROM auth.users
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.users.id
    )
  LOOP
    INSERT INTO public.companies (name, subscription_tier, subscription_status, trial_ends_at)
    VALUES (
      COALESCE(r.raw_user_meta_data->>'company_name', 'My Company'),
      'starter',
      'trial',
      r.created_at + INTERVAL '14 days'
    )
    RETURNING id INTO v_company_id;

    INSERT INTO public.user_profiles (id, email, full_name, company_id, subscription_tier, role, is_active, created_at, updated_at)
    VALUES (
      r.id,
      r.email,
      COALESCE(r.raw_user_meta_data->>'full_name', ''),
      v_company_id,
      'starter',
      'owner',
      true,
      r.created_at,
      NOW()
    );
  END LOOP;
END;
$$;
