import { createClient } from '@/lib/supabase/client'

// ============================================
// TYPES
// ============================================

export type PunchListSeverity = 'critical' | 'high' | 'medium' | 'low'
export type PunchListStatus = 'open' | 'in_progress' | 'pending_review' | 'resolved' | 'closed' | 'rejected'
export type PunchListCategory = 'safety' | 'quality' | 'compliance' | 'aesthetic' | 'functional'
export type AIFindingType = 'safety_issue' | 'quality_defect' | 'compliance_violation' | 'progress_tracking'

export interface PunchListItem {
  id: string
  project_id: string
  photo_id: string | null
  task_id: string | null
  title: string
  description: string | null
  location_description: string | null
  severity: PunchListSeverity
  category: PunchListCategory | null
  trade: string | null
  status: PunchListStatus
  assigned_to: string | null
  assigned_at: string | null
  due_date: string | null
  resolved_at: string | null
  closed_at: string | null
  ai_generated: boolean
  ai_confidence: number | null
  ai_finding_type: AIFindingType | null
  ai_details: any | null
  estimated_cost: number | null
  actual_cost: number | null
  impact_level: string | null
  requires_inspection: boolean
  inspection_completed: boolean
  inspector_notes: string | null
  created_by: string
  created_at: string
  updated_at: string

  // Joined data (optional)
  photo?: any
  project?: any
  assigned_user?: any
  comments_count?: number
  attachments_count?: number
}

export interface PunchListComment {
  id: string
  punch_list_item_id: string
  user_id: string
  user_name: string
  comment: string
  comment_type: 'note' | 'status_change' | 'assignment' | 'resolution' | 'rejection'
  photo_proof_id: string | null
  resolved: boolean
  resolution_approved: boolean | null
  approved_by: string | null
  created_at: string
  updated_at: string

  // Joined data
  photo_proof?: any
}

export interface PunchListStats {
  total: number
  open: number
  in_progress: number
  resolved: number
  closed: number
  critical: number
  high: number
  overdue: number
  ai_generated: number
}

export interface CreatePunchItemInput {
  project_id: string
  photo_id?: string
  title: string
  description?: string
  location_description?: string
  severity: PunchListSeverity
  category?: PunchListCategory
  trade?: string
  assigned_to?: string
  due_date?: string
  ai_generated?: boolean
  ai_confidence?: number
  ai_finding_type?: AIFindingType
  ai_details?: any
  estimated_cost?: number
  impact_level?: string
  requires_inspection?: boolean
}

export interface UpdatePunchItemInput {
  title?: string
  description?: string
  location_description?: string
  severity?: PunchListSeverity
  category?: PunchListCategory
  status?: PunchListStatus
  assigned_to?: string
  due_date?: string
  estimated_cost?: number
  actual_cost?: number
  requires_inspection?: boolean
  inspection_completed?: boolean
  inspector_notes?: string
  task_id?: string | null
}

// ============================================
// PUNCH LIST SERVICE
// ============================================

export const punchListService = {
  /**
   * Create a punch list item
   */
  async create(input: CreatePunchItemInput): Promise<PunchListItem | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Not authenticated')
    }

    const { data, error } = await supabase
      .from('punch_list_items')
      .insert({
        ...input,
        created_by: user.id,
        assigned_at: input.assigned_to ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating punch list item:', error)
      throw error
    }

    return data
  },

  /**
   * Create punch list item from AI finding
   */
  async createFromAIFinding(
    finding: {
      type: string
      description: string
      severity: string
      confidence: number
      location?: string
    },
    photo: { id: string; project_id: string },
    findingType: AIFindingType
  ): Promise<PunchListItem | null> {
    const severityMap: Record<string, PunchListSeverity> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low'
    }

    const categoryMap: Record<AIFindingType, PunchListCategory> = {
      safety_issue: 'safety',
      quality_defect: 'quality',
      compliance_violation: 'compliance',
      progress_tracking: 'functional'
    }

    const input: CreatePunchItemInput = {
      project_id: photo.project_id,
      photo_id: photo.id,
      title: `${findingType === 'safety_issue' ? '🚨 Safety Issue' : findingType === 'quality_defect' ? '⚠️ Quality Defect' : '📋 Compliance Issue'}: ${finding.type}`,
      description: finding.description,
      location_description: finding.location,
      severity: severityMap[finding.severity] || 'medium',
      category: categoryMap[findingType],
      ai_generated: true,
      ai_confidence: finding.confidence,
      ai_finding_type: findingType,
      ai_details: finding,
      impact_level: finding.severity === 'critical' ? 'blocking' : 'high',
      requires_inspection: findingType === 'safety_issue',
      due_date: findingType === 'safety_issue'
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours for safety
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days for others
    }

    return this.create(input)
  },

  /**
   * Get punch list items by project
   */
  async getByProject(
    projectId: string,
    filters?: {
      status?: PunchListStatus | PunchListStatus[]
      severity?: PunchListSeverity | PunchListSeverity[]
      assigned_to?: string
      ai_generated?: boolean
      overdue?: boolean
    }
  ): Promise<PunchListItem[]> {
    const supabase = createClient()

    let query = supabase
      .from('punch_list_items')
      .select(`
        *,
        photo:media_assets(id, url, thumbnail_url, filename),
        project:projects(id, name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters?.severity) {
      if (Array.isArray(filters.severity)) {
        query = query.in('severity', filters.severity)
      } else {
        query = query.eq('severity', filters.severity)
      }
    }

    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to)
    }

    if (filters?.ai_generated !== undefined) {
      query = query.eq('ai_generated', filters.ai_generated)
    }

    if (filters?.overdue) {
      query = query.lt('due_date', new Date().toISOString())
        .not('status', 'in', '(resolved,closed)')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching punch list items:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get punch list item by ID
   */
  async getById(id: string): Promise<PunchListItem | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('punch_list_items')
      .select(`
        *,
        photo:media_assets(id, url, thumbnail_url, filename, captured_at),
        project:projects(id, name, client_name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching punch list item:', error)
      return null
    }

    return data
  },

  /**
   * Get punch list items by photo
   */
  async getItemsByPhoto(photoId: string): Promise<PunchListItem[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('punch_list_items')
      .select(`
        *,
        photo:media_assets(id, url, thumbnail_url, filename),
        project:projects(id, name)
      `)
      .eq('photo_id', photoId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching punch list items by photo:', error)
      throw error
    }

    return data || []
  },

  /**
   * Update punch list item
   */
  async update(id: string, input: UpdatePunchItemInput): Promise<PunchListItem | null> {
    const supabase = createClient()

    const updateData: any = { ...input }

    // Set assigned_at if assigning
    if (input.assigned_to) {
      updateData.assigned_at = new Date().toISOString()
    }

    // Set resolved_at if resolving
    if (input.status === 'resolved' && !updateData.resolved_at) {
      updateData.resolved_at = new Date().toISOString()
    }

    // Set closed_at if closing
    if (input.status === 'closed' && !updateData.closed_at) {
      updateData.closed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('punch_list_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating punch list item:', error)
      throw error
    }

    return data
  },

  /**
   * Update status with comment
   */
  async updateStatus(
    id: string,
    status: PunchListStatus,
    comment?: string,
    photoProofId?: string
  ): Promise<PunchListItem | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Not authenticated')
    }

    // Update the item
    const item = await this.update(id, { status })

    // Add comment if provided
    if (comment) {
      await this.addComment(id, {
        comment,
        comment_type: 'status_change',
        resolved: status === 'resolved',
        photo_proof_id: photoProofId
      })
    }

    return item
  },

  /**
   * Assign punch item to user
   */
  async assign(id: string, userId: string, comment?: string): Promise<PunchListItem | null> {
    const supabase = createClient()

    const item = await this.update(id, {
      assigned_to: userId,
      status: 'in_progress'
    })

    if (comment) {
      await this.addComment(id, {
        comment,
        comment_type: 'assignment'
      })
    }

    return item
  },

  /**
   * Add comment to punch item
   */
  async addComment(
    punchItemId: string,
    input: {
      comment: string
      comment_type?: 'note' | 'status_change' | 'assignment' | 'resolution' | 'rejection'
      resolved?: boolean
      photo_proof_id?: string
    }
  ): Promise<PunchListComment | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Not authenticated')
    }

    const { data, error } = await supabase
      .from('punch_list_comments')
      .insert({
        punch_list_item_id: punchItemId,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email || 'User',
        comment: input.comment,
        comment_type: input.comment_type || 'note',
        resolved: input.resolved || false,
        photo_proof_id: input.photo_proof_id
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding comment:', error)
      throw error
    }

    return data
  },

  /**
   * Get comments for punch item
   */
  async getComments(punchItemId: string): Promise<PunchListComment[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('punch_list_comments')
      .select(`
        *,
        photo_proof:media_assets(id, url, thumbnail_url, filename)
      `)
      .eq('punch_list_item_id', punchItemId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get punch list statistics for project
   */
  async getStats(projectId: string): Promise<PunchListStats> {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('get_punch_list_stats', {
      project_uuid: projectId
    })

    if (error) {
      console.error('Error fetching punch list stats:', error)
      // Return default stats if function doesn't exist yet
      return {
        total: 0,
        open: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
        critical: 0,
        high: 0,
        overdue: 0,
        ai_generated: 0
      }
    }

    return data
  },

  /**
   * Get overdue punch items
   */
  async getOverdue(projectId: string): Promise<PunchListItem[]> {
    return this.getByProject(projectId, { overdue: true })
  },

  /**
   * Get critical punch items
   */
  async getCritical(projectId: string): Promise<PunchListItem[]> {
    return this.getByProject(projectId, {
      severity: 'critical',
      status: ['open', 'in_progress']
    })
  },

  /**
   * Delete punch list item
   */
  async delete(id: string): Promise<boolean> {
    const supabase = createClient()

    const { error } = await supabase
      .from('punch_list_items')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting punch list item:', error)
      throw error
    }

    return true
  },

  /**
   * Subscribe to punch list changes
   */
  subscribeToProject(
    projectId: string,
    callback: (payload: any) => void
  ): () => void {
    const supabase = createClient()

    const channel = supabase
      .channel(`punch_list:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'punch_list_items',
          filter: `project_id=eq.${projectId}`
        },
        callback
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get severity color
 */
export function getSeverityColor(severity: PunchListSeverity): string {
  switch (severity) {
    case 'critical':
      return '#DC2626' // Red
    case 'high':
      return '#F59E0B' // Orange
    case 'medium':
      return '#FBBF24' // Yellow
    case 'low':
      return '#6BCB77' // Green
    default:
      return '#6B7280' // Gray
  }
}

/**
 * Get status color
 */
export function getStatusColor(status: PunchListStatus): string {
  switch (status) {
    case 'open':
      return '#DC2626' // Red
    case 'in_progress':
      return '#F59E0B' // Orange
    case 'pending_review':
      return '#FBBF24' // Yellow
    case 'resolved':
      return '#6BCB77' // Green
    case 'closed':
      return '#6B7280' // Gray
    case 'rejected':
      return '#9CA3AF' // Light gray
    default:
      return '#6B7280'
  }
}

/**
 * Get severity icon
 */
export function getSeverityIcon(severity: PunchListSeverity): string {
  switch (severity) {
    case 'critical':
      return '🚨'
    case 'high':
      return '⚠️'
    case 'medium':
      return '⚡'
    case 'low':
      return '💡'
    default:
      return '📋'
  }
}

/**
 * Get status display name
 */
export function getStatusDisplayName(status: PunchListStatus): string {
  switch (status) {
    case 'open':
      return 'Open'
    case 'in_progress':
      return 'In Progress'
    case 'pending_review':
      return 'Pending Review'
    case 'resolved':
      return 'Resolved'
    case 'closed':
      return 'Closed'
    case 'rejected':
      return 'Rejected'
    default:
      return status
  }
}

/**
 * Check if punch item is overdue
 */
export function isOverdue(item: PunchListItem): boolean {
  if (!item.due_date) return false
  if (item.status === 'resolved' || item.status === 'closed') return false
  return new Date(item.due_date) < new Date()
}

/**
 * Get days until due
 */
export function getDaysUntilDue(item: PunchListItem): number | null {
  if (!item.due_date) return null
  const dueDate = new Date(item.due_date)
  const now = new Date()
  const diffTime = dueDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
