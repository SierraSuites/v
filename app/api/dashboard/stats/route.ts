export const dynamic = 'force-dynamic'

// ============================================================================
// DASHBOARD STATS API
// Returns cached dashboard statistics for better performance
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Cache for 30 seconds
export const revalidate = 30

/**
 * GET /api/dashboard/stats
 * Returns dashboard statistics for the authenticated user's company
 *
 * @security Requires authentication
 * @cache 30 seconds
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. AUTHENTICATION
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. GET USER'S COMPANY
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id, subscription_tier')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User profile not found' },
        { status: 404 }
      )
    }

    const companyId = profile.company_id

    // 3. FETCH ALL STATS IN PARALLEL
    const [
      projectsData,
      tasksData,
      quotesData,
      punchItemsData,
      storageData,
      teamData
    ] = await Promise.all([
      // Projects stats
      supabase
        .from('projects')
        .select('status', { count: 'exact' })
        .eq('company_id', companyId),

      // Tasks stats
      supabase
        .from('tasks')
        .select('status, due_date', { count: 'exact' })
        .eq('company_id', companyId),

      // Quotes stats
      supabase
        .from('quotes')
        .select('status, total_price', { count: 'exact' })
        .eq('company_id', companyId),

      // Punch items stats
      supabase
        .from('punch_list_items')
        .select('priority, status', { count: 'exact' })
        .eq('company_id', companyId),

      // Storage stats
      supabase
        .from('media_assets')
        .select('file_size', { count: 'exact' })
        .eq('company_id', companyId),

      // Team members count
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId)
    ])

    // 4. CALCULATE PROJECT STATS
    const projects = projectsData.data || []
    const totalProjects = projects.length
    const activeProjects = projects.filter(p => p.status === 'active').length
    const onHoldProjects = projects.filter(p => p.status === 'on_hold').length
    const completedProjects = projects.filter(p => p.status === 'completed').length

    // 5. CALCULATE TASK STATS
    const tasks = tasksData.data || []
    const totalTasks = tasks.length
    const tasksCompleted = tasks.filter(t => t.status === 'completed').length
    const tasksInProgress = tasks.filter(t => t.status === 'in_progress').length

    // Calculate overdue tasks
    const today = new Date()
    const tasksOverdue = tasks.filter(t => {
      if (t.status === 'completed' || !t.due_date) return false
      return new Date(t.due_date) < today
    }).length

    const completionRate = totalTasks > 0
      ? Math.round((tasksCompleted / totalTasks) * 100)
      : 0

    // 6. CALCULATE QUOTE STATS
    const quotes = quotesData.data || []
    const totalQuoteValue = quotes
      .filter(q => q.status === 'accepted')
      .reduce((sum, q) => sum + (q.total_price || 0), 0)
    const pendingQuotes = quotes.filter(q => q.status === 'pending').length
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length

    // 7. CALCULATE PUNCH ITEM STATS
    const punchItems = punchItemsData.data || []
    const criticalItems = punchItems.filter(
      p => p.priority === 'critical' && p.status !== 'resolved'
    ).length
    const openItems = punchItems.filter(p => p.status === 'open').length
    const resolvedItems = punchItems.filter(p => p.status === 'resolved').length

    // 8. CALCULATE STORAGE STATS
    const mediaAssets = storageData.data || []
    const photoCount = mediaAssets.length
    const storageUsed = mediaAssets.reduce((sum, p) => sum + (p.file_size || 0), 0) / (1024 * 1024 * 1024) // Convert to GB

    // Storage limits based on tier
    const storageLimits = {
      starter: 5,
      professional: 50,
      enterprise: 500
    }
    const storageLimit = storageLimits[profile.subscription_tier as keyof typeof storageLimits] || 5

    // 9. TEAM COUNT
    const teamMembers = teamData.count || 0

    // 10. BUILD RESPONSE
    const stats = {
      projects: {
        total: totalProjects,
        active: activeProjects,
        onHold: onHoldProjects,
        completed: completedProjects
      },
      tasks: {
        total: totalTasks,
        completed: tasksCompleted,
        inProgress: tasksInProgress,
        overdue: tasksOverdue,
        completionRate
      },
      quotes: {
        total: quotes.length,
        totalValue: totalQuoteValue,
        pending: pendingQuotes,
        accepted: acceptedQuotes
      },
      punchItems: {
        critical: criticalItems,
        open: openItems,
        resolved: resolvedItems,
        total: punchItems.length
      },
      storage: {
        used: storageUsed,
        limit: storageLimit,
        photoCount,
        percentageUsed: (storageUsed / storageLimit) * 100
      },
      team: {
        members: teamMembers
      }
    }

    // 11. RETURN WITH CACHE HEADERS
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'CDN-Cache-Control': 'public, s-maxage=30',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=30'
      }
    })

  } catch (error) {
    console.error('[GET /api/dashboard/stats] Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
