"use client"

import { useState } from 'react'
import { punchListService } from '@/lib/punchlist'
import { createClient } from '@/lib/supabase/client'

interface ResolutionWorkflowProps {
  punchItem: {
    id: string
    title: string
    status: 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed'
    severity: 'critical' | 'major' | 'minor'
    photo_id: string
    proof_photo_id?: string | null
  }
  onStatusChange: () => void
}

export default function ResolutionWorkflow({
  punchItem,
  onStatusChange
}: ResolutionWorkflowProps) {
  const [uploading, setUploading] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotesInput, setShowNotesInput] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload proof photo
      const fileExt = file.name.split('.').pop()
      const fileName = `${punchItem.id}_proof_${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('fieldsnap-photos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('fieldsnap-photos')
        .getPublicUrl(filePath)

      // Create media asset for proof photo
      const { data: mediaAsset, error: mediaError } = await supabase
        .from('media_assets')
        .insert({
          user_id: user.id,
          project_id: null, // Proof photos aren't tied to projects
          url: publicUrl,
          filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          width: 0,
          height: 0
        })
        .select()
        .single()

      if (mediaError) throw mediaError

      // Add comment with proof photo
      await punchListService.addComment(punchItem.id, {
        comment: 'Resolution proof photo uploaded',
        comment_type: 'resolution',
        resolved: true,
        photo_proof_id: mediaAsset.id
      })

      // Update punch item status
      await punchListService.update(punchItem.id, {
        status: 'resolved'
      })

      onStatusChange()
    } catch (error) {
      console.error('Error uploading proof photo:', error)
      alert('Failed to upload proof photo. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleStatusUpdate = async (newStatus: typeof punchItem.status) => {
    try {
      // Update status
      await punchListService.update(punchItem.id, {
        status: newStatus
      })

      // Add comment if notes provided
      if (notes.trim()) {
        await punchListService.addComment(punchItem.id, {
          comment: notes,
          comment_type: 'status_change'
        })
      }

      setNotes('')
      setShowNotesInput(false)
      onStatusChange()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#DC2626'
      case 'in_progress': return '#F59E0B'
      case 'resolved': return '#10B981'
      case 'verified': return '#6BCB77'
      case 'closed': return '#6B7280'
      default: return '#6B7280'
    }
  }

  const workflowSteps = [
    { key: 'open', label: 'Open', icon: '🔴', description: 'Issue identified' },
    { key: 'in_progress', label: 'In Progress', icon: '🟡', description: 'Being worked on' },
    { key: 'resolved', label: 'Resolved', icon: '🟢', description: 'Fix completed' },
    { key: 'verified', label: 'Verified', icon: '✅', description: 'Fix confirmed' },
    { key: 'closed', label: 'Closed', icon: '🔒', description: 'Archived' }
  ]

  const currentStepIndex = workflowSteps.findIndex(step => step.key === punchItem.status)

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: '#E0E0E0' }}>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{
              backgroundColor:
                punchItem.severity === 'critical' ? '#FEE2E2' :
                punchItem.severity === 'major' ? '#FED7AA' : '#FEF3C7'
            }}
          >
            {punchItem.severity === 'critical' ? '🚨' :
             punchItem.severity === 'major' ? '⚠️' : '📝'}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg" style={{ color: '#1A1A1A' }}>Resolution Workflow</h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>Track this item through to completion</p>
          </div>
        </div>

        {/* Current Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: '#4A4A4A' }}>Current Status:</span>
          <span
            className="px-3 py-1 rounded-full text-sm font-bold"
            style={{
              backgroundColor: `${getStatusColor(punchItem.status)}20`,
              color: getStatusColor(punchItem.status)
            }}
          >
            {workflowSteps[currentStepIndex].icon} {workflowSteps[currentStepIndex].label}
          </span>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="p-6">
        <div className="relative">
          {/* Progress Line */}
          <div
            className="absolute left-6 top-6 bottom-6 w-0.5"
            style={{ backgroundColor: '#E0E0E0' }}
          />

          {/* Steps */}
          <div className="space-y-6">
            {workflowSteps.map((step, index) => {
              const isCompleted = index < currentStepIndex
              const isCurrent = index === currentStepIndex
              const isUpcoming = index > currentStepIndex

              return (
                <div key={step.key} className="relative flex items-start gap-4">
                  {/* Step Icon */}
                  <div
                    className={`
                      relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-xl
                      transition-all
                      ${isCurrent ? 'ring-4 ring-offset-2' : ''}
                    `}
                    style={{
                      backgroundColor: isCompleted || isCurrent ? getStatusColor(step.key) : '#F3F4F6',
                      color: isCompleted || isCurrent ? '#FFFFFF' : '#9CA3AF',
                      ringColor: isCurrent ? `${getStatusColor(step.key)}40` : undefined
                    }}
                  >
                    {step.icon}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4
                        className="font-bold text-sm"
                        style={{ color: isCompleted || isCurrent ? '#1A1A1A' : '#9CA3AF' }}
                      >
                        {step.label}
                      </h4>
                      {isCompleted && (
                        <span className="text-xs" style={{ color: '#10B981' }}>✓ Complete</span>
                      )}
                      {isCurrent && (
                        <span className="text-xs font-semibold" style={{ color: getStatusColor(step.key) }}>
                          ● In Progress
                        </span>
                      )}
                    </div>
                    <p
                      className="text-xs mb-2"
                      style={{ color: isCompleted || isCurrent ? '#6B7280' : '#9CA3AF' }}
                    >
                      {step.description}
                    </p>

                    {/* Actions for current step */}
                    {isCurrent && (
                      <div className="mt-3 space-y-2">
                        {step.key === 'open' && (
                          <button
                            onClick={() => handleStatusUpdate('in_progress')}
                            className="w-full px-4 py-2 rounded-lg font-semibold text-sm text-white transition-colors"
                            style={{ backgroundColor: '#F59E0B' }}
                          >
                            🟡 Start Working on This
                          </button>
                        )}

                        {step.key === 'in_progress' && (
                          <div className="space-y-2">
                            <label
                              htmlFor={`proof-upload-${punchItem.id}`}
                              className="block w-full px-4 py-2 rounded-lg font-semibold text-sm text-white text-center cursor-pointer transition-colors"
                              style={{ backgroundColor: uploading ? '#9CA3AF' : '#10B981' }}
                            >
                              {uploading ? '⏳ Uploading...' : '📸 Upload Proof Photo & Mark Resolved'}
                            </label>
                            <input
                              id={`proof-upload-${punchItem.id}`}
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              disabled={uploading}
                              className="hidden"
                            />
                            <button
                              onClick={() => handleStatusUpdate('resolved')}
                              className="w-full px-4 py-2 rounded-lg font-semibold text-sm border hover:bg-gray-50 transition-colors"
                              style={{ borderColor: '#E5E7EB', color: '#374151' }}
                            >
                              Mark Resolved (No Photo)
                            </button>
                          </div>
                        )}

                        {step.key === 'resolved' && (
                          <div className="space-y-2">
                            <button
                              onClick={() => handleStatusUpdate('verified')}
                              className="w-full px-4 py-2 rounded-lg font-semibold text-sm text-white transition-colors"
                              style={{ backgroundColor: '#6BCB77' }}
                            >
                              ✅ Verify & Approve Fix
                            </button>
                            <button
                              onClick={() => handleStatusUpdate('in_progress')}
                              className="w-full px-4 py-2 rounded-lg font-semibold text-sm border hover:bg-red-50 transition-colors"
                              style={{ borderColor: '#DC2626', color: '#DC2626' }}
                            >
                              ❌ Reject - Needs More Work
                            </button>
                          </div>
                        )}

                        {step.key === 'verified' && (
                          <button
                            onClick={() => handleStatusUpdate('closed')}
                            className="w-full px-4 py-2 rounded-lg font-semibold text-sm text-white transition-colors"
                            style={{ backgroundColor: '#6B7280' }}
                          >
                            🔒 Close & Archive
                          </button>
                        )}

                        {/* Optional Notes */}
                        {!showNotesInput ? (
                          <button
                            onClick={() => setShowNotesInput(true)}
                            className="w-full px-4 py-2 rounded-lg font-semibold text-xs hover:bg-gray-50 transition-colors"
                            style={{ border: '1px dashed #E5E7EB', color: '#6B7280' }}
                          >
                            + Add Notes
                          </button>
                        ) : (
                          <div>
                            <textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Add resolution notes..."
                              className="w-full px-3 py-2 rounded-lg text-sm"
                              style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
                              rows={3}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer Tips */}
      <div className="p-4 border-t" style={{ borderColor: '#E0E0E0', backgroundColor: '#F8F9FA' }}>
        <p className="text-xs" style={{ color: '#6B7280' }}>
          💡 <strong>Tip:</strong> Upload a proof photo when marking items as resolved to document the completed work.
        </p>
      </div>
    </div>
  )
}
