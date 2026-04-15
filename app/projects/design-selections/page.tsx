'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
  installed: { bg: '#F3F4F6', darkBg: 'rgba(107,114,128,0.15)', color: '#6B7280' },
}

const AVAIL_CONFIG: Record<string, { label: string; color: string }> = {
  in_stock:        { label: 'In Stock',        color: '#16A34A' },
  order_required:  { label: 'Order Required',  color: '#2563EB' },
  backorder:       { label: 'Backordered',     color: '#D97706' },
  discontinued:    { label: 'Discontinued',    color: '#DC2626' },
}

const DEMO_SELECTIONS: Omit<DesignSelection, 'project_id'>[] = [
  {
    id: '1',
    category: 'Flooring', room_location: 'Master Bedroom',
    option_name: 'European Oak Engineered Hardwood', manufacturer: 'Armstrong', model: 'Prime Harvest',
    sku: 'APK5423LG', color: 'Mystic Taupe', finish: 'Low Gloss',
    price: 8450, upgrade_cost: 2100, lead_time_days: 14,
    availability_status: 'in_stock',
    description: '5" wide planks, wire-brushed texture, 3/8" thick engineered construction.',
    image_urls: [], client_approved: true, approved_date: '2026-02-01', status: 'approved',
    notes: 'Client loves the color — matches furniture perfectly.',
    alternatives: [{ id: 'a1', name: 'Classic Oak – Natural', manufacturer: 'Bruce', price: 6350, pros: ['Lower cost', '7-day delivery', 'Classic look'], cons: ['Lighter color', 'Less texture'] }],
  },
  {
    id: '2',
    category: 'Countertops', room_location: 'Kitchen',
    option_name: 'Calacatta Quartz', manufacturer: 'Cambria', model: 'Brittanicca',
    sku: 'CAM-BRIT-3CM', color: 'White with Gray Veining', finish: 'Polished',
    price: 12800, upgrade_cost: 4200, lead_time_days: 21,
    availability_status: 'order_required',
    description: '3cm thick, premium quartz with dramatic veining. Includes undermount sink cutout and edge profile.',
    image_urls: [], client_approved: false, approved_date: null, status: 'pending',
    notes: 'Waiting for client to visit showroom.',
    alternatives: [
      { id: 'a2', name: 'Carrara Marble', manufacturer: 'MSI', price: 10600, pros: ['Natural stone', 'Classic look', '20% savings'], cons: ['Requires sealing', 'Can stain'] },
      { id: 'a3', name: 'White Granite', manufacturer: 'Granite Select', price: 8600, pros: ['Durable', 'Heat resistant', 'Budget-friendly'], cons: ['Less dramatic veining'] },
    ],
  },
  {
    id: '3',
    category: 'Fixtures', room_location: 'Master Bathroom',
    option_name: 'Waterfall Tub Filler', manufacturer: 'Kohler', model: 'Purist',
    sku: 'K-14661-4', color: 'Brushed Nickel', finish: 'Brushed',
    price: 1285, upgrade_cost: 685, lead_time_days: 7,
    availability_status: 'in_stock',
    description: 'Floor-mount tub filler with hand shower, contemporary design.',
    image_urls: [], client_approved: true, approved_date: '2026-01-28', status: 'ordered',
    notes: 'Ordered 2/3, expected delivery 2/10.',
    alternatives: [],
  },
  {
    id: '4',
    category: 'Lighting', room_location: 'Dining Room',
    option_name: 'Modern Linear Chandelier', manufacturer: 'Kichler', model: 'Barrington',
    sku: 'KCH-43913', color: 'Black with Brushed Nickel', finish: 'Mixed Metal',
    price: 895, upgrade_cost: 345, lead_time_days: 10,
    availability_status: 'backorder',
    description: '36" linear fixture, 5-light, adjustable height, LED compatible.',
    image_urls: [], client_approved: false, approved_date: null, status: 'pending',
    notes: 'Client requested alternative due to backorder.',
    alternatives: [{ id: 'a4', name: 'Crystal Linear Pendant', manufacturer: 'Progress Lighting', price: 725, pros: ['In stock', 'Lower price', 'Similar style'], cons: ['Slightly smaller (30")'] }],
  },
  {
    id: '5',
    category: 'Tile', room_location: 'Kitchen',
    option_name: 'Subway Tile Backsplash', manufacturer: 'Daltile', model: 'Restore',
    sku: 'DAL-RE01', color: 'Bright White', finish: 'Glossy',
    price: 1640, upgrade_cost: 0, lead_time_days: 5,
    availability_status: 'in_stock',
    description: '3×6 ceramic subway tile, bright white gloss finish. Includes grout and installation.',
    image_urls: [], client_approved: true, approved_date: '2026-01-25', status: 'received',
    notes: 'Material on site, ready for installation.',
    alternatives: [],
  },
]

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Main content ──────────────────────────────────────────────────────────────

function DesignSelectionsContent() {
  const searchParams = useSearchParams()
  const { colors, darkMode } = useThemeColors()

  const [projects, setProjects] = useState<{ id: string; name: string; client: string | null }[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState(searchParams.get('project') ?? '')
  const [selections, setSelections] = useState<DesignSelection[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedRoom, setSelectedRoom] = useState('all')
  const [compareItems, setCompareItems] = useState<DesignSelection[]>([])
  const [showCompare, setShowCompare] = useState(false)
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

  // ── Load real projects + company_id from Supabase ─────────────────────────
  useEffect(() => {
    async function loadProjects() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles').select('company_id').eq('id', user.id).single()
      if (!profile?.company_id) return

      setCompanyId(profile.company_id)

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

  // ── Load real selections when project changes ─────────────────────────────
  useEffect(() => {
    if (!selectedProject) { setSelections([]); return }
    async function loadSelections() {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('design_selections')
        .select('*')
        .eq('project_id', selectedProject)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading selections:', error.message, error.code, error.details)
        setSelections([])
      } else {
        // Map DB rows → DesignSelection shape (alternatives not stored in DB yet)
        setSelections((data ?? []).map(row => ({ ...row, alternatives: [] })))
      }
      setLoading(false)
    }
    loadSelections()
  }, [selectedProject])

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

  const handleApprove = async (id: string) => {
    const supabase = createClient()
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('design_selections')
      .update({ client_approved: true, approved_date: now, status: 'approved' })
      .eq('id', id)

    if (error) { toast.error('Failed to approve selection'); return }
    setSelections(prev => prev.map(s =>
      s.id === id ? { ...s, client_approved: true, approved_date: now, status: 'approved' } : s
    ))
    toast.success('Selection approved')
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
    if (!newSelection.option_name || !newSelection.category || !selectedProject || !companyId) {
      toast.error('Name and category are required')
      return
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const row = {
      project_id: selectedProject,
      company_id: companyId,
      created_by: user?.id ?? null,
      ...newSelection,
      image_urls: [],
      client_approved: false,
      approved_date: null,
      alternatives: undefined, // not a DB column
    }
    // Remove client-side-only field
    const { alternatives: _a, ...insertRow } = row as any

    const { data, error } = await supabase
      .from('design_selections')
      .insert(insertRow)
      .select()
      .single()

    if (error) { toast.error('Failed to add selection'); return }
    setSelections(prev => [...prev, { ...data, alternatives: [] }])
    setShowAddModal(false)
    setNewSelection({ category: 'Flooring', room_location: '', option_name: '', manufacturer: '', model: '', sku: '', color: '', finish: '', description: '', price: 0, upgrade_cost: 0, lead_time_days: 0, availability_status: 'in_stock', notes: '' })
    toast.success('Selection added')
  }

  const handleDeleteSelection = async (id: string) => {
    if (!confirm('Delete this selection?')) return
    const supabase = createClient()
    const { error } = await supabase.from('design_selections').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    setSelections(prev => prev.filter(s => s.id !== id))
    toast.success('Selection deleted')
  }

  const toggleCompare = (sel: DesignSelection) => {
    setCompareItems(prev =>
      prev.some(i => i.id === sel.id) ? prev.filter(i => i.id !== sel.id) : [...prev, sel]
    )
  }

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
            <span className="font-medium" style={{ color: colors.text }}>Design Selections</span>
          </nav>

          {/* Title + actions */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-1" style={{ color: colors.text }}>Design Selection Manager</h1>
              <p className="text-sm" style={{ color: colors.textMuted }}>Track material selections and client approvals</p>
            </div>
            <div className="flex items-center gap-2">
              {compareItems.length > 0 && (
                <button
                  onClick={() => setShowCompare(true)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: '#7C3AED' }}
                >
                  Compare ({compareItems.length})
                </button>
              )}
              {selectedProject && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: '#2563EB' }}
                >
                  + Add Selection
                </button>
              )}
              <button
                onClick={() => setShowPackageModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: '#16A34A' }}
              >
                Generate Package
              </button>
            </div>
          </div>

          {/* Project picker */}
          <div className="mb-5">
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="rounded-lg text-sm focus:outline-none"
              style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text, padding: '0.5rem 0.75rem' }}
            >
              <option value="">Choose a project…</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.client ? ` — ${p.client}` : ''}</option>
              ))}
            </select>
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
                <div className="text-lg font-bold" style={{ color: stats.pending > 0 ? '#D97706' : '#16A34A' }}>{stats.pending} awaiting</div>
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
                <div className="text-lg font-bold" style={{ color: '#7C3AED' }}>{stats.ordered} on order</div>
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
              <p className="text-sm" style={{ color: muted }}>
                {selectedProject ? 'Add the first selection using the button above.' : 'Select a project above to get started.'}
              </p>
            </div>
          ) : (
            filtered.map(sel => {
              const statusStyle = STATUS_STYLES[sel.status] ?? STATUS_STYLES.pending
              const avail = AVAIL_CONFIG[sel.availability_status]
              const catIcon = CATEGORIES.find(c => c.name === sel.category)?.icon ?? '📦'
              const inCompare = compareItems.some(i => i.id === sel.id)

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
                              className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                              style={{
                                backgroundColor: darkMode ? statusStyle.darkBg : statusStyle.bg,
                                color: statusStyle.color,
                              }}
                            >
                              {sel.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-lg font-bold" style={{ color: colors.text }}>{formatCurrency(sel.price)}</div>
                        {sel.upgrade_cost > 0 && (
                          <div className="text-xs" style={{ color: '#D97706' }}>+{formatCurrency(sel.upgrade_cost)} upgrade</div>
                        )}
                      </div>
                    </div>

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
                    <p className="text-sm mb-4" style={{ color: colors.textMuted }}>{sel.description}</p>

                    {/* Approval banner */}
                    {sel.client_approved ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg mb-4"
                        style={{ backgroundColor: darkMode ? 'rgba(34,197,94,0.1)' : '#DCFCE7', borderLeft: '3px solid #16A34A' }}>
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: '#16A34A' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#16A34A' }}>Client Approved</p>
                          {sel.approved_date && (
                            <p className="text-xs" style={{ color: darkMode ? '#86EFAC' : '#15803D' }}>
                              Approved {formatDate(sel.approved_date)}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-lg mb-4"
                        style={{ backgroundColor: darkMode ? 'rgba(251,191,36,0.08)' : '#FFFBEB', borderLeft: '3px solid #D97706' }}>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#D97706' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: '#D97706' }}>Awaiting Approval</p>
                            <p className="text-xs" style={{ color: darkMode ? '#FCD34D' : '#92400E' }}>Send selection package for review</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleApprove(sel.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                          style={{ backgroundColor: '#16A34A' }}
                        >
                          Mark Approved
                        </button>
                      </div>
                    )}

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
                                <div>
                                  {alt.pros.map((p, i) => (
                                    <div key={i} style={{ color: '#16A34A' }}>+ {p}</div>
                                  ))}
                                </div>
                                <div>
                                  {alt.cons.map((c, i) => (
                                    <div key={i} style={{ color: '#DC2626' }}>− {c}</div>
                                  ))}
                                </div>
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

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 flex-wrap" style={{ borderTop: colors.border }}>
                      <button
                        onClick={() => toggleCompare(sel)}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                        style={{
                          backgroundColor: inCompare ? '#7C3AED' : 'transparent',
                          color: inCompare ? '#fff' : '#7C3AED',
                          border: '1px solid #7C3AED',
                        }}
                      >
                        {inCompare ? '✓ In Compare' : 'Compare'}
                      </button>
                      {/* Status changer */}
                      <select
                        value={sel.status}
                        onChange={e => handleStatusChange(sel.id, e.target.value as DesignSelection['status'])}
                        className="text-sm rounded-lg px-2 py-1.5"
                        style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text, outline: 'none' }}
                      >
                        {(['pending','approved','rejected','ordered','received','installed'] as const).map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                      <button
                        className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ color: '#DC2626', backgroundColor: darkMode ? 'rgba(220,38,38,0.1)' : '#FEF2F2', border: '1px solid rgba(220,38,38,0.2)' }}
                        onClick={() => handleDeleteSelection(sel.id)}
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

      {/* Compare modal */}
      {showCompare && compareItems.length > 0 && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-auto" style={{ backgroundColor: colors.bg }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold" style={{ color: colors.text }}>Compare Selections</h2>
                  <button onClick={() => setShowCompare(false)} style={{ color: muted }}>✕</button>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareItems.length}, 1fr)` }}>
                  {compareItems.map(sel => (
                    <div key={sel.id} className="p-4 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                      <div className="font-semibold mb-1" style={{ color: colors.text }}>{sel.option_name}</div>
                      <div className="text-sm mb-3" style={{ color: muted }}>{sel.category} · {sel.room_location}</div>
                      {[
                        ['Price', formatCurrency(sel.price)],
                        ['Manufacturer', sel.manufacturer],
                        ['Color', sel.color],
                        ['Lead Time', `${sel.lead_time_days} days`],
                        ['Availability', AVAIL_CONFIG[sel.availability_status]?.label],
                        ['Status', sel.status],
                      ].map(([k, v]) => (
                        <div key={k} className="mb-2">
                          <div className="text-xs" style={{ color: muted }}>{k}</div>
                          <div className="text-sm font-medium" style={{ color: colors.text }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowCompare(false)}
                  className="mt-6 w-full py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
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
                      onMouseEnter={e => (e.currentTarget.style.borderColor = '#7C3AED')}
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

      {/* ── Add Selection Modal ── */}
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

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: muted }}>Availability</label>
                  <select value={newSelection.availability_status} onChange={e => setNewSelection(p => ({ ...p, availability_status: e.target.value as any }))} style={inputStyle}>
                    <option value="in_stock">In Stock</option>
                    <option value="order_required">Order Required</option>
                    <option value="backorder">Backordered</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
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

    </div>
  )
}

export default function DesignSelectionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DesignSelectionsContent />
    </Suspense>
  )
}
