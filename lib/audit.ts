import { createClient } from '@/lib/supabase/client'

// ============================================
// TYPES
// ============================================

export interface AuditLogEntry {
  id: string
  company_id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  metadata: Record<string, any> | null
  ip_address: string
  user_agent: string
  is_critical: boolean
  created_at: string
}

export type AuditAction =
  // Authentication
  | 'login'
  | 'logout'
  | 'password_changed'
  | 'password_reset_requested'
  | 'mfa_enabled'
  | 'mfa_disabled'
  // Team Management
  | 'team_member_invited'
  | 'invitation_accepted'
  | 'invitation_revoked'
  | 'user_activated'
  | 'user_deactivated'
  | 'user_deleted'
  // Role Management
  | 'role_created'
  | 'role_updated'
  | 'role_deleted'
  | 'role_assigned'
  | 'role_removed'
  // Project Operations
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'project_archived'
  | 'project_restored'
  // Task Operations
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_assigned'
  | 'task_completed'
  // Financial Operations
  | 'invoice_created'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'invoice_voided'
  | 'expense_created'
  | 'expense_approved'
  | 'expense_rejected'
  | 'payment_received'
  // Document Operations
  | 'document_uploaded'
  | 'document_deleted'
  | 'document_shared'
  | 'document_downloaded'
  // Photo Operations
  | 'photo_uploaded'
  | 'photo_deleted'
  | 'photo_shared'
  | 'photo_metadata_updated'
  // Settings
  | 'settings_updated'
  | 'integration_enabled'
  | 'integration_disabled'
  | 'api_key_created'
  | 'api_key_revoked'
  // Permissions
  | 'permission_granted'
  | 'permission_revoked'
  | 'permission_denied'
  // Data Operations
  | 'export_generated'
  | 'import_completed'
  | 'bulk_delete'
  | 'data_restored'

export type EntityType =
  | 'profile'
  | 'user_role_assignment'
  | 'custom_roles'
  | 'team_invitation'
  | 'project'
  | 'task'
  | 'milestone'
  | 'photo'
  | 'document'
  | 'invoice'
  | 'expense'
  | 'payment'
  | 'company'
  | 'settings'
  | 'integration'
  | 'api_key'

// Actions that are always considered critical
const CRITICAL_ACTIONS: AuditAction[] = [
  'user_deleted',
  'role_deleted',
  'project_deleted',
  'bulk_delete',
  'settings_updated',
  'integration_enabled',
  'integration_disabled',
  'api_key_created',
  'api_key_revoked',
  'permission_granted',
  'permission_revoked',
  'invoice_voided',
  'mfa_disabled'
]

// ============================================
// AUDIT SERVICE
// ============================================

export const auditService = {
  /**
   * Create an audit log entry using the database function
   * This automatically handles criticality detection and proper formatting
   */
  async log(params: {
    action: AuditAction
    entityType: EntityType
    entityId?: string
    oldValues?: Record<string, any>
    newValues?: Record<string, any>
    metadata?: Record<string, any>
    companyId?: string
    userId?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<string | null> {
    const supabase = createClient()

    try {
      // Get current user if not provided
      let targetUserId = params.userId
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.error('Cannot create audit log: No user authenticated')
          return null
        }
        targetUserId = user.id
      }

      // Get company ID if not provided
      let companyId = params.companyId
      if (!companyId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', targetUserId)
          .single()

        if (!profile?.company_id) {
          console.error('Cannot create audit log: User has no company')
          return null
        }
        companyId = profile.company_id
      }

      // Call database function to create audit log
      const { data: logId, error } = await supabase.rpc('create_audit_log', {
        p_user_id: targetUserId,
        p_company_id: companyId,
        p_action: params.action,
        p_entity_type: params.entityType,
        p_entity_id: params.entityId || null,
        p_old_values: params.oldValues || null,
        p_new_values: params.newValues || null,
        p_metadata: params.metadata || null,
        p_ip_address: params.ipAddress || 'unknown',
        p_user_agent: params.userAgent || 'unknown'
      })

      if (error) {
        console.error('Error creating audit log:', error)
        return null
      }

      return logId
    } catch (error) {
      console.error('Error in audit service:', error)
      return null
    }
  },

  /**
   * Get audit logs with filtering
   */
  async getLogs(filters: {
    companyId: string
    userId?: string
    action?: AuditAction
    entityType?: EntityType
    entityId?: string
    startDate?: Date
    endDate?: Date
    criticalOnly?: boolean
    page?: number
    limit?: number
  }): Promise<{
    logs: AuditLogEntry[]
    total: number
    page: number
    totalPages: number
  }> {
    const supabase = createClient()
    const page = filters.page || 1
    const limit = Math.min(filters.limit || 50, 100)
    const offset = (page - 1) * limit

    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('company_id', filters.companyId)
        .order('created_at', { ascending: false })

      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.action) {
        query = query.eq('action', filters.action)
      }

      if (filters.entityType) {
        query = query.eq('entity_type', filters.entityType)
      }

      if (filters.entityId) {
        query = query.eq('entity_id', filters.entityId)
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString())
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString())
      }

      if (filters.criticalOnly) {
        query = query.eq('is_critical', true)
      }

      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching audit logs:', error)
        return { logs: [], total: 0, page, totalPages: 0 }
      }

      return {
        logs: data || [],
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      }
    } catch (error) {
      console.error('Error in audit service getLogs:', error)
      return { logs: [], total: 0, page, totalPages: 0 }
    }
  },

  /**
   * Get audit log statistics
   */
  async getStats(companyId: string, days: number = 30): Promise<{
    totalEvents: number
    criticalEvents: number
    topActions: Array<{ action: string; count: number }>
    topUsers: Array<{ userId: string; count: number }>
    eventsByDay: Array<{ date: string; count: number }>
  }> {
    const supabase = createClient()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    try {
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('action, user_id, is_critical, created_at')
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())

      if (error || !logs) {
        console.error('Error fetching audit stats:', error)
        return {
          totalEvents: 0,
          criticalEvents: 0,
          topActions: [],
          topUsers: [],
          eventsByDay: []
        }
      }

      // Calculate statistics
      const totalEvents = logs.length
      const criticalEvents = logs.filter(log => log.is_critical).length

      // Top actions
      const actionCounts = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topActions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Top users
      const userCounts = logs.reduce((acc, log) => {
        acc[log.user_id] = (acc[log.user_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topUsers = Object.entries(userCounts)
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Events by day
      const eventsByDayMap = logs.reduce((acc, log) => {
        const date = log.created_at.split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const eventsByDay = Object.entries(eventsByDayMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return {
        totalEvents,
        criticalEvents,
        topActions,
        topUsers,
        eventsByDay
      }
    } catch (error) {
      console.error('Error calculating audit stats:', error)
      return {
        totalEvents: 0,
        criticalEvents: 0,
        topActions: [],
        topUsers: [],
        eventsByDay: []
      }
    }
  },

  /**
   * Get audit trail for a specific entity
   */
  async getEntityHistory(
    companyId: string,
    entityType: EntityType,
    entityId: string
  ): Promise<AuditLogEntry[]> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', companyId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching entity history:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getEntityHistory:', error)
      return []
    }
  },

  /**
   * Check if action is critical
   */
  isCriticalAction(action: AuditAction): boolean {
    return CRITICAL_ACTIONS.includes(action)
  },

  /**
   * Format audit log entry for display
   */
  formatLogEntry(log: AuditLogEntry): string {
    const actionDescriptions: Partial<Record<AuditAction, string>> = {
      login: 'signed in',
      logout: 'signed out',
      password_changed: 'changed their password',
      role_assigned: 'was assigned a role',
      role_removed: 'had a role removed',
      user_activated: 'was activated',
      user_deactivated: 'was deactivated',
      project_created: 'created a project',
      project_updated: 'updated a project',
      project_deleted: 'deleted a project',
      invoice_created: 'created an invoice',
      invoice_paid: 'marked an invoice as paid',
      settings_updated: 'updated company settings',
      permission_granted: 'was granted permissions',
      permission_revoked: 'had permissions revoked'
    }

    const actionDesc = actionDescriptions[log.action as AuditAction] || log.action

    return `${actionDesc} ${log.entity_type ? `on ${log.entity_type}` : ''}`
  },

  /**
   * Export audit logs to CSV
   */
  async exportToCsv(filters: {
    companyId: string
    startDate?: Date
    endDate?: Date
    criticalOnly?: boolean
  }): Promise<string> {
    const logs = await this.getLogs({
      ...filters,
      limit: 10000 // Max export limit
    })

    const headers = [
      'Date',
      'User ID',
      'Action',
      'Entity Type',
      'Entity ID',
      'Critical',
      'IP Address'
    ]

    const rows = logs.logs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.user_id,
      log.action,
      log.entity_type,
      log.entity_id || '',
      log.is_critical ? 'Yes' : 'No',
      log.ip_address
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return csvContent
  },

  /**
   * Get recent critical events
   */
  async getCriticalEvents(companyId: string, limit: number = 10): Promise<AuditLogEntry[]> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_critical', true)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching critical events:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getCriticalEvents:', error)
      return []
    }
  },

  /**
   * Get user activity summary
   */
  async getUserActivity(
    companyId: string,
    userId: string,
    days: number = 30
  ): Promise<{
    totalActions: number
    criticalActions: number
    topActions: Array<{ action: string; count: number }>
    recentLogs: AuditLogEntry[]
  }> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const logs = await this.getLogs({
      companyId,
      userId,
      startDate,
      limit: 1000
    })

    const criticalActions = logs.logs.filter(log => log.is_critical).length

    const actionCounts = logs.logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalActions: logs.total,
      criticalActions,
      topActions,
      recentLogs: logs.logs.slice(0, 10)
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create audit log from HTTP request
 * Extracts IP and user agent automatically
 */
export async function auditFromRequest(
  request: Request,
  action: AuditAction,
  entityType: EntityType,
  options?: {
    entityId?: string
    oldValues?: Record<string, any>
    newValues?: Record<string, any>
    metadata?: Record<string, any>
  }
): Promise<string | null> {
  const ipAddress = request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const userAgent = request.headers.get('user-agent') || 'unknown'

  return auditService.log({
    action,
    entityType,
    entityId: options?.entityId,
    oldValues: options?.oldValues,
    newValues: options?.newValues,
    metadata: options?.metadata,
    ipAddress,
    userAgent
  })
}

/**
 * Get action icon for UI display
 */
export function getActionIcon(action: AuditAction): string {
  const icons: Partial<Record<AuditAction, string>> = {
    login: '🔐',
    logout: '🚪',
    password_changed: '🔑',
    role_assigned: '👤',
    role_removed: '❌',
    user_activated: '✅',
    user_deactivated: '🚫',
    project_created: '📁',
    project_updated: '✏️',
    project_deleted: '🗑️',
    invoice_created: '💰',
    invoice_paid: '💵',
    settings_updated: '⚙️',
    permission_granted: '🔓',
    permission_revoked: '🔒',
    document_uploaded: '📄',
    photo_uploaded: '📷',
    export_generated: '📊'
  }

  return icons[action] || '📝'
}

/**
 * Get action color for UI display
 */
export function getActionColor(action: AuditAction, isCritical: boolean): string {
  if (isCritical) return '#DC2626' // Red for critical

  const colors: Partial<Record<AuditAction, string>> = {
    login: '#10B981', // Green
    logout: '#6B7280', // Gray
    password_changed: '#F59E0B', // Orange
    role_assigned: '#6366F1', // Indigo
    role_removed: '#EF4444', // Red
    user_activated: '#10B981', // Green
    user_deactivated: '#EF4444', // Red
    project_created: '#10B981', // Green
    project_updated: '#6366F1', // Indigo
    project_deleted: '#EF4444', // Red
    invoice_paid: '#10B981', // Green
    settings_updated: '#F59E0B', // Orange
    permission_granted: '#10B981', // Green
    permission_revoked: '#EF4444' // Red
  }

  return colors[action] || '#6B7280'
}
