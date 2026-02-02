import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ROLE_PERMISSIONS, UserRole } from '@/lib/permissions'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const queryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  resourceType: z.enum(['team_member', 'custom_role', 'project_team', 'all']).optional(),
  userId: z.string().uuid().optional(),
  actionType: z.enum(['role_assigned', 'role_changed', 'role_removed', 'custom_role_created', 'custom_role_updated', 'custom_role_deleted', 'all']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

// ============================================
// GET /api/audit/permissions
// Get paginated audit log with filters
// Admin-only endpoint
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

    // Check if user has admin permissions
    const { data: highestRole } = await supabase.rpc('get_user_highest_role', {
      user_uuid: user.id
    })

    const userPermissions = ROLE_PERMISSIONS[highestRole as UserRole] || ROLE_PERMISSIONS.viewer

    // Only admins and superintendents can view audit logs
    if (!userPermissions.canManageTeam) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can view audit logs' },
        { status: 403 }
      )
    }

    // Get user's company ID
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

    // Parse and validate query parameters
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries())
    const validationResult = queryParamsSchema.safeParse(searchParams)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    const { page, limit, resourceType, userId, actionType, startDate, endDate } = validationResult.data

    // Build the query
    let query = supabase
      .from('permission_audit_log')
      .select(`
        id,
        user_id,
        action,
        resource_type,
        resource_id,
        permission_granted,
        permission_denied,
        reason,
        ip_address,
        user_agent,
        created_at,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters - only show logs from user's company
    // We'll join through team_members to verify company ownership
    const { data: companyUserIds } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', profile.company_id)
      .is('removed_at', null)

    const allowedUserIds = companyUserIds?.map(tm => tm.user_id) || []

    if (allowedUserIds.length > 0) {
      query = query.in('user_id', allowedUserIds)
    } else {
      // No team members found, return empty results
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      })
    }

    // Apply resource type filter
    if (resourceType && resourceType !== 'all') {
      query = query.eq('resource_type', resourceType)
    }

    // Apply user ID filter
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Apply action type filter
    if (actionType && actionType !== 'all') {
      query = query.eq('action', actionType)
    }

    // Apply date range filters
    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to)

    // Execute query
    const { data: logs, error: logsError, count } = await query

    if (logsError) {
      console.error('Error fetching audit logs:', logsError)
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      )
    }

    // Calculate pagination metadata
    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: logs || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      filters: {
        resourceType: resourceType || 'all',
        userId,
        actionType: actionType || 'all',
        startDate,
        endDate
      }
    })
  } catch (error) {
    console.error('Error in audit permissions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// GET /api/audit/permissions/summary
// Get audit log summary statistics
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

    // Check if user has admin permissions
    const { data: highestRole } = await supabase.rpc('get_user_highest_role', {
      user_uuid: user.id
    })

    const userPermissions = ROLE_PERMISSIONS[highestRole as UserRole] || ROLE_PERMISSIONS.viewer

    if (!userPermissions.canManageTeam) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can view audit statistics' },
        { status: 403 }
      )
    }

    // Get user's company ID
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

    // Get company user IDs
    const { data: companyUserIds } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', profile.company_id)
      .is('removed_at', null)

    const allowedUserIds = companyUserIds?.map(tm => tm.user_id) || []

    if (allowedUserIds.length === 0) {
      return NextResponse.json({
        totalLogs: 0,
        last24Hours: 0,
        last7Days: 0,
        last30Days: 0,
        byAction: {},
        byResourceType: {}
      })
    }

    // Get total count
    const { count: totalLogs } = await supabase
      .from('permission_audit_log')
      .select('*', { count: 'exact', head: true })
      .in('user_id', allowedUserIds)

    // Get counts for different time periods
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const { count: count24h } = await supabase
      .from('permission_audit_log')
      .select('*', { count: 'exact', head: true })
      .in('user_id', allowedUserIds)
      .gte('created_at', last24h.toISOString())

    const { count: count7d } = await supabase
      .from('permission_audit_log')
      .select('*', { count: 'exact', head: true })
      .in('user_id', allowedUserIds)
      .gte('created_at', last7d.toISOString())

    const { count: count30d } = await supabase
      .from('permission_audit_log')
      .select('*', { count: 'exact', head: true })
      .in('user_id', allowedUserIds)
      .gte('created_at', last30d.toISOString())

    // Get breakdown by action type
    const { data: byAction } = await supabase
      .from('permission_audit_log')
      .select('action')
      .in('user_id', allowedUserIds)

    const actionCounts: Record<string, number> = {}
    byAction?.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
    })

    // Get breakdown by resource type
    const { data: byResource } = await supabase
      .from('permission_audit_log')
      .select('resource_type')
      .in('user_id', allowedUserIds)

    const resourceCounts: Record<string, number> = {}
    byResource?.forEach(log => {
      resourceCounts[log.resource_type] = (resourceCounts[log.resource_type] || 0) + 1
    })

    return NextResponse.json({
      totalLogs: totalLogs || 0,
      last24Hours: count24h || 0,
      last7Days: count7d || 0,
      last30Days: count30d || 0,
      byAction: actionCounts,
      byResourceType: resourceCounts
    })
  } catch (error) {
    console.error('Error fetching audit statistics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
