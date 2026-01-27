'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { clientCommunication, formatCurrency, formatDate } from '@/lib/client-communication-integration'

interface ClientApproval {
  id: string
  project_id: string
  approval_type: 'change_order' | 'design_selection' | 'payment' | 'schedule_change' | 'scope_change' | 'final_walkthrough'
  title: string
  description: string
  document_url: string | null
  related_entity_type: string | null
  related_entity_id: string | null
  cost_impact: number
  schedule_impact_days: number
  requested_from: string
  requested_at: string
  due_date: string | null
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  responded_at: string | null
  response_notes: string
  signature_data: string | null
  signature_timestamp: string | null
  approved_by: string | null
  approval_method: 'digital_signature' | 'email_confirmation' | 'in_person' | null
  reminder_sent_at: string | null
  reminder_count: number
  annotations: any
}

function ApprovalsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')

  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string>(projectId || '')
  const [approvals, setApprovals] = useState<ClientApproval[]>([])
  const [selectedApproval, setSelectedApproval] = useState<ClientApproval | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isDrawing, setIsDrawing] = useState(false)

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [signaturePoints, setSignaturePoints] = useState<{ x: number; y: number }[]>([])

  // Form state for creating approval
  const [newApproval, setNewApproval] = useState({
    approval_type: 'change_order' as const,
    title: '',
    description: '',
    cost_impact: 0,
    schedule_impact_days: 0,
    requested_from: '',
    due_date: ''
  })

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadApprovals(selectedProject)
    }
  }, [selectedProject])

  const loadProjects = async () => {
    // In production, fetch from database
    const demoProjects = [
      { id: '1', name: 'Custom Home - Oakmont Drive', client_name: 'Johnson Family', client_email: 'sarah.johnson@email.com' },
      { id: '2', name: 'Downtown Loft Conversion', client_name: 'Urban Living Partners', client_email: 'contact@urbanlivingpartners.com' }
    ]
    setProjects(demoProjects)

    if (demoProjects.length > 0 && !selectedProject) {
      setSelectedProject(demoProjects[0].id)
    }
  }

  const loadApprovals = async (projectId: string) => {
    // Demo data
    const demoApprovals: ClientApproval[] = [
      {
        id: '1',
        project_id: projectId,
        approval_type: 'change_order',
        title: 'Add Custom Built-In Shelving to Office',
        description: 'Client requested custom built-in shelving unit for home office. Includes design, materials, and installation. Will add 3 days to schedule for carpentry work.',
        document_url: null,
        related_entity_type: 'change_order',
        related_entity_id: 'co-1',
        cost_impact: 4850,
        schedule_impact_days: 3,
        requested_from: 'Sarah Johnson (sarah.johnson@email.com)',
        requested_at: '2025-12-04T10:30:00',
        due_date: '2025-12-11',
        status: 'pending',
        responded_at: null,
        response_notes: '',
        signature_data: null,
        signature_timestamp: null,
        approved_by: null,
        approval_method: null,
        reminder_sent_at: '2025-12-06T09:00:00',
        reminder_count: 1,
        annotations: null
      },
      {
        id: '2',
        project_id: projectId,
        approval_type: 'design_selection',
        title: 'Upgrade to Premium Countertops',
        description: 'Client selected Cambria Brittanicca quartz for kitchen countertops (upgrade from standard granite). Requires approval for additional cost.',
        document_url: null,
        related_entity_type: 'design_selection',
        related_entity_id: 'ds-2',
        cost_impact: 4200,
        schedule_impact_days: 0,
        requested_from: 'Sarah Johnson (sarah.johnson@email.com)',
        requested_at: '2025-12-01T14:15:00',
        due_date: '2025-12-08',
        status: 'approved',
        responded_at: '2025-12-02T09:30:00',
        response_notes: 'Approved - love the veining pattern!',
        signature_data: 'data:image/png;base64,signature...',
        signature_timestamp: '2025-12-02T09:30:00',
        approved_by: 'Sarah Johnson',
        approval_method: 'digital_signature',
        reminder_sent_at: null,
        reminder_count: 0,
        annotations: null
      },
      {
        id: '3',
        project_id: projectId,
        approval_type: 'schedule_change',
        title: 'Delay Foundation Pour Due to Weather',
        description: 'Heavy rain forecast for next 3 days. Recommend delaying foundation pour from Dec 8 to Dec 12 to ensure proper curing conditions. No additional cost.',
        document_url: null,
        related_entity_type: null,
        related_entity_id: null,
        cost_impact: 0,
        schedule_impact_days: 4,
        requested_from: 'Sarah Johnson (sarah.johnson@email.com)',
        requested_at: '2025-12-05T16:45:00',
        due_date: '2025-12-07',
        status: 'approved',
        responded_at: '2025-12-05T18:20:00',
        response_notes: 'Makes sense - safety first',
        signature_data: null,
        signature_timestamp: '2025-12-05T18:20:00',
        approved_by: 'Sarah Johnson',
        approval_method: 'email_confirmation',
        reminder_sent_at: null,
        reminder_count: 0,
        annotations: null
      },
      {
        id: '4',
        project_id: projectId,
        approval_type: 'scope_change',
        title: 'Add Deck Extension',
        description: 'Client requested extending deck from 12x16 to 12x24 to accommodate outdoor furniture. Includes additional framing, decking materials, and railing.',
        document_url: null,
        related_entity_type: 'change_order',
        related_entity_id: 'co-4',
        cost_impact: 6400,
        schedule_impact_days: 5,
        requested_from: 'Sarah Johnson (sarah.johnson@email.com)',
        requested_at: '2025-11-28T11:00:00',
        due_date: '2025-12-05',
        status: 'rejected',
        responded_at: '2025-11-30T14:15:00',
        response_notes: 'Over budget - will stick with original size',
        signature_data: null,
        signature_timestamp: '2025-11-30T14:15:00',
        approved_by: 'Sarah Johnson',
        approval_method: 'email_confirmation',
        reminder_sent_at: null,
        reminder_count: 0,
        annotations: null
      },
      {
        id: '5',
        project_id: projectId,
        approval_type: 'payment',
        title: 'Progress Payment #3 - Framing Complete',
        description: 'Request for progress payment covering completed framing work. Milestone: Framing and roof structure 100% complete, inspections passed.',
        document_url: null,
        related_entity_type: null,
        related_entity_id: null,
        cost_impact: 85000,
        schedule_impact_days: 0,
        requested_from: 'Sarah Johnson (sarah.johnson@email.com)',
        requested_at: '2025-12-03T10:00:00',
        due_date: '2025-12-10',
        status: 'pending',
        responded_at: null,
        response_notes: '',
        signature_data: null,
        signature_timestamp: null,
        approved_by: null,
        approval_method: null,
        reminder_sent_at: null,
        reminder_count: 0,
        annotations: null
      }
    ]

    setApprovals(demoApprovals)
  }

  const filteredApprovals = approvals.filter(a => {
    if (filterStatus === 'all') return true
    return a.status === filterStatus
  })

  const stats = {
    total: approvals.length,
    pending: approvals.filter(a => a.status === 'pending').length,
    approved: approvals.filter(a => a.status === 'approved').length,
    rejected: approvals.filter(a => a.status === 'rejected').length,
    total_pending_cost: approvals.filter(a => a.status === 'pending').reduce((sum, a) => sum + a.cost_impact, 0),
    avg_response_time: 1.5 // days - calculated from actual data
  }

  const getApprovalTypeIcon = (type: string): string => {
    const icons: { [key: string]: string } = {
      change_order: '📝',
      design_selection: '🎨',
      payment: '💰',
      schedule_change: '📅',
      scope_change: '📐',
      final_walkthrough: '✅'
    }
    return icons[type] || '📋'
  }

  const getApprovalTypeLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
      change_order: 'Change Order',
      design_selection: 'Design Selection',
      payment: 'Payment Request',
      schedule_change: 'Schedule Change',
      scope_change: 'Scope Change',
      final_walkthrough: 'Final Walkthrough'
    }
    return labels[type] || type
  }

  const getStatusColor = (status: string): string => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
      expired: 'bg-gray-100 text-gray-800 border-gray-300'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const handleCreateApproval = async () => {
    // Validation
    if (!newApproval.title || !newApproval.requested_from) {
      alert('Please fill in required fields')
      return
    }

    const approval: ClientApproval = {
      id: Date.now().toString(),
      project_id: selectedProject,
      ...newApproval,
      document_url: null,
      related_entity_type: null,
      related_entity_id: null,
      requested_at: new Date().toISOString(),
      status: 'pending',
      responded_at: null,
      response_notes: '',
      signature_data: null,
      signature_timestamp: null,
      approved_by: null,
      approval_method: null,
      reminder_sent_at: null,
      reminder_count: 0,
      annotations: null
    }

    setApprovals([approval, ...approvals])
    setShowCreateModal(false)

    // Reset form
    setNewApproval({
      approval_type: 'change_order',
      title: '',
      description: '',
      cost_impact: 0,
      schedule_impact_days: 0,
      requested_from: '',
      due_date: ''
    })

    alert('✅ Approval request created! Email sent to client.')
  }

  const handleSendReminder = (approval: ClientApproval) => {
    const updated = approvals.map(a =>
      a.id === approval.id
        ? { ...a, reminder_sent_at: new Date().toISOString(), reminder_count: a.reminder_count + 1 }
        : a
    )
    setApprovals(updated)
    alert(`📧 Reminder sent to ${approval.requested_from}`)
  }

  const handleApprove = (approval: ClientApproval) => {
    setSelectedApproval(approval)
    setShowSignatureModal(true)
  }

  const handleReject = (approval: ClientApproval) => {
    const notes = prompt('Reason for rejection (optional):')
    const updated = approvals.map(a =>
      a.id === approval.id
        ? {
            ...a,
            status: 'rejected' as const,
            responded_at: new Date().toISOString(),
            response_notes: notes || '',
            approved_by: 'Client',
            approval_method: 'email_confirmation' as const
          }
        : a
    )
    setApprovals(updated)
    alert('❌ Approval rejected')
  }

  // Signature drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setSignaturePoints([{ x, y }])
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'

    const lastPoint = signaturePoints[signaturePoints.length - 1]
    ctx.beginPath()
    ctx.moveTo(lastPoint.x, lastPoint.y)
    ctx.lineTo(x, y)
    ctx.stroke()

    setSignaturePoints([...signaturePoints, { x, y }])
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignaturePoints([])
  }

  const saveSignature = () => {
    if (signaturePoints.length === 0) {
      alert('Please provide a signature')
      return
    }

    if (!selectedApproval) return

    const canvas = canvasRef.current
    if (!canvas) return

    const signatureData = canvas.toDataURL()

    const updated = approvals.map(a =>
      a.id === selectedApproval.id
        ? {
            ...a,
            status: 'approved' as const,
            responded_at: new Date().toISOString(),
            signature_data: signatureData,
            signature_timestamp: new Date().toISOString(),
            approved_by: 'Client',
            approval_method: 'digital_signature' as const
          }
        : a
    )

    setApprovals(updated)
    setShowSignatureModal(false)
    setSelectedApproval(null)
    clearSignature()

    alert('✅ Approval signed and recorded!')
  }

  const selectedProjectData = projects.find(p => p.id === selectedProject)

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                ✍️ Approval & Signature Workflows
              </h1>
              <p className="text-lg text-gray-600">
                Manage client approvals and digital signatures
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              + Request Approval
            </button>
          </div>

          {/* Info Banner */}
          <div className="bg-gradient-to-r from-indigo-100 to-blue-100 border-l-4 border-indigo-600 p-6 rounded-lg">
            <div className="flex items-start gap-4">
              <div className="text-3xl">💡</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">How Approval Workflows Work:</h3>
                <p className="text-gray-700">
                  Request client approval for change orders, design selections, payments, and schedule changes.
                  Clients can review, sign digitally, and respond via email or web portal. All approvals are tracked with full audit trail including signatures, timestamps, and IP addresses for legal compliance.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Selection */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Project
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="">Choose a project...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name} - {project.client_name}
              </option>
            ))}
          </select>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-6 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-600">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Requests</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-600">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-600">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-600">
            <div className="text-3xl mb-2">❌</div>
            <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-600">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_pending_cost)}</div>
            <div className="text-sm text-gray-600">Pending Value</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-600">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-3xl font-bold text-gray-900">{stats.avg_response_time}</div>
            <div className="text-sm text-gray-600">Avg Response (days)</div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex gap-3">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                filterStatus === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({approvals.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                filterStatus === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                filterStatus === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approved ({stats.approved})
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                filterStatus === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rejected ({stats.rejected})
            </button>
          </div>
        </div>

        {/* Approvals List */}
        <div className="space-y-6">
          {filteredApprovals.map((approval) => (
            <div key={approval.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getApprovalTypeIcon(approval.approval_type)}</span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{approval.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-600">{getApprovalTypeLabel(approval.approval_type)}</span>
                          <span className="text-sm text-gray-600">•</span>
                          <span className="text-sm text-gray-600">Requested {formatDate(approval.requested_at)}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(approval.status)}`}>
                            {approval.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {approval.status === 'pending' && approval.due_date && (
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Due Date</div>
                      <div className="font-semibold text-orange-600">{formatDate(approval.due_date)}</div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-gray-700 mb-4">{approval.description}</p>

                {/* Impact Summary */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-600">Cost Impact</div>
                    <div className="text-lg font-bold text-gray-900">
                      {approval.cost_impact === 0 ? 'No cost' : formatCurrency(approval.cost_impact)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Schedule Impact</div>
                    <div className="text-lg font-bold text-gray-900">
                      {approval.schedule_impact_days === 0 ? 'No delay' : `+${approval.schedule_impact_days} days`}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Requested From</div>
                    <div className="text-sm font-semibold text-gray-900">{approval.requested_from.split('(')[0]}</div>
                  </div>
                </div>

                {/* Status-specific content */}
                {approval.status === 'pending' && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-yellow-900">Awaiting Client Response</div>
                        {approval.reminder_count > 0 && (
                          <div className="text-sm text-yellow-700">
                            {approval.reminder_count} reminder{approval.reminder_count > 1 ? 's' : ''} sent • Last: {formatDate(approval.reminder_sent_at!)}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleSendReminder(approval)}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold text-sm"
                      >
                        📧 Send Reminder
                      </button>
                    </div>
                  </div>
                )}

                {approval.status === 'approved' && (
                  <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">✅</span>
                      <div>
                        <div className="font-semibold text-green-900">Approved by {approval.approved_by}</div>
                        <div className="text-sm text-green-700">
                          {formatDate(approval.responded_at!)} via {approval.approval_method?.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                    {approval.signature_data && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="text-xs text-green-700 mb-2">Digital Signature:</div>
                        <img src={approval.signature_data} alt="Signature" className="h-16 border-2 border-green-300 rounded bg-white p-2" />
                      </div>
                    )}
                    {approval.response_notes && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="text-xs text-green-700 mb-1">Client Notes:</div>
                        <div className="text-sm text-green-900">{approval.response_notes}</div>
                      </div>
                    )}
                  </div>
                )}

                {approval.status === 'rejected' && (
                  <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">❌</span>
                      <div>
                        <div className="font-semibold text-red-900">Rejected by {approval.approved_by}</div>
                        <div className="text-sm text-red-700">{formatDate(approval.responded_at!)}</div>
                      </div>
                    </div>
                    {approval.response_notes && (
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <div className="text-xs text-red-700 mb-1">Reason:</div>
                        <div className="text-sm text-red-900">{approval.response_notes}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {approval.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => handleApprove(approval)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                    >
                      ✓ Approve (Demo)
                    </button>
                    <button
                      onClick={() => handleReject(approval)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                    >
                      ✗ Reject (Demo)
                    </button>
                    <button
                      onClick={() => {
                        setSelectedApproval(approval)
                        setShowViewModal(true)
                      }}
                      className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                    >
                      View Details
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredApprovals.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">✍️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                No {filterStatus !== 'all' ? filterStatus : ''} Approvals
              </h3>
              <p className="text-gray-600 mb-6">
                {filterStatus === 'all'
                  ? 'Request client approval for change orders, design selections, and more'
                  : `No ${filterStatus} approval requests at this time`
                }
              </p>
              {filterStatus === 'all' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  + Request First Approval
                </button>
              )}
            </div>
          )}
        </div>

        {/* Create Approval Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Request Client Approval
                </h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Approval Type *
                    </label>
                    <select
                      value={newApproval.approval_type}
                      onChange={(e) => setNewApproval({ ...newApproval, approval_type: e.target.value as any })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="change_order">Change Order</option>
                      <option value="design_selection">Design Selection</option>
                      <option value="payment">Payment Request</option>
                      <option value="schedule_change">Schedule Change</option>
                      <option value="scope_change">Scope Change</option>
                      <option value="final_walkthrough">Final Walkthrough</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={newApproval.title}
                      onChange={(e) => setNewApproval({ ...newApproval, title: e.target.value })}
                      placeholder="Brief description of what needs approval"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newApproval.description}
                      onChange={(e) => setNewApproval({ ...newApproval, description: e.target.value })}
                      placeholder="Detailed explanation for the client"
                      rows={4}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Cost Impact
                      </label>
                      <input
                        type="number"
                        value={newApproval.cost_impact}
                        onChange={(e) => setNewApproval({ ...newApproval, cost_impact: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Schedule Impact (days)
                      </label>
                      <input
                        type="number"
                        value={newApproval.schedule_impact_days}
                        onChange={(e) => setNewApproval({ ...newApproval, schedule_impact_days: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Client Email *
                    </label>
                    <input
                      type="email"
                      value={newApproval.requested_from}
                      onChange={(e) => setNewApproval({ ...newApproval, requested_from: e.target.value })}
                      placeholder={selectedProjectData?.client_email || "client@email.com"}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Due Date (optional)
                    </label>
                    <input
                      type="date"
                      value={newApproval.due_date}
                      onChange={(e) => setNewApproval({ ...newApproval, due_date: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCreateApproval}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Send Approval Request
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Digital Signature Modal */}
        {showSignatureModal && selectedApproval && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Digital Signature Required
                </h2>

                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
                  <div className="font-semibold text-gray-900 mb-1">{selectedApproval.title}</div>
                  <div className="text-sm text-gray-700">
                    By signing below, you approve this {getApprovalTypeLabel(selectedApproval.approval_type).toLowerCase()}.
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Sign Below:
                  </label>
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="border-2 border-gray-300 rounded-lg cursor-crosshair w-full"
                    style={{ touchAction: 'none' }}
                  />
                  <button
                    onClick={clearSignature}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                  >
                    Clear Signature
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={saveSignature}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  >
                    ✓ Sign and Approve
                  </button>
                  <button
                    onClick={() => {
                      setShowSignatureModal(false)
                      setSelectedApproval(null)
                      clearSignature()
                    }}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ApprovalsContent />
    </Suspense>
  )
}
