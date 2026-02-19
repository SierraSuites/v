-- ============================================================
-- MODULE 14: INTEGRATIONS & API
-- Tables: integrations, integration_sync_logs, api_keys
-- Follows existing migration patterns (see module10, financial)
-- ============================================================

BEGIN;

-- Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE: integrations
-- Stores OAuth connections to third-party services
-- ============================================================

CREATE TABLE IF NOT EXISTS public.integrations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connected_by          UUID REFERENCES auth.users(id),
  disconnected_by       UUID REFERENCES auth.users(id),

  -- Integration type
  integration_type      TEXT NOT NULL CHECK (integration_type IN (
    'quickbooks_online', 'xero', 'stripe', 'square',
    'docusign', 'adobe_sign', 'gmail', 'outlook',
    'google_calendar', 'outlook_calendar', 'slack',
    'zapier', 'dropbox', 'google_drive', 'other'
  )),

  -- Status
  is_active             BOOLEAN DEFAULT false,
  is_connected          BOOLEAN DEFAULT false,
  connection_status     TEXT DEFAULT 'disconnected'
                          CHECK (connection_status IN ('disconnected', 'connecting', 'connected', 'error', 'expired')),

  -- OAuth credentials (store encrypted in production)
  access_token          TEXT,
  refresh_token         TEXT,
  token_type            VARCHAR(50) DEFAULT 'Bearer',
  expires_at            TIMESTAMPTZ,
  scope                 TEXT,

  -- Provider-specific identifiers
  external_company_id   VARCHAR(255),
  external_user_id      VARCHAR(255),

  -- Configuration (JSON: sync preferences, account mappings, etc.)
  settings              JSONB DEFAULT '{}',

  -- Sync tracking
  last_sync_at          TIMESTAMPTZ,
  last_sync_status      TEXT CHECK (last_sync_status IN ('success', 'partial', 'failed')),
  last_sync_error       TEXT,
  next_sync_at          TIMESTAMPTZ,

  -- Performance metrics
  total_syncs           INT DEFAULT 0,
  successful_syncs      INT DEFAULT 0,
  failed_syncs          INT DEFAULT 0,
  avg_sync_duration_ms  INT,

  -- Connection metadata
  connected_at          TIMESTAMPTZ,
  disconnected_at       TIMESTAMPTZ,

  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  -- One integration per type per company
  UNIQUE(company_id, integration_type)
);

CREATE INDEX IF NOT EXISTS idx_integrations_company
  ON public.integrations(company_id);

CREATE INDEX IF NOT EXISTS idx_integrations_type
  ON public.integrations(integration_type);

CREATE INDEX IF NOT EXISTS idx_integrations_active
  ON public.integrations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_integrations_next_sync
  ON public.integrations(next_sync_at) WHERE is_active = true;

-- ============================================================
-- TABLE: integration_sync_logs
-- Detailed audit trail for every sync operation
-- ============================================================

CREATE TABLE IF NOT EXISTS public.integration_sync_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id        UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Sync details
  sync_type             TEXT NOT NULL,
  direction             TEXT NOT NULL CHECK (direction IN ('push', 'pull', 'bidirectional')),
  trigger               TEXT CHECK (trigger IN ('manual', 'scheduled', 'webhook', 'realtime')),

  -- What was synced
  entity_type           TEXT,
  entity_id             UUID,
  external_entity_id    VARCHAR(255),

  -- Status
  status                TEXT NOT NULL
                          CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'retrying')),
  attempt_number        INT DEFAULT 1,
  max_retries           INT DEFAULT 3,

  -- Timing
  started_at            TIMESTAMPTZ DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  duration_ms           INT,

  -- Error handling
  error_code            VARCHAR(100),
  error_message         TEXT,
  error_details         JSONB,

  -- Request/response snapshots (redacted of sensitive data)
  request_payload       JSONB,
  response_payload      JSONB,

  -- Retry scheduling
  next_retry_at         TIMESTAMPTZ,
  retry_count           INT DEFAULT 0,

  -- Metadata
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_integration
  ON public.integration_sync_logs(integration_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_logs_status
  ON public.integration_sync_logs(status);

CREATE INDEX IF NOT EXISTS idx_sync_logs_entity
  ON public.integration_sync_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_sync_logs_retry
  ON public.integration_sync_logs(next_retry_at) WHERE status = 'retrying';

-- ============================================================
-- TABLE: api_keys
-- Public API keys for customers building integrations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by            UUID REFERENCES auth.users(id),
  revoked_by            UUID REFERENCES auth.users(id),

  -- Key details
  key_name              VARCHAR(255) NOT NULL,
  key_value             VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hashed
  key_prefix            VARCHAR(16) NOT NULL,        -- Visible prefix e.g. "sk_live_abc..."
  key_type              TEXT DEFAULT 'secret' CHECK (key_type IN ('secret', 'publishable')),

  -- Environment
  environment           TEXT DEFAULT 'production'
                          CHECK (environment IN ('production', 'sandbox')),

  -- Granular permissions (JSON)
  permissions           JSONB DEFAULT '{}',

  -- Rate limiting
  rate_limit_per_hour   INT DEFAULT 1000,
  rate_limit_per_day    INT DEFAULT 10000,

  -- Usage tracking
  total_requests        INT DEFAULT 0,
  requests_today        INT DEFAULT 0,
  requests_this_hour    INT DEFAULT 0,
  last_used_at          TIMESTAMPTZ,
  last_request_ip       VARCHAR(45),

  -- Status
  is_active             BOOLEAN DEFAULT true,
  expires_at            TIMESTAMPTZ,
  revoked_at            TIMESTAMPTZ,

  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_company
  ON public.api_keys(company_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_value
  ON public.api_keys(key_value);

CREATE INDEX IF NOT EXISTS idx_api_keys_active
  ON public.api_keys(is_active) WHERE is_active = true;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- integrations: company members can view
DROP POLICY IF EXISTS integrations_select_policy ON public.integrations;
CREATE POLICY integrations_select_policy ON public.integrations
  FOR SELECT TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS integrations_insert_policy ON public.integrations;
CREATE POLICY integrations_insert_policy ON public.integrations
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS integrations_update_policy ON public.integrations;
CREATE POLICY integrations_update_policy ON public.integrations
  FOR UPDATE TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS integrations_delete_policy ON public.integrations;
CREATE POLICY integrations_delete_policy ON public.integrations
  FOR DELETE TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

-- integration_sync_logs: company members can view (read-only via UI)
DROP POLICY IF EXISTS integration_sync_logs_select_policy ON public.integration_sync_logs;
CREATE POLICY integration_sync_logs_select_policy ON public.integration_sync_logs
  FOR SELECT TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS integration_sync_logs_insert_policy ON public.integration_sync_logs;
CREATE POLICY integration_sync_logs_insert_policy ON public.integration_sync_logs
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

-- api_keys: company members can manage their own keys
DROP POLICY IF EXISTS api_keys_select_policy ON public.api_keys;
CREATE POLICY api_keys_select_policy ON public.api_keys
  FOR SELECT TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS api_keys_insert_policy ON public.api_keys;
CREATE POLICY api_keys_insert_policy ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS api_keys_update_policy ON public.api_keys;
CREATE POLICY api_keys_update_policy ON public.api_keys
  FOR UPDATE TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS api_keys_delete_policy ON public.api_keys;
CREATE POLICY api_keys_delete_policy ON public.api_keys
  FOR DELETE TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ));

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check rate limit for an API key
CREATE OR REPLACE FUNCTION check_api_rate_limit(p_api_key_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_key RECORD;
BEGIN
  SELECT * INTO v_key FROM public.api_keys WHERE id = p_api_key_id AND is_active = true;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_key.expires_at IS NOT NULL AND v_key.expires_at < NOW() THEN RETURN false; END IF;
  IF v_key.requests_this_hour >= v_key.rate_limit_per_hour THEN RETURN false; END IF;
  IF v_key.requests_today >= v_key.rate_limit_per_day THEN RETURN false; END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log an API request and increment usage counters
CREATE OR REPLACE FUNCTION log_api_request(
  p_api_key_id      UUID,
  p_method          VARCHAR,
  p_path            TEXT,
  p_status_code     INT,
  p_response_ms     INT,
  p_ip_address      VARCHAR DEFAULT 'unknown'
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.api_keys
  SET
    total_requests       = total_requests + 1,
    requests_today       = requests_today + 1,
    requests_this_hour   = requests_this_hour + 1,
    last_used_at         = NOW(),
    last_request_ip      = p_ip_address
  WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================

DO $trg$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_integrations_updated_at'
  ) THEN
    CREATE TRIGGER trg_integrations_updated_at
      BEFORE UPDATE ON public.integrations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $trg$;

COMMIT;
