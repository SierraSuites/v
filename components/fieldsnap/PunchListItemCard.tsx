"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  type PunchListItem,
  type PunchListStatus,
  punchListService,
  getSeverityColor,
  getSeverityIcon,
  getStatusColor,
  getStatusDisplayName,
  isOverdue,
  getDaysUntilDue
} from '@/lib/punchlist'

interface PunchListItemCardProps {
  item: PunchListItem
  compact?: boolean
  onClick?: () => void
  onUpdated?: () => void
}

export default function PunchListItemCard({
  item,
  compact = false,
  onClick,
  onUpdated
}: PunchListItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  const overdue = isOverdue(item)
  const daysUntilDue = getDaysUntilDue(item)

  const handleStatusChange = async (newStatus: PunchListStatus) => {
    try {
      setIsUpdating(true)
      await punchListService.updateStatus(item.id, newStatus)
      setShowStatusMenu(false)
      onUpdated?.()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  // Compact view for sidebars/lists
  if (compact) {
    return (
      <div
        onClick={onClick}
        className="bg-white rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md"
        style={{ borderColor: '#E0E0E0' }}
      >
        <div className="flex items-start gap-3">
          {/* Severity Indicator */}
          <div
            className="w-1 h-full rounded-full flex-shrink-0"
            style={{ backgroundColor: getSeverityColor(item.severity) }}
          />

          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate" style={{ color: '#1A1A1A' }}>
                {item.title}
              </h4>
              <span className="text-xs flex-shrink-0">{getSeverityIcon(item.severity)}</span>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2 py-0.5 rounded text-xs font-semibold"
                style={{
                  backgroundColor: `${getStatusColor(item.status)}20`,
                  color: getStatusColor(item.status)
                }}
              >
                {getStatusDisplayName(item.status)}
              </span>
              {item.ai_generated && (
                <span className="text-xs" title="AI-Generated">🤖</span>
              )}
              {overdue && (
                <span className="text-xs" style={{ color: '#DC2626' }}>⏰ Overdue</span>
              )}
            </div>

            {/* Due Date */}
            {item.due_date && (
              <p className="text-xs" style={{ color: overdue ? '#DC2626' : '#6B7280' }}>
                Due: {new Date(item.due_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Full card view
  return (
    <div className="bg-white rounded-xl border overflow-hidden transition-all hover:shadow-lg" style={{ borderColor: '#E0E0E0' }}>
      {/* Header */}
      <div
        className="p-4 border-l-4"
        style={{
          borderColor: getSeverityColor(item.severity),
          backgroundColor: `${getSeverityColor(item.severity)}05`
        }}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{getSeverityIcon(item.severity)}</span>
              <h3
                className="font-bold text-lg cursor-pointer hover:underline"
                style={{ color: '#1A1A1A' }}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {item.title}
              </h3>
            </div>

            {item.description && (
              <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                {isExpanded || item.description.length < 150
                  ? item.description
                  : `${item.description.substring(0, 150)}...`}
                {!isExpanded && item.description.length > 150 && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="ml-2 text-xs font-semibold hover:underline"
                    style={{ color: '#FF6B6B' }}
                  >
                    Read more
                  </button>
                )}
              </p>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: '#6B7280' }}>
              {item.location_description && (
                <span>📍 {item.location_description}</span>
              )}
              {item.trade && (
                <span>🔧 {item.trade}</span>
              )}
              {item.category && (
                <span className="px-2 py-1 rounded" style={{ backgroundColor: '#F3F4F6' }}>
                  {item.category.toUpperCase()}
                </span>
              )}
              {item.ai_generated && (
                <span className="px-2 py-1 rounded" style={{ backgroundColor: '#E0E7FF', color: '#3730A3' }}>
                  🤖 AI-Generated ({Math.round((item.ai_confidence || 0) * 100)}% confidence)
                </span>
              )}
            </div>
          </div>

          {/* Severity Badge */}
          <div className="flex-shrink-0">
            <div
              className="px-3 py-1 rounded-lg text-xs font-bold uppercase"
              style={{
                backgroundColor: getSeverityColor(item.severity),
                color: '#FFFFFF'
              }}
            >
              {item.severity}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Status */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>STATUS</p>
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="w-full px-3 py-2 rounded-lg font-semibold text-sm text-white flex items-center justify-between transition-colors hover:opacity-90"
                style={{ backgroundColor: getStatusColor(item.status) }}
                disabled={isUpdating}
              >
                {getStatusDisplayName(item.status)}
                <span>▼</span>
              </button>

              {/* Status Dropdown */}
              {showStatusMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border shadow-lg z-10" style={{ borderColor: '#E0E0E0' }}>
                  {(['open', 'in_progress', 'pending_review', 'resolved', 'closed'] as PunchListStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                      style={{ color: '#374151' }}
                      disabled={status === item.status}
                    >
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: getStatusColor(status) }}
                      />
                      {getStatusDisplayName(status)}
                      {status === item.status && <span className="float-right">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>DUE DATE</p>
            {item.due_date ? (
              <div>
                <p className="font-semibold text-sm" style={{ color: overdue ? '#DC2626' : '#1A1A1A' }}>
                  {new Date(item.due_date).toLocaleDateString()}
                </p>
                {daysUntilDue !== null && (
                  <p className="text-xs mt-1" style={{ color: overdue ? '#DC2626' : '#6B7280' }}>
                    {overdue
                      ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''} overdue`
                      : daysUntilDue === 0
                      ? 'Due today'
                      : `${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} remaining`}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: '#9CA3AF' }}>No due date set</p>
            )}
          </div>

          {/* Assigned To */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>ASSIGNED TO</p>
            {item.assigned_user ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white" style={{ backgroundColor: '#6A9BFD' }}>
                  {(item.assigned_user as any).email?.[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>
                    {(item.assigned_user as any).user_metadata?.full_name || (item.assigned_user as any).email}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Unassigned</p>
            )}
          </div>
        </div>

        {/* Photo Preview */}
        {item.photo && (
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>RELATED PHOTO</p>
            <Link
              href={`/fieldsnap/${item.photo_id}`}
              className="block relative w-full h-48 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
            >
              <Image
                src={(item.photo as any).thumbnail_url || (item.photo as any).url}
                alt="Related photo"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <p className="absolute bottom-2 left-2 text-white text-xs font-semibold">
                📸 {(item.photo as any).filename}
              </p>
            </Link>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
            {item.estimated_cost && (
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>ESTIMATED COST</p>
                <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>
                  ${item.estimated_cost.toLocaleString()}
                </p>
              </div>
            )}

            {item.ai_details && (
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>AI ANALYSIS DETAILS</p>
                <pre className="text-xs p-2 rounded" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>
                  {JSON.stringify(item.ai_details, null, 2)}
                </pre>
              </div>
            )}

            <div className="text-xs" style={{ color: '#9CA3AF' }}>
              <p>Created: {new Date(item.created_at).toLocaleString()}</p>
              {item.updated_at !== item.created_at && (
                <p>Updated: {new Date(item.updated_at).toLocaleString()}</p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
          <Link
            href={`/projects/${item.project_id}/punch-list/${item.id}`}
            className="flex-1 px-4 py-2 rounded-lg text-center font-semibold text-sm transition-colors hover:bg-gray-50"
            style={{ border: '1px solid #E5E7EB', color: '#374151' }}
          >
            View Details
          </Link>
          {onClick && (
            <button
              onClick={onClick}
              className="flex-1 px-4 py-2 rounded-lg text-white font-semibold text-sm transition-transform hover:scale-105"
              style={{ backgroundColor: '#FF6B6B' }}
            >
              Manage
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
