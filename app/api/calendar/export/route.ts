import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateICalFile } from '@/lib/calendar/ical-export'

/**
 * Export calendar as iCal file
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
      .from('profiles')
      .select('company_id, full_name')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 })
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')
    const assignedTo = searchParams.get('assigned_to')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Build query
    let query = supabase
      .from('tasks')
      .select(
        `
        *,
        project:projects(name, address)
      `
      )
      .eq('company_id', profile.company_id)
      .order('start_date', { ascending: true })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    if (startDate) {
      query = query.gte('start_date', startDate)
    }

    if (endDate) {
      query = query.lte('due_date', endDate)
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    // Convert tasks to calendar events
    const events = (tasks || []).map((task: any) => ({
      id: task.id,
      title: `${task.title}${task.project?.name ? ` - ${task.project.name}` : ''}`,
      description: task.description || '',
      start_date: task.start_date,
      due_date: task.due_date,
      location: task.project?.address || '',
      status: task.status,
    }))

    // Generate iCal content
    const calendarName = projectId
      ? `${tasks?.[0]?.project?.name || 'Project'} Schedule`
      : 'Construction Project Schedule'

    const icalContent = generateICalFile(events, calendarName)

    // Return iCal file
    const filename = projectId
      ? `${tasks?.[0]?.project?.name?.replace(/[^a-z0-9]/gi, '-') || 'project'}-schedule.ics`
      : `construction-schedule-${new Date().toISOString().split('T')[0]}.ics`

    return new NextResponse(icalContent, {
      headers: {
        'Content-Type': 'text/calendar;charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting calendar:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
