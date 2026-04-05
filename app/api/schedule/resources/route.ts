import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Get resource allocation data for team members
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 })
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Get all team members in the company
    const { data: teamMembers, error: teamError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role')
      .eq('company_id', profile.company_id)
      .order('full_name')

    if (teamError) {
      console.error('Error fetching team members:', teamError)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    // For each team member, get their tasks in the date range
    const teamMembersWithTasks = await Promise.all(
      (teamMembers || []).map(async (member) => {
        let tasksQuery = supabase
          .from('tasks')
          .select(
            `
            id,
            title,
            start_date,
            due_date,
            estimated_hours,
            status,
            project:projects(name)
          `
          )
          .eq('assigned_to', member.id)
          .in('status', ['not_started', 'in_progress', 'on_hold'])

        // Filter by date range if provided
        if (startDate && endDate) {
          tasksQuery = tasksQuery
            .gte('start_date', startDate)
            .lte('due_date', endDate)
        }

        const { data: tasks } = await tasksQuery

        // Calculate workload (sum of estimated hours)
        const workloadHours = (tasks || []).reduce(
          (sum, task) => sum + (task.estimated_hours || 0),
          0
        )

        // Standard capacity: 40 hours per week (8 hours/day * 5 days)
        const capacityHours = 40

        return {
          ...member,
          tasks: (tasks || []).map((task: any) => ({
            ...task,
            project_name: task.project?.name,
          })),
          workload_hours: workloadHours,
          capacity_hours: capacityHours,
        }
      })
    )

    return NextResponse.json({
      team_members: teamMembersWithTasks,
      summary: {
        total_members: teamMembersWithTasks.length,
        overallocated: teamMembersWithTasks.filter(
          (m) => m.workload_hours > m.capacity_hours
        ).length,
        available: teamMembersWithTasks.filter(
          (m) => m.workload_hours < m.capacity_hours * 0.7
        ).length,
        total_tasks: teamMembersWithTasks.reduce((sum, m) => sum + m.tasks.length, 0),
      },
    })
  } catch (error) {
    console.error('Error fetching resource data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
