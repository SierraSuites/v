// ============================================================
// QUOTEHUB ENHANCED TYPE DEFINITIONS - BUSINESS WORKFLOW SYSTEM
// ============================================================

// Quote types with different business behaviors
export type QuoteType = 'proposal' | 'bid' | 'estimate' | 'change_order' | 'maintenance'

// Enhanced status workflow
export type QuoteStatus =
  | 'draft'
  | 'ready'
  | 'sent'
  | 'viewed'
  | 'commented'
  | 'revised'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'expired'
  | 'won'
  | 'lost'
  | 'cancelled'

export type DiscountType = 'fixed' | 'percentage'

// Conversion types for quote → project workflow
export type ConversionType = 'new_project' | 'change_order' | 'maintenance_schedule' | null

export type ActivityType =
  | 'created'
  | 'edited'
  | 'sent'
  | 'viewed'
  | 'commented'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'converted'
  | 'status_changed'
  | 'converted_to_project'
  | 'change_order_applied'

export type ContactType = 'client' | 'vendor' | 'subcontractor'

export type CommentType = 'internal' | 'client' | 'revision_request'

export type TemplateType = 'custom' | 'system' | 'shared'

// Client interaction types for portal
export type ClientInteractionType =
  | 'comment'
  | 'question'
  | 'revision_request'
  | 'approve_item'
  | 'reject_item'

// ============================================================
// DATABASE TYPES (matches SQL schema)
// ============================================================

export interface Contact {
  id: string
  user_id: string
  company_name: string | null
  contact_name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string
  contact_type: ContactType
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Quote {
  id: string
  user_id: string
  quote_number: string

  // ENHANCED: Quote type and numbering
  quote_type: QuoteType
  year: number
  sequence_number: number

  // ENHANCED: Client & Project links
  client_id: string | null
  project_id: string | null // For change orders - link to existing project
  original_quote_id: string | null // For revisions

  title: string
  description: string | null
  scope_of_work: string | null

  // ENHANCED: Enhanced status workflow
  status: QuoteStatus
  sub_status: string | null // client_review, pending_signature, etc.

  // ENHANCED: Conversion tracking (Critical!)
  converted_to_project_id: string | null
  converted_at: string | null
  conversion_type: ConversionType
  auto_create_project: boolean
  auto_create_tasks: boolean

  // Financial fields
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_type: DiscountType
  discount_value: number
  discount_amount: number
  total_amount: number
  deposit_required: number
  deposit_amount: number
  deposit_received: boolean
  currency: string

  // ENHANCED: Profit tracking
  total_cost: number
  profit_margin: number // Generated column

  // ENHANCED: Enhanced dates
  quote_date: string
  valid_until: string | null
  sent_at: string | null
  first_viewed_at: string | null
  last_viewed_at: string | null
  client_approved_at: string | null
  client_rejected_at: string | null

  // Additional details
  approved_by: string | null
  rejection_reason: string | null
  notes: string | null
  internal_notes: string | null
  terms_conditions: string | null
  payment_terms: string | null

  // Branding
  branding: QuoteBranding

  // ENHANCED: Tracking
  view_count: number
  revision_count: number
  email_sent_count: number

  // Metadata
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface QuoteBranding {
  logo: string | null
  primaryColor: string
  accentColor: string
}

export interface QuoteItem {
  id: string
  quote_id: string
  item_number: number

  // ENHANCED: Task conversion (Critical!)
  convert_to_task: boolean
  created_task_id: string | null

  category: string | null
  description: string
  detailed_description: string | null // For proposals
  benefits: string | null // For proposals: "Energy efficient, 10-year warranty"

  quantity: number
  unit: string
  unit_price: number

  // ENHANCED: Cost & margin tracking
  cost_price: number | null
  markup_percentage: number | null
  margin: number // Generated column

  tax_rate: number
  tax_amount: number
  is_taxable: boolean

  line_total: number
  notes: string | null
  sort_order: number

  // FLAGS
  is_optional: boolean
  is_allowance: boolean // For estimates

  created_at: string
  updated_at: string
}

export interface QuoteTemplate {
  id: string
  user_id: string
  name: string
  description: string | null

  // ENHANCED: Template type (proposal, bid, estimate, etc.)
  template_type: QuoteType
  category: string | null

  content: QuoteTemplateContent
  default_items: QuoteTemplateItem[]
  default_terms: string | null
  default_payment_terms: string | null
  default_tax_rate: number
  default_valid_days: number

  // ENHANCED: Usage tracking
  use_count: number
  last_used_at: string | null
  is_public: boolean
  is_system_template: boolean
  is_favorite: boolean

  created_by: string | null
  created_at: string
  updated_at: string
}

export interface QuoteTemplateContent {
  items: QuoteTemplateItem[]
  settings: QuoteTemplateSettings
  branding: QuoteBranding
}

export interface QuoteTemplateItem {
  category: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  tax_rate: number
  is_optional: boolean
}

export interface QuoteTemplateSettings {
  default_terms: string
  default_payment_terms: string
  default_tax_rate: number
  default_valid_days: number
}

export interface QuoteActivity {
  id: string
  quote_id: string
  activity_type: ActivityType
  description: string | null
  metadata: Record<string, any>

  // ENHANCED: Support for client actions
  user_id: string | null
  client_name: string | null

  created_at: string
}

// ENHANCED: Client interaction interface for portal
export interface QuoteClientInteraction {
  id: string
  quote_id: string
  interaction_type: ClientInteractionType
  target_type: string | null // whole_quote, line_item, terms, scope
  target_id: string | null
  content: string
  client_name: string | null
  client_email: string | null

  // Resolution tracking
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  resolution_notes: string | null

  created_at: string
}

export interface QuoteEmail {
  id: string
  quote_id: string
  sent_to: string
  sent_from: string | null
  subject: string | null
  message_body: string | null
  sent_at: string
  opened_at: string | null
  clicked_at: string | null
  open_count: number
  click_count: number
  ip_address: string | null
  user_agent: string | null
  location: string | null
  email_service_id: string | null
  email_status: string
  created_at: string
}

export interface QuoteComment {
  id: string
  quote_id: string
  comment_text: string
  comment_type: CommentType
  is_client_visible: boolean
  parent_comment_id: string | null
  mentioned_users: string[] | null
  attachments: QuoteAttachment[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface QuoteAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
}

export interface QuoteAnalytics {
  user_id: string
  total_quotes: number
  draft_count: number
  sent_count: number
  approved_count: number
  rejected_count: number
  expired_count: number
  approved_value: number
  total_value: number
  conversion_rate: number
  average_quote_value: number
}

// ============================================================
// FORM TYPES (for creating/updating)
// ============================================================

export interface QuoteFormData {
  // Step 1: Basic Information
  title: string
  description: string
  client_id: string | null
  project_id: string | null
  quote_date: string
  valid_until: string
  currency: string

  // Step 2: Line Items (handled separately)
  // items: QuoteItemFormData[]

  // Step 3: Financial
  tax_rate: number
  discount_type: DiscountType
  discount_value: number
  deposit_required: number

  // Step 4: Terms
  terms_conditions: string
  payment_terms: string
  notes: string
  internal_notes: string

  // Step 5: Branding
  branding: QuoteBranding
}

export interface QuoteItemFormData {
  category: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  tax_rate: number
  is_optional: boolean
  notes: string
}

export interface ContactFormData {
  company_name: string
  contact_name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  country: string
  contact_type: ContactType
  notes: string
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface QuoteWithRelations extends Quote {
  client?: Contact | null
  project?: {
    id: string
    name: string
    address: string
  } | null
  items?: QuoteItem[]
  activities?: QuoteActivity[]
  comments?: QuoteComment[]
}

export interface QuoteListItem {
  id: string
  quote_number: string
  title: string
  status: QuoteStatus
  total_amount: number
  currency: string
  quote_date: string
  valid_until: string | null
  client_name: string | null
  client_company: string | null
  project_name: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// FILTER AND SORT TYPES
// ============================================================

export interface QuoteFilters {
  search?: string
  status?: QuoteStatus[]
  client_id?: string
  project_id?: string
  min_amount?: number
  max_amount?: number
  date_from?: string
  date_to?: string
  created_by?: string
}

export interface QuoteSortOptions {
  field: 'quote_number' | 'title' | 'total_amount' | 'quote_date' | 'created_at' | 'status'
  direction: 'asc' | 'desc'
}

export interface QuotePaginationOptions {
  page: number
  per_page: number
}

// ============================================================
// EXCEL IMPORT/EXPORT TYPES
// ============================================================

export interface ExcelImportMapping {
  description: string
  quantity: string
  unit: string
  unit_price: string
  category?: string
  tax_rate?: string
  notes?: string
}

export interface ExcelImportPreview {
  valid_rows: QuoteItemFormData[]
  invalid_rows: {
    row_number: number
    data: any
    errors: string[]
  }[]
  total_rows: number
  valid_count: number
  invalid_count: number
}

// ============================================================
// EMAIL TYPES
// ============================================================

export interface QuoteEmailData {
  to: string
  cc?: string[]
  bcc?: string[]
  subject: string
  message: string
  attach_pdf: boolean
  send_copy_to_self: boolean
}

// ============================================================
// PDF GENERATION TYPES
// ============================================================

export interface QuotePDFOptions {
  include_logo: boolean
  include_terms: boolean
  include_notes: boolean
  watermark?: 'DRAFT' | 'APPROVED' | 'COPY' | null
  page_size: 'A4' | 'Letter'
  orientation: 'portrait' | 'landscape'
}

// ============================================================
// STATISTICS TYPES
// ============================================================

export interface QuoteStats {
  total: number
  by_status: Record<QuoteStatus, number>
  total_value: number
  approved_value: number
  conversion_rate: number
  average_value: number
  this_month_count: number
  this_month_value: number
  last_month_count: number
  last_month_value: number
}

export interface QuoteChartData {
  monthly_volume: {
    month: string
    count: number
    value: number
  }[]
  status_distribution: {
    status: QuoteStatus
    count: number
    percentage: number
  }[]
  top_clients: {
    client_name: string
    quote_count: number
    total_value: number
    conversion_rate: number
  }[]
}

// ============================================================
// UTILITY TYPES
// ============================================================

export type QuoteInsert = Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'quote_number'>
export type QuoteUpdate = Partial<QuoteInsert>

export type QuoteItemInsert = Omit<QuoteItem, 'id' | 'created_at' | 'updated_at' | 'line_total' | 'tax_amount'>
export type QuoteItemUpdate = Partial<QuoteItemInsert>

export type ContactInsert = Omit<Contact, 'id' | 'created_at' | 'updated_at'>
export type ContactUpdate = Partial<ContactInsert>
