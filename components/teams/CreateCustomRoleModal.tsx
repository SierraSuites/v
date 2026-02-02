'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { PermissionSet } from '@/lib/permissions'
import PermissionMatrixEditor from './PermissionMatrixEditor'

// ============================================
// TYPES
// ============================================

interface CreateCustomRoleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface RoleFormData {
  roleName: string
  description: string
  color: string
  icon: string
  permissions: PermissionSet
}

// ============================================
// PRESET COLORS & ICONS
// ============================================

const PRESET_COLORS = [
  { name: 'Gray', value: '#6B7280' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#10B981' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' }
]

const PRESET_ICONS = [
  '👤', '👨', '👩', '👷', '🏗️', '🔧', '🛠️', '📋', '📊',
  '💰', '🎯', '⚡', '🔒', '🌟', '🚀', '📱', '💼', '🏢'
]

// Default empty permissions
const DEFAULT_PERMISSIONS: PermissionSet = {
  canViewAllProjects: false,
  canEditProjects: false,
  canDeleteProjects: false,
  canCreateProjects: false,
  canManageTeam: false,
  canInviteMembers: false,
  canRemoveMembers: false,
  canChangeRoles: false,
  canViewAllPhotos: false,
  canUploadPhotos: false,
  canDeletePhotos: false,
  canSharePhotos: false,
  canEditPhotoMetadata: false,
  canViewAnalytics: false,
  canExportData: false,
  canViewReports: false,
  canManageAI: false,
  canRunAIAnalysis: false,
  canViewAIInsights: false,
  canManageTasks: false,
  canAssignTasks: false,
  canViewAllTasks: false,
  canManagePunchList: false,
  canResolvePunchItems: false,
  canViewPunchList: false,
  canManageFinances: false,
  canApproveExpenses: false,
  canViewFinancials: false,
  canUploadDocuments: false,
  canDeleteDocuments: false,
  canShareDocuments: false,
  canManageCompanySettings: false,
  canManageIntegrations: false
}

// ============================================
// COMPONENT
// ============================================

export default function CreateCustomRoleModal({
  isOpen,
  onClose,
  onSuccess
}: CreateCustomRoleModalProps) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<RoleFormData>({
    roleName: '',
    description: '',
    color: '#6B7280',
    icon: '👤',
    permissions: DEFAULT_PERMISSIONS
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Reset form when modal opens/closes
  const handleClose = () => {
    setStep(1)
    setFormData({
      roleName: '',
      description: '',
      color: '#6B7280',
      icon: '👤',
      permissions: DEFAULT_PERMISSIONS
    })
    setValidationErrors({})
    setError(null)
    onClose()
  }

  // Validate step 1
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.roleName.trim()) {
      errors.roleName = 'Role name is required'
    } else if (formData.roleName.length < 3) {
      errors.roleName = 'Role name must be at least 3 characters'
    } else if (formData.roleName.length > 50) {
      errors.roleName = 'Role name must be less than 50 characters'
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(formData.roleName)) {
      errors.roleName = 'Role name can only contain letters, numbers, spaces, hyphens, and underscores'
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle next step
  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2)
      }
    }
  }

  // Handle previous step
  const handlePrevious = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateStep1()) {
      setStep(1)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create role')
      }

      // Success!
      handleClose()
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the role')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create Custom Role</h2>
              <p className="text-sm text-gray-500 mt-1">
                Step {step} of 2: {step === 1 ? 'Role Details' : 'Permissions'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2">
              <div className={`flex-1 h-2 rounded-full transition-colors ${
                step >= 1 ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
              <div className={`flex-1 h-2 rounded-full transition-colors ${
                step >= 2 ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Step 1: Role Details */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Role Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.roleName}
                    onChange={(e) => {
                      setFormData({ ...formData, roleName: e.target.value })
                      setValidationErrors({ ...validationErrors, roleName: '' })
                    }}
                    placeholder="e.g., Site Safety Officer"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.roleName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.roleName && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.roleName}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value })
                      setValidationErrors({ ...validationErrors, description: '' })
                    }}
                    placeholder="Describe the responsibilities and access level for this role..."
                    rows={3}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                      validationErrors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.description.length}/500 characters
                  </p>
                  {validationErrors.description && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
                  )}
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Color
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color.value}
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`w-10 h-10 rounded-lg transition-all ${
                          formData.color === color.value
                            ? 'ring-2 ring-blue-500 ring-offset-2 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        {formData.color === color.value && (
                          <Check className="w-5 h-5 text-white mx-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Icon
                  </label>
                  <div className="grid grid-cols-9 gap-2">
                    {PRESET_ICONS.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`w-10 h-10 rounded-lg text-2xl flex items-center justify-center transition-all ${
                          formData.icon === icon
                            ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                            : 'bg-gray-100 hover:bg-gray-200 hover:scale-105'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: formData.color }}
                    >
                      {formData.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {formData.roleName || 'Role Name'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formData.description || 'No description'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Permissions */}
            {step === 2 && (
              <div>
                <PermissionMatrixEditor
                  initialPermissions={formData.permissions}
                  onChange={(permissions) => setFormData({ ...formData, permissions })}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <button
              onClick={step === 1 ? handleClose : handlePrevious}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              {step === 1 ? (
                'Cancel'
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </>
              )}
            </button>

            <button
              onClick={step === 1 ? handleNext : handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                'Creating...'
              ) : step === 1 ? (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create Role
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
