import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Export schedule as CSV
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
    const projectId = searchParams.get('project_id')

    // Build query
    let query = supabase
      .from('tasks')
      .select(
        `
        *,
        project:projects(name),
        assigned_user:profiles!tasks_assigned_to_fkey(full_name)
      `
      )
      .eq('company_id', profile.company_id)
      .order('start_date', { ascending: true })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    // Generate CSV
    const headers = [
      'Task ID',
      'Title',
      'Project',
      'Status',
      'Start Date',
      'Due Date',
      'Assigned To',
      'Completion %',
      'Is Milestone',
      'Critical Path',
      'Dependencies',
    ]

    const rows = tasks?.map((task: any) => [
      task.id,
      `"${task.title.replace(/"/g, '""')}"`, // Escape quotes
      `"${task.project?.name || 'N/A'}"`,
      task.status,
      task.start_date || '',
      task.due_date || '',
      `"${task.assigned_user?.full_name || 'Unassigned'}"`,
      task.completion_percentage || 0,
      task.is_milestone ? 'Yes' : 'No',
      task.is_on_critical_path ? 'Yes' : 'No',
      task.dependencies?.length > 0
        ? `"${task.dependencies.map((d: any) => d.depends_on_task_id).join(', ')}"`
        : '',
    ])

    const csv = [headers.join(','), ...(rows?.map((row: any) => row.join(',')) || [])].join('\n')

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="schedule-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting schedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
