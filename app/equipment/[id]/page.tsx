'use client'

/**
 * Equipment Detail Page
 * View equipment details, checkout/checkin, maintenance history
 */

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeftIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline'

interface Equipment {
  id: string
  name: string
  category: string
  status: string
  condition: string
  manufacturer?: string
  model_number?: string
  serial_number?: string
  ownership_type: string
  purchase_date?: string
  purchase_cost?: number
  current_location?: string
  next_maintenance_date?: string
  maintenance_interval_days: number
  hours_used?: number
  notes?: string
  qr_code?: string
  current_project?: { name: string }
  assigned_user?: { full_name: string; email: string }
  maintenance_records?: any[]
  assignment_history?: any[]
}

export default function EquipmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [showCheckinModal, setShowCheckinModal] = useState(false)

  useEffect(() => {
    if (id) {
      loadEquipment()
    }
  }, [id])

  async function loadEquipment() {
    try {
      const res = await fetch(`/api/equipment/${id}`)
      if (res.ok) {
        const data = await res.json()
        setEquipment(data.equipment)
      }
    } catch (error) {
      console.error('Error loading equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Equipment not found</h2>
          <button
            onClick={() => router.push('/equipment')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            ← Back to equipment list
          </button>
        </div>
      </div>
    )
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'in_use':
        return 'bg-blue-100 text-blue-800'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800'
      case 'repair':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/equipment')}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Equipment
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{equipment.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {equipment.manufacturer} {equipment.model_number}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {equipment.status === 'available' && (
              <button
                onClick={() => setShowCheckoutModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Check Out
              </button>
            )}
            {equipment.status === 'in_use' && (
              <button
                onClick={() => setShowCheckinModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                Check In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Status</p>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
              equipment.status
            )}`}
          >
            {equipment.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Condition</p>
          <p className="text-lg font-semibold text-gray-900">
            {equipment.condition.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Hours Used</p>
          <p className="text-lg font-semibold text-gray-900">{equipment.hours_used || 0}h</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Next Maintenance</p>
          <p className="text-lg font-semibold text-gray-900">
            {equipment.next_maintenance_date
              ? new Date(equipment.next_maintenance_date).toLocaleDateString()
              : 'Not scheduled'}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <WrenchScrewdriverIcon className="w-5 h-5" />
            Equipment Details
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Category</dt>
              <dd className="text-sm font-medium text-gray-900">
                {equipment.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </dd>
            </div>
            {equipment.serial_number && (
              <div>
                <dt className="text-sm text-gray-500">Serial Number</dt>
                <dd className="text-sm font-medium text-gray-900">{equipment.serial_number}</dd>
              </div>
            )}
            {equipment.qr_code && (
              <div>
                <dt className="text-sm text-gray-500">QR Code</dt>
                <dd className="text-sm font-mono text-gray-900">{equipment.qr_code}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500">Ownership</dt>
              <dd className="text-sm font-medium text-gray-900">
                {equipment.ownership_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </dd>
            </div>
            {equipment.purchase_date && (
              <div>
                <dt className="text-sm text-gray-500">Purchase Date</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(equipment.purchase_date).toLocaleDateString()}
                </dd>
              </div>
            )}
            {equipment.purchase_cost && (
              <div>
                <dt className="text-sm text-gray-500">Purchase Cost</dt>
                <dd className="text-sm font-medium text-gray-900">
                  ${equipment.purchase_cost.toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Assignment</h2>
          {equipment.status === 'in_use' ? (
            <dl className="space-y-3">
              {equipment.assigned_user && (
                <div>
                  <dt className="text-sm text-gray-500">Assigned To</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {equipment.assigned_user.full_name}
                  </dd>
                  <dd className="text-xs text-gray-500">{equipment.assigned_user.email}</dd>
                </div>
              )}
              {equipment.current_project && (
                <div>
                  <dt className="text-sm text-gray-500">Project</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {equipment.current_project.name}
                  </dd>
                </div>
              )}
              {equipment.current_location && (
                <div>
                  <dt className="text-sm text-gray-500">Location</dt>
                  <dd className="text-sm font-medium text-gray-900">{equipment.current_location}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-500">Not currently assigned</p>
          )}
        </div>
      </div>

      {/* Maintenance History */}
      {equipment.maintenance_records && equipment.maintenance_records.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClipboardDocumentListIcon className="w-5 h-5" />
            Maintenance History
          </h2>
          <div className="space-y-4">
            {equipment.maintenance_records.slice(0, 5).map((record: any) => (
              <div key={record.id} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {record.maintenance_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </p>
                    <p className="text-sm text-gray-600">{record.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(record.maintenance_date).toLocaleDateString()}
                      {record.performed_by_user && ` • ${record.performed_by_user.full_name}`}
                    </p>
                  </div>
                  {record.cost && (
                    <span className="text-sm font-medium text-gray-900">
                      ${record.cost.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {equipment.notes && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{equipment.notes}</p>
        </div>
      )}

      {/* Checkout Modal - Simplified for now */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Check Out Equipment</h2>
            <p className="text-sm text-gray-600 mb-4">
              Checkout functionality requires team member selection. Please implement with team data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkin Modal */}
      {showCheckinModal && (
        <CheckinModal
          equipmentId={equipment.id}
          onClose={() => setShowCheckinModal(false)}
          onSuccess={() => {
            setShowCheckinModal(false)
            loadEquipment()
          }}
        />
      )}
    </div>
  )
}

function CheckinModal({
  equipmentId,
  onClose,
  onSuccess,
}: {
  equipmentId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    condition_at_checkin: 'good',
    hours_used: '',
    damage_reported: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/equipment/${equipmentId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          hours_used: form.hours_used ? parseFloat(form.hours_used) : null,
        }),
      })

      if (res.ok) {
        onSuccess()
      } else {
        alert('Failed to check in equipment')
      }
    } catch (error) {
      console.error('Error checking in:', error)
      alert('Failed to check in equipment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Check In Equipment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition
            </label>
            <select
              value={form.condition_at_checkin}
              onChange={(e) => setForm({ ...form, condition_at_checkin: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="needs_repair">Needs Repair</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hours Used (optional)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.hours_used}
              onChange={(e) => setForm({ ...form, hours_used: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Damage Report (if any)
            </label>
            <textarea
              value={form.damage_reported}
              onChange={(e) => setForm({ ...form, damage_reported: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Checking In...' : 'Check In'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
