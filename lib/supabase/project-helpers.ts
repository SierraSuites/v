/**
 * Project Helper Functions
 *
 * Utility functions for projects that fetch related data
 */

import { createClient } from '@/lib/supabase/client'

export interface TeamMember {
  id: string
  name: string
  avatar: string
  role: string
  email?: string
}

/**
 * Fetch team members explicitly assigned to a project via project_team_members
 */
export async function getProjectTeamMembers(projectId: string): Promise<TeamMember[]> {
  const supabase = createClient()

  // Get project to find its company_id
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('company_id')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    console.error('Failed to load project:', projectError)
    return []
  }

  // Get all users in this company
  const { data: members, error: membersError } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, avatar_url, role')
    .eq('company_id', project.company_id)
    .order('full_name')

  if (membersError) {
    console.error('Failed to load team members:', membersError)
    return []
  }

  // Convert to TeamMember format
  return (members || []).map((member) => ({
    id: member.id,
    name: member.full_name || member.email,
    avatar: getInitials(member.full_name || member.email),
    role: formatRole(member.role),
    email: member.email
  }))
}

/**
 * Get team members for multiple projects at once
 * Returns a map of projectId -> TeamMember[]
 */
export async function getTeamMembersForProjects(
  projectIds: string[]
): Promise<Record<string, TeamMember[]>> {
  if (projectIds.length === 0) return {}

  const supabase = createClient()

  // Fetch project_team_members for all projects
  const { data: assignments, error: assignmentsError } = await supabase
    .from('project_team_members')
    .select('project_id, user_id, project_role')
    .in('project_id', projectIds)

  if (assignmentsError || !assignments || assignments.length === 0) return {}

  // Fetch user profiles for all assigned users
  const userIds = [...new Set(assignments.map(a => a.user_id))]
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, avatar_url, role')
    .in('id', userIds)

  if (profilesError) return {}

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

  // Group by project_id
  const result: Record<string, TeamMember[]> = {}
  assignments.forEach(a => {
    if (!result[a.project_id]) result[a.project_id] = []
    const profile = profileMap[a.user_id]
    result[a.project_id].push({
      id: a.user_id,
      name: profile?.full_name || profile?.email || 'Unknown',
      avatar: getInitials(profile?.full_name || profile?.email || '?'),
      role: formatRole(a.project_role || profile?.role || 'member'),
      email: profile?.email
    })
  })

  return result
}

/**
 * Get initials from a name for avatar display
 */
function getInitials(name: string): string {
  if (!name) return '?'

  const parts = name.trim().split(' ')
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Format role name for display
 */
function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    owner: 'Owner',
    admin: 'Admin',
    project_manager: 'Project Manager',
    member: 'Member',
    viewer: 'Viewer'
  }

  return roleMap[role] || role
}
