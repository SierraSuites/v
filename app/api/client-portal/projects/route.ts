/**
 * Client Portal Projects API
 * GET /api/client-portal/projects - Get projects accessible to client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth - for now, use regular auth (client portal auth would be separate)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // For demo purposes, return all company projects
    // In production, this would filter by client_user accessible_project_ids
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        status,
        project_type,
        start_date,
        end_date,
        budget,
        spent,
        address,
        city,
        state,
        zip,
        completion_percentage,
        client_name,
        client_email,
        client_phone
      `)
      .eq('company_id', profile.company_id)
      .in('status', ['active', 'planning', 'completed'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Client Portal Projects API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add progress summary for each project
    const projectsWithProgress = await Promise.all(
      (projects || []).map(async (project) => {
        // Get task completion stats
        const { data: taskStats } = await supabase
          .from('tasks')
          .select('status')
          .eq('project_id', project.id)

        const totalTasks = taskStats?.length || 0
        const completedTasks = taskStats?.filter(t => t.status === 'completed').length || 0
        const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

        return {
          ...project,
          task_stats: {
            total: totalTasks,
            completed: completedTasks,
            completion_rate: Math.round(taskCompletionRate),
          },
        }
      })
    )

    return NextResponse.json({ projects: projectsWithProgress })
  } catch (error: any) {
    console.error('[Client Portal Projects API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
