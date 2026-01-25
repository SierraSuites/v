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
 * Fetch team members for a project's company
 *
 * Since we don't have a project_members join table yet,
 * this returns all members of the project's company
 *
 * TODO: Create project_members table for per-project team assignments
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
  const supabase = createClient()

  // Get all projects with their company_ids
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, company_id')
    .in('id', projectIds)

  if (projectsError || !projects) {
    console.error('Failed to load projects:', projectsError)
    return {}
  }

  // Get unique company IDs
  const companyIds = [...new Set(projects.map(p => p.company_id))]

  // Get all users for these companies
  const { data: allMembers, error: membersError } = await supabase
    .from('user_profiles')
    .select('id, company_id, full_name, email, avatar_url, role')
    .in('company_id', companyIds)
    .order('full_name')

  if (membersError) {
    console.error('Failed to load team members:', membersError)
    return {}
  }

  // Group members by company_id
  const membersByCompany: Record<string, TeamMember[]> = {}

  ;(allMembers || []).forEach(member => {
    if (!membersByCompany[member.company_id]) {
      membersByCompany[member.company_id] = []
    }
    membersByCompany[member.company_id].push({
      id: member.id,
      name: member.full_name || member.email,
      avatar: getInitials(member.full_name || member.email),
      role: formatRole(member.role),
      email: member.email
    })
  })

  // Map project IDs to their team members
  const result: Record<string, TeamMember[]> = {}

  projects.forEach(project => {
    result[project.id] = membersByCompany[project.company_id] || []
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
