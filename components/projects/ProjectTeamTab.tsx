'use client'

// ============================================================================
// PROJECT TEAM TAB
// Displays team members with roles and permissions
// ============================================================================

import { useState } from 'react'
import { ProjectDetails } from '@/lib/projects/get-project-details'
import { Users, Mail, Shield, MoreVertical, UserPlus, Crown } from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  project: ProjectDetails
}

export default function ProjectTeamTab({ project }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Get unique roles
  const allRoles = Array.from(new Set(project.teamMembers.map(m => m.role)))
  const roles = ['all', ...allRoles]

  // Filter team members
  const filteredMembers = project.teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || member.role === roleFilter

    return matchesSearch && matchesRole
  })

  // Group members by role
  const membersByRole = filteredMembers.reduce((acc, member) => {
    if (!acc[member.role]) {
      acc[member.role] = []
    }
    acc[member.role].push(member)
    return acc
  }, {} as Record<string, typeof project.teamMembers>)

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
          <p className="text-gray-600 mt-1">
            {project.teamMembers.length} member{project.teamMembers.length !== 1 ? 's' : ''} •{' '}
            {allRoles.length} role{allRoles.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          <UserPlus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Role Filter */}
        <div className="flex gap-2 overflow-x-auto">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                roleFilter === role
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {role === 'all' ? 'All Roles' : role}
              {role !== 'all' && (
                <span className="ml-2 text-xs opacity-75">
                  ({project.teamMembers.filter(m => m.role === role).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Team Members List - Grouped by Role */}
      {filteredMembers.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(membersByRole).map(([role, members]) => (
            <div key={role} className="bg-white rounded-lg border overflow-hidden">
              {/* Role Header */}
              <div className="bg-gray-50 px-6 py-3 border-b">
                <h3 className="font-semibold text-gray-900 capitalize">{role}</h3>
                <p className="text-sm text-gray-600">
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Members in this role */}
              <div className="divide-y">
                {members.map((member) => (
                  <div key={member.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      {/* Member Info */}
                      <div className="flex items-start gap-4 flex-1">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {/* Owner badge */}
                          {member.id === project.user_id && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
                              <Crown className="h-3 w-3 text-yellow-900" />
                            </div>
                          )}
                        </div>

                        {/* Name & Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 truncate">{member.name}</h4>
                            {member.id === project.user_id && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                                Owner
                              </span>
                            )}
                            {member.id === project.project_manager_id && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                                PM
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <Mail className="h-4 w-4" />
                            <a href={`mailto:${member.email}`} className="hover:text-blue-600">
                              {member.email}
                            </a>
                          </div>

                          {/* Permissions */}
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-gray-400" />
                            <div className="flex flex-wrap gap-1">
                              {member.permissions.map((permission) => (
                                <span
                                  key={permission}
                                  className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded capitalize"
                                >
                                  {permission}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Added date */}
                          <div className="text-xs text-gray-500 mt-2">
                            Added {format(new Date(member.addedAt), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <MoreVertical className="h-5 w-5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Empty state
        <div className="bg-white rounded-lg border p-12 text-center">
          <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery || roleFilter !== 'all' ? 'No team members found' : 'No team members yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || roleFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Invite team members to collaborate on this project'}
          </p>
          {!searchQuery && roleFilter === 'all' && (
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              <UserPlus className="h-5 w-5" />
              Add First Member
            </button>
          )}
        </div>
      )}

      {/* Team Stats */}
      {project.teamMembers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-600 mb-1">Total Members</div>
            <div className="text-2xl font-bold text-gray-900">{project.teamMembers.length}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-600 mb-1">Unique Roles</div>
            <div className="text-2xl font-bold text-gray-900">{allRoles.length}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-600 mb-1">With Edit Access</div>
            <div className="text-2xl font-bold text-gray-900">
              {project.teamMembers.filter(m => m.permissions.includes('edit')).length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
