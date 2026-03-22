# INTEGRATIONS & API - IMPLEMENTATION QUALITY GUIDE

**Module**: Third-Party Integrations & Public API (Module 14)
**Business Purpose**: Ecosystem connectivity, accounting sync, payments, e-signatures, automation
**Target Quality**: 95%+ before launch
**Priority**: CRITICAL - Required for paid users, enterprise opportunities

---

## 1. CORE QUALITY REQUIREMENTS

### 1.1 Critical Feature: QuickBooks Online Sync

**Standard**: Financial data MUST sync with 99.9% accuracy. Invoice sync MUST complete within 5 seconds. Sync errors MUST retry with exponential backoff. All financial data MUST be encrypted in transit. OAuth token refresh MUST happen automatically.

**Why It Matters**: Accounting errors = IRS problems. Example: Contractor syncs 500 invoices to QuickBooks. One invoice ($45K) fails to sync due to network error. Month later, accountant files taxes missing $45K revenue. IRS audit triggers. All because integration didn't retry failed syncs.

**Database Schema**:
```sql
-- Integration connections
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Integration type
  integration_type TEXT NOT NULL CHECK (integration_type IN (
    'quickbooks_online', 'xero', 'stripe', 'square',
    'docusign', 'adobe_sign', 'gmail', 'outlook',
    'google_calendar', 'outlook_calendar', 'slack',
    'zapier', 'dropbox', 'google_drive', 'other'
  )),

  -- Status
  is_active BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT false,
  connection_status TEXT DEFAULT 'disconnected', -- 'disconnected', 'connecting', 'connected', 'error', 'expired'

  -- OAuth credentials
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,

  -- Provider-specific IDs
  external_company_id VARCHAR(255), -- QuickBooks realmId, etc.
  external_user_id VARCHAR(255),

  -- Configuration
  settings JSONB DEFAULT '{}',
  /* Example for QuickBooks:
  {
    "auto_sync": true,
    "sync_frequency": "realtime", // 'realtime', 'hourly', 'daily'
    "sync_invoices": true,
    "sync_expenses": true,
    "sync_payments": true,
    "sync_customers": true,
    "account_mappings": {
      "revenue_account_id": "123",
      "expense_account_id": "456"
    }
  }
  */

  -- Sync tracking
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT, -- 'success', 'partial', 'failed'
  last_sync_error TEXT,
  next_sync_at TIMESTAMPTZ,

  -- Performance metrics
  total_syncs INT DEFAULT 0,
  successful_syncs INT DEFAULT 0,
  failed_syncs INT DEFAULT 0,
  avg_sync_duration_ms INT,

  -- Connection metadata
  connected_at TIMESTAMPTZ,
  connected_by UUID REFERENCES auth.users(id),
  disconnected_at TIMESTAMPTZ,
  disconnected_by UUID REFERENCES auth.users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, integration_type)
);

CREATE INDEX idx_integrations_company ON integrations(company_id);
CREATE INDEX idx_integrations_type ON integrations(integration_type);
CREATE INDEX idx_integrations_active ON integrations(is_active) WHERE is_active = true;
CREATE INDEX idx_integrations_next_sync ON integrations(next_sync_at) WHERE is_active = true;

-- Sync logs (detailed audit trail)
CREATE TABLE integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Sync details
  sync_type TEXT NOT NULL, -- 'invoice', 'expense', 'payment', 'customer', 'full_sync'
  direction TEXT NOT NULL, -- 'push', 'pull', 'bidirectional'
  trigger TEXT, -- 'manual', 'scheduled', 'webhook', 'realtime'

  -- What was synced
  entity_type TEXT, -- 'invoice', 'expense', 'payment', 'contact'
  entity_id UUID, -- Internal ID
  external_entity_id VARCHAR(255), -- ID in external system (QuickBooks, Stripe, etc.)

  -- Status
  status TEXT NOT NULL, -- 'pending', 'in_progress', 'success', 'failed', 'retrying'
  attempt_number INT DEFAULT 1,
  max_retries INT DEFAULT 3,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,

  -- Error handling
  error_code VARCHAR(100),
  error_message TEXT,
  error_details JSONB,

  -- Data
  request_payload JSONB,
  response_payload JSONB,

  -- Retry logic
  next_retry_at TIMESTAMPTZ,
  retry_count INT DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_integration ON integration_sync_logs(integration_id, created_at DESC);
CREATE INDEX idx_sync_logs_status ON integration_sync_logs(status);
CREATE INDEX idx_sync_logs_entity ON integration_sync_logs(entity_type, entity_id);
CREATE INDEX idx_sync_logs_retry ON integration_sync_logs(next_retry_at) WHERE status = 'retrying';

-- Webhook subscriptions
CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Webhook details
  provider TEXT NOT NULL, -- 'stripe', 'quickbooks', 'docusign', etc.
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT, -- For signature verification
  events TEXT[] NOT NULL, -- Events this webhook subscribes to

  -- External provider details
  external_webhook_id VARCHAR(255), -- ID from provider

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INT DEFAULT 0,
  error_count INT DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_integration ON webhook_subscriptions(integration_id);
CREATE INDEX idx_webhooks_provider ON webhook_subscriptions(provider);

-- Public API keys (for customers to build integrations)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Key details
  key_name VARCHAR(255) NOT NULL,
  key_value VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hashed
  key_prefix VARCHAR(16) NOT NULL, -- Visible prefix: "sk_live_abc..."
  key_type TEXT DEFAULT 'secret', -- 'secret', 'publishable'

  -- Environment
  environment TEXT DEFAULT 'production', -- 'production', 'sandbox'

  -- Permissions
  permissions JSONB DEFAULT '{}',
  /* Example:
  {
    "projects": {"read": true, "write": true, "delete": false},
    "tasks": {"read": true, "write": true, "delete": false},
    "financials": {"read": false, "write": false, "delete": false}
  }
  */

  -- Rate limiting
  rate_limit_per_hour INT DEFAULT 1000,
  rate_limit_per_day INT DEFAULT 10000,

  -- Usage tracking
  total_requests INT DEFAULT 0,
  requests_today INT DEFAULT 0,
  requests_this_hour INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  last_request_ip VARCHAR(45),

  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_api_keys_company ON api_keys(company_id);
CREATE INDEX idx_api_keys_value ON api_keys(key_value);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- API request logs
CREATE TABLE api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Request details
  method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE
  path TEXT NOT NULL,
  query_params JSONB,
  request_body JSONB,

  -- Response
  status_code INT NOT NULL,
  response_body JSONB,
  response_time_ms INT,

  -- Client info
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Rate limiting
  rate_limit_exceeded BOOLEAN DEFAULT false,

  -- Error tracking
  error_code VARCHAR(100),
  error_message TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_logs_company ON api_request_logs(company_id, created_at DESC);
CREATE INDEX idx_api_logs_api_key ON api_request_logs(api_key_id, created_at DESC);
CREATE INDEX idx_api_logs_status ON api_request_logs(status_code);

-- RLS Policies
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their company's integrations
CREATE POLICY "Users can view company integrations"
  ON integrations FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Admins can manage integrations
CREATE POLICY "Admins can manage integrations"
  ON integrations FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND (r.permissions->>'settings'->>'edit' = 'true' OR r.name = 'Owner')
    )
  );

-- Users can view sync logs for their company
CREATE POLICY "Users can view sync logs"
  ON integration_sync_logs FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Admins can view and manage API keys
CREATE POLICY "Admins can view API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage API keys"
  ON api_keys FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND (r.permissions->>'settings'->>'edit' = 'true' OR r.name = 'Owner')
    )
  );

-- Function to refresh OAuth token
CREATE OR REPLACE FUNCTION refresh_oauth_token(p_integration_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_integration RECORD;
  v_new_access_token TEXT;
  v_new_refresh_token TEXT;
  v_new_expires_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_integration
  FROM integrations
  WHERE id = p_integration_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Call external API to refresh token (this would be implemented in application code)
  -- For now, just update the expires_at to extend it
  UPDATE integrations
  SET
    expires_at = NOW() + INTERVAL '1 hour',
    updated_at = NOW()
  WHERE id = p_integration_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to log API request
CREATE OR REPLACE FUNCTION log_api_request(
  p_api_key_id UUID,
  p_method VARCHAR,
  p_path TEXT,
  p_status_code INT,
  p_response_time_ms INT,
  p_ip_address VARCHAR
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO api_request_logs (
    api_key_id,
    company_id,
    method,
    path,
    status_code,
    response_time_ms,
    ip_address
  )
  SELECT
    p_api_key_id,
    company_id,
    p_method,
    p_path,
    p_status_code,
    p_response_time_ms,
    p_ip_address
  FROM api_keys
  WHERE id = p_api_key_id;

  -- Update API key usage stats
  UPDATE api_keys
  SET
    total_requests = total_requests + 1,
    requests_today = requests_today + 1,
    requests_this_hour = requests_this_hour + 1,
    last_used_at = NOW(),
    last_request_ip = p_ip_address
  WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(p_api_key_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_api_key RECORD;
BEGIN
  SELECT * INTO v_api_key
  FROM api_keys
  WHERE id = p_api_key_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check hourly limit
  IF v_api_key.requests_this_hour >= v_api_key.rate_limit_per_hour THEN
    RETURN false;
  END IF;

  -- Check daily limit
  IF v_api_key.requests_today >= v_api_key.rate_limit_per_day THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;
```

**QuickBooks Integration Implementation**:
```typescript
// lib/integrations/quickbooks.ts

import { createClient } from '@/lib/supabase/server'
import axios from 'axios'

const QB_BASE_URL = 'https://quickbooks.api.intuit.com/v3'
const QB_OAUTH_URL = 'https://oauth.platform.intuit.com/oauth2/v1'

interface QuickBooksConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  environment: 'sandbox' | 'production'
}

const qbConfig: QuickBooksConfig = {
  clientId: process.env.QUICKBOOKS_CLIENT_ID!,
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
  redirectUri: process.env.QUICKBOOKS_REDIRECT_URI!,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
}

export async function getQuickBooksAuthUrl(companyId: string): Promise<string> {
  const state = Buffer.from(JSON.stringify({ companyId })).toString('base64')

  const authUrl = new URL('https://appcenter.intuit.com/connect/oauth2')
  authUrl.searchParams.append('client_id', qbConfig.clientId)
  authUrl.searchParams.append('scope', 'com.intuit.quickbooks.accounting')
  authUrl.searchParams.append('redirect_uri', qbConfig.redirectUri)
  authUrl.searchParams.append('response_type', 'code')
  authUrl.searchParams.append('state', state)

  return authUrl.toString()
}

export async function exchangeCodeForTokens(code: string, companyId: string) {
  const supabase = createClient()

  try {
    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      `${QB_OAUTH_URL}/tokens/bearer`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: qbConfig.redirectUri,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${qbConfig.clientId}:${qbConfig.clientSecret}`
          ).toString('base64')}`,
        },
      }
    )

    const {
      access_token,
      refresh_token,
      expires_in,
      x_refresh_token_expires_in,
      realmId,
    } = tokenResponse.data

    // Store integration
    const { data: integration, error } = await supabase
      .from('integrations')
      .upsert({
        company_id: companyId,
        integration_type: 'quickbooks_online',
        is_active: true,
        is_connected: true,
        connection_status: 'connected',
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        external_company_id: realmId,
        settings: {
          auto_sync: true,
          sync_frequency: 'realtime',
          sync_invoices: true,
          sync_expenses: true,
          sync_payments: true,
          sync_customers: true,
        },
        connected_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return integration
  } catch (error) {
    console.error('QuickBooks token exchange error:', error)
    throw error
  }
}

export async function refreshQuickBooksToken(integrationId: string) {
  const supabase = createClient()

  // Get current integration
  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .single()

  if (!integration) {
    throw new Error('Integration not found')
  }

  try {
    const tokenResponse = await axios.post(
      `${QB_OAUTH_URL}/tokens/bearer`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: integration.refresh_token,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${qbConfig.clientId}:${qbConfig.clientSecret}`
          ).toString('base64')}`,
        },
      }
    )

    const { access_token, refresh_token, expires_in } = tokenResponse.data

    // Update integration
    await supabase
      .from('integrations')
      .update({
        access_token,
        refresh_token,
        expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', integrationId)

    return { access_token, refresh_token }
  } catch (error) {
    console.error('QuickBooks token refresh error:', error)

    // Mark integration as error status
    await supabase
      .from('integrations')
      .update({
        connection_status: 'error',
        last_sync_status: 'failed',
        last_sync_error: 'Token refresh failed',
      })
      .eq('id', integrationId)

    throw error
  }
}

export async function syncInvoiceToQuickBooks(
  invoiceId: string,
  integrationId: string
) {
  const supabase = createClient()

  // Get invoice data
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, customer:contacts(*), line_items')
    .eq('id', invoiceId)
    .single()

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  // Get integration
  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .single()

  if (!integration) {
    throw new Error('Integration not found')
  }

  // Check if token needs refresh
  if (new Date(integration.expires_at) < new Date()) {
    await refreshQuickBooksToken(integrationId)
    // Re-fetch integration with new token
    const { data: refreshedIntegration } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .single()
    integration.access_token = refreshedIntegration.access_token
  }

  // Log sync attempt
  const { data: syncLog } = await supabase
    .from('integration_sync_logs')
    .insert({
      integration_id: integrationId,
      company_id: integration.company_id,
      sync_type: 'invoice',
      direction: 'push',
      trigger: 'realtime',
      entity_type: 'invoice',
      entity_id: invoiceId,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  try {
    // Map invoice to QuickBooks format
    const qbInvoice = {
      Line: invoice.line_items.map((item: any) => ({
        DetailType: 'SalesItemLineDetail',
        Amount: item.amount,
        Description: item.description,
        SalesItemLineDetail: {
          Qty: item.quantity || 1,
          UnitPrice: item.unit_price || item.amount,
        },
      })),
      CustomerRef: {
        value: invoice.customer.quickbooks_id || '1', // Would need to sync customer first
      },
      DueDate: invoice.due_date,
      TxnDate: invoice.issue_date,
      DocNumber: invoice.invoice_number,
    }

    // Send to QuickBooks
    const response = await axios.post(
      `${QB_BASE_URL}/company/${integration.external_company_id}/invoice`,
      qbInvoice,
      {
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    )

    const qbInvoiceId = response.data.Invoice.Id

    // Update invoice with QuickBooks ID
    await supabase
      .from('invoices')
      .update({
        quickbooks_id: qbInvoiceId,
        synced_to_quickbooks: true,
        synced_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    // Update sync log
    await supabase
      .from('integration_sync_logs')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(syncLog.started_at).getTime(),
        external_entity_id: qbInvoiceId,
        response_payload: response.data,
      })
      .eq('id', syncLog.id)

    // Update integration stats
    await supabase
      .from('integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success',
        total_syncs: integration.total_syncs + 1,
        successful_syncs: integration.successful_syncs + 1,
      })
      .eq('id', integrationId)

    return { success: true, quickbooks_id: qbInvoiceId }
  } catch (error: any) {
    console.error('QuickBooks sync error:', error)

    // Update sync log with error
    await supabase
      .from('integration_sync_logs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(syncLog.started_at).getTime(),
        error_code: error.response?.data?.Fault?.Error?.[0]?.code || 'UNKNOWN',
        error_message: error.response?.data?.Fault?.Error?.[0]?.Message || error.message,
        error_details: error.response?.data,
      })
      .eq('id', syncLog.id)

    // Update integration stats
    await supabase
      .from('integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'failed',
        last_sync_error: error.message,
        total_syncs: integration.total_syncs + 1,
        failed_syncs: integration.failed_syncs + 1,
      })
      .eq('id', integrationId)

    throw error
  }
}
```

**Stripe Payment Integration**:
```typescript
// lib/integrations/stripe.ts

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function connectStripeAccount(companyId: string, code: string) {
  const supabase = createClient()

  try {
    // Exchange authorization code for Stripe account
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    })

    const { access_token, refresh_token, stripe_user_id } = response

    // Store integration
    const { data: integration, error } = await supabase
      .from('integrations')
      .upsert({
        company_id: companyId,
        integration_type: 'stripe',
        is_active: true,
        is_connected: true,
        connection_status: 'connected',
        access_token,
        refresh_token,
        external_company_id: stripe_user_id,
        settings: {
          auto_create_customers: true,
          send_receipts: true,
          allow_ach: true,
        },
        connected_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return integration
  } catch (error) {
    console.error('Stripe connection error:', error)
    throw error
  }
}

export async function createStripePaymentIntent(
  invoiceId: string,
  amount: number,
  customerId?: string
) {
  const supabase = createClient()

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      metadata: {
        invoice_id: invoiceId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // Update invoice with payment intent ID
    await supabase
      .from('invoices')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
      })
      .eq('id', invoiceId)

    return paymentIntent
  } catch (error) {
    console.error('Stripe payment intent error:', error)
    throw error
  }
}

export async function handleStripeWebhook(event: Stripe.Event) {
  const supabase = createClient()

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const invoiceId = paymentIntent.metadata.invoice_id

      if (invoiceId) {
        // Mark invoice as paid
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_method: 'stripe',
            stripe_charge_id: paymentIntent.latest_charge as string,
          })
          .eq('id', invoiceId)

        // Create payment record
        await supabase.from('payments').insert({
          invoice_id: invoiceId,
          amount: paymentIntent.amount / 100,
          payment_method: 'credit_card',
          payment_date: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id: paymentIntent.latest_charge as string,
        })
      }
      break

    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object as Stripe.PaymentIntent
      const failedInvoiceId = failedIntent.metadata.invoice_id

      if (failedInvoiceId) {
        // Log failed payment
        await supabase.from('payment_attempts').insert({
          invoice_id: failedInvoiceId,
          amount: failedIntent.amount / 100,
          status: 'failed',
          error_message: failedIntent.last_payment_error?.message,
          attempted_at: new Date().toISOString(),
        })
      }
      break

    // Handle other event types...
  }

  return { received: true }
}
```

**Public API Implementation**:
```typescript
// app/api/v1/projects/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  client_id: z.string().uuid().optional(),
  project_type: z.string().optional(),
  estimated_budget: z.number().positive().optional(),
  start_date: z.string().optional(),
  target_completion: z.string().optional(),
  status: z.enum(['lead', 'planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
})

// API Key authentication middleware
async function authenticateApiKey(request: Request): Promise<{
  apiKey: any
  companyId: string
} | null> {
  const supabase = createRouteHandlerClient({ cookies })

  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const apiKeyValue = authHeader.substring(7)

  // Hash the API key to compare with stored hash
  const hashedKey = crypto.createHash('sha256').update(apiKeyValue).digest('hex')

  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_value', hashedKey)
    .eq('is_active', true)
    .single()

  if (!apiKey) {
    return null
  }

  // Check if key is expired
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return null
  }

  // Check rate limit
  const { data: rateLimitOk } = await supabase.rpc('check_rate_limit', {
    p_api_key_id: apiKey.id,
  })

  if (!rateLimitOk) {
    return null
  }

  return {
    apiKey,
    companyId: apiKey.company_id,
  }
}

export async function GET(req: Request) {
  const startTime = Date.now()

  try {
    const auth = await authenticateApiKey(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('projects')
      .select('*')
      .eq('company_id', auth.companyId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: projects, error } = await query

    if (error) throw error

    // Log API request
    await supabase.rpc('log_api_request', {
      p_api_key_id: auth.apiKey.id,
      p_method: 'GET',
      p_path: '/api/v1/projects',
      p_status_code: 200,
      p_response_time_ms: Date.now() - startTime,
      p_ip_address: req.headers.get('x-forwarded-for') || 'unknown',
    })

    return NextResponse.json({
      data: projects,
      pagination: {
        limit,
        offset,
        total: projects?.length || 0,
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const startTime = Date.now()

  try {
    const auth = await authenticateApiKey(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if API key has write permission
    if (!auth.apiKey.permissions?.projects?.write) {
      return NextResponse.json(
        { error: 'Forbidden - No write access to projects' },
        { status: 403 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })
    const body = await req.json()

    // Validate input
    const validatedData = createProjectSchema.parse(body)

    // Create project
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        ...validatedData,
        company_id: auth.companyId,
      })
      .select()
      .single()

    if (error) throw error

    // Log API request
    await supabase.rpc('log_api_request', {
      p_api_key_id: auth.apiKey.id,
      p_method: 'POST',
      p_path: '/api/v1/projects',
      p_status_code: 201,
      p_response_time_ms: Date.now() - startTime,
      p_ip_address: req.headers.get('x-forwarded-for') || 'unknown',
    })

    return NextResponse.json({ data: project }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Testing Checklist**:
- [ ] QuickBooks OAuth flow completes successfully
- [ ] QuickBooks token refreshes automatically before expiry
- [ ] Invoice sync to QuickBooks completes in <5 seconds
- [ ] Failed sync retries with exponential backoff (1s, 2s, 4s)
- [ ] Sync accuracy is 99.9%+ (0 data loss)
- [ ] Customer sync creates matching QB customers
- [ ] Payment sync updates both systems
- [ ] Stripe payment intent creates successfully
- [ ] Stripe webhook signature verification works
- [ ] Stripe payment marks invoice as paid
- [ ] API key authentication works
- [ ] API rate limiting enforces limits (429 response)
- [ ] API returns proper error codes (400, 401, 403, 500)
- [ ] API request logging captures all requests
- [ ] Webhook retry logic uses exponential backoff
- [ ] Integration disconnect revokes tokens properly
- [ ] Expired integrations show warning
- [ ] Sync conflict resolution works (last-write-wins)
- [ ] All credentials encrypted at rest
- [ ] OAuth PKCE flow implemented for security

**Success Metrics**:
- 99.9% sync accuracy (QuickBooks)
- <5 second sync time for invoices
- <1% failed sync rate
- 40% of paid users connect at least 1 integration
- QuickBooks most popular (60% of integrations)
- Stripe payment success rate: >98%
- API response time: <500ms (p95)
- API uptime: 99.9%

---

## 2. USER EXPERIENCE QUALITY STANDARDS

- **Loading states**: Spinner during OAuth flow, progress bar for sync
- **Empty states**: "Connect QuickBooks to sync your financials automatically"
- **Error states**: "QuickBooks sync failed: Invoice #1234 missing customer. Create customer first."
- **Mobile optimization**: OAuth flow works on mobile browsers
- **Keyboard navigation**: Tab through integration settings
- **Accessibility**: Screen reader announces sync status

---

## 3. PERFORMANCE REQUIREMENTS

- OAuth flow: <3 seconds end-to-end
- Invoice sync: <5 seconds per invoice
- Token refresh: <2 seconds
- API response time: <500ms (p95)
- Webhook processing: <1 second
- Sync batch processing: 100 invoices in <30 seconds

---

## 4. SECURITY REQUIREMENTS

- OAuth tokens encrypted at rest (AES-256)
- API keys hashed (SHA-256)
- Webhook signature verification required
- Rate limiting prevents abuse
- HTTPS enforced for all integrations
- Credentials never logged
- Token rotation every 60 days
- API key expiration enforced

---

## 5. PRE-LAUNCH CHECKLIST

### Functional Testing (60 items)
- [ ] QuickBooks OAuth connect
- [ ] QuickBooks token refresh
- [ ] QuickBooks disconnect
- [ ] Sync invoice to QuickBooks
- [ ] Sync expense to QuickBooks
- [ ] Sync payment to QuickBooks
- [ ] Sync customer to QuickBooks
- [ ] Handle QuickBooks sync error
- [ ] Retry failed QuickBooks sync
- [ ] QuickBooks webhook receives updates
- [ ] Stripe OAuth connect
- [ ] Create Stripe payment intent
- [ ] Process Stripe payment
- [ ] Handle Stripe webhook (payment succeeded)
- [ ] Handle Stripe webhook (payment failed)
- [ ] Stripe refund processes correctly
- [ ] DocuSign send envelope
- [ ] DocuSign track signature status
- [ ] DocuSign webhook (signed)
- [ ] Gmail send email
- [ ] Gmail OAuth connect
- [ ] Outlook send email
- [ ] Outlook OAuth connect
- [ ] Google Calendar sync event
- [ ] Outlook Calendar sync event
- [ ] Slack notification sends
- [ ] Create API key
- [ ] Revoke API key
- [ ] API key authentication
- [ ] API rate limiting (429 response)
- [ ] API GET /projects
- [ ] API POST /projects
- [ ] API GET /tasks
- [ ] API POST /tasks
- [ ] API GET /contacts
- [ ] API webhook delivery
- [ ] Webhook retry on failure
- [ ] Webhook signature verification
- [ ] Integration settings update
- [ ] Sync frequency configuration
- [ ] Account mapping (QuickBooks)
- [ ] Two-way sync (bidirectional)
- [ ] Conflict resolution (last-write-wins)
- [ ] Sync log displays correctly
- [ ] Error log shows details
- [ ] Integration disconnect
- [ ] Re-authorize expired integration
- [ ] Export sync logs to CSV
- [ ] Integration health check
- [ ] Sync status dashboard
- [ ] Real-time sync trigger
- [ ] Scheduled sync executes
- [ ] Manual sync button works
- [ ] Sync all data (full sync)
- [ ] Incremental sync (changes only)
- [ ] Duplicate detection prevents double-sync
- [ ] Sync rollback on error
- [ ] Integration audit trail
- [ ] API documentation accessible
- [ ] API playground (test requests)

### UX Testing (15 items)
- [ ] OAuth flow is intuitive
- [ ] Integration cards show status clearly
- [ ] Sync progress visible
- [ ] Error messages actionable
- [ ] Settings page well-organized
- [ ] API key creation simple
- [ ] Webhook URL easy to copy
- [ ] Sync logs readable
- [ ] Loading states don't block UI
- [ ] Success confirmations clear
- [ ] Mobile OAuth flow works
- [ ] Toast notifications not intrusive
- [ ] Empty state helpful
- [ ] Help documentation linked
- [ ] Color coding intuitive (green=success)

### Performance Testing (8 items)
- [ ] OAuth completes in <3s
- [ ] Invoice sync in <5s
- [ ] Token refresh in <2s
- [ ] API responds in <500ms
- [ ] Webhook processes in <1s
- [ ] Batch sync 100 items <30s
- [ ] No memory leaks
- [ ] Database queries <100ms

### Security Testing (12 items)
- [ ] Tokens encrypted at rest
- [ ] API keys hashed
- [ ] Webhook signatures verified
- [ ] Rate limiting enforces limits
- [ ] HTTPS enforced
- [ ] No credentials in logs
- [ ] SQL injection blocked
- [ ] XSS attempts sanitized
- [ ] CORS configured correctly
- [ ] Token rotation works
- [ ] API key expiration enforced
- [ ] Audit log captures changes

### Integration Testing (10 items)
- [ ] QuickBooks sandbox connection works
- [ ] Stripe test mode works
- [ ] DocuSign demo account works
- [ ] Gmail test account works
- [ ] Webhook receives test events
- [ ] API Postman collection works
- [ ] End-to-end: Create invoice → Sync QB → Payment Stripe
- [ ] End-to-end: Send contract → DocuSign → Signed webhook
- [ ] Zapier triggers fire correctly
- [ ] Public API docs match implementation

---

## 6. SUCCESS METRICS

- 40% of paid users connect ≥1 integration
- QuickBooks most popular (60% of integrations)
- 99.9% sync accuracy
- <1% failed sync rate
- 98%+ Stripe payment success rate
- API uptime: 99.9%
- API response time: <500ms (p95)
- 1000+ API calls per day (active ecosystem)

---

## 7. COMPETITIVE EDGE

**vs Procore**: QuickBooks sync is $100/mo add-on, ours is included
**vs Buildertrend**: Limited integrations, no public API
**vs Standalone Tools**: We integrate project data, they don't

**What Makes Us Better**:
1. QuickBooks sync included (save $100/mo vs. Procore)
2. Real-time sync (not daily batch)
3. 99.9% accuracy guarantee
4. Public API for custom integrations
5. Zapier app (3000+ app connections)
6. Webhook retry logic (never miss updates)
7. Comprehensive sync logs (debug issues fast)
8. Bidirectional sync (updates flow both ways)

**Win Statement**: "The Sierra Suites QuickBooks integration saved our bookkeeper 8 hours per week. No more manual invoice entry. Payment from Stripe? Automatically logged in QuickBooks. And when we needed a custom integration, their public API made it possible in 2 days. Procore wanted $5K for the same thing."
