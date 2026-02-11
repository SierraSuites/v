import { createClient } from "@/lib/supabase/client"
import { permissionService } from '@/lib/permissions'

// ============================================================================
// RBAC PERMISSION GUARD HELPERS
// ============================================================================

/**
 * Get authenticated user and their company ID
 */
async function getAuthContext(): Promise<{
  userId: string
  companyId: string
} | null> {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.error('Authentication required')
      return null
    }

    // Get user's company from profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      console.error('User profile or company not found')
      return null
    }

    return {
      userId: user.id,
      companyId: profile.company_id
    }
  } catch (error) {
    console.error('Error getting auth context:', error)
    return null
  }
}

/**
 * Check if user has required project permission
 */
async function checkProjectPermission(
  permission: 'canViewAllProjects' | 'canCreateProjects' | 'canEditProjects' | 'canDeleteProjects',
  userId: string,
  companyId: string,
  projectId?: string
): Promise<boolean> {
  try {
    const hasPermission = await permissionService.hasPermissionDB(
      userId,
      companyId,
      permission
    )

    // If user has the permission globally, they're good
    if (hasPermission) {
      // Log permission check for audit trail
      await permissionService.logPermissionCheck(
        `project_${permission}`,
        'project',
        projectId || companyId,
        true
      )
      return true
    }

    // If checking specific project and user doesn't have global permission,
    // check if they're assigned to this specific project
    if (projectId && permission === 'canViewAllProjects') {
      const accessibleProjects = await permissionService.getUserAccessibleProjects(userId)
      const hasAccess = accessibleProjects.includes(projectId)

      await permissionService.logPermissionCheck(
        `project_${permission}_specific`,
        'project',
        projectId,
        hasAccess,
        hasAccess ? undefined : 'Not assigned to project'
      )

      return hasAccess
    }

    // Log permission denial
    await permissionService.logPermissionCheck(
      `project_${permission}`,
      'project',
      projectId || companyId,
      false,
      'Insufficient permissions'
    )

    return false
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

export type Project = {
  id: string
  user_id: string

  // Basic Information
  name: string
  client: string
  address: string
  city: string | null
  state: string | null
  zip_code: string | null
  country: string
  type: "residential" | "commercial" | "industrial" | "infrastructure" | "renovation"
  description: string | null

  // Status & Progress
  status: "planning" | "active" | "on-hold" | "completed" | "cancelled"
  progress: number

  // Timeline
  start_date: string
  end_date: string

  // Budget
  estimated_budget: number
  spent: number
  currency: string

  // Team & Resources
  project_manager_id: string | null
  equipment: string[]
  certifications_required: string[]

  // Settings
  document_categories: string[]
  notification_settings: {
    emailUpdates: boolean
    milestoneAlerts: boolean
    budgetAlerts: boolean
    teamNotifications: boolean
  }
  client_visibility: boolean

  // Metadata
  is_favorite: boolean
  thumbnail: string | null

  // Timestamps
  created_at: string
  updated_at: string
}

export type ProjectPhase = {
  id: string
  project_id: string
  name: string
  start_date: string
  end_date: string
  status: "pending" | "in-progress" | "completed"
  progress: number
  created_at: string
  updated_at: string
}

export type ProjectMember = {
  id: string
  project_id: string
  user_id: string
  role: string
  permissions: string[]
  added_at: string
}

export type ProjectDocument = {
  id: string
  project_id: string
  uploaded_by: string | null
  name: string
  category: string
  file_path: string
  file_size: number | null
  file_type: string | null
  description: string | null
  tags: string[]
  uploaded_at: string
}

export type ProjectMilestone = {
  id: string
  project_id: string
  phase_id: string | null
  name: string
  description: string | null
  due_date: string
  completed_at: string | null
  status: "pending" | "in-progress" | "completed" | "cancelled"
  created_at: string
  updated_at: string
}

export type ProjectExpense = {
  id: string
  project_id: string
  category: string
  description: string | null
  amount: number
  currency: string
  date: string
  vendor: string | null
  invoice_number: string | null
  payment_status: "pending" | "paid" | "overdue"
  created_by: string | null
  created_at: string
}

export type ProjectInsert = Omit<Project, "id" | "user_id" | "created_at" | "updated_at" | "spent" | "progress">
export type ProjectUpdate = Partial<ProjectInsert>

// ============================================
// PROJECT CRUD OPERATIONS
// ============================================

/**
 * Fetch all projects for the current user
 * RBAC: Enforces canViewAllProjects or returns only assigned projects
 */
export async function getProjects() {
  const supabase = createClient()

  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  // Check if user can view all projects
  const canViewAll = await checkProjectPermission(
    'canViewAllProjects',
    authContext.userId,
    authContext.companyId
  )

  let query = supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })

  if (!canViewAll) {
    // User can only see assigned projects
    const accessibleProjects = await permissionService.getUserAccessibleProjects(authContext.userId)

    if (accessibleProjects.length === 0) {
      return { data: [], error: null }
    }

    // Filter to only accessible projects
    query = query.in('id', accessibleProjects)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching projects:", error)
    console.error("Fetch error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    console.error("Full error object:", JSON.stringify(error, null, 2))
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Fetch a single project by ID
 * RBAC: Enforces canViewAllProjects or project assignment
 */
export async function getProjectById(projectId: string) {
  const supabase = createClient()

  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  // Check if user can view this specific project
  const canView = await checkProjectPermission(
    'canViewAllProjects',
    authContext.userId,
    authContext.companyId,
    projectId
  )

  if (!canView) {
    return { data: null, error: new Error('Permission denied: Cannot view this project') }
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single()

  if (error) {
    console.error("Error fetching project:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Fetch projects by status
 */
export async function getProjectsByStatus(status: Project["status"]) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching projects by status:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Fetch projects by type
 */
export async function getProjectsByType(type: Project["type"]) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("type", type)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching projects by type:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Fetch favorite projects
 */
export async function getFavoriteProjects() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("is_favorite", true)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching favorite projects:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Create a new project
 * RBAC: Requires canCreateProjects permission
 */
export async function createProject(project: ProjectInsert) {
  const supabase = createClient()

  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canCreate = await checkProjectPermission(
    'canCreateProjects',
    authContext.userId,
    authContext.companyId
  )

  if (!canCreate) {
    return { data: null, error: new Error('Permission denied: canCreateProjects required') }
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      ...project,
      user_id: authContext.userId,
      progress: 0,
      spent: 0
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating project:", error)
    console.error("Error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    console.error("Project data being inserted:", project)
    return { data: null, error }
  }

  // Log the operation
  await permissionService.logPermissionCheck(
    'create_project',
    'project',
    data.id,
    true
  )

  return { data, error: null }
}

/**
 * Update an existing project
 * RBAC: Requires canEditProjects permission
 */
export async function updateProject(projectId: string, updates: ProjectUpdate) {
  const supabase = createClient()

  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canEdit = await checkProjectPermission(
    'canEditProjects',
    authContext.userId,
    authContext.companyId,
    projectId
  )

  if (!canEdit) {
    return { data: null, error: new Error('Permission denied: canEditProjects required') }
  }

  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .select()
    .single()

  if (error) {
    console.error("Error updating project:", error)
    return { data: null, error }
  }

  // Log the operation
  await permissionService.logPermissionCheck(
    'update_project',
    'project',
    projectId,
    true
  )

  return { data, error: null }
}

/**
 * Delete a project
 * RBAC: Requires canDeleteProjects permission
 */
export async function deleteProject(projectId: string) {
  const supabase = createClient()

  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { error: new Error('Authentication required') }
  }

  const canDelete = await checkProjectPermission(
    'canDeleteProjects',
    authContext.userId,
    authContext.companyId,
    projectId
  )

  if (!canDelete) {
    return { error: new Error('Permission denied: canDeleteProjects required') }
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)

  if (error) {
    console.error("Error deleting project:", error)
    return { error }
  }

  // Log the operation
  await permissionService.logPermissionCheck(
    'delete_project',
    'project',
    projectId,
    true
  )

  return { error: null }
}

/**
 * Toggle favorite status
 */
export async function toggleFavoriteProject(projectId: string, isFavorite: boolean) {
  return updateProject(projectId, { is_favorite: isFavorite })
}

// ============================================
// PROJECT PHASES OPERATIONS
// ============================================

/**
 * Get all phases for a project
 */
export async function getProjectPhases(projectId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("project_phases")
    .select("*")
    .eq("project_id", projectId)
    .order("start_date", { ascending: true })

  if (error) {
    console.error("Error fetching project phases:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Create a new phase
 */
export async function createProjectPhase(phase: Omit<ProjectPhase, "id" | "created_at" | "updated_at">) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("project_phases")
    .insert(phase)
    .select()
    .single()

  if (error) {
    console.error("Error creating project phase:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Update a phase
 */
export async function updateProjectPhase(phaseId: string, updates: Partial<Omit<ProjectPhase, "id" | "created_at" | "updated_at">>) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("project_phases")
    .update(updates)
    .eq("id", phaseId)
    .select()
    .single()

  if (error) {
    console.error("Error updating project phase:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Delete a phase
 */
export async function deleteProjectPhase(phaseId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from("project_phases")
    .delete()
    .eq("id", phaseId)

  if (error) {
    console.error("Error deleting project phase:", error)
    return { error }
  }

  return { error: null }
}

// ============================================
// PROJECT MEMBERS OPERATIONS
// ============================================

/**
 * Get all members for a project
 */
export async function getProjectMembers(projectId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)

  if (error) {
    console.error("Error fetching project members:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Add a member to a project
 */
export async function addProjectMember(member: Omit<ProjectMember, "id" | "added_at">) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("project_members")
    .insert(member)
    .select()
    .single()

  if (error) {
    console.error("Error adding project member:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Update a member's role or permissions
 */
export async function updateProjectMember(memberId: string, updates: Partial<Pick<ProjectMember, "role" | "permissions">>) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("project_members")
    .update(updates)
    .eq("id", memberId)
    .select()
    .single()

  if (error) {
    console.error("Error updating project member:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Remove a member from a project
 */
export async function removeProjectMember(memberId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", memberId)

  if (error) {
    console.error("Error removing project member:", error)
    return { error }
  }

  return { error: null }
}

// ============================================
// PROJECT EXPENSES OPERATIONS
// ============================================

/**
 * Get all expenses for a project
 */
export async function getProjectExpenses(projectId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("project_expenses")
    .select("*")
    .eq("project_id", projectId)
    .order("date", { ascending: false })

  if (error) {
    console.error("Error fetching project expenses:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Add an expense to a project
 */
export async function addProjectExpense(expense: Omit<ProjectExpense, "id" | "created_at" | "created_by">) {
  const supabase = createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    return { data: null, error: new Error("User not authenticated") }
  }

  const { data, error } = await supabase
    .from("project_expenses")
    .insert({
      ...expense,
      created_by: user.user.id
    })
    .select()
    .single()

  if (error) {
    console.error("Error adding project expense:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Update an expense
 */
export async function updateProjectExpense(expenseId: string, updates: Partial<Omit<ProjectExpense, "id" | "created_at" | "created_by">>) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("project_expenses")
    .update(updates)
    .eq("id", expenseId)
    .select()
    .single()

  if (error) {
    console.error("Error updating project expense:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Delete an expense
 */
export async function deleteProjectExpense(expenseId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from("project_expenses")
    .delete()
    .eq("id", expenseId)

  if (error) {
    console.error("Error deleting project expense:", error)
    return { error }
  }

  return { error: null }
}

// ============================================
// PROJECT MILESTONES OPERATIONS
// ============================================

/**
 * Get all milestones for a project
 */
export async function getProjectMilestones(projectId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("due_date", { ascending: true })

  if (error) {
    console.error("Error fetching project milestones:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Create a milestone
 */
export async function createProjectMilestone(milestone: Omit<ProjectMilestone, "id" | "created_at" | "updated_at">) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("project_milestones")
    .insert(milestone)
    .select()
    .single()

  if (error) {
    console.error("Error creating project milestone:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Update a milestone
 */
export async function updateProjectMilestone(milestoneId: string, updates: Partial<Omit<ProjectMilestone, "id" | "created_at" | "updated_at">>) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("project_milestones")
    .update(updates)
    .eq("id", milestoneId)
    .select()
    .single()

  if (error) {
    console.error("Error updating project milestone:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Delete a milestone
 */
export async function deleteProjectMilestone(milestoneId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from("project_milestones")
    .delete()
    .eq("id", milestoneId)

  if (error) {
    console.error("Error deleting project milestone:", error)
    return { error }
  }

  return { error: null }
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to project changes
 */
export function subscribeToProjects(callback: (payload: any) => void) {
  const supabase = createClient()

  const channel = supabase
    .channel("projects-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "projects"
      },
      callback
    )
    .subscribe()

  return channel
}

/**
 * Subscribe to specific project changes
 */
export function subscribeToProject(projectId: string, callback: (payload: any) => void) {
  const supabase = createClient()

  const channel = supabase
    .channel(`project-${projectId}-changes`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "projects",
        filter: `id=eq.${projectId}`
      },
      callback
    )
    .subscribe()

  return channel
}

/**
 * Subscribe to project expenses changes
 */
export function subscribeToProjectExpenses(projectId: string, callback: (payload: any) => void) {
  const supabase = createClient()

  const channel = supabase
    .channel(`project-${projectId}-expenses`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "project_expenses",
        filter: `project_id=eq.${projectId}`
      },
      callback
    )
    .subscribe()

  return channel
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribeChannel(channel: any) {
  const supabase = createClient()
  await supabase.removeChannel(channel)
}
