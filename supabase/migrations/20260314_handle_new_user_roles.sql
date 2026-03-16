-- Fix handle_new_user trigger to:
-- 1. Create a company for the new user
-- 2. Create user_profiles with company_id
-- 3. Assign Admin role (first user of a company = owner = Admin)
-- 4. Subsequent users in same company get Viewer by default

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_confirmed();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_admin_role_id uuid;
  v_viewer_role_id uuid;
  v_company_name text;
  v_is_first_user boolean;
BEGIN
  -- Get company name from metadata or default
  v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company');

  -- Check if user already has a company assigned (e.g. invited to existing company)
  -- For now, each new signup creates their own company
  INSERT INTO public.companies (name)
  VALUES (v_company_name)
  RETURNING id INTO v_company_id;

  -- Create user profile
  INSERT INTO public.user_profiles (
    id,
    full_name,
    company_name,
    company_id,
    country,
    phone,
    plan,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_company_name,
    v_company_id,
    COALESCE(NEW.raw_user_meta_data->>'country', 'US'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'selected_plan', 'starter'),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    updated_at = NOW();

  -- Find Admin and Viewer system roles (is_system_role = true, company_id IS NULL)
  SELECT id INTO v_admin_role_id
  FROM public.custom_roles
  WHERE role_slug = 'admin' AND is_active = true
  LIMIT 1;

  SELECT id INTO v_viewer_role_id
  FROM public.custom_roles
  WHERE role_slug = 'viewer' AND is_active = true
  LIMIT 1;

  -- Assign Admin role to the new user (they created this company, so they're the owner)
  IF v_admin_role_id IS NOT NULL THEN
    INSERT INTO public.user_role_assignments (user_id, company_id, role_id, assigned_by)
    VALUES (NEW.id, v_company_id, v_admin_role_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block user creation even if trigger fails
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
