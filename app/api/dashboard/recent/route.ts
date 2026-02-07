export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's company_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, full_name')
      .eq('id', user.id)
      .single()

    const companyId = profile?.company_id
    if (!companyId) {
      return NextResponse.json({
        user: { id: user.id, user_metadata: user.user_metadata },
        companyId: null,
        projects: [],
        activities: [],
        tasks: [],
      })
    }

    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Fetch all data in parallel
    const [projectsResult, activitiesResult, tasksResult] = await Promise.all([
      supabase
        .from('projects')
        .select('id, name, status, progress, estimated_end_date, client_name, updated_at')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(5),

      supabase
        .from('activities')
        .select(`
          id, action, entity_type, entity_id, metadata, created_at, user_id,
          user_profiles (full_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10),

      supabase
        .from('tasks')
        .select(`
          id, title, due_date, priority, status, project_id,
          projects (name)
        `)
        .eq('company_id', companyId)
        .neq('status', 'completed')
        .gte('due_date', today)
        .lte('due_date', nextWeek)
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true })
        .limit(6),
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

    return NextResponse.json({
      user: { id: user.id, user_metadata: user.user_metadata },
      companyId,
      projects: projectsResult.data || [],
      activities,
      tasks,
    })
  } catch (error) {
    console.error('[GET /api/dashboard/recent] Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
