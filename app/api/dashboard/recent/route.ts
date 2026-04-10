export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/api-permissions'

export async function GET(_request: NextRequest) {
  try {
    // 1. AUTHENTICATION CHECK — all authenticated users can view their own dashboard
    const authResult = await getAuthenticatedUser()
    if (!authResult.user) return authResult.error

    const supabase = await createClient()

    // Get user's company_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, full_name')
      .eq('id', authResult.user.id)
      .single()

    const companyId = profile?.company_id
    const userId = authResult.user.id

    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Scope queries by company_id when available, fall back to user_id
    const scopeFilter = (query: any) =>
      companyId ? query.eq('company_id', companyId) : query.eq('user_id', userId)

    // Fetch all data in parallel
    const [projectsResult, activitiesResult, tasksResult, allProjectsResult] = await Promise.all([
      scopeFilter(
        supabase
          .from('projects')
          .select('id, name, status, progress, end_date, client, updated_at')
      )
        .order('updated_at', { ascending: false })
        .limit(5),

      companyId
        ? supabase
            .from('activities')
            .select(`id, action, entity_type, entity_id, metadata, created_at, user_id, user_profiles (full_name)`)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(10)
        : supabase
            .from('activities')
            .select(`id, action, entity_type, entity_id, metadata, created_at, user_id, user_profiles (full_name)`)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10),

      scopeFilter(
        supabase
          .from('tasks')
          .select(`id, title, due_date, priority, status, project_id, projects (name)`)
          .neq('status', 'completed')
          .gte('due_date', today)
          .lte('due_date', nextWeek)
      )
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true })
        .limit(6),

      scopeFilter(
        supabase
          .from('projects')
          .select('id, name, status, type, estimated_budget, spent')
      ),
    ])

    // Transform activities (user_profiles may be array)
    const activities = (activitiesResult.data || []).map((item: any) => ({
      ...item,
      user_profiles: Array.isArray(item.user_profiles) ? item.user_profiles[0] : item.user_profiles,
    }))

    // Transform tasks (projects may be array)
    const tasks = (tasksResult.data || []).map((item: any) => ({
      ...item,
      projects: Array.isArray(item.projects) ? item.projects[0] : item.projects,
    }))

    // Map estimated_budget -> budget for BudgetTrackingWidget
    const allProjects = (allProjectsResult.data || []).map((p: any) => ({
      ...p,
      budget: p.estimated_budget ?? 0,
    }))

    return NextResponse.json({
      user: { id: authResult.user.id },
      companyId,
      projects: projectsResult.data || [],
      activities,
      tasks,
      allProjects,
    })
  } catch (error) {
    console.error('[GET /api/dashboard/recent] Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
