-- Invite-aware handle_new_user trigger
-- When Supabase sends an invite via auth.admin.inviteUserByEmail(),
-- it passes data into raw_user_meta_data. The trigger reads invited_company_id
-- and invited_role to join the existing company instead of creating a new one.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id  UUID;
  new_role        TEXT := 'owner';
  rbac_role_id    UUID;
  provider        TEXT;
  is_invited      BOOLEAN := false;
BEGIN
  provider := NEW.raw_app_meta_data->>'provider';

  -- ── Detect if this user was invited ────────────────────────────────────────
  -- inviteUserByEmail passes data into raw_user_meta_data
  IF NEW.raw_user_meta_data->>'invited_company_id' IS NOT NULL THEN
    is_invited     := true;
    new_company_id := (NEW.raw_user_meta_data->>'invited_company_id')::UUID;
    new_role       := COALESCE(NEW.raw_user_meta_data->>'invited_role', 'viewer');

    -- Mark matching team_invitation as accepted
    UPDATE public.team_invitations
    SET status      = 'accepted',
        accepted_at = NOW()
    WHERE email     = LOWER(NEW.email)
      AND company_id = new_company_id
      AND status    IN ('pending', 'sent')
      AND expires_at > NOW();

  ELSE
    -- ── New owner — create a fresh company ───────────────────────────────────
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

    new_role := 'owner';
  END IF;

  -- ── Create the user profile ─────────────────────────────────────────────────
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
    new_role,
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
  )
  ON CONFLICT (id) DO UPDATE
    SET company_id = EXCLUDED.company_id,
        role       = EXCLUDED.role,
        updated_at = NOW();

  -- ── RBAC role assignment (best-effort) ──────────────────────────────────────
  BEGIN
    SELECT id INTO rbac_role_id
    FROM public.custom_roles
    WHERE role_slug = new_role AND is_system_role = true
    LIMIT 1;

    IF rbac_role_id IS NOT NULL THEN
      INSERT INTO public.user_role_assignments (
        user_id, role_id, company_id, assigned_by, assignment_reason
      )
      VALUES (
        NEW.id,
        rbac_role_id,
        new_company_id,
        COALESCE((NEW.raw_user_meta_data->>'invited_by')::UUID, NEW.id),
        CASE WHEN is_invited THEN 'Accepted team invitation' ELSE 'Initial registration as company owner' END
      )
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'RBAC assignment skipped for %: %', NEW.email, SQLERRM;
  END;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
