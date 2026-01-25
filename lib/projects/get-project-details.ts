// ============================================================================
// PROJECT DETAILS FETCHER
// Retrieves complete project information with all related data
// ============================================================================

import { createClient } from '@/lib/supabase/server'

export interface ProjectMember {
  id: string
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
  created_by: string | null
  created_at: string
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

  // Related data
  teamMembers: ProjectMember[]
  phases: ProjectPhase[]
  documents: ProjectDocument[]
  milestones: ProjectMilestone[]
  expenses: ProjectExpense[]

  // Computed fields
  budgetRemaining: number
  budgetPercentage: number
  isOverBudget: boolean
  daysRemaining: number
  isOverdue: boolean
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
    const supabase = createClient()

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
        project_members (
          id,
          role,
          permissions,
          added_at,
          user_id
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
      console.error('[getProjectDetails] Database error:', error)
      return { data: null, error: new Error('Failed to fetch project details') }
    }

    if (!project) {
      return { data: null, error: new Error('Project not found') }
    }

    // For each team member, fetch their user profile
    const teamMemberIds = project.project_members?.map((pm: any) => pm.user_id) || []
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', teamMemberIds)

    // Map team members with profile data
    const teamMembers: ProjectMember[] = (project.project_members || []).map((pm: any) => {
      const profile = profiles?.find(p => p.id === pm.user_id)
      return {
        id: pm.user_id,
        name: profile?.full_name || 'Unknown User',
        email: profile?.email || '',
        avatar: profile?.avatar_url || null,
        role: pm.role,
        permissions: pm.permissions || ['view'],
        addedAt: pm.added_at
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

    // Calculate budget metrics
    const budgetRemaining = project.estimated_budget - project.spent
    const budgetPercentage = project.estimated_budget > 0
      ? (project.spent / project.estimated_budget) * 100
      : 0
    const isOverBudget = budgetPercentage > 100

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

      // Status & Progress
      status: project.status,
      progress: project.progress,

      // Timeline
      start_date: project.start_date,
      end_date: project.end_date,

      // Budget
      estimated_budget: project.estimated_budget,
      spent: project.spent,
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

      // Related data
      teamMembers,
      phases: project.project_phases || [],
      documents,
      milestones: project.project_milestones || [],
      expenses: project.project_expenses || [],

      // Computed fields
      budgetRemaining,
      budgetPercentage,
      isOverBudget,
      daysRemaining,
      isOverdue
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
    const supabase = createClient()

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
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    return !!member
  } catch {
    return false
  }
}
