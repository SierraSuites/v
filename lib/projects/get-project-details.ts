// ============================================================================
// PROJECT DETAILS FETCHER
// Retrieves complete project information with all related data
// ============================================================================

import { createClient } from '@/lib/supabase/server'

export interface ProjectMember {
  id: string          // user_id
  membershipId: string // project_team_members.id (row id, used for DELETE)
  name: string
  email: string
  avatar: string | null
  role: string
  permissions: string[]
  addedAt: string
}

export interface ProjectPhase {
  id: string
  name: string
  start_date: string
  end_date: string
  status: 'pending' | 'in-progress' | 'completed'
  progress: number
  created_at: string
  updated_at: string
}

export interface ProjectDocument {
  id: string
  name: string
  category: string
  file_path: string
  file_size: number | null
  file_type: string | null
  description: string | null
  tags: string[] | null
  uploaded_at: string
  uploaded_by: {
    id: string
    name: string
    avatar: string | null
  } | null
}

export interface ProjectMilestone {
  id: string
  phase_id: string | null
  name: string
  description: string | null
  due_date: string
  completed_at: string | null
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface DesignSelection {
  id: string
  category: string
  room_location: string
  option_name: string
  manufacturer: string
  model: string
  sku: string
  color: string
  finish: string
  description: string
  image_urls: string[]
  price: number
  upgrade_cost: number
  installation_cost: number
  lead_time_days: number
  availability_status: string
  client_approved: boolean
  approved_date: string | null
  approved_by_name: string | null
  approved_by_email: string | null
  status: 'pending' | 'approved' | 'rejected' | 'ordered' | 'received' | 'installed'
  notes: string
  linked_expense_id: string | null
  linked_task_id: string | null
  created_at: string
  updated_at: string
}

export interface ProjectExpense {
  id: string
  category: string
  description: string | null
  amount: number
  currency: string
  date: string
  vendor: string | null
  invoice_number: string | null
  payment_status: 'pending' | 'paid' | 'overdue'
  design_selection_id: string | null
  created_by: string | null
  created_at: string
}

export interface ProjectChangeOrder {
  id: string
  co_number: string
  title: string
  description: string
  reason: string | null
  original_amount: number
  change_amount: number
  days_added: number
  original_end_date: string | null
  status: 'draft' | 'pending_client' | 'client_approved' | 'client_rejected' | 'executed' | 'cancelled'
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface ProjectRFI {
  id: string
  rfi_number: string
  subject: string
  question: string
  response: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'draft' | 'open' | 'answered' | 'closed' | 'cancelled'
  due_date: string | null
  responded_at: string | null
  drawing_references: string[]
  spec_references: string[]
  created_at: string
  updated_at: string
}

export interface ProjectTask {
  id: string
  title: string
  description: string | null
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked' | 'review'
  priority: 'low' | 'medium' | 'high' | 'critical'
  trade: string | null
  phase: string | null
  start_date: string | null
  due_date: string | null
  duration: number | null
  estimated_hours: number | null
  actual_hours: number | null
  progress: number | null
  assignee_id: string | null
  assignee_name: string | null
  design_selection_id: string | null
  selection_task_type: 'order' | 'delivery' | 'installation' | null
  crew_size: number | null
  equipment: string[] | null
  materials: string[] | null
  certifications: string[] | null
  safety_protocols: string[] | null
  quality_standards: string[] | null
  location: string | null
  weather_dependent: boolean | null
  weather_buffer: number | null
  inspection_required: boolean | null
  inspection_type: string | null
  dependencies: string[] | null
  attachments: number | null
  comments: number | null
  client_visibility: boolean | null
  created_at: string
  updated_at: string
}

export interface ProjectDetails {
  // Basic project info
  id: string
  user_id: string
  name: string
  client: string
  address: string
  city: string | null
  state: string | null
  zip_code: string | null
  country: string
  type: 'residential' | 'commercial' | 'industrial' | 'infrastructure' | 'renovation'
  description: string | null

  // Status & Progress
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
  progress: number

  // Timeline
  start_date: string
  end_date: string

  // Budget
  estimated_budget: number
  spent: number
  currency: string

  // Team
  project_manager_id: string | null
  equipment: string[] | null
  certifications_required: string[] | null

  // Settings
  document_categories: string[] | null
  notification_settings: Record<string, unknown> | null
  client_visibility: boolean

  // Metadata
  is_favorite: boolean
  thumbnail: string | null
  created_at: string
  updated_at: string

  // Current user context (used by useProjectPermissions hook)
  currentUserRole: string        // project_team_members.project_role for this user, or 'owner' if company owner/admin
  currentUserCompanyRole: string // user_profiles.role (company-wide role)

  // Related data
  teamMembers: ProjectMember[]
  phases: ProjectPhase[]
  documents: ProjectDocument[]
  milestones: ProjectMilestone[]
  expenses: ProjectExpense[]
  tasks: ProjectTask[]
  changeOrders: ProjectChangeOrder[]
  rfis: ProjectRFI[]
  designSelections: DesignSelection[]

  // Computed fields
  budgetRemaining: number
  budgetPercentage: number
  isOverBudget: boolean
  daysRemaining: number
  isOverdue: boolean

  // Projected spend = actual + committed design selections + approved + installation labor
  projectedSpend: number
  projectedPercentage: number

  // Design selections summary (price + status only — for budget projection seeding)
  designSelectionsSummary: { price: number; status: string; installation_cost: number }[]
}

/**
 * Get complete project details with all related data
 *
 * @param projectId - UUID of the project
 * @returns Complete project details or null if not found
 */
export async function getProjectDetails(
  projectId: string
): Promise<{ data: ProjectDetails | null; error: Error | null }> {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { data: null, error: new Error('Not authenticated') }
    }

    // Fetch project with all related data in one query
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_team_members (
          id,
          user_id,
          project_role,
          added_at
        ),
        project_phases (*),
        project_documents (
          *,
          uploaded_by_profile:uploaded_by (
            id,
            full_name,
            avatar_url
          )
        ),
        project_milestones (*),
        project_expenses (*)
      `)
      .eq('id', projectId)
      .single()

    if (error) {
      console.error('[getProjectDetails] Database error:', JSON.stringify(error, null, 2))
      return { data: null, error: new Error('Failed to fetch project details') }
    }

    if (!project) {
      return { data: null, error: new Error('Project not found') }
    }

    // Fetch change orders, RFIs, and design selections summary separately
    const [changeOrdersRes, rfisRes, designSelectionsRes] = await Promise.all([
      supabase.from('project_change_orders').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('project_rfis').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('design_selections').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
    ])

    // Fetch tasks separately (no FK relationship registered with PostgREST)
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    // Fetch team members — only users explicitly assigned to this project
    const teamMemberIds = project.project_team_members?.map((ptm: any) => ptm.user_id) || []

    // Fetch profiles + current user's company role in one query
    const profileIds = [...new Set([...teamMemberIds, user.id])]
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, avatar_url, role')
      .in('id', profileIds)

    const currentUserProfile = profiles?.find((p: any) => p.id === user.id)
    const currentUserCompanyRole = currentUserProfile?.role || 'member'

    // Resolve current user's project role
    const isCompanyOwnerOrAdmin = currentUserCompanyRole === 'owner' || currentUserCompanyRole === 'admin'
    const currentUserPtm = project.project_team_members?.find((ptm: any) => ptm.user_id === user.id)
    const currentUserRole = isCompanyOwnerOrAdmin
      ? 'owner'
      : (currentUserPtm?.project_role || 'viewer')

    const teamMembers: ProjectMember[] = (project.project_team_members || []).map((ptm: any) => {
      const profile = profiles?.find((p: any) => p.id === ptm.user_id)
      return {
        id: ptm.user_id,
        membershipId: ptm.id,
        name: profile?.full_name || profile?.email || 'Unknown User',
        email: profile?.email || '',
        avatar: profile?.avatar_url || null,
        role: ptm.project_role || 'member',
        permissions: ['view'],
        addedAt: ptm.added_at
      }
    })

    // Map documents with uploader info
    const documents: ProjectDocument[] = (project.project_documents || []).map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      category: doc.category,
      file_path: doc.file_path,
      file_size: doc.file_size,
      file_type: doc.file_type,
      description: doc.description,
      tags: doc.tags,
      uploaded_at: doc.uploaded_at,
      uploaded_by: doc.uploaded_by_profile ? {
        id: doc.uploaded_by_profile.id,
        name: doc.uploaded_by_profile.full_name || 'Unknown',
        avatar: doc.uploaded_by_profile.avatar_url
      } : null
    }))

    // Calculate budget metrics from actual expenses (not the stale `spent` column)
    const allExpenses = project.project_expenses || []
    const actualSpent = allExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
    const budgetRemaining = project.estimated_budget - actualSpent
    const budgetPercentage = project.estimated_budget > 0
      ? (actualSpent / project.estimated_budget) * 100
      : 0
    const isOverBudget = budgetPercentage > 100

    // Compute projected spend = actual + committed design selections (excluding paid) + approved + installation
    const paidSelIds = new Set(
      allExpenses.map((e: any) => e.design_selection_id).filter(Boolean)
    )
    const selSummary = (designSelectionsRes.data || []) as { price: number; status: string; installation_cost: number; id: string }[]
    const sumPrice = (arr: typeof selSummary) => arr.reduce((n, s) => n + (s.price || 0), 0)
    const sumInstall = (arr: typeof selSummary) => arr.reduce((n, s) => n + (s.installation_cost || 0), 0)
    // Track which installed items already have a recorded labor expense — their
    // installation_cost is already in actualSpent, so don't project it again
    const paidInstallIds = new Set(
      allExpenses.filter((e: any) => e.category === 'labor' && e.design_selection_id).map((e: any) => e.design_selection_id)
    )
    const unpaidOrdered      = selSummary.filter(s => s.status === 'ordered'   && !paidSelIds.has(s.id))
    const unpaidReceived     = selSummary.filter(s => s.status === 'received'  && !paidSelIds.has(s.id))
    const unpaidInstalled    = selSummary.filter(s => s.status === 'installed' && !paidSelIds.has(s.id))
    const unpaidApproved     = selSummary.filter(s => s.status === 'approved'  && !paidSelIds.has(s.id))
    const unpaidInstallLabor = selSummary.filter(s =>
      ['approved', 'ordered', 'received', 'installed'].includes(s.status) && !paidInstallIds.has(s.id)
    )
    const projectedSpend = actualSpent
      + sumPrice(unpaidOrdered) + sumPrice(unpaidReceived) + sumPrice(unpaidInstalled)
      + sumPrice(unpaidApproved)
      + sumInstall(unpaidInstallLabor)
    const projectedPercentage = project.estimated_budget > 0
      ? (projectedSpend / project.estimated_budget) * 100
      : 0

    // Calculate time metrics
    const today = new Date()
    const endDate = new Date(project.end_date)
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const isOverdue = daysRemaining < 0 && project.status !== 'completed'

    // Construct complete project details
    const projectDetails: ProjectDetails = {
      // Basic info
      id: project.id,
      user_id: project.user_id,
      name: project.name,
      client: project.client,
      address: project.address,
      city: project.city,
      state: project.state,
      zip_code: project.zip_code,
      country: project.country,
      type: project.type,
      description: project.description,

      // Status & Progress — computed from tasks, not the manual DB column
      status: project.status,
      progress: (() => {
        const allTasks = (tasksData || []) as ProjectTask[]
        if (allTasks.length === 0) return 0
        const completed = allTasks.filter(t => t.status === 'completed').length
        return Math.round((completed / allTasks.length) * 100)
      })(),

      // Timeline
      start_date: project.start_date,
      end_date: project.end_date,

      // Budget — computed from actual expenses, not the stale `spent` column
      estimated_budget: project.estimated_budget,
      spent: actualSpent,
      currency: project.currency,

      // Team
      project_manager_id: project.project_manager_id,
      equipment: project.equipment,
      certifications_required: project.certifications_required,

      // Settings
      document_categories: project.document_categories,
      notification_settings: project.notification_settings,
      client_visibility: project.client_visibility,

      // Metadata
      is_favorite: project.is_favorite,
      thumbnail: project.thumbnail,
      created_at: project.created_at,
      updated_at: project.updated_at,

      // Current user context
      currentUserRole,
      currentUserCompanyRole,

      // Related data
      teamMembers,
      phases: project.project_phases || [],
      documents,
      milestones: project.project_milestones || [],
      expenses: project.project_expenses || [],
      tasks: (tasksData as ProjectTask[]) || [],
      changeOrders: (changeOrdersRes.error ? [] : changeOrdersRes.data as ProjectChangeOrder[]) || [],
      rfis: (rfisRes.error ? [] : rfisRes.data as ProjectRFI[]) || [],

      // Computed fields
      budgetRemaining,
      budgetPercentage,
      isOverBudget,
      daysRemaining,
      isOverdue,
      projectedSpend,
      projectedPercentage,

      // Full design selections for the Design Selections tab
      designSelections: (designSelectionsRes.data || []) as DesignSelection[],

      // Design selections summary for budget projection seeding (derived from full data)
      designSelectionsSummary: (designSelectionsRes.data || []) as { price: number; status: string; installation_cost: number }[],
    }

    return { data: projectDetails, error: null }

  } catch (error) {
    console.error('[getProjectDetails] Unexpected error:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error occurred')
    }
  }
}

/**
 * Check if user has access to a project
 *
 * @param projectId - UUID of the project
 * @param userId - UUID of the user
 * @returns True if user has access
 */
export async function userHasProjectAccess(
  projectId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = await createClient()

    // Check if user owns the project
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (project) return true

    // Check if user is a project member
    const { data: member } = await supabase
      .from('project_team_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    return !!member
  } catch {
    return false
  }
}
