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

    const twoWeeksOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Scope queries by company_id when available, fall back to user_id
    const scopeFilter = (query: any) =>
      companyId ? query.eq('company_id', companyId) : query.eq('user_id', userId)

    // Fetch all data in parallel
    const [projectsResult, recentTasksActivityResult, tasksResult, allProjectsResult] = await Promise.all([
      scopeFilter(
        supabase
          .from('projects')
          .select('id, name, status, progress, end_date, client, updated_at, created_at')
      )
        .order('updated_at', { ascending: false })
        .limit(5),

      // Recently updated tasks for activity feed (separate from upcoming tasks)
      scopeFilter(
        supabase
          .from('tasks')
          .select('id, title, status, updated_at, created_at')
      )
        .order('updated_at', { ascending: false })
        .limit(5),

      // tasks has no registered PostgREST FK to projects — fetch without join
      scopeFilter(
        supabase
          .from('tasks')
          .select(`id, title, due_date, priority, status, progress, trade, project_id`)
          .neq('status', 'completed')
          .gte('due_date', thirtyDaysAgo)
          .lte('due_date', twoWeeksOut)
      )
        .order('due_date', { ascending: true })
        .limit(8),

      scopeFilter(
        supabase
          .from('projects')
          .select('id, name, status, type, estimated_budget, spent')
      ),
    ])

    // Build synthetic activity feed from recent project + task changes
    // (The activities table schema doesn't match what the API queries; nothing writes to it)
    const activityItems = [
      ...(projectsResult.data || []).map((p: any) => ({
        id: `project-${p.id}`,
        action: p.created_at && p.updated_at && p.created_at === p.updated_at ? 'created' : 'updated',
        entity_type: 'project' as const,
        entity_id: p.id,
        entity_name: p.name,
        metadata: { status: p.status },
        created_at: p.updated_at,
        user_id: null,
        user_profiles: null,
      })),
      ...(recentTasksActivityResult.data || []).map((t: any) => ({
        id: `task-${t.id}`,
        action: t.status === 'completed' ? 'completed' : (t.created_at && t.updated_at && t.created_at === t.updated_at ? 'created' : 'updated'),
        entity_type: 'task' as const,
        entity_id: t.id,
        entity_name: t.title,
        metadata: { status: t.status },
        created_at: t.updated_at,
        user_id: null,
        user_profiles: null,
      })),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)

    const activities = activityItems

    // Map estimated_budget -> budget for BudgetTrackingWidget
    const allProjects = (allProjectsResult.data || []).map((p: any) => ({
      ...p,
      budget: p.estimated_budget ?? 0,
    }))

    // Enrich tasks with project name from allProjects (tasks has no PostgREST FK join)
    const projectMap = new Map<string, string>(
      (allProjectsResult.data || []).map((p: any) => [p.id, p.name])
    )
    const tasks = (tasksResult.data || []).map((item: any) => ({
      ...item,
      projects: item.project_id ? { name: projectMap.get(item.project_id) || null } : null,
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
