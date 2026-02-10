'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Shield, AlertCircle, CheckCircle, Calendar, Clock } from 'lucide-react'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { getRoleDisplayName, getRoleColor, getRoleIcon, canManageRole } from '@/lib/permissions'
import UserRoleBadge from '@/components/users/UserRoleBadge'

// ============================================
// TYPES
// ============================================

interface RoleAssignment {
  id: string
  role_id: string
  project_ids: string[] | null
  assigned_at: string
  expires_at: string | null
  custom_roles: {
    id: string
    role_name: string
    role_slug: string
    color: string
    icon: string
    is_system_role: boolean
  }
}

interface Role {
  id: string
  role_name: string
  role_slug: string
  description: string
  color: string
  icon: string
  is_builtin: boolean
}

interface UserRoleEditorProps {
  userId: string
  userName: string
  userEmail: string
  onClose: () => void
  onSuccess?: () => void
}

// ============================================
// COMPONENT
// ============================================

export default function UserRoleEditor({
  userId,
  userName,
  userEmail,
  onClose,
  onSuccess
}: UserRoleEditorProps) {
  const { user: currentUser } = useCurrentUser()
  const [loading, setLoading] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [loadingAssignments, setLoadingAssignments] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Data
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [assignments, setAssignments] = useState<RoleAssignment[]>([])

  // Form state for new assignment
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRoleId, setNewRoleId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  // Fetch available roles
  useEffect(() => {
    async function fetchRoles() {
      try {
        setLoadingRoles(true)
        const response = await fetch('/api/roles')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch roles')
        }

        const allRoles = [
          ...(data.builtInRoles || []),
          ...(data.customRoles || [])
        ]

        setAvailableRoles(allRoles)
      } catch (err: any) {
        console.error('Error fetching roles:', err)
      } finally {
        setLoadingRoles(false)
      }
    }

    fetchRoles()
  }, [])

  // Fetch user's current role assignments
  useEffect(() => {
    fetchAssignments()
  }, [userId])

  async function fetchAssignments() {
    try {
      setLoadingAssignments(true)
      setError(null)

      const response = await fetch(`/api/users/${userId}/roles`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch role assignments')
      }

      setAssignments(data.roleAssignments || [])
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoadingAssignments(false)
    }
  }

  // Assign new role
  const handleAssignRole = async () => {
    if (!newRoleId) {
      setError('Please select a role')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/users/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: newRoleId,
          expiresAt: expiresAt || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign role')
      }

      setSuccess('Role assigned successfully')
      setShowAddForm(false)
      setNewRoleId('')
      setExpiresAt('')

      // Refetch assignments
      await fetchAssignments()

      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Remove role
  const handleRemoveRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to remove the "${roleName}" role from this user?`)) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/users/${userId}/roles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove role')
      }

      setSuccess('Role removed successfully')

      // Refetch assignments
      await fetchAssignments()

      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Check if role is expiring soon (within 7 days)
  const isExpiringSoon = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false
    const expirationDate = new Date(expiresAt)
    const now = new Date()
    const daysUntilExpiry = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7
  }

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get roles that aren't already assigned
  const unassignedRoles = availableRoles.filter(
    role => !assignments.some(a => a.role_id === role.id)
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Roles</h2>
            <p className="text-sm text-gray-600 mt-1">
              {userName || userEmail}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Current Roles */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Current Roles</h3>
              {currentUser?.permissions.canChangeRoles && unassignedRoles.length > 0 && (
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                  disabled={loading}
                >
                  <Plus className="w-4 h-4" />
                  Add Role
                </button>
              )}
            </div>

            {/* Loading State */}
            {loadingAssignments && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Assignments List */}
            {!loadingAssignments && (
              <>
                {assignments.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                    <Shield className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No roles assigned</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span
                              style={{ color: assignment.custom_roles.color }}
                              className="text-2xl"
                            >
                              {assignment.custom_roles.icon}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {assignment.custom_roles.role_name}
                                </span>
                                {assignment.custom_roles.is_system_role && (
                                  <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-200 rounded">
                                    System
                                  </span>
                                )}
                                {assignment.expires_at && isExpiringSoon(assignment.expires_at) && (
                                  <span className="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Expiring Soon
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                <span>Assigned {formatDate(assignment.assigned_at)}</span>
                                {assignment.expires_at && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Expires {formatDate(assignment.expires_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {currentUser?.permissions.canChangeRoles && (
                          <button
                            onClick={() =>
                              handleRemoveRole(
                                assignment.role_id,
                                assignment.custom_roles.role_name
                              )
                            }
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            disabled={loading}
                            title="Remove role"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Add Role Form */}
          {showAddForm && currentUser?.permissions.canChangeRoles && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Assign New Role</h4>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Role
                </label>
                <select
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading || loadingRoles}
                >
                  <option value="">Choose a role...</option>
                  {unassignedRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.role_name}
                      {role.is_builtin && ' (Built-in)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expires At <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for permanent assignment
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAssignRole}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !newRoleId}
                >
                  {loading ? 'Assigning...' : 'Assign Role'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewRoleId('')
                    setExpiresAt('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Available Roles Preview */}
          {!showAddForm && unassignedRoles.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Available Roles ({unassignedRoles.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {unassignedRoles.slice(0, 6).map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded text-sm"
                  >
                    <span style={{ color: role.color }}>{role.icon}</span>
                    <span className="text-gray-700">{role.role_name}</span>
                  </div>
                ))}
                {unassignedRoles.length > 6 && (
                  <div className="flex items-center justify-center p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500">
                    +{unassignedRoles.length - 6} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={() => {
              onSuccess?.()
              onClose()
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
