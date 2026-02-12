'use client'

import { useState, useEffect } from 'react'
import { X, Mail, User, MessageSquare, Calendar, Shield, AlertCircle, CheckCircle } from 'lucide-react'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { getRoleDisplayName, getRoleColor, getRoleIcon, UserRole } from '@/lib/permissions'

// ============================================
// TYPES
// ============================================

interface Role {
  id: string
  role_name: string
  role_slug: string
  description: string
  color: string
  icon: string
  is_builtin: boolean
}

interface InviteTeamMemberProps {
  onClose: () => void
  onSuccess?: () => void
}

// ============================================
// COMPONENT
// ============================================

export default function InviteTeamMember({
  onClose,
  onSuccess
}: InviteTeamMemberProps) {
  const { user: currentUser } = useCurrentUser()
  const [loading, setLoading] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Available roles
  const [roles, setRoles] = useState<Role[]>([])

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    roleId: '',
    message: '',
    expiresInDays: 7
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

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

        // Combine built-in and custom roles
        const allRoles = [
          ...(data.builtInRoles || []),
          ...(data.customRoles || [])
        ]

        setRoles(allRoles)

        // Set default role to viewer
        if (allRoles.length > 0) {
          const viewerRole = allRoles.find(r => r.role_slug === 'viewer')
          if (viewerRole) {
            setFormData(prev => ({ ...prev, roleId: viewerRole.id }))
          }
        }
      } catch (err: any) {
        console.error('Error fetching roles:', err)
      } finally {
        setLoadingRoles(false)
      }
    }

    fetchRoles()
  }, [])

  // Validate email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Invalid email address'
    }

    if (!formData.roleId) {
      errors.roleId = 'Please select a role'
    }

    if (formData.expiresInDays < 1 || formData.expiresInDays > 30) {
      errors.expiresInDays = 'Expiration must be between 1 and 30 days'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Get selected role details
  const selectedRole = roles.find(r => r.id === formData.roleId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Invite Team Member</h2>
            <p className="text-sm text-gray-600 mt-1">
              Send an invitation to join your team
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">
                Invitation sent successfully! The user will receive an email with instructions.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="colleague@company.com"
                disabled={loading || success}
              />
            </div>
            {formErrors.email && (
              <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>
            )}
          </div>

          {/* Full Name (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-gray-400">(Optional)</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Doe"
                disabled={loading || success}
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            {loadingRoles ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.roleId ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={loading || success}
                >
                  <option value="">Select a role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.role_name}
                      {role.is_builtin && ' (Built-in)'}
                    </option>
                  ))}
                </select>
                {formErrors.roleId && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.roleId}</p>
                )}

                {/* Selected Role Preview */}
                {selectedRole && (
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ color: selectedRole.color }}>
                        {selectedRole.icon}
                      </span>
                      <span className="font-medium text-gray-900">
                        {selectedRole.role_name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {selectedRole.description}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Invitation Expiry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invitation Expires In
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={formData.expiresInDays}
                onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading || success}
              >
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days (recommended)</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
            </div>
          </div>

          {/* Personal Message (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Personal Message <span className="text-gray-400">(Optional)</span>
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Add a personal message to the invitation email..."
                maxLength={500}
                disabled={loading || success}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.message.length}/500 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading || success || loadingRoles}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Invitation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
