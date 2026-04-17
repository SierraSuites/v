'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const APPROVAL_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  change_order:      { label: 'Change Order',       icon: null },
  design_selection:  { label: 'Design Selection',   icon: null },
  payment:           { label: 'Payment Request',    icon: null },
  schedule_change:   { label: 'Schedule Change',    icon: null },
  scope_change:      { label: 'Scope Change',       icon: null },
  final_walkthrough: { label: 'Final Walkthrough',  icon: null },
}

const STATUS_CONFIG: Record<string, { color: string; darkColor: string; bg: string; darkBg: string; label: string }> = {
  pending:  { color: '#D97706', darkColor: '#FBBF24', bg: '#FEF3C7', darkBg: 'rgba(251,191,36,0.12)', label: 'Pending' },
  approved: { color: '#16A34A', darkColor: '#4ADE80', bg: '#DCFCE7', darkBg: 'rgba(34,197,94,0.12)',  label: 'Approved' },
  rejected: { color: '#DC2626', darkColor: '#F87171', bg: '#FEE2E2', darkBg: 'rgba(239,68,68,0.12)',  label: 'Rejected' },
  expired:  { color: '#6B7280', darkColor: '#9CA3AF', bg: '#F3F4F6', darkBg: 'rgba(107,114,128,0.12)', label: 'Expired' },
}

const DEMO_APPROVALS: ClientApproval[] = [
  {
    id: '1', project_id: '', approval_type: 'change_order',
    title: 'Add Custom Built-In Shelving to Office',
    description: 'Client requested custom built-in shelving unit for home office. Includes design, materials, and installation. Will add 3 days to schedule for carpentry work.',
    document_url: null, related_entity_type: 'change_order', related_entity_id: 'co-1',
    cost_impact: 4850, schedule_impact_days: 3,
    requested_from: 'Sarah Johnson (sarah.johnson@email.com)',
    requested_at: '2026-04-04T10:30:00', due_date: '2026-04-11', status: 'pending',
    responded_at: null, response_notes: '', signature_data: null, signature_timestamp: null,
    approved_by: null, approval_method: null,
    reminder_sent_at: '2026-04-06T09:00:00', reminder_count: 1, annotations: null,
  },
  {
    id: '2', project_id: '', approval_type: 'design_selection',
    title: 'Upgrade to Premium Countertops',
    description: 'Client selected Cambria Brittanicca quartz for kitchen countertops (upgrade from standard granite). Requires approval for additional cost.',
    document_url: null, related_entity_type: 'design_selection', related_entity_id: 'ds-2',
    cost_impact: 4200, schedule_impact_days: 0,
    requested_from: 'Sarah Johnson (sarah.johnson@email.com)',
    requested_at: '2026-04-01T14:15:00', due_date: '2026-04-08', status: 'approved',
    responded_at: '2026-04-02T09:30:00', response_notes: 'Approved - love the veining pattern!',
    signature_data: 'data:image/png;base64,signature...', signature_timestamp: '2026-04-02T09:30:00',
    approved_by: 'Sarah Johnson', approval_method: 'digital_signature',
    reminder_sent_at: null, reminder_count: 0, annotations: null,
  },
  {
    id: '3', project_id: '', approval_type: 'schedule_change',
    title: 'Delay Foundation Pour Due to Weather',
    description: 'Heavy rain forecast for next 3 days. Recommend delaying foundation pour from Apr 8 to Apr 12 to ensure proper curing conditions. No additional cost.',
    document_url: null, related_entity_type: null, related_entity_id: null,
    cost_impact: 0, schedule_impact_days: 4,
    requested_from: 'Sarah Johnson (sarah.johnson@email.com)',
    requested_at: '2026-04-05T16:45:00', due_date: '2026-04-07', status: 'approved',
    responded_at: '2026-04-05T18:20:00', response_notes: 'Makes sense - safety first',
    signature_data: null, signature_timestamp: '2026-04-05T18:20:00',
    approved_by: 'Sarah Johnson', approval_method: 'email_confirmation',
    reminder_sent_at: null, reminder_count: 0, annotations: null,
  },
  {
    id: '4', project_id: '', approval_type: 'scope_change',
    title: 'Add Deck Extension',
    description: 'Client requested extending deck from 12x16 to 12x24 to accommodate outdoor furniture. Includes additional framing, decking materials, and railing.',
    document_url: null, related_entity_type: 'change_order', related_entity_id: 'co-4',
    cost_impact: 6400, schedule_impact_days: 5,
    requested_from: 'Sarah Johnson (sarah.johnson@email.com)',
    requested_at: '2026-03-28T11:00:00', due_date: '2026-04-05', status: 'rejected',
    responded_at: '2026-03-30T14:15:00', response_notes: 'Over budget - will stick with original size',
    signature_data: null, signature_timestamp: '2026-03-30T14:15:00',
    approved_by: 'Sarah Johnson', approval_method: 'email_confirmation',
    reminder_sent_at: null, reminder_count: 0, annotations: null,
  },
  {
    id: '5', project_id: '', approval_type: 'payment',
    title: 'Progress Payment #3 - Framing Complete',
    description: 'Request for progress payment covering completed framing work. Milestone: Framing and roof structure 100% complete, inspections passed.',
    document_url: null, related_entity_type: null, related_entity_id: null,
    cost_impact: 85000, schedule_impact_days: 0,
    requested_from: 'Sarah Johnson (sarah.johnson@email.com)',
    requested_at: '2026-04-03T10:00:00', due_date: '2026-04-10', status: 'pending',
    responded_at: null, response_notes: '', signature_data: null, signature_timestamp: null,
    approved_by: null, approval_method: null,
    reminder_sent_at: null, reminder_count: 0, annotations: null,
  },
]

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconClipboard({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}
function IconClock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function IconCheck({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function IconDollar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function IconCalendar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
function IconBell({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}
function IconPen({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}
function IconX({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeLabel(type: string) {
  return APPROVAL_TYPE_CONFIG[type]?.label ?? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Main Component ───────────────────────────────────────────────────────────

function ApprovalsContent() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')

  const { colors, darkMode } = useThemeColors()

  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string>(projectId || '')
  const [approvals, setApprovals] = useState<ClientApproval[]>([])
  const [selectedApproval, setSelectedApproval] = useState<ClientApproval | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isDrawing, setIsDrawing] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [signaturePoints, setSignaturePoints] = useState<{ x: number; y: number }[]>([])

  const [newApproval, setNewApproval] = useState({
    approval_type: 'change_order' as ClientApproval['approval_type'],
    title: '',
    description: '',
    cost_impact: 0,
    schedule_impact_days: 0,
    requested_from: '',
    due_date: '',
  })

  // ── Load real projects ─────────────────────────────────────────────────────
  useEffect(() => {
    async function loadProjects() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles').select('company_id').eq('id', user.id).single()
      if (!profile?.company_id) return

      const { data } = await supabase
        .from('projects')
        .select('id, name, client')
        .eq('company_id', profile.company_id)
        .order('name')

      setProjects(data ?? [])
      if (!selectedProject && data?.length) setSelectedProject(data[0].id)
    }
    loadProjects()
  }, [])

  // ── Load approvals when project changes (demo data; replace with DB query) ─
  useEffect(() => {
    if (!selectedProject) { setApprovals([]); return }
    setApprovals(DEMO_APPROVALS.map(a => ({ ...a, project_id: selectedProject })))
  }, [selectedProject])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total: approvals.length,
    pending: approvals.filter(a => a.status === 'pending').length,
    approved: approvals.filter(a => a.status === 'approved').length,
    rejected: approvals.filter(a => a.status === 'rejected').length,
    pendingValue: approvals.filter(a => a.status === 'pending').reduce((s, a) => s + a.cost_impact, 0),
  }

  const filteredApprovals = approvals.filter(a =>
    filterStatus === 'all' || a.status === filterStatus
  )

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCreateApproval = () => {
    if (!newApproval.title || !newApproval.requested_from) {
      toast.error('Please fill in required fields')
      return
    }
    const approval: ClientApproval = {
      id: Date.now().toString(),
      project_id: selectedProject,
      ...newApproval,
      document_url: null, related_entity_type: null, related_entity_id: null,
      requested_at: new Date().toISOString(), status: 'pending',
      responded_at: null, response_notes: '', signature_data: null, signature_timestamp: null,
      approved_by: null, approval_method: null, reminder_sent_at: null, reminder_count: 0, annotations: null,
    }
    setApprovals(prev => [approval, ...prev])
    setShowCreateModal(false)
    setNewApproval({ approval_type: 'change_order', title: '', description: '', cost_impact: 0, schedule_impact_days: 0, requested_from: '', due_date: '' })
    toast.success('Approval request created!')
  }

  const handleSendReminder = (approval: ClientApproval) => {
    setApprovals(prev => prev.map(a =>
      a.id === approval.id
        ? { ...a, reminder_sent_at: new Date().toISOString(), reminder_count: a.reminder_count + 1 }
        : a
    ))
    toast.success(`Reminder sent to ${approval.requested_from.split('(')[0].trim()}`)
  }

  const handleApprove = (approval: ClientApproval) => {
    setSelectedApproval(approval)
    setShowSignatureModal(true)
  }

  const handleReject = (approval: ClientApproval) => {
    const notes = prompt('Reason for rejection (optional):')
    setApprovals(prev => prev.map(a =>
      a.id === approval.id
        ? { ...a, status: 'rejected', responded_at: new Date().toISOString(), response_notes: notes || '', approved_by: 'Client', approval_method: 'email_confirmation' }
        : a
    ))
    toast.error('Approval rejected')
  }

  // ── Signature canvas ───────────────────────────────────────────────────────
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setSignaturePoints([{ x: e.clientX - rect.left, y: e.clientY - rect.top }])
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
    ctx.strokeStyle = darkMode ? '#fff' : '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    const last = signaturePoints[signaturePoints.length - 1]
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    setSignaturePoints(prev => [...prev, { x, y }])
  }

  const stopDrawing = () => setIsDrawing(false)

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setSignaturePoints([])
  }

  const saveSignature = () => {
    if (signaturePoints.length === 0) { toast.error('Please provide a signature'); return }
    if (!selectedApproval) return
    const canvas = canvasRef.current
    if (!canvas) return
    setApprovals(prev => prev.map(a =>
      a.id === selectedApproval.id
        ? { ...a, status: 'approved', responded_at: new Date().toISOString(), signature_data: canvas.toDataURL(), signature_timestamp: new Date().toISOString(), approved_by: 'Client', approval_method: 'digital_signature' }
        : a
    ))
    setShowSignatureModal(false)
    setSelectedApproval(null)
    clearSignature()
    toast.success('Approval signed and recorded!')
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const card = { backgroundColor: colors.bg, border: colors.border, borderRadius: '0.75rem' }
  const trackBg = darkMode ? '#374151' : '#E5E7EB'
  const inputStyle = {
    backgroundColor: colors.bgAlt, border: colors.border, color: colors.text,
    borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
    width: '100%', outline: 'none',
  }

  const selectedProjectData = projects.find(p => p.id === selectedProject)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: darkMode ? '#0d0f17' : '#F8F9FA' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: colors.text }}>Approval &amp; Signature Workflows</h1>
            <p className="text-sm" style={{ color: colors.textMuted }}>Manage client approvals and digital signatures</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#2563EB' }}
          >
            + Request Approval
          </button>
        </div>

        {/* Project picker */}
        <div className="p-4 rounded-xl mb-6 flex items-center gap-4" style={card}>
          <label className="text-sm font-semibold shrink-0" style={{ color: colors.text }}>Project</label>
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={inputStyle}>
            <option value="">Choose a project…</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.client ? ` — ${p.client}` : ''}</option>
            ))}
          </select>
        </div>

        {/* Stat cards — mirrors project header metric card format */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total requests */}
          <div className="p-4 rounded-xl" style={card}>
            <div className="flex items-center gap-2 mb-1">
              <IconClipboard className="w-4 h-4" style={{ color: '#2563EB' }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>Total</span>
            </div>
            <div className="text-2xl font-bold mb-2" style={{ color: '#2563EB' }}>{stats.total}</div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
              <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: '#2563EB' }} />
            </div>
            <div className="text-xs mt-1" style={{ color: colors.textMuted }}>All approval requests</div>
          </div>

          {/* Pending */}
          <div className="p-4 rounded-xl" style={card}>
            <div className="flex items-center gap-2 mb-1">
              <IconClock className="w-4 h-4" style={{ color: '#D97706' }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>Pending</span>
            </div>
            <div className="text-2xl font-bold mb-2" style={{ color: '#D97706' }}>{stats.pending}</div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${stats.total ? (stats.pending / stats.total) * 100 : 0}%`, backgroundColor: '#D97706' }} />
            </div>
            <div className="text-xs mt-1" style={{ color: colors.textMuted }}>Awaiting client response</div>
          </div>

          {/* Approved */}
          <div className="p-4 rounded-xl" style={card}>
            <div className="flex items-center gap-2 mb-1">
              <IconCheck className="w-4 h-4" style={{ color: '#16A34A' }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>Approved</span>
            </div>
            <div className="text-2xl font-bold mb-2" style={{ color: '#16A34A' }}>{stats.approved}</div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${stats.total ? (stats.approved / stats.total) * 100 : 0}%`, backgroundColor: '#16A34A' }} />
            </div>
            <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
              {stats.total ? Math.round((stats.approved / stats.total) * 100) : 0}% approval rate
            </div>
          </div>

          {/* Pending value */}
          <div className="p-4 rounded-xl" style={card}>
            <div className="flex items-center gap-2 mb-1">
              <IconDollar className="w-4 h-4" style={{ color: '#7C3AED' }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>Pending Value</span>
            </div>
            <div className="text-2xl font-bold mb-2" style={{ color: '#7C3AED' }}>{formatCurrency(stats.pendingValue)}</div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
              <div className="h-full rounded-full" style={{ width: stats.pending > 0 ? '100%' : '0%', backgroundColor: '#7C3AED' }} />
            </div>
            <div className="text-xs mt-1" style={{ color: colors.textMuted }}>Across {stats.pending} pending item{stats.pending !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-4 rounded-xl mb-6 flex gap-2 flex-wrap" style={card}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => {
            const active = filterStatus === f
            const count = f === 'all' ? stats.total : stats[f as 'pending' | 'approved' | 'rejected']
            const cfg = f !== 'all' ? STATUS_CONFIG[f] : null
            return (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: active
                    ? (cfg ? (darkMode ? cfg.darkBg : cfg.bg) : (darkMode ? 'rgba(59,130,246,0.15)' : '#EFF6FF'))
                    : 'transparent',
                  color: active
                    ? (cfg ? (darkMode ? cfg.darkColor : cfg.color) : '#2563EB')
                    : colors.textMuted,
                  border: active
                    ? `1px solid ${cfg ? (darkMode ? cfg.darkColor + '50' : cfg.color + '50') : '#93C5FD'}`
                    : '1px solid transparent',
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
              </button>
            )
          })}
        </div>

        {/* Approvals list */}
        <div className="space-y-4">
          {filteredApprovals.map((approval) => {
            const statusCfg = STATUS_CONFIG[approval.status] ?? STATUS_CONFIG.expired
            const statusColor = darkMode ? statusCfg.darkColor : statusCfg.color
            const statusBg = darkMode ? statusCfg.darkBg : statusCfg.bg

            return (
              <div key={approval.id} className="rounded-xl overflow-hidden" style={card}>
                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-base font-semibold" style={{ color: colors.text }}>{approval.title}</h3>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: statusBg, color: statusColor }}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: colors.textMuted }}>
                        <span>{getTypeLabel(approval.approval_type)}</span>
                        <span>·</span>
                        <span>Requested {formatDate(approval.requested_at)}</span>
                        {approval.due_date && approval.status === 'pending' && (
                          <>
                            <span>·</span>
                            <span style={{ color: '#D97706' }}>Due {formatDate(approval.due_date)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm mb-4" style={{ color: colors.textMuted }}>{approval.description}</p>

                  {/* Impact row */}
                  <div
                    className="grid grid-cols-3 gap-4 p-3 rounded-lg mb-4 text-sm"
                    style={{ backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : '#F9FAFB', border: colors.border }}
                  >
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Cost Impact</div>
                      <div className="font-semibold" style={{ color: colors.text }}>
                        {approval.cost_impact === 0 ? 'No cost' : formatCurrency(approval.cost_impact)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Schedule Impact</div>
                      <div className="font-semibold" style={{ color: colors.text }}>
                        {approval.schedule_impact_days === 0 ? 'No delay' : `+${approval.schedule_impact_days} days`}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Requested From</div>
                      <div className="font-semibold truncate" style={{ color: colors.text }}>
                        {approval.requested_from.split('(')[0].trim()}
                      </div>
                    </div>
                  </div>

                  {/* Pending notice */}
                  {approval.status === 'pending' && (
                    <div
                      className="flex items-center justify-between p-3 rounded-lg mb-4"
                      style={{
                        backgroundColor: darkMode ? 'rgba(251,191,36,0.08)' : '#FFFBEB',
                        borderLeft: '3px solid #D97706',
                      }}
                    >
                      <div>
                        <div className="text-sm font-medium" style={{ color: darkMode ? '#FBBF24' : '#92400E' }}>
                          Awaiting client response
                        </div>
                        {approval.reminder_count > 0 && (
                          <div className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                            {approval.reminder_count} reminder{approval.reminder_count > 1 ? 's' : ''} sent · Last: {formatDate(approval.reminder_sent_at!)}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleSendReminder(approval)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: '#D97706', color: '#fff' }}
                      >
                        <IconBell className="w-3.5 h-3.5" />
                        Send Reminder
                      </button>
                    </div>
                  )}

                  {/* Approved notice */}
                  {approval.status === 'approved' && (
                    <div
                      className="p-3 rounded-lg mb-4"
                      style={{
                        backgroundColor: darkMode ? 'rgba(34,197,94,0.08)' : '#F0FDF4',
                        borderLeft: '3px solid #16A34A',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <IconCheck className="w-4 h-4" style={{ color: '#16A34A' }} />
                        <span className="text-sm font-medium" style={{ color: darkMode ? '#4ADE80' : '#166534' }}>
                          Approved by {approval.approved_by}
                        </span>
                        <span className="text-xs" style={{ color: colors.textMuted }}>
                          · {formatDate(approval.responded_at!)} via {approval.approval_method?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {approval.response_notes && (
                        <p className="text-xs mt-1 pl-6" style={{ color: colors.textMuted }}>"{approval.response_notes}"</p>
                      )}
                    </div>
                  )}

                  {/* Rejected notice */}
                  {approval.status === 'rejected' && (
                    <div
                      className="p-3 rounded-lg mb-4"
                      style={{
                        backgroundColor: darkMode ? 'rgba(239,68,68,0.08)' : '#FFF5F5',
                        borderLeft: '3px solid #DC2626',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <IconX className="w-4 h-4" style={{ color: '#DC2626' }} />
                        <span className="text-sm font-medium" style={{ color: darkMode ? '#F87171' : '#991B1B' }}>
                          Rejected by {approval.approved_by}
                        </span>
                        <span className="text-xs" style={{ color: colors.textMuted }}>· {formatDate(approval.responded_at!)}</span>
                      </div>
                      {approval.response_notes && (
                        <p className="text-xs mt-1 pl-6" style={{ color: colors.textMuted }}>"{approval.response_notes}"</p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {approval.status === 'pending' && (
                    <div className="flex gap-2 pt-3" style={{ borderTop: colors.border }}>
                      <button
                        onClick={() => handleApprove(approval)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: '#16A34A' }}
                      >
                        <IconCheck className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(approval)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: '#DC2626' }}
                      >
                        <IconX className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {filteredApprovals.length === 0 && (
            <div className="rounded-xl p-12 text-center" style={card}>
              <IconClipboard className="w-12 h-12 mx-auto mb-3" style={{ color: colors.textMuted }} />
              <h3 className="text-lg font-semibold mb-1" style={{ color: colors.text }}>
                No {filterStatus !== 'all' ? filterStatus : ''} approvals
              </h3>
              <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
                {filterStatus === 'all'
                  ? 'Request client approval for change orders, design selections, and more'
                  : `No ${filterStatus} approval requests at this time`}
              </p>
              {filterStatus === 'all' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: '#2563EB' }}
                >
                  + Request First Approval
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Create Approval Modal ─────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold" style={{ color: colors.text }}>Request Client Approval</h2>
                <button onClick={() => setShowCreateModal(false)} style={{ color: colors.textMuted }}>
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>Approval Type</label>
                  <select value={newApproval.approval_type} onChange={e => setNewApproval({ ...newApproval, approval_type: e.target.value as any })} style={inputStyle}>
                    <option value="change_order">Change Order</option>
                    <option value="design_selection">Design Selection</option>
                    <option value="payment">Payment Request</option>
                    <option value="schedule_change">Schedule Change</option>
                    <option value="scope_change">Scope Change</option>
                    <option value="final_walkthrough">Final Walkthrough</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>Title *</label>
                  <input type="text" value={newApproval.title} onChange={e => setNewApproval({ ...newApproval, title: e.target.value })} placeholder="Brief description of what needs approval" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>Description</label>
                  <textarea value={newApproval.description} onChange={e => setNewApproval({ ...newApproval, description: e.target.value })} placeholder="Detailed explanation for the client" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>Cost Impact ($)</label>
                    <input type="number" value={newApproval.cost_impact} onChange={e => setNewApproval({ ...newApproval, cost_impact: parseFloat(e.target.value) || 0 })} placeholder="0" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>Schedule Impact (days)</label>
                    <input type="number" value={newApproval.schedule_impact_days} onChange={e => setNewApproval({ ...newApproval, schedule_impact_days: parseInt(e.target.value) || 0 })} placeholder="0" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>Client Email *</label>
                  <input type="email" value={newApproval.requested_from} onChange={e => setNewApproval({ ...newApproval, requested_from: e.target.value })} placeholder={selectedProjectData?.client || 'client@email.com'} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>Due Date (optional)</label>
                  <input type="date" value={newApproval.due_date} onChange={e => setNewApproval({ ...newApproval, due_date: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleCreateApproval} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#2563EB' }}>
                  Send Approval Request
                </button>
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ backgroundColor: colors.bgAlt, color: colors.text, border: colors.border }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Digital Signature Modal ───────────────────────────────────────────── */}
      {showSignatureModal && selectedApproval && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl shadow-xl max-w-2xl w-full" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold" style={{ color: colors.text }}>Digital Signature Required</h2>
                <button onClick={() => { setShowSignatureModal(false); setSelectedApproval(null); clearSignature() }} style={{ color: colors.textMuted }}>
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              <div
                className="p-3 rounded-lg mb-5"
                style={{ backgroundColor: darkMode ? 'rgba(59,130,246,0.08)' : '#EFF6FF', borderLeft: '3px solid #2563EB' }}
              >
                <div className="text-sm font-semibold mb-0.5" style={{ color: colors.text }}>{selectedApproval.title}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>
                  By signing below, you approve this {getTypeLabel(selectedApproval.approval_type).toLowerCase()}.
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>Sign Below</label>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full rounded-lg cursor-crosshair"
                  style={{ backgroundColor: darkMode ? '#1a1d27' : '#fff', border: colors.border, touchAction: 'none' }}
                />
                <button onClick={clearSignature} className="mt-1.5 text-xs" style={{ color: '#2563EB' }}>
                  Clear Signature
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={saveSignature} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#16A34A' }}>
                  <IconPen className="w-4 h-4" />
                  Sign and Approve
                </button>
                <button onClick={() => { setShowSignatureModal(false); setSelectedApproval(null); clearSignature() }} className="px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ backgroundColor: colors.bgAlt, color: colors.text, border: colors.border }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ApprovalsContent />
    </Suspense>
  )
}
