// ReportCenter Type Definitions

export type ReportType =
  | 'daily'
  | 'weekly_timesheet'
  | 'budget'
  | 'safety'
  | 'progress'
  | 'custom'

export type ReportStatus =
  | 'draft'
  | 'final'
  | 'sent'
  | 'archived'

export type SectionType =
  | 'header'
  | 'info'
  | 'table'
  | 'gallery'
  | 'text'
  | 'chart'
  | 'checklist'

// Main Report Interface
export interface Report {
  id: string
  report_number: string // R-2024-DAILY-001
  report_type: ReportType
  title: string
  description?: string

  // Source data
  project_id?: string
  date_range_start: string // ISO date
  date_range_end: string // ISO date

  // Generation details
  generated_at: string // ISO timestamp
  generation_time_ms?: number
  data_snapshot: Record<string, any> // Raw data backup

  // Content (flexible JSONB)
  summary: ReportSummary
  sections: ReportSection[]
  photos?: ReportPhoto[]

  // Status & delivery
  status: ReportStatus
  sent_to_client: boolean
  sent_at?: string
  client_viewed: boolean
  client_viewed_at?: string

  // File storage
  pdf_url?: string
  excel_url?: string

  // Metadata
  created_by: string // UUID
  created_at: string
  updated_at: string

  // Relations (populated via joins)
  project?: {
    id: string
    name: string
    location?: string
  }
}

// Report Summary (JSONB field)
export interface ReportSummary {
  tasks_count?: number
  photos_count?: number
  crew_count?: number
  total_hours?: number
  total_cost?: number
  completion_percentage?: number
  issues_count?: number
  [key: string]: any // Allow custom summary fields
}

// Report Section (JSONB array item)
export interface ReportSection {
  id: string // Unique section ID
  type: SectionType
  title?: string
  order?: number
  data: any // Flexible data structure
  settings?: Record<string, any>
}

// Report Photo
export interface ReportPhoto {
  id: string
  url: string
  caption?: string
  taken_at: string
  order?: number
}

// Report Template
export interface ReportTemplate {
  id: string
  template_name: string
  template_type: string // 'daily', 'weekly_timesheet', etc.
  description?: string

  // Template structure (JSONB)
  sections: TemplateSection[]
  styling: TemplateStyling

  // Flags
  is_system_template: boolean
  is_default: boolean
  is_active: boolean

  // Metadata
  created_by?: string
  organization_id?: string
  created_at: string
  updated_at: string
}

// Template Section (JSONB array item)
export interface TemplateSection {
  id: string
  type: SectionType
  title: string
  order: number
  fields?: TemplateField[]
  settings?: {
    required?: boolean
    max_items?: number
    allow_custom_fields?: boolean
    [key: string]: any
  }
}

// Template Field
export interface TemplateField {
  id: string
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox'
  required?: boolean
  default_value?: any
  options?: string[] // For select fields
}

// Template Styling (JSONB field)
export interface TemplateStyling {
  primaryColor?: string
  secondaryColor?: string
  fontFamily?: string
  fontSize?: number
  showLogo?: boolean
  logoUrl?: string
  headerText?: string
  footerText?: string
  pageSize?: 'letter' | 'a4'
  [key: string]: any
}

// Report Schedule
export interface ReportSchedule {
  id: string
  schedule_name: string
  report_type: ReportType
  template_id?: string

  // Scheduling
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'
  cron_expression?: string // For custom schedules
  time_of_day?: string // HH:MM format
  day_of_week?: number // 0-6 (Sunday = 0)
  day_of_month?: number // 1-31

  // Scope
  project_id?: string // null = all projects
  user_id?: string // Who creates the report

  // Actions
  auto_send_to_client: boolean
  recipient_emails?: string[]

  // Status
  is_active: boolean
  last_run_at?: string
  next_run_at?: string

  // Metadata
  created_by: string
  created_at: string
  updated_at: string
}

// Timesheet Entry
export interface TimesheetEntry {
  id: string
  employee_id: string
  employee_name?: string // Populated via join

  // Project allocation
  project_id?: string
  project_name?: string // Populated via join

  // Date tracking
  work_date: string // ISO date
  week_start_date: string // Monday of the week

  // Hours (user input)
  regular_hours: number
  overtime_hours: number
  double_time_hours?: number

  // Calculated (generated column)
  total_hours: number // regular + overtime + double_time

  // Rates
  hourly_rate: number
  overtime_rate?: number // Defaults to hourly_rate × 1.5
  double_time_rate?: number // Defaults to hourly_rate × 2

  // Cost (generated column)
  total_cost: number

  // Classification
  work_type?: string // 'regular', 'travel', 'on_call', etc.
  notes?: string

  // Approval
  approved: boolean
  approved_by?: string
  approved_at?: string

  // Metadata
  created_at: string
  updated_at: string
}

// Week Summary (for timesheet reports)
export interface WeekSummary {
  employee_id: string
  employee_name: string
  total_regular: number
  total_overtime: number
  total_double_time?: number
  total_hours: number
  total_cost: number
}

// Daily Report Form Data
export interface DailyReportFormData {
  project_id: string
  report_date: string

  // Auto-loaded data
  weather?: WeatherData
  tasks_completed: CompletedTask[]
  photos: ReportPhoto[]

  // Manual entry
  crew: CrewMember[]
  notes: string
  issues: string
  tomorrow_plan: string
  materials_used: string
  safety_notes?: string
}

// Weather Data
export interface WeatherData {
  temp: number // Fahrenheit
  condition: string // 'Sunny', 'Cloudy', etc.
  humidity: number // Percentage
  wind_speed: number // MPH
  precipitation?: number // Inches
  icon?: string // Weather icon code
}

// Completed Task (for daily reports)
export interface CompletedTask {
  id: string
  title: string
  description?: string
  status: string
  assigned_to?: string
  completed_at?: string
}

// Crew Member (for daily reports)
export interface CrewMember {
  id: string
  name: string
  role: string
  hours: number
  notes?: string
}

// Report Stats (for dashboard)
export interface ReportStats {
  total: number
  this_week: number
  this_month: number
  sent_to_clients: number
  pending_review: number
  by_type: Record<ReportType, number>
}

// Report Filter Options
export interface ReportFilters {
  type?: ReportType
  status?: ReportStatus
  project_id?: string
  date_from?: string
  date_to?: string
  search?: string
}

// Timesheet Filters
export interface TimesheetFilters {
  week_start_date: string
  employee_id?: string
  project_id?: string
  approved?: boolean
}

// Export Options
export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv'
  include_photos?: boolean
  include_signature?: boolean
  watermark?: string
}

// PDF Generation Options
export interface PDFOptions {
  template_id?: string
  orientation: 'portrait' | 'landscape'
  include_header: boolean
  include_footer: boolean
  page_numbers: boolean
  company_logo?: string
}

// Email Options (for sending reports)
export interface EmailOptions {
  recipients: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  message?: string
  attach_pdf?: boolean
  attach_excel?: boolean
}

// Client Interaction (for report portal)
export interface ReportClientInteraction {
  id: string
  report_id: string
  interaction_type: 'viewed' | 'comment' | 'question' | 'approval' | 'rejection'

  // Comment/Question
  message?: string
  attachment_url?: string

  // Context
  section_id?: string // Which section was commented on

  // Status
  resolved: boolean
  resolved_by?: string
  resolved_at?: string
  response?: string

  // Metadata
  created_by?: string // Client user
  created_by_name?: string
  created_at: string
}

// Report Activity (audit trail)
export interface ReportActivity {
  id: string
  report_id: string
  activity_type:
    | 'created'
    | 'updated'
    | 'sent'
    | 'viewed'
    | 'approved'
    | 'rejected'
    | 'archived'

  description: string
  metadata?: Record<string, any>

  // Actor
  created_by?: string
  created_by_name?: string
  created_at: string
}

// Utility Types

// Database insert types (omit generated fields)
export type ReportInsert = Omit<Report, 'id' | 'created_at' | 'updated_at' | 'report_number'>
export type TimesheetEntryInsert = Omit<TimesheetEntry, 'id' | 'total_hours' | 'total_cost' | 'created_at' | 'updated_at'>
export type ReportTemplateInsert = Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at'>

// Database update types (allow partial updates)
export type ReportUpdate = Partial<ReportInsert>
export type TimesheetEntryUpdate = Partial<TimesheetEntryInsert>
export type ReportTemplateUpdate = Partial<ReportTemplateInsert>

// API Response types
export interface ReportResponse {
  data: Report | null
  error: Error | null
}

export interface ReportsResponse {
  data: Report[]
  count: number
  error: Error | null
}

export interface TimesheetResponse {
  data: TimesheetEntry[]
  summary: WeekSummary[]
  error: Error | null
}
