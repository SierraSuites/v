// Financial Management Types - Enterprise Grade
// Invoice, Payment, and Expense tracking

export interface Invoice {
  id: string
  company_id: string
  project_id?: string
  contact_id: string

  // Invoice Info
  invoice_number: string
  invoice_date: string
  due_date: string

  // Line Items
  line_items: InvoiceLineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount?: number
  total_amount: number

  // Payments
  amount_paid: number
  balance_due: number

  // Status
  status: InvoiceStatus
  sent_at?: string
  paid_at?: string

  // Email Tracking
  last_email_sent_at?: string
  email_sent_count?: number

  // Terms
  payment_terms: string
  notes?: string

  // Integration
  quickbooks_id?: string
  synced_at?: string

  // Metadata
  created_by: string
  created_at: string
  updated_at: string

  // Relations (populated)
  contact?: Contact
  project?: Project
  payments?: Payment[]
}

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
  category?: string
  billable?: boolean
}

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'void'

export interface Payment {
  id: string
  invoice_id: string
  company_id: string

  // Payment Info
  payment_date: string
  amount: number
  payment_method: PaymentMethod

  // Details
  reference_number?: string
  notes?: string

  // Stripe Integration
  stripe_payment_intent_id?: string
  stripe_charge_id?: string

  // QuickBooks Integration
  quickbooks_id?: string

  // Metadata
  recorded_by: string
  created_at: string

  // Relations
  invoice?: Invoice
}

export type PaymentMethod =
  | 'check'
  | 'ach'
  | 'wire'
  | 'credit_card'
  | 'debit_card'
  | 'cash'
  | 'other'

export interface Expense {
  id: string
  company_id: string
  project_id?: string

  // Expense Info
  date: string
  vendor: string
  description: string
  amount: number
  category: ExpenseCategory

  // Payment
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  paid_at?: string

  // Receipts
  receipt_url?: string
  receipt_ocr_data?: ReceiptOCRData

  // Billing
  billable_to_client: boolean
  invoiced: boolean
  invoice_id?: string
  markup_percentage?: number

  // Integration
  quickbooks_id?: string
  synced_at?: string

  // Metadata
  created_by: string
  created_at: string
  updated_at: string

  // Relations
  project?: Project
}

export type ExpenseCategory =
  | 'materials'
  | 'labor'
  | 'subcontractors'
  | 'equipment'
  | 'equipment_rental'
  | 'permits'
  | 'utilities'
  | 'insurance'
  | 'professional_fees'
  | 'travel'
  | 'office'
  | 'marketing'
  | 'other'

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'scheduled'
  | 'cancelled'

export interface ReceiptOCRData {
  vendor?: string
  date?: string
  amount?: number
  tax?: number
  category?: string
  line_items?: Array<{
    description: string
    amount: number
  }>
  confidence?: number
}

// Progress Billing (AIA-style)
export interface ProgressBilling {
  id: string
  project_id: string
  company_id: string

  // Billing Period
  period_start: string
  period_end: string
  billing_number: number

  // Contract
  original_contract_amount: number
  change_orders_total: number
  adjusted_contract_amount: number

  // Work Completed
  work_items: ProgressBillingItem[]
  total_completed_to_date: number
  total_completed_percentage: number

  // Previous Billing
  total_billed_previously: number

  // Current Billing
  work_completed_this_period: number
  materials_stored: number
  total_earned: number
  retainage_percentage: number
  retainage_amount: number
  amount_due_this_period: number

  // Status
  status: 'draft' | 'submitted' | 'approved' | 'invoiced'
  submitted_at?: string
  approved_at?: string
  invoice_id?: string

  // AIA Forms
  aia_g702_url?: string
  aia_g703_url?: string

  created_by: string
  created_at: string
  updated_at: string
}

export interface ProgressBillingItem {
  id: string
  description: string
  scheduled_value: number
  work_completed_to_date: number
  work_completed_percentage: number
  work_completed_this_period: number
  materials_stored: number
  total_completed_and_stored: number
  balance_to_finish: number
}

// Cash Flow Forecasting
export interface CashFlowForecast {
  company_id: string
  forecast_date: string

  // Weekly forecast (12 weeks)
  weeks: CashFlowWeek[]

  // Summary
  current_balance: number
  minimum_safe_balance: number
  projected_low_point: number
  projected_low_date: string

  // Scenarios
  best_case_balance: number
  expected_case_balance: number
  worst_case_balance: number
}

export interface CashFlowWeek {
  week_number: number
  week_start: string
  week_end: string

  beginning_balance: number

  // Cash In
  invoices_paid: number
  down_payments: number
  other_income: number
  total_cash_in: number

  // Cash Out
  payroll: number
  materials: number
  subcontractors: number
  equipment: number
  operating_expenses: number
  other_expenses: number
  total_cash_out: number

  // Net
  net_change: number
  ending_balance: number

  // Alerts
  alerts?: string[]
}

// Financial Statistics
export interface FinancialStats {
  // Accounts Receivable
  total_outstanding: number
  total_overdue: number
  total_invoices: number
  overdue_invoices: number

  // Aging
  current_0_30: number
  aging_31_60: number
  aging_61_90: number
  aging_90_plus: number

  // This Month
  month_revenue: number
  month_expenses: number
  month_profit: number
  month_profit_margin: number

  // Year to Date
  ytd_revenue: number
  ytd_expenses: number
  ytd_profit: number
  ytd_profit_margin: number

  // Cash Flow
  current_cash_balance: number
  expected_30_days: number
  runway_days: number
}

// Invoice Email Tracking
export interface InvoiceEmail {
  id: string
  invoice_id: string

  sent_to: string
  sent_at: string

  // Tracking
  opened: boolean
  open_count: number
  first_opened_at?: string
  last_opened_at?: string

  clicked: boolean
  click_count: number
  first_clicked_at?: string

  // Email details
  subject: string
  message?: string
  pdf_url: string

  sent_by: string
}

// QuickBooks Integration
export interface QuickBooksConnection {
  id: string
  company_id: string

  // OAuth
  access_token: string
  refresh_token: string
  token_expires_at: string
  realm_id: string

  // Settings
  auto_sync_invoices: boolean
  auto_sync_expenses: boolean
  auto_sync_payments: boolean
  two_way_sync: boolean

  // Account Mapping
  account_mapping: Record<string, string>

  // Status
  is_active: boolean
  last_sync_at?: string
  sync_status?: 'success' | 'failed' | 'in_progress'
  error_message?: string

  // Stats
  total_syncs: number
  failed_syncs: number

  connected_at: string
  connected_by: string
}

// Helper types for Contact and Project (if not already defined)
interface Contact {
  id: string
  company_name?: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
}

interface Project {
  id: string
  name: string
  status: string
  budget?: number
}
