import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ROLE_PERMISSIONS, UserRole } from '@/lib/permissions'

// ============================================
// GET /api/audit-logs
// Get audit trail for company (with filtering)
// ============================================

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions - only admins and certain roles can view audit logs
    const { data: highestRole } = await supabase.rpc('get_user_highest_role', {
      user_uuid: user.id
    })

    const userPermissions = ROLE_PERMISSIONS[highestRole as UserRole] || ROLE_PERMISSIONS.viewer

    // Audit logs are sensitive - require both analytics and team management permissions
    if (!userPermissions.canViewAnalytics && !userPermissions.canManageTeam) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view audit logs' },
        { status: 403 }
      )
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get query parameters for filtering
    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100 per page
    const action = searchParams.get('action') // Filter by action type
    const entityType = searchParams.get('entityType') // Filter by entity type
    const entityId = searchParams.get('entityId') // Filter by specific entity
    const userId = searchParams.get('userId') // Filter by user who performed action
    const startDate = searchParams.get('startDate') // ISO date string
    const endDate = searchParams.get('endDate') // ISO date string
    const criticalOnly = searchParams.get('criticalOnly') === 'true'
    const search = searchParams.get('search') || '' // Search in action or metadata

    // Build query
    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        is_critical,
        created_at,
        actor:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (action) {
      query = query.eq('action', action)
    }

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (entityId) {
      query = query.eq('entity_id', entityId)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    if (criticalOnly) {
      query = query.eq('is_critical', true)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: logs, error: logsError, count } = await query

    if (logsError) {
      console.error('Error fetching audit logs:', logsError)
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      )
    }

    // Apply client-side search if needed (for metadata searching)
    let filteredLogs = logs || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredLogs = filteredLogs.filter(log =>
        log.action.toLowerCase().includes(searchLower) ||
        log.entity_type.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.new_values).toLowerCase().includes(searchLower) ||
        JSON.stringify(log.old_values).toLowerCase().includes(searchLower)
      )
    }

    // Get summary statistics
    const { data: stats } = await supabase
      .from('audit_logs')
      .select('action, is_critical', { count: 'exact' })
      .eq('company_id', profile.company_id)

    const criticalCount = stats?.filter(s => s.is_critical).length || 0
    const actionCounts = stats?.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      logs: filteredLogs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats: {
        totalEvents: count || 0,
        criticalEvents: criticalCount,
        actionDistribution: actionCounts
      }
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/audit-logs
// Create a custom audit log entry (for manual logging)
// ============================================

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { action, entityType, entityId, oldValues, newValues, metadata } = body

    if (!action || !entityType) {
      return NextResponse.json(
        { error: 'Missing required fields: action and entityType' },
        { status: 400 }
      )
    }

    // Create audit log using database function
    const { data: logId, error: logError } = await supabase.rpc('create_audit_log', {
      p_user_id: user.id,
      p_company_id: profile.company_id,
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId || null,
      p_old_values: oldValues || null,
      p_new_values: newValues || null,
      p_metadata: metadata || null,
      p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      p_user_agent: req.headers.get('user-agent') || 'unknown'
    })

    if (logError) {
      console.error('Error creating audit log:', logError)
      return NextResponse.json(
        { error: 'Failed to create audit log' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Audit log created successfully',
        logId
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating audit log:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// GET /api/audit-logs/actions
// Get list of available action types
// ============================================

export async function OPTIONS(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get distinct action types and entity types from company's audit logs
    const { data: actions } = await supabase
      .from('audit_logs')
      .select('action')
      .eq('company_id', profile.company_id)
      .order('action')

    const { data: entityTypes } = await supabase
      .from('audit_logs')
      .select('entity_type')
      .eq('company_id', profile.company_id)
      .order('entity_type')

    const uniqueActions = [...new Set(actions?.map(a => a.action) || [])]
    const uniqueEntityTypes = [...new Set(entityTypes?.map(e => e.entity_type) || [])]

    // Predefined action categories for better UX
    const actionCategories = {
      authentication: ['login', 'logout', 'password_changed', 'mfa_enabled', 'mfa_disabled'],
      team: ['team_member_invited', 'invitation_accepted', 'invitation_revoked', 'user_activated', 'user_deactivated'],
      roles: ['role_created', 'role_updated', 'role_deleted', 'role_assigned', 'role_removed'],
      projects: ['project_created', 'project_updated', 'project_deleted', 'project_archived'],
      permissions: ['permission_granted', 'permission_revoked'],
      settings: ['settings_updated', 'integration_enabled', 'integration_disabled'],
      data: ['export_generated', 'import_completed', 'bulk_delete']
    }

    const entityTypeCategories = {
      users: ['profile', 'user_role_assignment'],
      team: ['team_invitation', 'custom_roles'],
      projects: ['project', 'task', 'milestone'],
      financial: ['invoice', 'expense', 'payment'],
      content: ['photo', 'document', 'comment']
    }

    return NextResponse.json({
      actions: uniqueActions,
      entityTypes: uniqueEntityTypes,
      actionCategories,
      entityTypeCategories
    })
  } catch (error) {
    console.error('Error fetching action types:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
