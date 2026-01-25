"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  type CompanyTeam,
  type UserRole,
  permissionService,
  getRoleDisplayName,
  getRoleColor,
  getRoleIcon
} from '@/lib/permissions'
import TeamMemberList from './TeamMemberList'

interface TeamManagerProps {
  companyId?: string
  onTeamSelect?: (team: CompanyTeam) => void
}

export default function TeamManager({ companyId, onTeamSelect }: TeamManagerProps) {
  const [teams, setTeams] = useState<CompanyTeam[]>([])
  const [selectedTeam, setSelectedTeam] = useState<CompanyTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canManageTeams, setCanManageTeams] = useState(false)

  // Create team modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    team_type: 'custom' as CompanyTeam['team_type'],
    color: '#6A9BFD'
  })
  const [creating, setCreating] = useState(false)

  // Load teams
  const loadTeams = async () => {
    try {
      setLoading(true)
      setError(null)

      const userTeams = await permissionService.getUserTeams()
      setTeams(userTeams)

      // Check permissions
      const hasPermission = await permissionService.hasPermission('canManageTeam')
      setCanManageTeams(hasPermission)
    } catch (err) {
      console.error('Error loading teams:', err)
      setError('Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeams()
  }, [companyId])

  const handleCreateTeam = async () => {
    if (!createForm.name.trim()) {
      alert('Team name is required')
      return
    }

    try {
      setCreating(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        alert('Not authenticated')
        return
      }

      // Get user's company_id if not provided
      let targetCompanyId = companyId
      if (!targetCompanyId) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single()

        targetCompanyId = profile?.company_id
      }

      if (!targetCompanyId) {
        alert('No company associated with your account')
        return
      }

      // Create team
      const { data: team, error: teamError } = await supabase
        .from('company_teams')
        .insert({
          company_id: targetCompanyId,
          name: createForm.name,
          description: createForm.description || null,
          team_type: createForm.team_type,
          color: createForm.color,
          created_by: user.id
        })
        .select()
        .single()

      if (teamError) throw teamError

      // Add creator as admin
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'admin',
          is_lead: true,
          added_by: user.id
        })

      if (memberError) throw memberError

      // Reset form and reload
      setCreateForm({
        name: '',
        description: '',
        team_type: 'custom',
        color: '#6A9BFD'
      })
      setShowCreateModal(false)
      await loadTeams()

      alert('Team created successfully!')
    } catch (err) {
      console.error('Error creating team:', err)
      alert('Failed to create team')
    } finally {
      setCreating(false)
    }
  }

  const handleSelectTeam = (team: CompanyTeam) => {
    setSelectedTeam(team)
    onTeamSelect?.(team)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#FF6B6B' }} />
        <span className="ml-3 text-sm" style={{ color: '#6B7280' }}>Loading teams...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
        <p className="text-sm" style={{ color: '#DC2626' }}>⚠️ {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
            👥 Teams
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Manage your company teams and members
          </p>
        </div>
        {canManageTeams && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg text-white font-semibold transition-transform hover:scale-105"
            style={{ backgroundColor: '#FF6B6B' }}
          >
            ➕ Create Team
          </button>
        )}
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center" style={{ borderColor: '#E0E0E0' }}>
          <p className="text-4xl mb-3">👥</p>
          <p className="text-lg font-semibold mb-2" style={{ color: '#1A1A1A' }}>
            No Teams Yet
          </p>
          <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
            Create your first team to start collaborating
          </p>
          {canManageTeams && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-lg text-white font-semibold transition-transform hover:scale-105"
              style={{ backgroundColor: '#FF6B6B' }}
            >
              Create Your First Team
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <div
              key={team.id}
              onClick={() => handleSelectTeam(team)}
              className="bg-white rounded-xl border p-6 cursor-pointer transition-all hover:shadow-lg"
              style={{
                borderColor: selectedTeam?.id === team.id ? team.color : '#E0E0E0',
                borderWidth: selectedTeam?.id === team.id ? '2px' : '1px'
              }}
            >
              {/* Team Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${team.color}20`, color: team.color }}
                  >
                    {team.team_type === 'construction' ? '🏗️' :
                     team.team_type === 'management' ? '📋' :
                     team.team_type === 'quality' ? '✅' :
                     team.team_type === 'safety' ? '🦺' : '👥'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate" style={{ color: '#1A1A1A' }}>
                      {team.name}
                    </h3>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      {team.team_type.charAt(0).toUpperCase() + team.team_type.slice(1)} Team
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {team.description && (
                <p className="text-sm mb-4 line-clamp-2" style={{ color: '#6B7280' }}>
                  {team.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1" style={{ color: '#6B7280' }}>
                  <span>👤</span>
                  <span>{team.member_count || 0} members</span>
                </div>
                <div className="flex items-center gap-1" style={{ color: '#6B7280' }}>
                  <span>📁</span>
                  <span>{team.project_count || 0} projects</span>
                </div>
              </div>

              {/* Active Badge */}
              {team.is_active && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
                  <span className="px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                    ✓ Active
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selected Team Details */}
      {selectedTeam && (
        <div className="bg-white rounded-xl border p-6" style={{ borderColor: '#E0E0E0' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                style={{ backgroundColor: `${selectedTeam.color}20`, color: selectedTeam.color }}
              >
                {selectedTeam.team_type === 'construction' ? '🏗️' :
                 selectedTeam.team_type === 'management' ? '📋' :
                 selectedTeam.team_type === 'quality' ? '✅' :
                 selectedTeam.team_type === 'safety' ? '🦺' : '👥'}
              </div>
              <div>
                <h3 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
                  {selectedTeam.name}
                </h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {selectedTeam.description || 'No description'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTeam(null)}
              className="text-2xl hover:opacity-70"
              style={{ color: '#6B7280' }}
            >
              ×
            </button>
          </div>

          <TeamMemberList
            teamId={selectedTeam.id}
            canManage={canManageTeams}
            onMemberUpdated={loadTeams}
          />
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b" style={{ borderColor: '#E0E0E0' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
                  ➕ Create New Team
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-2xl hover:opacity-70"
                  style={{ color: '#6B7280' }}
                  disabled={creating}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Team Name */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                  Team Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., Construction Crew A"
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E5E7EB' }}
                  disabled={creating}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Brief description of this team..."
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 resize-none"
                  style={{ borderColor: '#E5E7EB' }}
                  rows={3}
                  disabled={creating}
                />
              </div>

              {/* Team Type */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                  Team Type
                </label>
                <select
                  value={createForm.team_type}
                  onChange={(e) => setCreateForm({ ...createForm, team_type: e.target.value as CompanyTeam['team_type'] })}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E5E7EB' }}
                  disabled={creating}
                >
                  <option value="custom">Custom</option>
                  <option value="construction">🏗️ Construction</option>
                  <option value="management">📋 Management</option>
                  <option value="quality">✅ Quality</option>
                  <option value="safety">🦺 Safety</option>
                </select>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                  Team Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={createForm.color}
                    onChange={(e) => setCreateForm({ ...createForm, color: e.target.value })}
                    className="w-16 h-10 rounded-lg border cursor-pointer"
                    style={{ borderColor: '#E5E7EB' }}
                    disabled={creating}
                  />
                  <div className="flex-1 flex gap-2">
                    {['#6A9BFD', '#FF6B6B', '#10B981', '#F59E0B', '#8B5CF6'].map(color => (
                      <button
                        key={color}
                        onClick={() => setCreateForm({ ...createForm, color })}
                        className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor: createForm.color === color ? '#1A1A1A' : 'transparent'
                        }}
                        disabled={creating}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t bg-gray-50" style={{ borderColor: '#E0E0E0' }}>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 rounded-lg font-semibold border transition-colors hover:bg-white"
                  style={{ borderColor: '#E5E7EB', color: '#374151' }}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTeam}
                  className="flex-1 px-4 py-3 rounded-lg text-white font-semibold transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#FF6B6B' }}
                  disabled={creating || !createForm.name.trim()}
                >
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
