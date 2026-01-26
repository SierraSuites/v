"use client"

import { useState, useEffect } from 'react'
import { punchListService } from '@/lib/punchlist'

interface QuickPunchItemModalProps {
  isOpen: boolean
  onClose: () => void
  photo: {
    id: string
    project_id: string | null
    filename: string
    url: string
    ai_analysis?: {
      defects: string[]
      safety_issues: string[]
    }
  }
  onSuccess?: () => void
}

export default function QuickPunchItemModal({
  isOpen,
  onClose,
  photo,
  onSuccess
}: QuickPunchItemModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<'critical' | 'major' | 'minor'>('major')
  const [category, setCategory] = useState<'safety' | 'quality' | 'progress' | 'other'>('quality')
  const [location, setLocation] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && photo) {
      // Auto-populate from AI analysis
      if (photo.ai_analysis) {
        if (photo.ai_analysis.safety_issues.length > 0) {
          setTitle(`Safety Issue: ${photo.ai_analysis.safety_issues[0]}`)
          setCategory('safety')
          setSeverity('critical')
          setDescription(photo.ai_analysis.safety_issues.join(', '))
        } else if (photo.ai_analysis.defects.length > 0) {
          setTitle(`Defect: ${photo.ai_analysis.defects[0]}`)
          setCategory('quality')
          setSeverity('major')
          setDescription(photo.ai_analysis.defects.join(', '))
        }
      }

      // Default title if no AI data
      if (!title) {
        setTitle(`Issue from ${photo.filename}`)
      }
    }
  }, [isOpen, photo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      alert('Please enter a title')
      return
    }

    if (!photo.project_id) {
      alert('This photo must be associated with a project to create a punch item')
      return
    }

    try {
      setLoading(true)

      await punchListService.create({
        project_id: photo.project_id,
        photo_id: photo.id,
        title: title.trim(),
        description: description.trim() || undefined,
        severity,
        category,
        location_description: location.trim() || undefined,
        assigned_to: assignedTo.trim() || undefined
      })

      // Reset form
      setTitle('')
      setDescription('')
      setSeverity('major')
      setCategory('quality')
      setLocation('')
      setAssignedTo('')

      // Success callback
      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (error) {
      console.error('Error creating punch item:', error)
      alert('Failed to create punch item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between" style={{ borderColor: '#E0E0E0' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
              style={{ backgroundColor: '#FEE2E2' }}
            >
              🚨
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Create Punch Item</h2>
              <p className="text-sm" style={{ color: '#6B7280' }}>Flag issue from photo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Photo Preview */}
        <div className="p-6 border-b" style={{ borderColor: '#E0E0E0' }}>
          <div className="flex items-center gap-4">
            <img
              src={photo.url}
              alt={photo.filename}
              className="w-24 h-24 rounded-lg object-cover"
              style={{ border: '2px solid #E0E0E0' }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: '#1A1A1A' }}>
                {photo.filename}
              </p>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                Photo ID: {photo.id.substring(0, 8)}...
              </p>

              {/* AI-detected issues */}
              {photo.ai_analysis && (photo.ai_analysis.defects.length > 0 || photo.ai_analysis.safety_issues.length > 0) && (
                <div className="mt-2 p-2 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#92400E' }}>🤖 AI Detected:</p>
                  <div className="flex flex-wrap gap-1">
                    {photo.ai_analysis.safety_issues.map((issue, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
                      >
                        ⚠️ {issue}
                      </span>
                    ))}
                    {photo.ai_analysis.defects.map((defect, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ backgroundColor: '#FED7AA', color: '#EA580C' }}
                      >
                        🔍 {defect}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4A4A4A' }}>
              Title <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm"
              style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
              placeholder="Brief description of the issue"
              required
              disabled={loading}
            />
          </div>

          {/* Severity & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4A4A4A' }}>
                Severity <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full px-4 py-3 rounded-lg text-sm"
                style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
                required
                disabled={loading}
              >
                <option value="critical">🔴 Critical - Immediate action required</option>
                <option value="major">🟠 Major - Needs attention soon</option>
                <option value="minor">🟡 Minor - Can wait</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4A4A4A' }}>
                Category <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-4 py-3 rounded-lg text-sm"
                style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
                required
                disabled={loading}
              >
                <option value="safety">⚠️ Safety Issue</option>
                <option value="quality">🔍 Quality Issue</option>
                <option value="progress">📋 Progress Item</option>
                <option value="other">📝 Other</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4A4A4A' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm"
              style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
              placeholder="Detailed description of the issue and what needs to be done..."
              rows={4}
              disabled={loading}
            />
          </div>

          {/* Location & Assigned To */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4A4A4A' }}>
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm"
                style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
                placeholder="e.g. Floor 3, Room 201"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4A4A4A' }}>
                Assign To
              </label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm"
                style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
                placeholder="Team member name or role"
                disabled={loading}
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#E5F4FF', border: '1px solid #BFDBFE' }}>
            <p className="text-xs" style={{ color: '#1E40AF' }}>
              💡 <strong>Tip:</strong> Punch items will be tracked through the entire resolution workflow:
              Open → In Progress → Resolved → Verified → Closed
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
              style={{ border: '1px solid #E5E7EB', color: '#374151' }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-lg font-semibold text-sm text-white transition-all"
              style={{ backgroundColor: loading ? '#9CA3AF' : '#FF6B6B' }}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                '🚨 Create Punch Item'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
