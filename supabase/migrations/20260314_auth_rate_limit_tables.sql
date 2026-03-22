-- Auth: rate_limit_records and auth_audit_logs tables
-- Required by lib/auth/rate-limiting.ts and lib/auth/audit-logging.ts

-- Rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limit_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL UNIQUE,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  lock_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON public.rate_limit_records (identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_lock_until ON public.rate_limit_records (lock_until);

-- Auth audit logs table
CREATE TABLE IF NOT EXISTS public.auth_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'login_success', 'login_failed', 'logout',
    'password_reset_requested', 'password_reset_completed', 'password_changed',
    'email_changed', '2fa_enabled', '2fa_disabled', '2fa_verified',
    'oauth_connected', 'oauth_disconnected', 'session_revoked',
    'account_locked', 'account_unlocked', 'registration', 'email_verified'
  )),
  ip_address text,
  user_agent text,
  device_fingerprint text,
  location text,
  metadata jsonb DEFAULT '{}',
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_user_id ON public.auth_audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_email ON public.auth_audit_logs (email);
CREATE INDEX IF NOT EXISTS idx_auth_audit_event_type ON public.auth_audit_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created_at ON public.auth_audit_logs (created_at DESC);

-- Brute force protection columns on user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_failed_login_at timestamptz;

-- Function to look up user_profiles.id by auth email (avoids relying on user_profiles.email)
CREATE OR REPLACE FUNCTION public.get_user_profile_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT up.id FROM public.user_profiles up
  JOIN auth.users au ON au.id = up.id
  WHERE au.email = p_email
  LIMIT 1;
$$;

-- Schema permissions for service role
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- RLS: rate_limit_records (service role only)
ALTER TABLE public.rate_limit_records ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Service role only" ON public.rate_limit_records
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role insert" ON public.rate_limit_records
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS: auth_audit_logs (users can read their own logs)
ALTER TABLE public.auth_audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own logs" ON public.auth_audit_logs
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role full access" ON public.auth_audit_logs
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role insert logs" ON public.auth_audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix project_documents.uploaded_by FK to reference user_profiles instead of auth.users
-- (required for PostgREST to join across the public schema)
ALTER TABLE public.project_documents
  DROP CONSTRAINT IF EXISTS project_documents_uploaded_by_fkey;
ALTER TABLE public.project_documents
  ADD CONSTRAINT project_documents_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Grant SELECT to authenticated role on project-related tables
-- (GRANT allows queries to reach the table; RLS policies control which rows are returned)
GRANT SELECT ON public.project_members TO authenticated;
GRANT SELECT ON public.project_phases TO authenticated;
GRANT SELECT ON public.project_documents TO authenticated;
GRANT SELECT ON public.project_milestones TO authenticated;
GRANT SELECT ON public.project_expenses TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
