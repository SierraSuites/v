-- =====================================================
-- Module 1: Authentication Security Enhancements
-- Migration: 202602111500
-- =====================================================
--
-- This migration adds critical security infrastructure:
-- 1. Auth audit logging for all auth events
-- 2. User sessions tracking for security monitoring
-- 3. Password history to prevent reuse
-- 4. Rate limiting records (database-backed)
-- 5. Additional security fields on user_profiles
-- 6. Enhanced handle_new_user() trigger
--
-- =====================================================

-- =====================================================
-- 1. AUTH AUDIT LOGS TABLE
-- =====================================================
-- Tracks all authentication events for security monitoring

CREATE TABLE IF NOT EXISTS public.auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login_success',
    'login_failed',
    'logout',
    'password_reset_requested',
    'password_reset_completed',
    'password_changed',
    'email_changed',
    '2fa_enabled',
    '2fa_disabled',
    '2fa_verified',
    'oauth_connected',
    'oauth_disconnected',
    'session_revoked',
    'account_locked',
    'account_unlocked',
    'registration',
    'email_verified'
  )),
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  location TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON public.auth_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_email ON public.auth_audit_logs(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_event ON public.auth_audit_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_ip ON public.auth_audit_logs(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created ON public.auth_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.auth_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can view audit logs
CREATE POLICY "Admin users can view all audit logs"
  ON public.auth_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = auth.uid()
        AND up.permissions->>'canManageUsers' = 'true'
    )
  );

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON public.auth_audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

COMMENT ON TABLE public.auth_audit_logs IS 'Audit trail for all authentication events';

-- =====================================================
-- 2. USER SESSIONS TABLE
-- =====================================================
-- Tracks active user sessions for security monitoring

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token_id TEXT,
  device_name TEXT,
  browser TEXT,
  os TEXT,
  ip_address INET,
  location TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  is_current BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(user_id, revoked_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions(expires_at);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view only their own sessions
CREATE POLICY "Users can view own sessions"
  ON public.user_sessions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON public.user_sessions
  FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can view all sessions
CREATE POLICY "Admin users can view all sessions"
  ON public.user_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = auth.uid()
        AND up.permissions->>'canManageUsers' = 'true'
    )
  );

COMMENT ON TABLE public.user_sessions IS 'Active user sessions for security monitoring and remote logout';

-- =====================================================
-- 3. PASSWORD HISTORY TABLE
-- =====================================================
-- Prevents password reuse

CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_history_user ON public.password_history(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: No direct access (managed by triggers)
CREATE POLICY "No direct access to password history"
  ON public.password_history
  FOR ALL
  USING (false);

COMMENT ON TABLE public.password_history IS 'Password history to prevent reuse (last 5 passwords)';

-- =====================================================
-- 4. RATE LIMITING TABLE
-- =====================================================
-- Database-backed rate limiting for production

CREATE TABLE IF NOT EXISTS public.rate_limit_records (
  identifier TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  lock_until TIMESTAMPTZ,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON public.rate_limit_records(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limit_lock ON public.rate_limit_records(lock_until) WHERE lock_until IS NOT NULL;

-- Enable RLS
ALTER TABLE public.rate_limit_records ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only accessible by service role
CREATE POLICY "Service role only"
  ON public.rate_limit_records
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.rate_limit_records IS 'Rate limiting records for brute force protection';

-- =====================================================
-- 5. ADD SECURITY FIELDS TO user_profiles
-- =====================================================

-- Two-factor authentication
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS two_factor_verified_at TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS backup_codes TEXT[];

-- Password security
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMPTZ;

-- Profile metadata (from profile page but missing in schema)
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS website TEXT;

-- OAuth provider info
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS oauth_provider TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS oauth_provider_id TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS oauth_connected_at TIMESTAMPTZ;

-- Onboarding tracking
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Compliance/Legal
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS account_deactivated_at TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS account_deactivated_reason TEXT;

-- Add comments
COMMENT ON COLUMN public.user_profiles.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN public.user_profiles.two_factor_secret IS 'Encrypted TOTP secret for 2FA';
COMMENT ON COLUMN public.user_profiles.failed_login_attempts IS 'Counter for brute force protection';
COMMENT ON COLUMN public.user_profiles.locked_until IS 'Account lock expiration (brute force protection)';

-- =====================================================
-- 6. ENHANCED handle_new_user() TRIGGER
-- =====================================================

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
  -- Get OAuth provider if applicable
  provider := NEW.raw_app_meta_data->>'provider';

  -- Create company (with error handling)
  BEGIN
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
      NOW() + INTERVAL '14 days' -- 14 day trial
    )
    RETURNING id INTO new_company_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create company: %', SQLERRM;
  END;

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
    'owner', -- First user is always owner
    COALESCE(NEW.raw_user_meta_data->>'selected_plan', 'starter'),
    provider,
    CASE WHEN provider IS NOT NULL THEN NEW.id::text ELSE NULL END,
    CASE WHEN provider IS NOT NULL THEN NOW() ELSE NULL END,
    NOW(), -- Terms accepted during registration
    NOW(), -- Privacy accepted during registration
    NEW.email_confirmed_at,
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'America/New_York'),
    true,
    NOW()
  );

  -- Assign Admin role from custom_roles (Module 10 integration)
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
      NEW.id, -- Self-assigned
      'Initial registration as company owner'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Log auth event
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
  -- Log error and re-raise
  RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Enhanced user creation trigger with OAuth support, RBAC integration, and audit logging';

-- =====================================================
-- 7. CLEANUP FUNCTION FOR OLD RECORDS
-- =====================================================

-- Clean up old rate limit records (run daily via cron)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.rate_limit_records
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;

COMMENT ON FUNCTION public.cleanup_rate_limit_records() IS 'Cleanup old rate limit records (run daily)';

-- Clean up old audit logs (keep 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.auth_audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_audit_logs() IS 'Cleanup audit logs older than 90 days';

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users for their own data
GRANT SELECT ON public.auth_audit_logs TO authenticated;
GRANT SELECT, UPDATE ON public.user_sessions TO authenticated;

-- Grant service role full access for rate limiting
GRANT ALL ON public.rate_limit_records TO service_role;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify all tables were created
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('auth_audit_logs', 'user_sessions', 'password_history', 'rate_limit_records');

-- Verify RLS policies exist
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('auth_audit_logs', 'user_sessions');

-- Verify new columns on user_profiles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name IN (
    'two_factor_enabled',
    'title',
    'bio',
    'oauth_provider',
    'failed_login_attempts',
    'onboarding_completed'
  );
