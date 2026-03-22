-- =====================================================
-- Module 20: Third-party Integrations
-- Features: Zapier, webhooks, API keys, OAuth apps
-- Date: 2026-03-17
-- =====================================================

-- =====================================================
-- 1. API KEYS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Key Details
  key_name VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) NOT NULL UNIQUE,
  api_secret VARCHAR(255),
  description TEXT,

  -- Permissions
  scopes TEXT[] NOT NULL, -- read:projects, write:invoices, etc.
  allowed_ips TEXT[], -- IP whitelist

  -- Rate Limiting
  rate_limit_per_hour INTEGER DEFAULT 1000,
  rate_limit_per_day INTEGER DEFAULT 10000,

  -- Usage Tracking
  last_used_at TIMESTAMPTZ,
  total_requests BIGINT DEFAULT 0,
  failed_requests BIGINT DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,

  -- Created By
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_api_keys_company ON api_keys(company_id);
CREATE INDEX idx_api_keys_key ON api_keys(api_key);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- =====================================================
-- 2. WEBHOOKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Webhook Details
  webhook_name VARCHAR(255) NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  method VARCHAR(10) NOT NULL DEFAULT 'POST',

  -- Events
  events TEXT[] NOT NULL, -- project.created, invoice.paid, etc.

  -- Security
  secret VARCHAR(255), -- For signature verification
  headers JSONB, -- Custom headers

  -- Configuration
  payload_format VARCHAR(20) DEFAULT 'json', -- json, form, xml
  retry_policy VARCHAR(20) DEFAULT 'exponential', -- none, linear, exponential
  max_retries INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error TEXT,
  total_deliveries BIGINT DEFAULT 0,
  failed_deliveries BIGINT DEFAULT 0,
  success_rate DECIMAL(5,2),

  -- Created By
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_method CHECK (method IN ('POST', 'PUT', 'PATCH')),
  CONSTRAINT valid_payload_format CHECK (payload_format IN ('json', 'form', 'xml')),
  CONSTRAINT valid_retry_policy CHECK (retry_policy IN ('none', 'linear', 'exponential'))
);

-- Indexes
CREATE INDEX idx_webhooks_company ON webhooks(company_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;
CREATE INDEX idx_webhooks_events ON webhooks USING GIN (events);

-- =====================================================
-- 3. WEBHOOK DELIVERIES TABLE (Log)
-- =====================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Request
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  request_headers JSONB,
  request_body TEXT,

  -- Response
  response_status INTEGER,
  response_headers JSONB,
  response_body TEXT,
  response_time_ms INTEGER,

  -- Status
  status VARCHAR(20) NOT NULL, -- pending, success, failed, retrying
  attempt_number INTEGER DEFAULT 1,
  error_message TEXT,

  -- Timing
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  CONSTRAINT valid_delivery_status CHECK (status IN ('pending', 'success', 'failed', 'retrying'))
);

-- Indexes
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, triggered_at DESC);
CREATE INDEX idx_webhook_deliveries_company ON webhook_deliveries(company_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE status = 'retrying';

-- =====================================================
-- 4. OAUTH APPLICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS oauth_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Application Details
  app_name VARCHAR(255) NOT NULL,
  description TEXT,
  app_url TEXT,
  logo_url TEXT,

  -- OAuth Credentials
  client_id VARCHAR(255) NOT NULL UNIQUE,
  client_secret VARCHAR(255) NOT NULL,

  -- Configuration
  redirect_uris TEXT[] NOT NULL,
  allowed_scopes TEXT[] NOT NULL,
  grant_types TEXT[] NOT NULL DEFAULT ARRAY['authorization_code', 'refresh_token'],

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_confidential BOOLEAN DEFAULT true, -- Public vs Confidential client

  -- Rate Limiting
  rate_limit_per_hour INTEGER DEFAULT 1000,

  -- Created By
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_oauth_applications_company ON oauth_applications(company_id);
CREATE INDEX idx_oauth_applications_client_id ON oauth_applications(client_id);

-- =====================================================
-- 5. OAUTH TOKENS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES oauth_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Tokens
  access_token VARCHAR(500) NOT NULL UNIQUE,
  refresh_token VARCHAR(500) UNIQUE,
  token_type VARCHAR(20) DEFAULT 'Bearer',

  -- Scopes
  scopes TEXT[] NOT NULL,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ,

  -- Status
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  -- Usage
  last_used_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_oauth_tokens_application ON oauth_tokens(application_id);
CREATE INDEX idx_oauth_tokens_user ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_access_token ON oauth_tokens(access_token);
CREATE INDEX idx_oauth_tokens_refresh_token ON oauth_tokens(refresh_token);
CREATE INDEX idx_oauth_tokens_active ON oauth_tokens(is_revoked, expires_at) WHERE is_revoked = false;

-- =====================================================
-- 6. ZAPIER INTEGRATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS zapier_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Integration Details
  integration_name VARCHAR(255) NOT NULL,
  zap_id VARCHAR(255),
  description TEXT,

  -- Trigger/Action Configuration
  trigger_event VARCHAR(100) NOT NULL,
  target_app VARCHAR(100) NOT NULL,
  target_action VARCHAR(100) NOT NULL,

  -- Mapping
  field_mapping JSONB NOT NULL,

  -- Filters
  filters JSONB,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error TEXT,
  total_executions BIGINT DEFAULT 0,
  failed_executions BIGINT DEFAULT 0,

  -- Created By
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_zapier_integrations_company ON zapier_integrations(company_id);
CREATE INDEX idx_zapier_integrations_active ON zapier_integrations(is_active) WHERE is_active = true;
CREATE INDEX idx_zapier_integrations_trigger ON zapier_integrations(trigger_event);

-- =====================================================
-- 7. INTEGRATION LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Integration Type
  integration_type VARCHAR(50) NOT NULL, -- api, webhook, zapier, oauth
  integration_id UUID, -- Reference to specific integration

  -- Event
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,

  -- Request/Response
  request_payload JSONB,
  response_payload JSONB,
  http_status INTEGER,

  -- Status
  status VARCHAR(20) NOT NULL, -- success, failed, pending
  error_message TEXT,

  -- Performance
  execution_time_ms INTEGER,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_integration_type CHECK (integration_type IN ('api', 'webhook', 'zapier', 'oauth')),
  CONSTRAINT valid_log_status CHECK (status IN ('success', 'failed', 'pending'))
);

-- Indexes
CREATE INDEX idx_integration_logs_company ON integration_logs(company_id);
CREATE INDEX idx_integration_logs_type ON integration_logs(integration_type, integration_id);
CREATE INDEX idx_integration_logs_created ON integration_logs(created_at DESC);
CREATE INDEX idx_integration_logs_status ON integration_logs(status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE zapier_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Company-based access
CREATE POLICY "Users can view company API keys"
  ON api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = api_keys.company_id
    )
  );

CREATE POLICY "Users can manage API keys"
  ON api_keys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = api_keys.company_id
    )
  );

CREATE POLICY "Users can view company webhooks"
  ON webhooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = webhooks.company_id
    )
  );

CREATE POLICY "Users can manage webhooks"
  ON webhooks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = webhooks.company_id
    )
  );

CREATE POLICY "Users can view webhook deliveries"
  ON webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = webhook_deliveries.company_id
    )
  );

CREATE POLICY "Users can view integration logs"
  ON integration_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = integration_logs.company_id
    )
  );

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Function to generate API key
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS VARCHAR AS $$
DECLARE
  v_key VARCHAR;
BEGIN
  -- Generate a 32-character random API key
  v_key := 'sk_' || encode(gen_random_bytes(24), 'base64');
  v_key := replace(v_key, '/', '_');
  v_key := replace(v_key, '+', '-');
  v_key := replace(v_key, '=', '');

  RETURN v_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track API key usage
CREATE OR REPLACE FUNCTION track_api_key_usage(p_api_key VARCHAR, p_success BOOLEAN)
RETURNS VOID AS $$
BEGIN
  UPDATE api_keys
  SET
    last_used_at = NOW(),
    total_requests = total_requests + 1,
    failed_requests = CASE WHEN p_success THEN failed_requests ELSE failed_requests + 1 END
  WHERE api_key = p_api_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate webhook success rate
CREATE OR REPLACE FUNCTION update_webhook_success_rate()
RETURNS TRIGGER AS $$
DECLARE
  v_success_rate DECIMAL(5,2);
BEGIN
  IF NEW.total_deliveries > 0 THEN
    v_success_rate := ((NEW.total_deliveries - NEW.failed_deliveries)::DECIMAL / NEW.total_deliveries::DECIMAL) * 100;
    NEW.success_rate := v_success_rate;
  ELSE
    NEW.success_rate := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_webhook_success_rate
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  WHEN (OLD.total_deliveries IS DISTINCT FROM NEW.total_deliveries OR OLD.failed_deliveries IS DISTINCT FROM NEW.failed_deliveries)
  EXECUTE FUNCTION update_webhook_success_rate();

-- Function to schedule webhook retry
CREATE OR REPLACE FUNCTION schedule_webhook_retry(
  p_delivery_id UUID,
  p_attempt_number INTEGER
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_webhook RECORD;
  v_next_retry TIMESTAMPTZ;
  v_delay_seconds INTEGER;
BEGIN
  SELECT * INTO v_webhook
  FROM webhooks w
  JOIN webhook_deliveries wd ON w.id = wd.webhook_id
  WHERE wd.id = p_delivery_id;

  IF v_webhook.retry_policy = 'exponential' THEN
    v_delay_seconds := POWER(2, p_attempt_number) * 60; -- 2^n minutes
  ELSIF v_webhook.retry_policy = 'linear' THEN
    v_delay_seconds := p_attempt_number * 300; -- n * 5 minutes
  ELSE
    RETURN NULL; -- No retry
  END IF;

  v_next_retry := NOW() + (v_delay_seconds || ' seconds')::INTERVAL;

  RETURN v_next_retry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to auto-generate API key
CREATE OR REPLACE FUNCTION auto_generate_api_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.api_key IS NULL THEN
    NEW.api_key := generate_api_key();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_api_key
  BEFORE INSERT ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_api_key();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
