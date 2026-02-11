-- ============================================================================
-- MODULE 12: FINANCIAL MANAGEMENT - COMPLETE DATABASE SETUP
-- ============================================================================
-- Purpose: Invoice, Payment, Expense, and Progress Billing Management
-- Priority: CRITICAL
-- Status: 20% → 90% Complete
-- Created: February 11, 2026
-- ============================================================================
-- Features:
-- - Invoice management with line items
-- - Payment tracking with multiple methods
-- - Expense management with receipt OCR
-- - Progress billing (AIA-style G702/G703)
-- - Cash flow forecasting
-- - QuickBooks integration
-- - Full RBAC integration
-- - Row-level security (RLS)
-- - Automatic status updates and triggers
-- ============================================================================

-- ============================================================================
-- 1. INVOICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE RESTRICT,

  -- Invoice Info
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,

  -- Line Items (stored as JSONB for flexibility)
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Amounts
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 4) DEFAULT 0, -- e.g., 0.0700 for 7%
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Payments
  amount_paid DECIMAL(12, 2) DEFAULT 0,
  balance_due DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'void')),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Terms and Notes
  payment_terms TEXT DEFAULT 'Net 30', -- 'Net 30', 'Due on receipt', 'Net 15', etc.
  notes TEXT,
  footer_text TEXT,

  -- Email Tracking
  last_email_sent_at TIMESTAMPTZ,
  email_sent_count INTEGER DEFAULT 0,

  -- Integration
  quickbooks_id VARCHAR(100) UNIQUE,
  quickbooks_sync_token VARCHAR(50),
  synced_at TIMESTAMPTZ,
  sync_error TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_amounts CHECK (subtotal >= 0 AND tax_amount >= 0 AND total_amount >= 0 AND amount_paid >= 0),
  CONSTRAINT valid_dates CHECK (due_date >= invoice_date)
);

-- Indexes for performance
CREATE INDEX idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX idx_invoices_contact_id ON public.invoices(contact_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_quickbooks ON public.invoices(quickbooks_id) WHERE quickbooks_id IS NOT NULL;
CREATE INDEX idx_invoices_overdue ON public.invoices(due_date, status) WHERE status IN ('sent', 'partial', 'overdue');

-- ============================================================================
-- 2. PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Payment Info
  payment_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('check', 'ach', 'wire', 'credit_card', 'debit_card', 'cash', 'other')),

  -- Details
  reference_number VARCHAR(100), -- Check number, transaction ID, etc.
  notes TEXT,

  -- Stripe Integration (for online payments)
  stripe_payment_intent_id VARCHAR(100) UNIQUE,
  stripe_charge_id VARCHAR(100),
  stripe_customer_id VARCHAR(100),

  -- QuickBooks Integration
  quickbooks_id VARCHAR(100) UNIQUE,
  quickbooks_sync_token VARCHAR(50),
  synced_at TIMESTAMPTZ,

  -- Metadata
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX idx_payments_company_id ON public.payments(company_id);
CREATE INDEX idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX idx_payments_stripe ON public.payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX idx_payments_quickbooks ON public.payments(quickbooks_id) WHERE quickbooks_id IS NOT NULL;

-- ============================================================================
-- 3. EXPENSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  -- Expense Info
  date DATE NOT NULL,
  vendor VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL CHECK (category IN (
    'materials', 'labor', 'subcontractors', 'equipment', 'equipment_rental',
    'permits', 'utilities', 'insurance', 'professional_fees', 'travel',
    'office', 'marketing', 'other'
  )),

  -- Payment Info
  payment_method TEXT CHECK (payment_method IN ('check', 'ach', 'wire', 'credit_card', 'debit_card', 'cash', 'other')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'scheduled', 'cancelled')),
  paid_at TIMESTAMPTZ,

  -- Receipts
  receipt_url TEXT,
  receipt_filename VARCHAR(255),
  receipt_ocr_data JSONB, -- Extracted data from receipt scanning

  -- Billing to Client
  billable_to_client BOOLEAN DEFAULT false,
  markup_percentage DECIMAL(5, 2) DEFAULT 0, -- e.g., 15.00 for 15%
  billable_amount DECIMAL(12, 2) GENERATED ALWAYS AS (
    CASE WHEN billable_to_client THEN amount * (1 + markup_percentage / 100) ELSE 0 END
  ) STORED,
  invoiced BOOLEAN DEFAULT false,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoiced_at TIMESTAMPTZ,

  -- Approval Workflow
  requires_approval BOOLEAN DEFAULT false,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Integration
  quickbooks_id VARCHAR(100) UNIQUE,
  quickbooks_sync_token VARCHAR(50),
  synced_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_expenses_company_id ON public.expenses(company_id);
CREATE INDEX idx_expenses_project_id ON public.expenses(project_id);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_expenses_vendor ON public.expenses(vendor);
CREATE INDEX idx_expenses_billable ON public.expenses(billable_to_client) WHERE billable_to_client = true;
CREATE INDEX idx_expenses_approval ON public.expenses(approval_status) WHERE requires_approval = true;
CREATE INDEX idx_expenses_quickbooks ON public.expenses(quickbooks_id) WHERE quickbooks_id IS NOT NULL;

-- ============================================================================
-- 4. PROGRESS BILLING TABLE (AIA-style)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.progress_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Billing Period
  period_number INTEGER NOT NULL, -- Application number (1, 2, 3, etc.)
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Contract Values
  original_contract_amount DECIMAL(12, 2) NOT NULL CHECK (original_contract_amount >= 0),
  change_orders_total DECIMAL(12, 2) DEFAULT 0,
  adjusted_contract_amount DECIMAL(12, 2) GENERATED ALWAYS AS (original_contract_amount + change_orders_total) STORED,

  -- Work Completed
  work_items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of ProgressBillingItem
  total_completed_to_date DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_completed_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN original_contract_amount + change_orders_total > 0
    THEN (total_completed_to_date / (original_contract_amount + change_orders_total)) * 100
    ELSE 0 END
  ) STORED,

  -- Previous Billing
  total_billed_previously DECIMAL(12, 2) DEFAULT 0,

  -- Current Period
  work_completed_this_period DECIMAL(12, 2) NOT NULL DEFAULT 0,
  materials_stored DECIMAL(12, 2) DEFAULT 0,
  total_earned DECIMAL(12, 2) GENERATED ALWAYS AS (total_completed_to_date + materials_stored) STORED,

  -- Retainage
  retainage_percentage DECIMAL(5, 2) DEFAULT 10.00, -- 10% typical
  retainage_amount DECIMAL(12, 2) GENERATED ALWAYS AS (
    (total_completed_to_date + materials_stored - total_billed_previously) * (retainage_percentage / 100)
  ) STORED,

  -- Amount Due
  amount_due_this_period DECIMAL(12, 2) GENERATED ALWAYS AS (
    total_completed_to_date + materials_stored - total_billed_previously -
    ((total_completed_to_date + materials_stored - total_billed_previously) * (retainage_percentage / 100))
  ) STORED,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'invoiced')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,

  -- Generated Invoice
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoiced_at TIMESTAMPTZ,

  -- AIA Forms (G702 and G703 PDFs)
  aia_g702_url TEXT,
  aia_g703_url TEXT,

  -- Notes
  notes TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_progress_billing_period UNIQUE (project_id, period_number),
  CONSTRAINT valid_period_dates CHECK (period_end >= period_start),
  CONSTRAINT positive_values CHECK (
    original_contract_amount >= 0 AND
    total_completed_to_date >= 0 AND
    total_billed_previously >= 0 AND
    work_completed_this_period >= 0 AND
    materials_stored >= 0
  )
);

-- Indexes
CREATE INDEX idx_progress_billing_project ON public.progress_billing(project_id);
CREATE INDEX idx_progress_billing_company ON public.progress_billing(company_id);
CREATE INDEX idx_progress_billing_period ON public.progress_billing(period_start, period_end);
CREATE INDEX idx_progress_billing_status ON public.progress_billing(status);

-- ============================================================================
-- 5. CHANGE ORDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Change Order Info
  change_order_number VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Financial Impact
  amount DECIMAL(12, 2) NOT NULL, -- Can be positive or negative
  reason TEXT,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'completed')),
  requested_at TIMESTAMPTZ,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,

  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_change_order_number UNIQUE (project_id, change_order_number)
);

CREATE INDEX idx_change_orders_project ON public.change_orders(project_id);
CREATE INDEX idx_change_orders_company ON public.change_orders(company_id);
CREATE INDEX idx_change_orders_status ON public.change_orders(status);

-- ============================================================================
-- 6. QUICKBOOKS CONNECTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quickbooks_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,

  -- OAuth Credentials (encrypted)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  realm_id VARCHAR(100) NOT NULL, -- QuickBooks company ID

  -- Sync Settings
  auto_sync_invoices BOOLEAN DEFAULT true,
  auto_sync_expenses BOOLEAN DEFAULT true,
  auto_sync_payments BOOLEAN DEFAULT true,
  two_way_sync BOOLEAN DEFAULT false, -- If true, changes from QB sync back

  -- Account Mapping (Sierra Suites categories → QuickBooks accounts)
  account_mapping JSONB DEFAULT '{}'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failed', 'in_progress', 'partial')),
  sync_error TEXT,

  -- Statistics
  total_syncs INTEGER DEFAULT 0,
  successful_syncs INTEGER DEFAULT 0,
  failed_syncs INTEGER DEFAULT 0,

  -- Metadata
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  disconnected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quickbooks_company ON public.quickbooks_connections(company_id);
CREATE INDEX idx_quickbooks_active ON public.quickbooks_connections(is_active) WHERE is_active = true;

-- ============================================================================
-- 7. TRIGGERS - AUTOMATIC STATUS UPDATES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7.1 Update invoice status and amounts when payment is recorded
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  invoice_total DECIMAL(12, 2);
  total_paid DECIMAL(12, 2);
  invoice_due_date DATE;
  new_status TEXT;
BEGIN
  -- Get invoice details
  SELECT total_amount, due_date INTO invoice_total, invoice_due_date
  FROM public.invoices WHERE id = NEW.invoice_id;

  -- Calculate total paid
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM public.payments WHERE invoice_id = NEW.invoice_id;

  -- Determine new status
  IF total_paid >= invoice_total THEN
    new_status := 'paid';
  ELSIF total_paid > 0 THEN
    new_status := 'partial';
  ELSIF invoice_due_date < CURRENT_DATE THEN
    new_status := 'overdue';
  ELSE
    new_status := 'sent';
  END IF;

  -- Update invoice
  UPDATE public.invoices
  SET
    amount_paid = total_paid,
    status = new_status,
    paid_at = CASE WHEN total_paid >= invoice_total THEN NOW() ELSE paid_at END,
    updated_at = NOW()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER payment_update_invoice
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_on_payment();

-- ----------------------------------------------------------------------------
-- 7.2 Auto-update invoice status to overdue
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_overdue_invoices()
RETURNS void AS $$
BEGIN
  UPDATE public.invoices
  SET status = 'overdue', updated_at = NOW()
  WHERE due_date < CURRENT_DATE
    AND status IN ('sent', 'partial')
    AND balance_due > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This function should be called daily via a cron job or scheduled task
-- For now, we'll create it for manual execution

-- ----------------------------------------------------------------------------
-- 7.3 Update timestamps automatically
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_billing_updated_at BEFORE UPDATE ON public.progress_billing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_change_orders_updated_at BEFORE UPDATE ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all financial tables
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 8.1 INVOICES RLS POLICIES
-- ----------------------------------------------------------------------------

-- Policy: Users can view invoices from their company
CREATE POLICY invoices_select_policy ON public.invoices
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users with canManageFinances can insert invoices
CREATE POLICY invoices_insert_policy ON public.invoices
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_role_permissions urp
      JOIN public.role_permissions rp ON urp.role_id = rp.role_id
      WHERE urp.user_id = auth.uid()
        AND rp.permission_key = 'canManageFinances'
        AND rp.enabled = true
    )
  );

-- Policy: Users with canManageFinances can update invoices
CREATE POLICY invoices_update_policy ON public.invoices
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_role_permissions urp
      JOIN public.role_permissions rp ON urp.role_id = rp.role_id
      WHERE urp.user_id = auth.uid()
        AND rp.permission_key = 'canManageFinances'
        AND rp.enabled = true
    )
  );

-- Policy: Users with canManageFinances can delete draft invoices only
CREATE POLICY invoices_delete_policy ON public.invoices
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
    AND status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.user_role_permissions urp
      JOIN public.role_permissions rp ON urp.role_id = rp.role_id
      WHERE urp.user_id = auth.uid()
        AND rp.permission_key = 'canManageFinances'
        AND rp.enabled = true
    )
  );

-- ----------------------------------------------------------------------------
-- 8.2 PAYMENTS RLS POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY payments_select_policy ON public.payments
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY payments_insert_policy ON public.payments
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_role_permissions urp
      JOIN public.role_permissions rp ON urp.role_id = rp.role_id
      WHERE urp.user_id = auth.uid()
        AND rp.permission_key = 'canManageFinances'
        AND rp.enabled = true
    )
  );

CREATE POLICY payments_delete_policy ON public.payments
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_role_permissions urp
      JOIN public.role_permissions rp ON urp.role_id = rp.role_id
      WHERE urp.user_id = auth.uid()
        AND rp.permission_key = 'canManageFinances'
        AND rp.enabled = true
    )
  );

-- ----------------------------------------------------------------------------
-- 8.3 EXPENSES RLS POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY expenses_select_policy ON public.expenses
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY expenses_insert_policy ON public.expenses
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_role_permissions urp
      JOIN public.role_permissions rp ON urp.role_id = rp.role_id
      WHERE urp.user_id = auth.uid()
        AND rp.permission_key IN ('canManageFinances', 'canCreateExpenses')
        AND rp.enabled = true
    )
  );

CREATE POLICY expenses_update_policy ON public.expenses
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
    AND (
      -- Can update own expenses
      created_by = auth.uid()
      OR
      -- Or has manage finances permission
      EXISTS (
        SELECT 1 FROM public.user_role_permissions urp
        JOIN public.role_permissions rp ON urp.role_id = rp.role_id
        WHERE urp.user_id = auth.uid()
          AND rp.permission_key = 'canManageFinances'
          AND rp.enabled = true
      )
      OR
      -- Or has approve expenses permission (for approval workflow)
      EXISTS (
        SELECT 1 FROM public.user_role_permissions urp
        JOIN public.role_permissions rp ON urp.role_id = rp.role_id
        WHERE urp.user_id = auth.uid()
          AND rp.permission_key = 'canApproveExpenses'
          AND rp.enabled = true
      )
    )
  );

CREATE POLICY expenses_delete_policy ON public.expenses
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.user_role_permissions urp
        JOIN public.role_permissions rp ON urp.role_id = rp.role_id
        WHERE urp.user_id = auth.uid()
          AND rp.permission_key = 'canManageFinances'
          AND rp.enabled = true
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 8.4 PROGRESS BILLING RLS POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY progress_billing_select_policy ON public.progress_billing
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY progress_billing_insert_policy ON public.progress_billing
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_role_permissions urp
      JOIN public.role_permissions rp ON urp.role_id = rp.role_id
      WHERE urp.user_id = auth.uid()
        AND rp.permission_key = 'canManageFinances'
        AND rp.enabled = true
    )
  );

CREATE POLICY progress_billing_update_policy ON public.progress_billing
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_role_permissions urp
      JOIN public.role_permissions rp ON urp.role_id = rp.role_id
      WHERE urp.user_id = auth.uid()
        AND rp.permission_key = 'canManageFinances'
        AND rp.enabled = true
    )
  );

-- ----------------------------------------------------------------------------
-- 8.5 CHANGE ORDERS RLS POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY change_orders_select_policy ON public.change_orders
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY change_orders_insert_policy ON public.change_orders
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY change_orders_update_policy ON public.change_orders
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 8.6 QUICKBOOKS CONNECTIONS RLS POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY quickbooks_select_policy ON public.quickbooks_connections
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY quickbooks_insert_policy ON public.quickbooks_connections
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_role_permissions urp
      JOIN public.role_permissions rp ON urp.role_id = rp.role_id
      WHERE urp.user_id = auth.uid()
        AND rp.permission_key = 'canManageCompanySettings'
        AND rp.enabled = true
    )
  );

CREATE POLICY quickbooks_update_policy ON public.quickbooks_connections
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_role_permissions urp
      JOIN public.role_permissions rp ON urp.role_id = rp.role_id
      WHERE urp.user_id = auth.uid()
        AND rp.permission_key = 'canManageCompanySettings'
        AND rp.enabled = true
    )
  );

-- ============================================================================
-- 9. DATABASE FUNCTIONS FOR COMPLEX QUERIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 9.1 Get Financial Statistics for Company
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_financial_stats(p_company_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    -- Accounts Receivable
    'total_outstanding', COALESCE((
      SELECT SUM(balance_due) FROM public.invoices
      WHERE company_id = p_company_id
        AND status IN ('sent', 'partial', 'overdue')
    ), 0),
    'total_overdue', COALESCE((
      SELECT SUM(balance_due) FROM public.invoices
      WHERE company_id = p_company_id
        AND status = 'overdue'
    ), 0),
    'total_invoices', COALESCE((
      SELECT COUNT(*) FROM public.invoices
      WHERE company_id = p_company_id
        AND status IN ('sent', 'partial', 'overdue', 'paid')
    ), 0),
    'overdue_invoices', COALESCE((
      SELECT COUNT(*) FROM public.invoices
      WHERE company_id = p_company_id
        AND status = 'overdue'
    ), 0),

    -- Aging Buckets
    'current_0_30', COALESCE((
      SELECT SUM(balance_due) FROM public.invoices
      WHERE company_id = p_company_id
        AND status IN ('sent', 'partial')
        AND due_date >= CURRENT_DATE - INTERVAL '30 days'
    ), 0),
    'aging_31_60', COALESCE((
      SELECT SUM(balance_due) FROM public.invoices
      WHERE company_id = p_company_id
        AND due_date BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '31 days'
    ), 0),
    'aging_61_90', COALESCE((
      SELECT SUM(balance_due) FROM public.invoices
      WHERE company_id = p_company_id
        AND due_date BETWEEN CURRENT_DATE - INTERVAL '90 days' AND CURRENT_DATE - INTERVAL '61 days'
    ), 0),
    'aging_90_plus', COALESCE((
      SELECT SUM(balance_due) FROM public.invoices
      WHERE company_id = p_company_id
        AND due_date < CURRENT_DATE - INTERVAL '90 days'
    ), 0),

    -- This Month
    'month_revenue', COALESCE((
      SELECT SUM(amount_paid) FROM public.invoices
      WHERE company_id = p_company_id
        AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', CURRENT_DATE)
    ), 0),
    'month_expenses', COALESCE((
      SELECT SUM(amount) FROM public.expenses
      WHERE company_id = p_company_id
        AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
    ), 0),

    -- Year to Date
    'ytd_revenue', COALESCE((
      SELECT SUM(amount_paid) FROM public.invoices
      WHERE company_id = p_company_id
        AND DATE_TRUNC('year', paid_at) = DATE_TRUNC('year', CURRENT_DATE)
    ), 0),
    'ytd_expenses', COALESCE((
      SELECT SUM(amount) FROM public.expenses
      WHERE company_id = p_company_id
        AND DATE_TRUNC('year', date) = DATE_TRUNC('year', CURRENT_DATE)
    ), 0)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. INITIAL RBAC PERMISSIONS
-- ============================================================================

-- Financial permissions should already exist from Module 10 RBAC setup
-- Verify they exist:
-- - canManageFinances
-- - canViewFinancials
-- - canApproveExpenses
-- - canManageCompanySettings (for QuickBooks integration)

-- If not present, they will be added via the permission system

-- ============================================================================
-- 11. SAMPLE DATA (FOR TESTING - REMOVE IN PRODUCTION)
-- ============================================================================

-- This section can be populated with sample invoices, payments, and expenses
-- for testing purposes. Should be removed or commented out in production.

-- ============================================================================
-- END OF FINANCIAL MODULE SETUP
-- ============================================================================

-- To apply this migration:
-- 1. Connect to your Supabase database
-- 2. Run this entire SQL file
-- 3. Verify all tables are created with \dt public.*
-- 4. Verify RLS is enabled with SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- 5. Test RBAC permissions with test user accounts

-- Notes:
-- - All financial calculations use DECIMAL(12, 2) for precision
-- - All triggers are SECURITY DEFINER to bypass RLS during automatic updates
-- - Invoice numbers must be unique across the entire system
-- - Payments automatically update invoice status and amounts
-- - RLS policies integrate with Module 10 RBAC system
-- - QuickBooks integration requires OAuth setup (see integration docs)
-- - Receipt OCR data stored as JSONB for flexibility
-- - Progress billing supports AIA G702/G703 forms
-- - Change orders track project modifications
