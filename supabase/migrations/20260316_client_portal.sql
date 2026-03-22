-- ============================================================================
-- Client Portal Migration
-- ============================================================================

-- ============================================================================
-- CLIENT USERS TABLE
-- ============================================================================
CREATE TABLE client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Client information
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,

  -- Authentication
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  password_hash TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,

  -- Portal access
  portal_access_level TEXT DEFAULT 'basic' CHECK (portal_access_level IN ('basic', 'premium', 'enterprise')),

  -- Linked projects (array of project IDs they can access)
  accessible_project_ids UUID[],

  -- Preferences
  notification_preferences JSONB DEFAULT '{
    "email_updates": true,
    "sms_updates": false,
    "invoice_notifications": true,
    "project_updates": true
  }'::jsonb,

  -- Metadata
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT client_users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_client_users_company ON client_users(company_id);
CREATE INDEX idx_client_users_email ON client_users(email);
CREATE INDEX idx_client_users_auth_user ON client_users(auth_user_id);
CREATE INDEX idx_client_users_active ON client_users(is_active) WHERE is_active = true;

-- ============================================================================
-- CLIENT PORTAL SESSIONS TABLE
-- ============================================================================
CREATE TABLE client_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,

  -- Session details
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,

  -- Expiry
  expires_at TIMESTAMPTZ NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_sessions_user ON client_portal_sessions(client_user_id);
CREATE INDEX idx_client_sessions_token ON client_portal_sessions(session_token);
CREATE INDEX idx_client_sessions_expires ON client_portal_sessions(expires_at);

-- ============================================================================
-- CHANGE ORDERS TABLE
-- ============================================================================
CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Change order details
  change_order_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Financial
  original_amount DECIMAL(12, 2) DEFAULT 0,
  proposed_amount DECIMAL(12, 2) NOT NULL,
  approved_amount DECIMAL(12, 2),

  -- Timeline impact
  original_completion_date DATE,
  proposed_completion_date DATE,
  schedule_impact_days INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending_review',
    'client_review',
    'approved',
    'rejected',
    'on_hold',
    'implemented'
  )),

  -- Parties
  requested_by UUID REFERENCES auth.users(id),
  requested_by_client UUID REFERENCES client_users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),

  -- Documents
  attachments TEXT[], -- Array of file paths in storage

  -- Justification and notes
  justification TEXT,
  internal_notes TEXT,
  client_notes TEXT,

  -- Timestamps
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT change_orders_unique_number UNIQUE(company_id, change_order_number)
);

CREATE INDEX idx_change_orders_company ON change_orders(company_id);
CREATE INDEX idx_change_orders_project ON change_orders(project_id);
CREATE INDEX idx_change_orders_status ON change_orders(status);
CREATE INDEX idx_change_orders_number ON change_orders(change_order_number);

-- ============================================================================
-- CLIENT COMMUNICATIONS TABLE
-- ============================================================================
CREATE TABLE client_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Message details
  subject TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Parties
  sent_by_client UUID REFERENCES client_users(id),
  sent_by_contractor UUID REFERENCES auth.users(id),
  recipient_client UUID REFERENCES client_users(id),
  recipient_contractor UUID REFERENCES auth.users(id),

  -- Thread
  parent_message_id UUID REFERENCES client_communications(id) ON DELETE SET NULL,
  thread_id UUID, -- Root message ID for threading

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Priority
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Attachments
  attachments TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT client_communications_sender CHECK (
    (sent_by_client IS NOT NULL AND sent_by_contractor IS NULL) OR
    (sent_by_client IS NULL AND sent_by_contractor IS NOT NULL)
  ),
  CONSTRAINT client_communications_recipient CHECK (
    (recipient_client IS NOT NULL AND recipient_contractor IS NULL) OR
    (recipient_client IS NULL AND recipient_contractor IS NOT NULL)
  )
);

CREATE INDEX idx_client_comms_company ON client_communications(company_id);
CREATE INDEX idx_client_comms_project ON client_communications(project_id);
CREATE INDEX idx_client_comms_thread ON client_communications(thread_id);
CREATE INDEX idx_client_comms_client_sender ON client_communications(sent_by_client);
CREATE INDEX idx_client_comms_contractor_sender ON client_communications(sent_by_contractor);
CREATE INDEX idx_client_comms_unread ON client_communications(is_read) WHERE is_read = false;

-- ============================================================================
-- CLIENT PAYMENT RECORDS TABLE
-- ============================================================================
CREATE TABLE client_payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  client_user_id UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,

  -- Payment details
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',

  -- Payment method
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'credit_card',
    'debit_card',
    'bank_transfer',
    'ach',
    'check',
    'cash',
    'other'
  )),

  -- Stripe integration
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  stripe_customer_id TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'succeeded',
    'failed',
    'refunded',
    'partially_refunded',
    'disputed'
  )),

  -- Payment details
  card_last4 TEXT,
  card_brand TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  failure_reason TEXT,

  -- Timestamps
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_payments_company ON client_payment_records(company_id);
CREATE INDEX idx_client_payments_invoice ON client_payment_records(invoice_id);
CREATE INDEX idx_client_payments_client ON client_payment_records(client_user_id);
CREATE INDEX idx_client_payments_stripe_intent ON client_payment_records(stripe_payment_intent_id);
CREATE INDEX idx_client_payments_status ON client_payment_records(status);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_payment_records ENABLE ROW LEVEL SECURITY;

-- Client Users Policies
CREATE POLICY "Company users can view client users"
  ON client_users FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Company users can manage client users"
  ON client_users FOR ALL
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Change Orders Policies
CREATE POLICY "Users can view change orders in their company"
  ON change_orders FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create change orders in their company"
  ON change_orders FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update change orders in their company"
  ON change_orders FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Client Communications Policies
CREATE POLICY "Users can view communications in their company"
  ON client_communications FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can send communications in their company"
  ON client_communications FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update communications they sent"
  ON client_communications FOR UPDATE
  USING (
    sent_by_contractor = auth.uid()
  );

-- Client Payment Records Policies
CREATE POLICY "Users can view payment records in their company"
  ON client_payment_records FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "System can create payment records"
  ON client_payment_records FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate change order number
CREATE OR REPLACE FUNCTION generate_change_order_number(p_company_id UUID, p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_project_code TEXT;
BEGIN
  -- Get project code/name
  SELECT UPPER(SUBSTRING(name FROM 1 FOR 3)) INTO v_project_code
  FROM projects WHERE id = p_project_id;

  -- Count existing change orders for this project
  SELECT COUNT(*) INTO v_count
  FROM change_orders
  WHERE company_id = p_company_id AND project_id = p_project_id;

  -- Format: PCO-001, PCO-002, etc.
  RETURN COALESCE(v_project_code, 'CO') || '-' || LPAD((v_count + 1)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on client_users
CREATE OR REPLACE FUNCTION update_client_user_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_users_update_timestamp
  BEFORE UPDATE ON client_users
  FOR EACH ROW
  EXECUTE FUNCTION update_client_user_timestamp();

-- Trigger to set thread_id on communications
CREATE OR REPLACE FUNCTION set_communication_thread_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_message_id IS NULL THEN
    NEW.thread_id = NEW.id;
  ELSE
    SELECT thread_id INTO NEW.thread_id
    FROM client_communications
    WHERE id = NEW.parent_message_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_communications_set_thread
  BEFORE INSERT ON client_communications
  FOR EACH ROW
  EXECUTE FUNCTION set_communication_thread_id();

-- Trigger to update last_activity on sessions
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_sessions_update_activity
  BEFORE UPDATE ON client_portal_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();
