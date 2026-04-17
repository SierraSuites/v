'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DesignSelection {
  id: string
  project_id: string
  category: string
  room_location: string
  option_name: string
  manufacturer: string
  model: string
  sku: string
  color: string
  finish: string
  price: number
  upgrade_cost: number
  lead_time_days: number
  availability_status: 'in_stock' | 'order_required' | 'discontinued' | 'backorder'
  description: string
  image_urls: string[]
  client_approved: boolean
  approved_date: string | null
  approved_by_name: string | null
  approved_by_email: string | null
  status: 'pending' | 'approved' | 'rejected' | 'ordered' | 'received' | 'installed'
  notes: string
  alternatives: AlternativeOption[]
}

interface AlternativeOption {
  id: string
  name: string
  manufacturer: string
  price: number
  pros: string[]
  cons: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Flooring',     icon: '🏠' },
  { name: 'Cabinets',     icon: '🗄️' },
  { name: 'Countertops',  icon: '⬛' },
  { name: 'Fixtures',     icon: '🚰' },
  { name: 'Lighting',     icon: '💡' },
  { name: 'Paint',        icon: '🎨' },
  { name: 'Tile',         icon: '⬜' },
  { name: 'Hardware',     icon: '🔧' },
  { name: 'Appliances',   icon: '📱' },
  { name: 'Windows',      icon: '🪟' },
]

const STATUS_STYLES: Record<string, { bg: string; darkBg: string; color: string }> = {
  pending:   { bg: '#FEF3C7', darkBg: 'rgba(251,191,36,0.15)',  color: '#D97706' },
  approved:  { bg: '#DCFCE7', darkBg: 'rgba(34,197,94,0.15)',   color: '#16A34A' },
  rejected:  { bg: '#FEE2E2', darkBg: 'rgba(239,68,68,0.15)',   color: '#DC2626' },
  ordered:   { bg: '#DBEAFE', darkBg: 'rgba(59,130,246,0.15)',  color: '#2563EB' },
  received:  { bg: '#F3E8FF', darkBg: 'rgba(168,85,247,0.15)', color: '#9333EA' },
  installed: { bg: '#F3F4F6', darkBg: 'rgba(156,163,175,0.2)', color: '#9CA3AF' },
}

const AVAIL_CONFIG: Record<string, { label: string; color: string }> = {
  in_stock:        { label: 'In Stock',        color: '#16A34A' },
  order_required:  { label: 'Order Required',  color: '#2563EB' },
  backorder:       { label: 'Backordered',     color: '#D97706' },
  discontinued:    { label: 'Discontinued',    color: '#DC2626' },
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DesignSelectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const { colors, darkMode } = useThemeColors()

  const [projectName, setProjectName] = useState<string>('')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [paymentSelection, setPaymentSelection] = useState<DesignSelection | null>(null)
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], vendor: '', notes: '' })
  const [approvalTarget, setApprovalTarget] = useState<DesignSelection | null>(null)
  const [approvalForm, setApprovalForm] = useState({ name: '', email: '', decision: 'approved' as 'approved' | 'rejected' })
  const [editingSelection, setEditingSelection] = useState<DesignSelection | null>(null)
  const [editForm, setEditForm] = useState({
    category: 'Flooring', room_location: '', option_name: '', manufacturer: '', model: '',
    sku: '', color: '', finish: '', description: '', price: 0, upgrade_cost: 0,
    lead_time_days: 0, availability_status: 'in_stock' as DesignSelection['availability_status'],
    status: 'pending' as DesignSelection['status'], notes: '', _showAdvanced: false,
  })
  const [selections, setSelections] = useState<DesignSelection[]>([])
  const [paidSelectionIds, setPaidSelectionIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedRoom, setSelectedRoom] = useState('all')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSelection, setNewSelection] = useState({
    category: 'Flooring',
    room_location: '',
    option_name: '',
    manufacturer: '',
    model: '',
    sku: '',
    color: '',
    finish: '',
    description: '',
    price: 0,
    upgrade_cost: 0,
    lead_time_days: 0,
    availability_status: 'in_stock' as DesignSelection['availability_status'],
    notes: '',
  })

  // ── Load project name + company_id ────────────────────────────────────────
  useEffect(() => {
    async function loadContext() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      const [profileRes, projectRes] = await Promise.all([
        supabase.from('user_profiles').select('company_id').eq('id', user.id).single(),
        supabase.from('projects').select('name').eq('id', projectId).single(),
      ])

      if (profileRes.data?.company_id) setCompanyId(profileRes.data.company_id)
      if (projectRes.data?.name) setProjectName(projectRes.data.name)
    }
    loadContext()
  }, [projectId])

  // ── Load selections ───────────────────────────────────────────────────────
  useEffect(() => {
    async function loadSelections() {
      setLoading(true)
      const supabase = createClient()
      const [selectionsRes, paymentsRes] = await Promise.all([
        supabase.from('design_selections').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
        supabase.from('project_expenses').select('design_selection_id').eq('project_id', projectId).not('design_selection_id', 'is', null),
      ])

      if (selectionsRes.error) {
        console.error('Error loading selections:', selectionsRes.error.message)
        setSelections([])
      } else {
        setSelections((selectionsRes.data ?? []).map(row => ({ ...row, alternatives: [] })))
      }

      if (!paymentsRes.error && paymentsRes.data) {
        setPaidSelectionIds(new Set(paymentsRes.data.map((e: any) => e.design_selection_id)))
      }

      setLoading(false)
    }
    loadSelections()
  }, [projectId])

  const rooms = [...new Set(selections.map(s => s.room_location))].sort()
  const filtered = selections.filter(s => {
    if (selectedCategory !== 'all' && s.category !== selectedCategory) return false
    if (selectedRoom !== 'all' && s.room_location !== selectedRoom) return false
    return true
  })

  const stats = {
    total: selections.length,
    approved: selections.filter(s => s.client_approved).length,
    pending: selections.filter(s => !s.client_approved && s.status === 'pending').length,
    ordered: selections.filter(s => s.status === 'ordered' || s.status === 'received').length,
    totalCost: selections.reduce((n, s) => n + s.price, 0),
    upgradeCost: selections.reduce((n, s) => n + s.upgrade_cost, 0),
  }

  const handleClientDecision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!approvalTarget) return
    if (!approvalForm.name.trim()) { toast.error('Client name is required'); return }

    const isApproved = approvalForm.decision === 'approved'
    const supabase = createClient()
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('design_selections')
      .update({
        client_approved: isApproved,
        approved_date: now,
        approved_by_name: approvalForm.name.trim(),
        approved_by_email: approvalForm.email.trim() || null,
        status: isApproved ? 'approved' : 'rejected',
      })
      .eq('id', approvalTarget.id)

    if (error) { toast.error('Failed to save decision'); return }
    setSelections(prev => prev.map(s =>
      s.id === approvalTarget.id
        ? { ...s, client_approved: isApproved, approved_date: now, approved_by_name: approvalForm.name.trim(), approved_by_email: approvalForm.email.trim() || null, status: isApproved ? 'approved' : 'rejected' }
        : s
    ))
    setApprovalTarget(null)
    setApprovalForm({ name: '', email: '', decision: 'approved' })
    toast.success(isApproved ? 'Selection approved by client' : 'Selection rejected by client')
  }

const handleStatusChange = async (id: string, status: DesignSelection['status']) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('design_selections')
      .update({ status })
      .eq('id', id)

    if (error) { toast.error('Failed to update status'); return }
    setSelections(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    toast.success(`Status updated to ${status.replace(/_/g, ' ')}`)
  }

  const handleAddSelection = async () => {
    if (!newSelection.option_name || !newSelection.category || !companyId) {
      toast.error('Name and category are required')
      return
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('design_selections')
      .insert({
        project_id: projectId,
        company_id: companyId,
        created_by: user?.id ?? null,
        ...newSelection,
        image_urls: [],
        client_approved: false,
        approved_date: null,
      })
      .select()
      .single()

    if (error) { toast.error('Failed to add selection'); return }
    setSelections(prev => [...prev, { ...data, alternatives: [] }])
    setShowAddModal(false)
    setNewSelection({ category: 'Flooring', room_location: '', option_name: '', manufacturer: '', model: '', sku: '', color: '', finish: '', description: '', price: 0, upgrade_cost: 0, lead_time_days: 0, availability_status: 'in_stock', notes: '' })
    toast.success('Selection added')
  }

  const handleDeleteSelection = async () => {
    if (!confirmDeleteId) return
    const supabase = createClient()
    const { error } = await supabase.from('design_selections').delete().eq('id', confirmDeleteId)
    if (error) { toast.error('Failed to delete'); return }
    setSelections(prev => prev.filter(s => s.id !== confirmDeleteId))
    setPaidSelectionIds(prev => { const s = new Set(prev); s.delete(confirmDeleteId); return s })
    setConfirmDeleteId(null)
    toast.success('Selection deleted')
  }

  // Status progression sequence
  const STATUS_SEQUENCE: DesignSelection['status'][] = ['pending', 'approved', 'ordered', 'received', 'installed']
  const NEXT_STATUS_LABEL: Partial<Record<DesignSelection['status'], string>> = {
    ordered:   'Mark Ordered',
    received:  'Mark Received',
    installed: 'Mark Installed',
  }
  function getNextStatus(current: DesignSelection['status']): { status: DesignSelection['status']; label: string } | null {
    // pending → approved requires client signature modal
    // installed and rejected are terminal
    if (current === 'pending' || current === 'installed' || current === 'rejected') return null
    const idx = STATUS_SEQUENCE.indexOf(current)
    if (idx === -1) return null
    const next = STATUS_SEQUENCE[idx + 1]
    return next ? { status: next, label: NEXT_STATUS_LABEL[next] ?? next } : null
  }

  function openEditSelection(sel: DesignSelection) {
    setEditingSelection(sel)
    setEditForm({
      category: sel.category, room_location: sel.room_location, option_name: sel.option_name,
      manufacturer: sel.manufacturer, model: sel.model, sku: sel.sku, color: sel.color,
      finish: sel.finish, description: sel.description, price: sel.price,
      upgrade_cost: sel.upgrade_cost, lead_time_days: sel.lead_time_days,
      availability_status: sel.availability_status, status: sel.status, notes: sel.notes, _showAdvanced: false,
    })
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSelection) return
    const supabase = createClient()
    const resetApproval = editForm.status === 'pending' || editForm.status === 'rejected'
    const { error } = await supabase
      .from('design_selections')
      .update({
        category: editForm.category, room_location: editForm.room_location,
        option_name: editForm.option_name, manufacturer: editForm.manufacturer,
        model: editForm.model, sku: editForm.sku, color: editForm.color,
        finish: editForm.finish, description: editForm.description,
        price: editForm.price, upgrade_cost: editForm.upgrade_cost,
        lead_time_days: editForm.lead_time_days, availability_status: editForm.availability_status,
        status: editForm.status, notes: editForm.notes,
        ...(resetApproval ? { client_approved: false, approved_date: null, approved_by_name: null, approved_by_email: null } : {}),
      })
      .eq('id', editingSelection.id)

    if (error) { toast.error('Failed to save changes'); return }
    setSelections(prev => prev.map(s => s.id === editingSelection.id ? {
      ...s, ...editForm, alternatives: s.alternatives,
      ...(resetApproval ? { client_approved: false, approved_date: null, approved_by_name: null, approved_by_email: null } : {}),
    } : s))
    setEditingSelection(null)
    toast.success('Selection updated')
  }

  function openRecordPayment(sel: DesignSelection) {
    setPaymentSelection(sel)
    setPaymentForm({
      amount: String(sel.price),
      date: new Date().toISOString().split('T')[0],
      vendor: sel.manufacturer || '',
      notes: '',
    })
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentSelection || !companyId) return

    const supabase = createClient()
    const amount = parseFloat(paymentForm.amount)
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return }

    // Create the expense entry
    const { error: expenseError } = await supabase
      .from('project_expenses')
      .insert({
        project_id: projectId,
        created_by: userId,
        category: 'materials',
        description: `${paymentSelection.option_name}${paymentSelection.room_location ? ` — ${paymentSelection.room_location}` : ''}${paymentForm.notes ? ` (${paymentForm.notes})` : ''}`,
        amount,
        date: paymentForm.date,
        vendor: paymentForm.vendor || null,
        payment_status: 'paid',
        design_selection_id: paymentSelection.id,
      })

    if (expenseError) { toast.error('Failed to record payment'); return }

    setPaidSelectionIds(prev => new Set([...prev, paymentSelection.id]))
    setPaymentSelection(null)
    toast.success('Payment recorded')
  }

  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const toggleExpanded = (id: string) =>
    setExpandedCards(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  // ── Shared styles ──────────────────────────────────────────────────────────
  const card = { backgroundColor: colors.bg, border: colors.border, borderRadius: '0.75rem' }
  const inputStyle = {
    backgroundColor: colors.bgAlt, border: colors.border, color: colors.text,
    borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
    width: '100%', outline: 'none',
  }
  const muted = colors.textMuted

  return (
    <div className="min-h-screen" style={{ backgroundColor: darkMode ? '#0d0f17' : '#F8F9FA' }}>

      {/* ── Page Header ── */}
      <div style={{ backgroundColor: colors.bg, borderBottom: colors.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm mb-4">
            <Link href="/dashboard" className="hover:underline" style={{ color: colors.textMuted }}>Dashboard</Link>
            <span style={{ color: colors.textMuted }}>/</span>
            <Link href="/projects" className="hover:underline" style={{ color: colors.textMuted }}>Projects</Link>
            <span style={{ color: colors.textMuted }}>/</span>
            <Link href={`/projects/${projectId}`} className="hover:underline" style={{ color: colors.textMuted }}>
              {projectName || '…'}
            </Link>
            <span style={{ color: colors.textMuted }}>/</span>
            <span className="font-medium" style={{ color: colors.text }}>Design Selections</span>
          </nav>

          {/* Title + actions */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-1" style={{ color: colors.text }}>Design Selections</h1>
              <p className="text-sm" style={{ color: colors.textMuted }}>Track material selections and client approvals</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: '#2563EB' }}
              >
                + Add Selection
              </button>
              <button
                onClick={() => setShowPackageModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: '#16A34A' }}
              >
                Generate Package
              </button>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Selections */}
            <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(37,99,235,0.1)' }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#2563EB' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>Selections</div>
                  <div className="text-lg font-bold" style={{ color: colors.text }}>{stats.approved} / {stats.total}</div>
                </div>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${stats.total ? (stats.approved / stats.total) * 100 : 0}%`, backgroundColor: '#2563EB' }} />
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ color: colors.textMuted }}>
                <span>{stats.total ? Math.round((stats.approved / stats.total) * 100) : 0}% approved</span>
                <span>{stats.total} total</span>
              </div>
            </div>

            {/* Pending */}
            <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: stats.pending > 0 ? 'rgba(217,119,6,0.1)' : 'rgba(22,163,74,0.1)' }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: stats.pending > 0 ? '#D97706' : '#16A34A' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>Pending</div>
                  <div className="text-lg font-bold" style={{ color: stats.pending > 0 ? (darkMode ? '#FCD34D' : '#D97706') : '#16A34A' }}>{stats.pending} awaiting</div>
                </div>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${stats.total ? (stats.pending / stats.total) * 100 : 0}%`, backgroundColor: stats.pending > 0 ? '#D97706' : '#16A34A' }} />
              </div>
              <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {stats.pending > 0 ? `${stats.pending} need client sign-off` : 'All selections resolved'}
              </div>
            </div>

            {/* Ordered */}
            <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#7C3AED' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>Ordered</div>
                  <div className="text-lg font-bold" style={{ color: darkMode ? '#C4B5FD' : '#7C3AED' }}>{stats.ordered} on order</div>
                </div>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${stats.total ? (stats.ordered / stats.total) * 100 : 0}%`, backgroundColor: '#7C3AED' }} />
              </div>
              <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {stats.total ? Math.round((stats.ordered / stats.total) * 100) : 0}% ordered or on-site
              </div>
            </div>

            {/* Investment */}
            <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(219,39,119,0.1)' }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#DB2777' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>Investment</div>
                  <div className="text-lg font-bold" style={{ color: colors.text }}>{formatCurrency(stats.totalCost)}</div>
                </div>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${stats.totalCost ? Math.min(100, (stats.upgradeCost / stats.totalCost) * 100) : 0}%`, backgroundColor: '#DB2777' }} />
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ color: colors.textMuted }}>
                <span>{formatCurrency(stats.upgradeCost)} upgrades</span>
                <span>{stats.totalCost ? Math.round((stats.upgradeCost / stats.totalCost) * 100) : 0}% of total</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="p-4 rounded-xl mb-6 grid grid-cols-2 gap-4" style={card}>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Category</label>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={inputStyle}>
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Room</label>
            <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} style={inputStyle}>
              <option value="all">All Rooms</option>
              {rooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Selection cards */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center rounded-xl" style={card}>
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center rounded-xl" style={card}>
              <p className="text-4xl mb-3">🎨</p>
              <p className="font-semibold mb-1" style={{ color: colors.text }}>No selections yet</p>
              <p className="text-sm" style={{ color: muted }}>Add the first selection using the button above.</p>
            </div>
          ) : (
            filtered.map(sel => {
              const statusStyle = STATUS_STYLES[sel.status] ?? STATUS_STYLES.pending
              const avail = AVAIL_CONFIG[sel.availability_status]
              const catIcon = CATEGORIES.find(c => c.name === sel.category)?.icon ?? '📦'
              const isExpanded = expandedCards.has(sel.id)
              const isPaid = paidSelectionIds.has(sel.id)
              const showPaymentStatus = sel.status === 'ordered' || sel.status === 'received' || sel.status === 'installed'

              return (
                <div key={sel.id} className="rounded-xl overflow-hidden" style={card}>
                  <div className="p-5">
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-2xl shrink-0 mt-0.5">{catIcon}</span>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base truncate" style={{ color: colors.text }}>
                            {sel.option_name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs" style={{ color: muted }}>{sel.category}</span>
                            <span style={{ color: muted }}>·</span>
                            <span className="text-xs" style={{ color: muted }}>{sel.room_location}</span>
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: darkMode ? statusStyle.darkBg : statusStyle.bg,
                                color: statusStyle.color,
                              }}
                            >
                              {sel.status === 'approved' ? '✓ Client Approved' : sel.status.charAt(0).toUpperCase() + sel.status.slice(1)}
                            </span>
                            {sel.client_approved && sel.status !== 'approved' && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: darkMode ? 'rgba(34,197,94,0.15)' : '#DCFCE7', color: '#16A34A' }}>
                                ✓ Client Approved
                              </span>
                            )}
                            {showPaymentStatus && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={isPaid
                                ? { backgroundColor: darkMode ? 'rgba(34,197,94,0.15)' : '#DCFCE7', color: '#16A34A' }
                                : { backgroundColor: darkMode ? 'rgba(239,68,68,0.15)' : '#FEE2E2', color: '#DC2626' }
                              }>
                                {isPaid ? '$ Paid' : '$ Unpaid'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <div className="text-right">
                          <div className="text-lg font-bold" style={{ color: colors.text }}>{formatCurrency(sel.price)}</div>
                          {sel.upgrade_cost > 0 && (
                            <div className="text-xs" style={{ color: darkMode ? '#FCD34D' : '#D97706' }}>+{formatCurrency(sel.upgrade_cost)} upgrade</div>
                          )}
                        </div>
                        <button
                          onClick={() => toggleExpanded(sel.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ backgroundColor: colors.bgAlt, border: colors.border, color: muted }}
                        >
                          {isExpanded ? 'Hide' : 'Details'}
                          <svg className="w-3.5 h-3.5 transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Expandable details */}
                    {isExpanded && (
                      <>
                    {/* Product details */}
                    <div className="grid grid-cols-4 gap-3 mb-4 p-3 rounded-lg" style={{ backgroundColor: colors.bgAlt }}>
                      {[
                        { label: 'Manufacturer', value: sel.manufacturer },
                        { label: 'Model / SKU',  value: sel.model, sub: sel.sku },
                        { label: 'Color / Finish', value: sel.color, sub: sel.finish },
                        {
                          label: 'Availability',
                          value: avail?.label ?? sel.availability_status,
                          sub: `${sel.lead_time_days}-day lead`,
                          valueColor: avail?.color,
                        },
                      ].map(({ label, value, sub, valueColor }) => (
                        <div key={label}>
                          <div className="text-xs mb-0.5" style={{ color: muted }}>{label}</div>
                          <div className="text-sm font-semibold" style={{ color: valueColor ?? colors.text }}>{value}</div>
                          {sub && <div className="text-xs" style={{ color: muted }}>{sub}</div>}
                        </div>
                      ))}
                    </div>

                    {/* Description */}
                    {sel.description && <p className="text-sm mb-4" style={{ color: colors.textMuted }}>{sel.description}</p>}

                    {/* Alternatives */}
                    {sel.alternatives.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: muted }}>
                          Alternatives Considered
                        </p>
                        <div className="space-y-2">
                          {sel.alternatives.map(alt => (
                            <div key={alt.id} className="p-3 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold" style={{ color: colors.text }}>{alt.name}</span>
                                <span className="text-sm font-semibold" style={{ color: colors.text }}>{formatCurrency(alt.price)}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>{alt.pros.map((p, i) => <div key={i} style={{ color: '#16A34A' }}>+ {p}</div>)}</div>
                                <div>{alt.cons.map((c, i) => <div key={i} style={{ color: '#DC2626' }}>− {c}</div>)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {sel.notes && (
                      <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: colors.bgAlt }}>
                        <span className="text-xs font-semibold" style={{ color: muted }}>Note: </span>
                        <span className="text-xs" style={{ color: colors.text }}>{sel.notes}</span>
                      </div>
                    )}
                      </>
                    )}

                    {/* Approval banner — only prompt when pending */}
                    {sel.status === 'pending' && (
                      <div className="flex items-center justify-between p-3 rounded-lg mb-4"
                        style={{ border: colors.border }}>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#D97706' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: '#D97706' }}>Awaiting Client Decision</p>
                            <p className="text-xs" style={{ color: darkMode ? '#FCD34D' : '#92400E' }}>Client signature required</p>
                          </div>
                        </div>
                        <button
                          onClick={() => { setApprovalTarget(sel); setApprovalForm({ name: '', email: '', decision: 'approved' }) }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                          style={{ backgroundColor: darkMode ? '#92400E' : '#D97706', color: darkMode ? '#D97706' : '#FFF', border: colors.border }}
                        >
                          Submit Decision
                        </button>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 flex-wrap" style={{ borderTop: colors.border }}>
                      <button
                        onClick={() => openEditSelection(sel)}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                        style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                      >
                        Edit
                      </button>
                      {(() => {
                        const next = getNextStatus(sel.status)
                        return next ? (
                          <button
                            onClick={() => handleStatusChange(sel.id, next.status)}
                            className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
                            style={{ backgroundColor: '#2563EB' }}
                          >
                            {next.label}
                          </button>
                        ) : null
                      })()}
                      {(sel.status === 'ordered' || sel.status === 'received' || sel.status === 'installed') && !isPaid && (
                        <button
                          onClick={() => openRecordPayment(sel)}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
                          style={{ backgroundColor: '#16A34A' }}
                        >
                          Record Payment
                        </button>
                      )}
                      <button
                        className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ color: '#DC2626', backgroundColor: darkMode ? 'rgba(220,38,38,0.1)' : '#FEF2F2', border: '1px solid rgba(220,38,38,0.2)' }}
                        onClick={() => setConfirmDeleteId(sel.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setConfirmDeleteId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: colors.bg, border: colors.border }}>
              <p className="text-sm font-medium text-center mb-1" style={{ color: colors.text }}>Delete this selection?</p>
              <p className="text-xs text-center mb-5" style={{ color: colors.textMuted }}>
                {selections.find(s => s.id === confirmDeleteId)?.option_name}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteSelection}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: '#DC2626' }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Package modal */}
      {showPackageModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="rounded-xl shadow-xl w-full max-w-lg" style={{ backgroundColor: colors.bg }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: colors.text }}>Generate Selection Package</h2>
                <button onClick={() => setShowPackageModal(false)} style={{ color: muted }}>✕</button>
              </div>
              <p className="text-sm mb-4" style={{ color: muted }}>
                Create a professional document with all {selections.length} material selections for client review and approval.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { icon: '📕', title: 'PDF Package', sub: 'Print or email to client' },
                  { icon: '🌐', title: 'Web Link', sub: 'Client reviews and approves online' },
                ].map(({ icon, title, sub }) => (
                  <button
                    key={title}
                    onClick={() => { toast.success(`Generating ${title}…`); setShowPackageModal(false) }}
                    className="p-4 rounded-lg text-left transition-colors"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border }}
                    onMouseEnter={e => (e.currentTarget.style.border = '1px solid #7C3AED')}
                    onMouseLeave={e => (e.currentTarget.style.border = colors.border)}
                  >
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="font-semibold text-sm" style={{ color: colors.text }}>{title}</div>
                    <div className="text-xs" style={{ color: muted }}>{sub}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowPackageModal(false)}
                className="w-full py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Selection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold" style={{ color: colors.text }}>Add Design Selection</h2>
                <button onClick={() => setShowAddModal(false)} style={{ color: muted }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Category *</label>
                  <select value={newSelection.category} onChange={e => setNewSelection(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                    {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Room / Location</label>
                  <input value={newSelection.room_location} onChange={e => setNewSelection(p => ({ ...p, room_location: e.target.value }))} placeholder="e.g. Master Bedroom" style={inputStyle} />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Selection Name *</label>
                <input value={newSelection.option_name} onChange={e => setNewSelection(p => ({ ...p, option_name: e.target.value }))} placeholder="e.g. European Oak Engineered Hardwood" style={inputStyle} />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Manufacturer</label>
                  <input value={newSelection.manufacturer} onChange={e => setNewSelection(p => ({ ...p, manufacturer: e.target.value }))} placeholder="e.g. Armstrong" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Model</label>
                  <input value={newSelection.model} onChange={e => setNewSelection(p => ({ ...p, model: e.target.value }))} placeholder="e.g. Prime Harvest" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>SKU</label>
                  <input value={newSelection.sku} onChange={e => setNewSelection(p => ({ ...p, sku: e.target.value }))} placeholder="e.g. APK5423LG" style={inputStyle} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Color</label>
                  <input value={newSelection.color} onChange={e => setNewSelection(p => ({ ...p, color: e.target.value }))} placeholder="e.g. Mystic Taupe" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Finish</label>
                  <input value={newSelection.finish} onChange={e => setNewSelection(p => ({ ...p, finish: e.target.value }))} placeholder="e.g. Low Gloss" style={inputStyle} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Price ($)</label>
                  <input type="number" min="0" value={newSelection.price} onChange={e => setNewSelection(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Upgrade Cost ($)</label>
                  <input type="number" min="0" value={newSelection.upgrade_cost} onChange={e => setNewSelection(p => ({ ...p, upgrade_cost: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Lead Time (days)</label>
                  <input type="number" min="0" value={newSelection.lead_time_days} onChange={e => setNewSelection(p => ({ ...p, lead_time_days: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Availability</label>
                <select value={newSelection.availability_status} onChange={e => setNewSelection(p => ({ ...p, availability_status: e.target.value as any }))} style={inputStyle}>
                  <option value="in_stock">In Stock</option>
                  <option value="order_required">Order Required</option>
                  <option value="backorder">Backordered</option>
                  <option value="discontinued">Discontinued</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Description</label>
                <textarea value={newSelection.description} onChange={e => setNewSelection(p => ({ ...p, description: e.target.value }))} placeholder="Product details, dimensions, specs…" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Notes</label>
                <input value={newSelection.notes} onChange={e => setNewSelection(p => ({ ...p, notes: e.target.value }))} placeholder="Internal notes" style={inputStyle} />
              </div>

              <div className="flex gap-3">
                <button onClick={handleAddSelection} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#2563EB' }}>
                  Save Selection
                </button>
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Decision Modal */}
      {approvalTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="rounded-xl shadow-xl w-full max-w-md" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="px-6 py-4" style={{ borderBottom: colors.borderBottom }}>
              <h2 className="text-lg font-semibold" style={{ color: colors.text }}>Client Decision</h2>
              <p className="text-sm mt-0.5" style={{ color: colors.textMuted }}>
                The client's typed name serves as an electronic signature under the E-SIGN Act.
              </p>
            </div>

            {/* Selection summary */}
            <div className="mx-6 mt-4 p-3 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
              <p className="text-sm font-semibold truncate" style={{ color: colors.text }}>{approvalTarget.option_name}</p>
              <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                {approvalTarget.category}{approvalTarget.room_location ? ` · ${approvalTarget.room_location}` : ''} · {formatCurrency(approvalTarget.price)}
              </p>
            </div>

            <form onSubmit={handleClientDecision} className="px-6 py-4 space-y-4">
              {/* Approve / Reject toggle */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: colors.textMuted }}>Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovalForm(f => ({ ...f, decision: 'approved' }))}
                    className="flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: approvalForm.decision === 'approved' ? '#16A34A' : colors.bgAlt,
                      color: approvalForm.decision === 'approved' ? '#fff' : colors.textMuted,
                      border: approvalForm.decision === 'approved' ? '2px solid #16A34A' : colors.border,
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalForm(f => ({ ...f, decision: 'rejected' }))}
                    className="flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: approvalForm.decision === 'rejected' ? '#DC2626' : colors.bgAlt,
                      color: approvalForm.decision === 'rejected' ? '#fff' : colors.textMuted,
                      border: approvalForm.decision === 'rejected' ? '2px solid #DC2626' : colors.border,
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.textMuted }}>
                  Client full name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Jane Smith"
                  value={approvalForm.name}
                  onChange={e => setApprovalForm(f => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.textMuted }}>
                  Client email <span className="font-normal" style={{ color: colors.textMuted }}>(optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. jane@example.com"
                  value={approvalForm.email}
                  onChange={e => setApprovalForm(f => ({ ...f, email: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: approvalForm.decision === 'approved' ? '#16A34A' : '#DC2626' }}
                >
                  Confirm {approvalForm.decision === 'approved' ? 'Approval' : 'Rejection'}
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalTarget(null)}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Selection Modal */}
      {editingSelection && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="px-6 py-4" style={{ borderBottom: colors.borderBottom }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: colors.text }}>Edit Selection</h2>
                <button onClick={() => setEditingSelection(null)} style={{ color: muted }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {/* ── Core fields ── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Category</label>
                  <select value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                    {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Room / Location</label>
                  <input value={editForm.room_location} onChange={e => setEditForm(p => ({ ...p, room_location: e.target.value }))} placeholder="e.g. Kitchen" style={inputStyle} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Selection Name *</label>
                <input value={editForm.option_name} onChange={e => setEditForm(p => ({ ...p, option_name: e.target.value }))} placeholder="e.g. European Oak Hardwood" style={inputStyle} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Price ($)</label>
                  <input type="number" min="0" value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value as DesignSelection['status'] }))} style={inputStyle}>
                    {(['pending', 'approved', 'rejected', 'ordered', 'received', 'installed'] as const).map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Notes</label>
                <input value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} placeholder="Internal notes" style={inputStyle} />
              </div>

              {/* ── Advanced toggle ── */}
              <button
                type="button"
                onClick={() => setEditForm(p => ({ ...p, _showAdvanced: !p._showAdvanced }))}
                className="flex items-center gap-2 text-xs font-semibold w-full py-2 rounded-lg px-3"
                style={{ backgroundColor: colors.bgAlt, border: colors.border, color: muted }}
              >
                <svg className="w-3.5 h-3.5 transition-transform" style={{ transform: editForm._showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                Advanced details
              </button>

              {editForm._showAdvanced && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Manufacturer</label>
                      <input value={editForm.manufacturer} onChange={e => setEditForm(p => ({ ...p, manufacturer: e.target.value }))} placeholder="e.g. Armstrong" style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Model</label>
                      <input value={editForm.model} onChange={e => setEditForm(p => ({ ...p, model: e.target.value }))} placeholder="e.g. Prime Harvest" style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>SKU</label>
                      <input value={editForm.sku} onChange={e => setEditForm(p => ({ ...p, sku: e.target.value }))} placeholder="e.g. APK5423LG" style={inputStyle} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Color</label>
                      <input value={editForm.color} onChange={e => setEditForm(p => ({ ...p, color: e.target.value }))} placeholder="e.g. Mystic Taupe" style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Finish</label>
                      <input value={editForm.finish} onChange={e => setEditForm(p => ({ ...p, finish: e.target.value }))} placeholder="e.g. Low Gloss" style={inputStyle} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Upgrade Cost ($)</label>
                      <input type="number" min="0" value={editForm.upgrade_cost} onChange={e => setEditForm(p => ({ ...p, upgrade_cost: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Lead Time (days)</label>
                      <input type="number" min="0" value={editForm.lead_time_days} onChange={e => setEditForm(p => ({ ...p, lead_time_days: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Availability</label>
                      <select value={editForm.availability_status} onChange={e => setEditForm(p => ({ ...p, availability_status: e.target.value as DesignSelection['availability_status'] }))} style={inputStyle}>
                        <option value="in_stock">In Stock</option>
                        <option value="order_required">Order Required</option>
                        <option value="backorder">Backordered</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Description</label>
                    <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Product details, dimensions, specs…" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                </div>
              )}

              {editingSelection && paidSelectionIds.has(editingSelection.id) && (
                <div className="p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: darkMode ? 'rgba(34,197,94,0.1)' : '#DCFCE7', border: '1px solid rgba(22,163,74,0.3)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#16A34A' }}>Payment recorded</p>
                    <p className="text-xs" style={{ color: darkMode ? '#86EFAC' : '#15803D' }}>Remove to allow a new payment to be recorded</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const supabase = createClient()
                      const { error } = await supabase
                        .from('project_expenses')
                        .delete()
                        .eq('design_selection_id', editingSelection.id)
                      if (error) { toast.error('Failed to remove payment'); return }
                      setPaidSelectionIds(prev => { const s = new Set(prev); s.delete(editingSelection.id); return s })
                      toast.success('Payment removed')
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                    style={{ color: '#DC2626', backgroundColor: darkMode ? 'rgba(220,38,38,0.1)' : '#FEF2F2', border: '1px solid rgba(220,38,38,0.2)' }}
                  >
                    Mark Unpaid
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#2563EB' }}>
                  Save Changes
                </button>
                <button type="button" onClick={() => setEditingSelection(null)} className="px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentSelection && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="rounded-xl shadow-xl w-full max-w-md" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="px-6 py-4" style={{ borderBottom: colors.borderBottom }}>
              <h2 className="text-lg font-semibold" style={{ color: colors.text }}>Record Payment</h2>
              <p className="text-sm mt-0.5" style={{ color: colors.textMuted }}>This will create an expense record linked to this selection.</p>
            </div>

            {/* Selection summary */}
            <div className="mx-6 mt-4 p-3 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: colors.text }}>{paymentSelection.option_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                    {paymentSelection.category}{paymentSelection.room_location ? ` · ${paymentSelection.room_location}` : ''}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize shrink-0"
                  style={{ backgroundColor: darkMode ? STATUS_STYLES[paymentSelection.status]?.darkBg : STATUS_STYLES[paymentSelection.status]?.bg, color: STATUS_STYLES[paymentSelection.status]?.color }}
                >
                  {paymentSelection.status}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.textMuted }}>Amount paid *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.textMuted }}>Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.date}
                    onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.textMuted }}>Vendor</label>
                <input
                  type="text"
                  value={paymentForm.vendor}
                  onChange={e => setPaymentForm(f => ({ ...f, vendor: e.target.value }))}
                  placeholder="e.g. Armstrong"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.textMuted }}>Notes</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Invoice #, reference, etc."
                  style={inputStyle}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: '#16A34A' }}
                >
                  Record Payment
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentSelection(null)}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
