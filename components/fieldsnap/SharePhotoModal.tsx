"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  type CompanyTeam,
  type SharedMediaAsset,
  permissionService,
  getPermissionLevelColor,
  getPermissionLevelIcon
} from '@/lib/permissions'

interface SharePhotoModalProps {
  photoId: string
  photoTitle?: string
  onClose: () => void
  onShared?: () => void
}

export default function SharePhotoModal({
  photoId,
  photoTitle,
  onClose,
  onShared
}: SharePhotoModalProps) {
  const [teams, setTeams] = useState<CompanyTeam[]>([])
  const [currentShares, setCurrentShares] = useState<SharedMediaAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)

  // Share form state
  const [shareType, setShareType] = useState<'team' | 'user'>('team')
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [permissionLevel, setPermissionLevel] = useState<'view' | 'comment' | 'edit'>('view')
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null)
  const [shareMessage, setShareMessage] = useState<string>('')

  // Load teams and current shares
  const loadData = async () => {
    try {
      setLoading(true)

      // Load user's teams
      const userTeams = await permissionService.getUserTeams()
      setTeams(userTeams)

      // Load existing shares
      const supabase = createClient()
      const { data: shares } = await supabase
        .from('shared_media_assets')
        .select(`
          *,
          team:company_teams(id, name, color)
        `)
        .eq('media_asset_id', photoId)
        .eq('is_active', true)
        .order('shared_at', { ascending: false })

      setCurrentShares(shares || [])
    } catch (err) {
      console.error('Error loading share data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [photoId])

  const handleShare = async () => {
    try {
      setSharing(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        alert('Not authenticated')
        return
      }

      // Validate input
      if (shareType === 'team' && !selectedTeamId) {
        alert('Please select a team')
        return
      }
      if (shareType === 'user' && !userEmail.trim()) {
        alert('Please enter an email address')
        return
      }

      // Calculate expiration
      let expiresAt: string | null = null
      if (expiresInDays) {
        const expiry = new Date()
        expiry.setDate(expiry.getDate() + expiresInDays)
        expiresAt = expiry.toISOString()
      }

      // Get user ID if sharing with specific user
      let targetUserId: string | null = null
      if (shareType === 'user') {
        const { data: targetUser } = await supabase
          .from('auth.users')
          .select('id')
          .eq('email', userEmail.toLowerCase())
          .single()

        if (!targetUser) {
          alert('User not found. They must have an account to receive shares.')
          return
        }
        targetUserId = targetUser.id
      }

      // Create share
      const { error } = await supabase
        .from('shared_media_assets')
        .insert({
          media_asset_id: photoId,
          shared_with_team_id: shareType === 'team' ? selectedTeamId : null,
          shared_with_user_id: targetUserId,
          shared_by: user.id,
          permission_level: permissionLevel,
          expires_at: expiresAt,
          share_message: shareMessage || null
        })

      if (error) throw error

      // Reset form
      setSelectedTeamId('')
      setUserEmail('')
      setShareMessage('')
      setPermissionLevel('view')
      setExpiresInDays(null)

      await loadData()
      onShared?.()
      alert('Shared successfully!')
    } catch (err: any) {
      console.error('Error sharing:', err)
      if (err.code === '23505') {
        alert('Already shared with this team/user')
      } else {
        alert('Failed to share photo')
      }
    } finally {
      setSharing(false)
    }
  }

  const handleRevokeShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to revoke this share?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('shared_media_assets')
        .update({ is_active: false })
        .eq('id', shareId)

      if (error) throw error

      await loadData()
      onShared?.()
    } catch (err) {
      console.error('Error revoking share:', err)
      alert('Failed to revoke share')
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#FF6B6B' }} />
          <p className="mt-4 text-sm" style={{ color: '#6B7280' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: '#E0E0E0' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
                🔗 Share Photo
              </h3>
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                {photoTitle || 'Share this photo with teams or individuals'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-2xl hover:opacity-70"
              style={{ color: '#6B7280' }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Share Type Toggle */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
              Share With
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setShareType('team')}
                className="flex-1 px-4 py-2 rounded-lg font-semibold transition-all"
                style={{
                  backgroundColor: shareType === 'team' ? '#FF6B6B' : '#F3F4F6',
                  color: shareType === 'team' ? '#FFFFFF' : '#6B7280'
                }}
              >
                👥 Team
              </button>
              <button
                onClick={() => setShareType('user')}
                className="flex-1 px-4 py-2 rounded-lg font-semibold transition-all"
                style={{
                  backgroundColor: shareType === 'user' ? '#FF6B6B' : '#F3F4F6',
                  color: shareType === 'user' ? '#FFFFFF' : '#6B7280'
                }}
              >
                👤 Individual
              </button>
            </div>
          </div>

          {/* Team Selection */}
          {shareType === 'team' && (
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                Select Team
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E5E7EB' }}
                disabled={sharing}
              >
                <option value="">Choose a team...</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.member_count || 0} members)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User Email */}
          {shareType === 'user' && (
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                Email Address
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E5E7EB' }}
                disabled={sharing}
              />
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                User must have an account to receive shares
              </p>
            </div>
          )}

          {/* Permission Level */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
              Permission Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['view', 'comment', 'edit'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setPermissionLevel(level)}
                  className="px-4 py-3 rounded-lg font-semibold text-sm transition-all border-2"
                  style={{
                    backgroundColor: permissionLevel === level ? `${getPermissionLevelColor(level)}20` : '#FFFFFF',
                    borderColor: permissionLevel === level ? getPermissionLevelColor(level) : '#E5E7EB',
                    color: permissionLevel === level ? getPermissionLevelColor(level) : '#6B7280'
                  }}
                  disabled={sharing}
                >
                  {getPermissionLevelIcon(level)} {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
              {permissionLevel === 'view' && '👁️ Can only view the photo'}
              {permissionLevel === 'comment' && '💬 Can view and add comments'}
              {permissionLevel === 'edit' && '✏️ Can view, comment, and edit metadata'}
            </p>
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
              Expires In (Optional)
            </label>
            <select
              value={expiresInDays || ''}
              onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: '#E5E7EB' }}
              disabled={sharing}
            >
              <option value="">Never expires</option>
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
              Message (Optional)
            </label>
            <textarea
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              placeholder="Add a note about this share..."
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 resize-none"
              style={{ borderColor: '#E5E7EB' }}
              rows={3}
              disabled={sharing}
            />
          </div>

          {/* Current Shares */}
          {currentShares.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3" style={{ color: '#374151' }}>
                Currently Shared With ({currentShares.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {currentShares.map(share => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: '#F8F9FA' }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                        style={{
                          backgroundColor: share.shared_with_team_id
                            ? (share.team as any)?.color + '20'
                            : '#E5E7EB',
                          color: share.shared_with_team_id ? (share.team as any)?.color : '#6B7280'
                        }}
                      >
                        {share.shared_with_team_id ? '👥' : '👤'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: '#1A1A1A' }}>
                          {share.shared_with_team_id
                            ? (share.team as any)?.name
                            : (share.user as any)?.email}
                        </p>
                        <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                          <span
                            className="px-2 py-0.5 rounded font-semibold"
                            style={{
                              backgroundColor: `${getPermissionLevelColor(share.permission_level)}20`,
                              color: getPermissionLevelColor(share.permission_level)
                            }}
                          >
                            {getPermissionLevelIcon(share.permission_level)} {share.permission_level}
                          </span>
                          {share.expires_at && (
                            <span>
                              Expires {new Date(share.expires_at).toLocaleDateString()}
                            </span>
                          )}
                          {share.access_count > 0 && (
                            <span>
                              {share.access_count} view{share.access_count !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeShare(share.id)}
                      className="px-3 py-1 rounded text-xs font-semibold transition-colors hover:bg-red-100"
                      style={{ color: '#DC2626' }}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50" style={{ borderColor: '#E0E0E0' }}>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg font-semibold border transition-colors hover:bg-white"
              style={{ borderColor: '#E5E7EB', color: '#374151' }}
              disabled={sharing}
            >
              Close
            </button>
            <button
              onClick={handleShare}
              className="flex-1 px-4 py-3 rounded-lg text-white font-semibold transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#FF6B6B' }}
              disabled={
                sharing ||
                (shareType === 'team' && !selectedTeamId) ||
                (shareType === 'user' && !userEmail.trim())
              }
            >
              {sharing ? 'Sharing...' : '🔗 Share Photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
