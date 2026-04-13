export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireProjectAccess, requireProjectPermission } from '@/lib/api-permissions'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/projects/[id]/members
 * Returns current members + available company members to add.
 *
 * Optimised: 2 parallel rounds instead of 6+ sequential queries.
 * Round 1: auth user + user profile (company role) + project (company_id) + assignments — all parallel
 * Round 2: member profiles + all company profiles — parallel, only if round 1 passes auth
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Round 1 — everything we need for auth + data shape, all in parallel
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [profileRes, projectRes, assignmentsRes] = await Promise.all([
      supabase.from('user_profiles').select('role').eq('id', user.id).single(),
      supabase.from('projects').select('company_id').eq('id', id).single(),
      supabase.from('project_team_members').select('id, user_id, project_role, added_at, added_by').eq('project_id', id),
    ])

    // Access check: company owner/admin bypass, otherwise must be a project member
    const companyRole = profileRes.data?.role
    const assignments = assignmentsRes.data || []
    const isCompanyAdmin = companyRole === 'owner' || companyRole === 'admin'
    const isMember = assignments.some(a => a.user_id === user.id)

    if (!isCompanyAdmin && !isMember) {
      return NextResponse.json({ error: 'Forbidden', message: 'You do not have access to this project' }, { status: 403 })
    }

    const companyId = projectRes.data?.company_id
    if (!companyId) return NextResponse.json({ members: [], available: [] })

    const assignedUserIds = assignments.map(a => a.user_id)

    // Round 2 — member profiles + available company members, in parallel
    const [memberProfilesRes, allCompanyMembersRes] = await Promise.all([
      assignedUserIds.length > 0
        ? supabase.from('user_profiles').select('id, full_name, email, avatar_url').in('id', assignedUserIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from('user_profiles').select('id, full_name, email, avatar_url, role').eq('company_id', companyId).order('full_name'),
    ])

    const memberProfiles = memberProfilesRes.data || []
    const allCompanyMembers = allCompanyMembersRes.data || []

    const members = assignments.map(a => {
      const profile = memberProfiles.find(p => p.id === a.user_id)
      return {
        id: a.id,
        user_id: a.user_id,
        name: profile?.full_name || profile?.email || 'Unknown',
        email: profile?.email || '',
        avatar_url: profile?.avatar_url || null,
        project_role: a.project_role,
        added_at: a.added_at,
      }
    })

    const available = allCompanyMembers
      .filter(m => !assignedUserIds.includes(m.id))
      .map(m => ({
        id: m.id,
        name: m.full_name || m.email || 'Unknown',
        email: m.email || '',
        avatar_url: m.avatar_url || null,
        role: m.role,
      }))

    return NextResponse.json({ members, available })
  } catch (error) {
    console.error('[GET /api/projects/[id]/members]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/projects/[id]/members
 * Add a user to the project
 * Body: { user_id: string, project_role: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const projectAccess = await requireProjectPermission(id, 'manageTeam')
    if (!projectAccess.authorized) return projectAccess.error

    const { user_id, project_role } = await request.json()

    if (!user_id || !project_role) {
      return NextResponse.json({ error: 'user_id and project_role are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get project's company_id
    const { data: project } = await supabase
      .from('projects')
      .select('company_id')
      .eq('id', id)
      .single()

    if (!project?.company_id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check not already a member
    const { data: existing } = await supabase
      .from('project_team_members')
      .select('id')
      .eq('project_id', id)
      .eq('user_id', user_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'User is already a member of this project' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('project_team_members')
      .insert({
        project_id: id,
        user_id,
        company_id: project.company_id,
        project_role,
        added_by: projectAccess.userId,
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/projects/[id]/members]', error)
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[POST /api/projects/[id]/members]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/projects/[id]/members
 * Remove a user from the project
 * Body: { member_id: string } (project_team_members.id)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const projectAccess = await requireProjectPermission(id, 'manageTeam')
    if (!projectAccess.authorized) return projectAccess.error

    const { member_id } = await request.json()

    if (!member_id) {
      return NextResponse.json({ error: 'member_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('project_team_members')
      .delete()
      .eq('id', member_id)
      .eq('project_id', id)

    if (error) {
      console.error('[DELETE /api/projects/[id]/members]', error)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/projects/[id]/members]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
