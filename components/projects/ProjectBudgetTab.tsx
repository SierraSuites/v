'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserCompany } from '@/lib/auth/get-user-company'
import { ProjectDetails } from '@/lib/projects/get-project-details'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import {
  PlusIcon,
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
  vendor: string | null
  payment_status: 'pending' | 'paid' | 'overdue'
  design_selection_id: string | null
  created_by: { name: string; avatar: string }
}

interface DSItem {
  id: string
  option_name: string
  category: string
  room_location: string | null
  status: 'pending' | 'approved' | 'rejected' | 'ordered' | 'received' | 'installed'
  price: number
  installation_cost: number
  materialExpense: { id: string; amount: number; payment_status: string; date: string } | null
  laborExpense:    { id: string; amount: number; payment_status: string; date: string } | null
  orderTask:    { status: string } | null
  deliveryTask: { status: string } | null
  installTask:  { status: string } | null
}

interface BudgetData {
  estimated_budget: number
  total_expenses: number
  currency: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n ?? 0)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const CATEGORY_LABELS: Record<string, string> = {
  materials: 'Materials', labor: 'Labor', equipment: 'Equipment',
  permits: 'Permits', subcontractors: 'Subcontractors',
  utilities: 'Utilities', insurance: 'Insurance', other: 'Other',
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  materials:      { bg: 'rgba(37,99,235,0.1)',   text: '#2563EB' },
  labor:          { bg: 'rgba(22,163,74,0.1)',    text: '#16A34A' },
  equipment:      { bg: 'rgba(245,158,11,0.1)',   text: '#D97706' },
  permits:        { bg: 'rgba(124,58,237,0.1)',   text: '#7C3AED' },
  subcontractors: { bg: 'rgba(234,88,12,0.1)',    text: '#EA580C' },
  utilities:      { bg: 'rgba(6,182,212,0.1)',    text: '#0891B2' },
  insurance:      { bg: 'rgba(219,39,119,0.1)',   text: '#DB2777' },
  other:          { bg: 'rgba(107,114,128,0.1)',  text: '#6B7280' },
}

const DS_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending:   { bg: 'rgba(245,158,11,0.1)',  text: '#D97706', border: '#FDE68A' },
  approved:  { bg: 'rgba(37,99,235,0.1)',   text: '#2563EB', border: '#BFDBFE' },
  rejected:  { bg: 'rgba(220,38,38,0.1)',   text: '#DC2626', border: '#FECACA' },
  ordered:   { bg: 'rgba(124,58,237,0.1)',  text: '#7C3AED', border: '#DDD6FE' },
  received:  { bg: 'rgba(14,165,233,0.1)',  text: '#0EA5E9', border: '#BAE6FD' },
  installed: { bg: 'rgba(22,163,74,0.1)',   text: '#16A34A', border: '#BBF7D0' },
}

const DS_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
  ordered: 'Ordered', received: 'Received', installed: 'Installed',
}

const ALL_CATEGORIES = [
  { value: 'materials',      label: 'Materials' },
  { value: 'labor',          label: 'Labor' },
  { value: 'equipment',      label: 'Equipment' },
  { value: 'permits',        label: 'Permits & Fees' },
  { value: 'subcontractors', label: 'Subcontractors' },
  { value: 'utilities',      label: 'Utilities' },
  { value: 'insurance',      label: 'Insurance' },
  { value: 'other',          label: 'Other' },
]

const FILTER_CATEGORIES = [{ value: 'all', label: 'All' }, ...ALL_CATEGORIES]

// ── Sub-components ────────────────────────────────────────────────────────────

function PipelineDot({ label, status, darkMode }: { label: string; status: string | null; darkMode: boolean }) {
  const done    = status === 'completed'
  const active  = status === 'in-progress' || status === 'review'
  const blocked = status === 'blocked'
  const color   = done ? '#16A34A' : active ? '#2563EB' : blocked ? '#DC2626' : '#9CA3AF'
  const bg      = done    ? (darkMode ? 'rgba(22,163,74,0.2)'  : '#F0FDF4') :
                  active  ? (darkMode ? 'rgba(37,99,235,0.2)'  : '#EFF6FF') :
                  blocked ? (darkMode ? 'rgba(220,38,38,0.2)'  : '#FEF2F2') :
                             (darkMode ? '#374151' : '#F3F4F6')
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: bg }}>
        {done
          ? <CheckCircleSolid className="w-3.5 h-3.5" style={{ color: '#16A34A' }} />
          : <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        }
      </div>
      <span className="text-xs" style={{ color }}>{label}</span>
    </div>
  )
}

function PaymentBadge({ status, date, amount, currency }: { status: string; date: string; amount: number; currency: string }) {
  if (status === 'paid') {
    return (
      <span className="text-xs flex items-center gap-1" style={{ color: '#16A34A' }}>
        <CheckCircleSolid className="w-3 h-3" />
        Paid {fmtDate(date)} · {fmt(amount, currency)}
      </span>
    )
  }
  if (status === 'overdue') {
    return <span className="text-xs font-medium" style={{ color: '#DC2626' }}>Overdue · {fmt(amount, currency)}</span>
  }
  return <span className="text-xs" style={{ color: '#D97706' }}>Pending · {fmt(amount, currency)}</span>
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  project: ProjectDetails
  onSpentChange?: (spent: number) => void
}

const EMPTY_EXPENSE_FORM = {
  category: 'equipment',
  description: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  vendor: '',
  payment_status: 'pending' as 'pending' | 'paid' | 'overdue',
}

export default function ProjectBudgetTab({ project, onSpentChange }: Props) {
  const { colors, darkMode } = useThemeColors()
  const [budgetData,  setBudgetData]  = useState<BudgetData | null>(null)
  const [expenses,    setExpenses]    = useState<Expense[] | null>(null)
  const [dsItems,     setDsItems]     = useState<DSItem[]>([])
  const [showAdd,     setShowAdd]     = useState(false)
  const [catFilter,   setCatFilter]   = useState('all')
  const [payFilter,   setPayFilter]   = useState<'all' | 'paid' | 'unpaid'>('all')
  const [newExp,      setNewExp]      = useState(EMPTY_EXPENSE_FORM)
  const [editingExp,  setEditingExp]  = useState<Expense | null>(null)
  const [editForm,    setEditForm]    = useState(EMPTY_EXPENSE_FORM)
  const [confirmDel,  setConfirmDel]  = useState<{ id: string; description: string } | null>(null)
  const [detailExp,   setDetailExp]   = useState<Expense | null>(null)
  const [saving,      setSaving]      = useState(false)

  useEffect(() => { loadData() }, [project.id])

  async function loadData() {
    try {
      const supabase = createClient()

      const [projectRes, expensesRes, selectionsRes, tasksRes] = await Promise.all([
        supabase.from('projects').select('estimated_budget, currency').eq('id', project.id).single(),
        supabase.from('project_expenses')
          .select('id, category, description, amount, date, vendor, payment_status, created_by, design_selection_id')
          .eq('project_id', project.id)
          .order('date', { ascending: false }),
        supabase.from('design_selections')
          .select('id, option_name, category, room_location, status, price, installation_cost')
          .eq('project_id', project.id)
          .order('created_at', { ascending: true }),
        supabase.from('tasks')
          .select('id, status, selection_task_type, design_selection_id')
          .eq('project_id', project.id)
          .not('design_selection_id', 'is', null),
      ])

      if (projectRes.error) throw projectRes.error
      if (expensesRes.error) throw expensesRes.error

      const expensesRaw = expensesRes.data || []

      // Resolve creator names
      const creatorIds = [...new Set(expensesRaw.map((e: any) => e.created_by).filter(Boolean))]
      const creatorMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {}
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles').select('id, full_name, avatar_url').in('id', creatorIds)
        profiles?.forEach((p: any) => { creatorMap[p.id] = p })
      }

      const formattedExpenses: Expense[] = expensesRaw.map((e: any) => ({
        id: e.id,
        category: e.category,
        description: e.description,
        amount: e.amount,
        date: e.date,
        vendor: e.vendor,
        payment_status: e.payment_status || 'pending',
        design_selection_id: e.design_selection_id ?? null,
        created_by: {
          name:   creatorMap[e.created_by]?.full_name  || 'Unknown',
          avatar: creatorMap[e.created_by]?.avatar_url || '',
        },
      }))

      const totalExpenses = formattedExpenses.reduce((s, e) => s + e.amount, 0)
      const estimated     = projectRes.data.estimated_budget || 0

      setBudgetData({
        estimated_budget: estimated,
        total_expenses:   totalExpenses,
        currency:         projectRes.data.currency || 'USD',
      })
      setExpenses(formattedExpenses)

      // Build per-selection items
      const tasksBySelId: Record<string, any[]> = {}
      for (const t of (tasksRes.data || [])) {
        if (!tasksBySelId[t.design_selection_id]) tasksBySelId[t.design_selection_id] = []
        tasksBySelId[t.design_selection_id].push(t)
      }

      const expBySelId: Record<string, Expense[]> = {}
      for (const e of formattedExpenses) {
        if (e.design_selection_id) {
          if (!expBySelId[e.design_selection_id]) expBySelId[e.design_selection_id] = []
          expBySelId[e.design_selection_id].push(e)
        }
      }

      const items: DSItem[] = (selectionsRes.data || [])
        .filter((s: any) => ['approved','ordered','received','installed'].includes(s.status))
        .map((s: any) => {
          const linked    = tasksBySelId[s.id] || []
          const linkedExp = expBySelId[s.id]   || []
          const matExp    = linkedExp.find(e => e.category === 'materials') ?? null
          const labExp    = linkedExp.find(e => e.category === 'labor')     ?? null
          return {
            id:               s.id,
            option_name:      s.option_name,
            category:         s.category,
            room_location:    s.room_location,
            status:           s.status,
            price:            s.price || 0,
            installation_cost: s.installation_cost || 0,
            materialExpense:  matExp ? { id: matExp.id, amount: matExp.amount, payment_status: matExp.payment_status, date: matExp.date } : null,
            laborExpense:     labExp ? { id: labExp.id, amount: labExp.amount, payment_status: labExp.payment_status, date: labExp.date } : null,
            orderTask:    linked.find(t => t.selection_task_type === 'order')        ?? null,
            deliveryTask: linked.find(t => t.selection_task_type === 'delivery')     ?? null,
            installTask:  linked.find(t => t.selection_task_type === 'installation') ?? null,
          }
        })

      setDsItems(items)
    } catch (err: any) {
      console.error('Failed to load budget data:', err?.message)
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const supabase = createClient()
      const profile  = await getUserCompany()
      if (!profile) throw new Error('Not authenticated')

      const amount = parseFloat(newExp.amount)
      const { data: inserted, error } = await supabase
        .from('project_expenses')
        .insert({
          project_id:     project.id,
          category:       newExp.category,
          description:    newExp.description,
          amount,
          date:           newExp.date,
          vendor:         newExp.vendor || null,
          payment_status: newExp.payment_status,
          created_by:     profile.id,
        })
        .select('id').single()
      if (error) throw error

      const added: Expense = {
        id:                   inserted.id,
        category:             newExp.category,
        description:          newExp.description,
        amount,
        date:                 newExp.date,
        vendor:               newExp.vendor || null,
        payment_status:       newExp.payment_status,
        design_selection_id:  null,
        created_by:           { name: profile.full_name ?? 'You', avatar: profile.avatar_url ?? '' },
      }
      setExpenses(prev => prev ? [added, ...prev] : [added])
      setBudgetData(prev => prev ? { ...prev, total_expenses: prev.total_expenses + amount } : prev)
      onSpentChange?.(budgetData ? budgetData.total_expenses + amount : amount)
      setNewExp(EMPTY_EXPENSE_FORM)
      setShowAdd(false)
      toast.success('Expense added')
    } catch (err: any) {
      console.error('Failed to add expense:', err?.message)
      toast.error('Failed to add expense.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingExp) return
    setSaving(true)
    try {
      const supabase = createClient()
      const newAmount = parseFloat(editForm.amount)
      const { error } = await supabase.from('project_expenses').update({
        category:       editForm.category,
        description:    editForm.description,
        amount:         newAmount,
        date:           editForm.date,
        vendor:         editForm.vendor || null,
        payment_status: editForm.payment_status,
      }).eq('id', editingExp.id)
      if (error) throw error

      const diff = newAmount - editingExp.amount
      setExpenses(prev => prev?.map(ex => ex.id === editingExp.id
        ? { ...ex, ...editForm, amount: newAmount, vendor: editForm.vendor || null }
        : ex) ?? prev)
      setBudgetData(prev => prev ? { ...prev, total_expenses: prev.total_expenses + diff } : prev)
      onSpentChange?.(budgetData ? budgetData.total_expenses + diff : newAmount)
      setEditingExp(null)
      toast.success('Expense updated')
    } catch (err: any) {
      toast.error('Failed to update expense.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!confirmDel) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('project_expenses').delete().eq('id', confirmDel.id)
      if (error) throw error
      const deleted = expenses?.find(e => e.id === confirmDel.id)
      setExpenses(prev => prev?.filter(e => e.id !== confirmDel.id) ?? prev)
      if (deleted) {
        setBudgetData(prev => prev ? { ...prev, total_expenses: prev.total_expenses - deleted.amount } : prev)
        onSpentChange?.(budgetData ? budgetData.total_expenses - deleted.amount : 0)
      }
      setConfirmDel(null)
    } catch {
      toast.error('Failed to delete expense.')
    }
  }

  async function markAsPaid(expId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('project_expenses')
      .update({ payment_status: 'paid' })
      .eq('id', expId)
    if (error) { toast.error('Failed to mark as paid.'); return }
    setExpenses(prev => prev?.map(e => e.id === expId ? { ...e, payment_status: 'paid' } : e) ?? prev)
    toast.success('Marked as paid')
  }

  function openEdit(exp: Expense) {
    setEditingExp(exp)
    setEditForm({
      category:       exp.category,
      description:    exp.description,
      amount:         String(exp.amount),
      date:           exp.date,
      vendor:         exp.vendor ?? '',
      payment_status: exp.payment_status,
    })
    setDetailExp(null)
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (budgetData === null || expenses === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const currency = budgetData.currency
  const estimated = budgetData.estimated_budget

  // Split recorded expenses by payment status
  const paidTotal    = expenses.filter(e => e.payment_status === 'paid').reduce((n, e) => n + e.amount, 0)
  const pendingTotal = expenses.filter(e => e.payment_status !== 'paid').reduce((n, e) => n + e.amount, 0)

  // Projected spend: actual + unpaid committed material + unpaid installation labor
  const dsExpIds    = new Set(expenses.filter(e => e.design_selection_id).map(e => e.design_selection_id))
  const dsLaborIds  = new Set(expenses.filter(e => e.category === 'labor' && e.design_selection_id).map(e => e.design_selection_id))

  const unpaidMaterials = dsItems
    .filter(s => ['ordered','received','installed'].includes(s.status) && !dsExpIds.has(s.id))
    .reduce((n, s) => n + s.price, 0)
  const unpaidInstall = dsItems
    .filter(s => ['approved','ordered','received','installed'].includes(s.status) && !dsLaborIds.has(s.id))
    .reduce((n, s) => n + s.installation_cost, 0)
  const approvedUnordered = dsItems
    .filter(s => s.status === 'approved')
    .reduce((n, s) => n + s.price, 0)

  const projected    = budgetData.total_expenses + unpaidMaterials + unpaidInstall + approvedUnordered
  const projectedPct = estimated > 0 ? (projected / estimated) * 100 : 0
  const remaining    = estimated - projected
  const isOver       = remaining < 0

  const allExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date))
  const filteredExpenses = allExpenses
    .filter(e => catFilter === 'all' || e.category === catFilter)
    .filter(e => payFilter === 'all' ? true : payFilter === 'paid' ? e.payment_status === 'paid' : e.payment_status !== 'paid')

  const pendingPayments = expenses.filter(e => e.payment_status === 'pending' || e.payment_status === 'overdue')
    .sort((a, b) => (a.payment_status === 'overdue' ? -1 : 1))

  const cardStyle = { backgroundColor: colors.bgAlt, border: colors.border, borderRadius: '0.5rem' }
  const inputStyle = {
    backgroundColor: colors.bgAlt, border: colors.border,
    color: colors.text, borderRadius: '0.375rem',
    padding: '0.5rem 0.75rem', fontSize: '0.875rem',
    width: '100%', outline: 'none',
  }

  return (
    <>
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: colors.text }}>Budget</h2>
          <p className="text-sm mt-0.5" style={{ color: colors.textMuted }}>
            Track project expenses and projected spend
          </p>
        </div>
      </div>

      {/* ── Budget Overview ── */}
      <div className="rounded-lg p-5" style={cardStyle}>
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" style={{ color: colors.text }}>
                {fmt(projected, currency)}
              </span>
              <span className="text-sm" style={{ color: colors.textMuted }}>
                of {fmt(estimated, currency)}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              Projected total (paid + committed + approved)
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: isOver ? '#DC2626' : projectedPct > 90 ? '#D97706' : '#16A34A' }}>
              {isOver ? '+' : ''}{fmt(Math.abs(remaining), currency)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              {isOver ? 'over budget' : 'remaining'}
            </p>
          </div>
        </div>

        {/* Stacked bar */}
        <div className="w-full h-2.5 rounded-full overflow-hidden flex mb-2" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}>
          {paidTotal > 0 && (
            <div className="h-full bg-blue-500" style={{ width: `${Math.min((paidTotal / estimated) * 100, 100)}%` }} />
          )}
          {pendingTotal > 0 && (
            <div className="h-full bg-orange-400" style={{ width: `${Math.min((pendingTotal / estimated) * 100, Math.max(0, 100 - (paidTotal / estimated) * 100))}%` }} />
          )}
          {(unpaidMaterials + unpaidInstall) > 0 && (
            <div className="h-full bg-purple-500" style={{ width: `${Math.min(((unpaidMaterials + unpaidInstall) / estimated) * 100, Math.max(0, 100 - (budgetData.total_expenses / estimated) * 100))}%` }} />
          )}
          {approvedUnordered > 0 && (
            <div className="h-full bg-yellow-400" style={{ width: `${Math.min((approvedUnordered / estimated) * 100, Math.max(0, 100 - ((budgetData.total_expenses + unpaidMaterials + unpaidInstall) / estimated) * 100))}%` }} />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: colors.textMuted }}>
          {paidTotal > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              Paid {fmt(paidTotal, currency)}
            </span>
          )}
          {pendingTotal > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
              Pending {fmt(pendingTotal, currency)}
            </span>
          )}
          {(unpaidMaterials + unpaidInstall) > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              Committed {fmt(unpaidMaterials + unpaidInstall, currency)}
            </span>
          )}
          {approvedUnordered > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
              Approved {fmt(approvedUnordered, currency)}
            </span>
          )}
          <span className="ml-auto font-medium" style={{ color: isOver ? '#DC2626' : colors.textMuted }}>
            {projectedPct.toFixed(1)}% of budget
          </span>
        </div>
      </div>

      {/* ── Pending Payments ── */}
      {pendingPayments.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-3" style={{ color: colors.text }}>
            Pending Payments
            <span className="ml-2 text-sm font-normal" style={{ color: colors.textMuted }}>
              {pendingPayments.length} {pendingPayments.length === 1 ? 'item' : 'items'} · {fmt(pendingPayments.reduce((s, e) => s + e.amount, 0), currency)}
            </span>
          </h3>
          <div className="space-y-2">
            {pendingPayments.map(exp => {
              const cc = CATEGORY_COLORS[exp.category] ?? CATEGORY_COLORS.other
              const isOverdue = exp.payment_status === 'overdue'
              return (
                <div
                  key={exp.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg"
                  style={{ ...cardStyle, borderLeft: `3px solid ${isOverdue ? '#DC2626' : '#D97706'}` }}
                >
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailExp(exp)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: colors.text }}>{exp.description}</span>
                      <span className="text-sm font-bold shrink-0" style={{ color: isOverdue ? '#DC2626' : colors.text }}>
                        {fmt(exp.amount, currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: cc.bg, color: cc.text }}>
                        {CATEGORY_LABELS[exp.category] ?? exp.category}
                      </span>
                      <span className="text-xs" style={{ color: colors.textMuted }}>{fmtDate(exp.date)}</span>
                      {exp.vendor && <span className="text-xs" style={{ color: colors.textMuted }}>· {exp.vendor}</span>}
                      <span className="text-xs font-semibold" style={{ color: isOverdue ? '#DC2626' : '#D97706' }}>
                        {isOverdue ? 'Overdue' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => markAsPaid(exp.id)}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 cursor-pointer"
                  >
                    Mark Paid
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Design Selection Costs ── */}
      {dsItems.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-3" style={{ color: colors.text }}>
            Design Selection Costs
            <span className="ml-2 text-sm font-normal" style={{ color: colors.textMuted }}>
              {dsItems.length} {dsItems.length === 1 ? 'item' : 'items'}
            </span>
          </h3>
          <div className="space-y-2">
            {dsItems.map(item => {
              const sc = DS_STATUS_COLORS[item.status] ?? DS_STATUS_COLORS.approved
              const showPipeline = ['ordered','received','installed'].includes(item.status)
              return (
                <div key={item.id} className="rounded-lg p-4" style={{ ...cardStyle, borderLeft: `3px solid ${sc.border}` }}>
                  {/* Top row: name + status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold" style={{ color: colors.text }}>{item.option_name}</span>
                      <span className="text-xs ml-2" style={{ color: colors.textMuted }}>
                        {item.category}{item.room_location ? ` · ${item.room_location}` : ''}
                      </span>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                      style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
                    >
                      {DS_STATUS_LABELS[item.status]}
                    </span>
                  </div>

                  {/* Cost rows */}
                  <div className="space-y-1.5 mb-3">
                    {item.price > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: colors.textMuted }}>Materials</span>
                        {item.materialExpense
                          ? <PaymentBadge status={item.materialExpense.payment_status} date={item.materialExpense.date} amount={item.materialExpense.amount} currency={currency} />
                          : <span style={{ color: colors.textMuted }}>{fmt(item.price, currency)} — not yet paid</span>
                        }
                      </div>
                    )}
                    {item.installation_cost > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: colors.textMuted }}>Installation</span>
                        {item.laborExpense
                          ? <PaymentBadge status={item.laborExpense.payment_status} date={item.laborExpense.date} amount={item.laborExpense.amount} currency={currency} />
                          : <span style={{ color: item.status === 'installed' ? '#D97706' : colors.textMuted }}>
                              {fmt(item.installation_cost, currency)}{item.status !== 'installed' ? ' — pending install' : ' — not yet paid'}
                            </span>
                        }
                      </div>
                    )}
                  </div>

                  {/* Task pipeline */}
                  {showPipeline && (
                    <div className="flex items-center gap-1.5">
                      <PipelineDot label="Order"    status={item.orderTask?.status    ?? null} darkMode={darkMode} />
                      <ChevronRightIcon className="h-3 w-3 shrink-0" style={{ color: colors.textMuted }} />
                      <PipelineDot label="Delivery" status={item.deliveryTask?.status ?? null} darkMode={darkMode} />
                      <ChevronRightIcon className="h-3 w-3 shrink-0" style={{ color: colors.textMuted }} />
                      <PipelineDot label="Install"  status={item.installTask?.status  ?? null} darkMode={darkMode} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── All Expenses ── */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-base font-semibold" style={{ color: colors.text }}>
            All Expenses
            <span className="ml-2 text-sm font-normal" style={{ color: colors.textMuted }}>
              {filteredExpenses.length} {filteredExpenses.length === 1 ? 'entry' : 'entries'}
            </span>
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Paid / Unpaid toggle */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: colors.border }}>
              {(['all', 'paid', 'unpaid'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setPayFilter(f)}
                  className="px-3 py-1.5 text-xs font-medium capitalize cursor-pointer"
                  style={payFilter === f
                    ? { backgroundColor: '#2563EB', color: '#fff' }
                    : { backgroundColor: colors.bgAlt, color: colors.textMuted }
                  }
                >
                  {f === 'unpaid' ? 'Pending' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              className="text-sm rounded-lg px-3 py-1.5 outline-none"
              style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text, colorScheme: darkMode ? 'dark' : 'light' }}
            >
              {FILTER_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium cursor-pointer"
            >
              <PlusIcon className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {filteredExpenses.length > 0 ? filteredExpenses.map(exp => {
            const cc = CATEGORY_COLORS[exp.category] ?? CATEGORY_COLORS.other
            const isPaid = exp.payment_status === 'paid'
            const isOverdue = exp.payment_status === 'overdue'
            return (
              <div
                key={exp.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer"
                style={cardStyle}
                onClick={() => setDetailExp(exp)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate" style={{ color: colors.text }}>{exp.description}</span>
                    <span className="text-sm font-bold shrink-0" style={{ color: colors.text }}>{fmt(exp.amount, currency)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: cc.bg, color: cc.text }}>
                      {CATEGORY_LABELS[exp.category] ?? exp.category}
                    </span>
                    <span className="text-xs" style={{ color: colors.textMuted }}>{fmtDate(exp.date)}</span>
                    {exp.vendor && <span className="text-xs" style={{ color: colors.textMuted }}>· {exp.vendor}</span>}
                    <span className="text-xs font-medium" style={{
                      color: isPaid ? '#16A34A' : isOverdue ? '#DC2626' : '#D97706'
                    }}>
                      {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(exp) }}
                    className="p-1.5 rounded-lg"
                    style={{ color: colors.textMuted, border: colors.border }}
                    title="Edit"
                  >
                    <PencilSquareIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDel({ id: exp.id, description: exp.description }) }}
                    className="p-1.5 rounded-lg"
                    style={{ color: colors.textMuted, border: colors.border }}
                    title="Delete"
                    onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = colors.textMuted)}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          }) : (
            <div className="text-center py-10 rounded-lg" style={{ ...cardStyle, borderStyle: 'dashed' }}>
              <CheckCircleIcon className="h-10 w-10 mx-auto mb-2" style={{ color: darkMode ? '#374151' : '#D1D5DB' }} />
              <p className="text-sm" style={{ color: colors.textMuted }}>
                No expenses match this filter
              </p>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ── Add Expense Modal ── */}
    {showAdd && (
      <>
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAdd(false)} />
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
          <div className="pointer-events-auto rounded-xl shadow-xl w-full max-w-md" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: colors.borderBottom }}>
              <h3 className="text-base font-semibold" style={{ color: colors.text }}>Add Expense</h3>
              <button onClick={() => setShowAdd(false)} style={{ color: colors.textMuted }}><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAddExpense} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>
                  Description <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  required rows={2} value={newExp.description}
                  onChange={e => setNewExp(f => ({ ...f, description: e.target.value }))}
                  placeholder="What was this expense for?"
                  className="resize-none outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Category</label>
                  <select
                    value={newExp.category}
                    onChange={e => setNewExp(f => ({ ...f, category: e.target.value }))}
                    className="outline-none"
                    style={{ ...inputStyle, colorScheme: darkMode ? 'dark' : 'light' }}
                  >
                    {ALL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>
                    Amount <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    required type="number" min="0" step="0.01"
                    value={newExp.amount}
                    onChange={e => setNewExp(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>
                    Date <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    required type="date"
                    value={newExp.date}
                    onChange={e => setNewExp(f => ({ ...f, date: e.target.value }))}
                    className="outline-none"
                    style={{ ...inputStyle, colorScheme: darkMode ? 'dark' : 'light' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Vendor</label>
                  <input
                    type="text" value={newExp.vendor}
                    onChange={e => setNewExp(f => ({ ...f, vendor: e.target.value }))}
                    placeholder="Vendor name"
                    className="outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Payment Status</label>
                <select
                  value={newExp.payment_status}
                  onChange={e => setNewExp(f => ({ ...f, payment_status: e.target.value as any }))}
                  className="outline-none"
                  style={{ ...inputStyle, colorScheme: darkMode ? 'dark' : 'light' }}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit" disabled={saving || !newExp.description || !newExp.amount}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Add Expense'}
                </button>
                <button
                  type="button" onClick={() => setShowAdd(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    )}

    {/* ── Edit Expense Modal ── */}
    {editingExp && (
      <>
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setEditingExp(null)} />
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
          <div className="pointer-events-auto rounded-xl shadow-xl w-full max-w-md" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: colors.borderBottom }}>
              <h3 className="text-base font-semibold" style={{ color: colors.text }}>Edit Expense</h3>
              <button onClick={() => setEditingExp(null)} style={{ color: colors.textMuted }}><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Description</label>
                <input
                  required value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Category</label>
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                    className="outline-none"
                    style={{ ...inputStyle, colorScheme: darkMode ? 'dark' : 'light' }}
                  >
                    {ALL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Amount</label>
                  <input
                    required type="number" min="0" step="0.01"
                    value={editForm.amount}
                    onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                    className="outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Date</label>
                  <input
                    required type="date" value={editForm.date}
                    onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                    className="outline-none"
                    style={{ ...inputStyle, colorScheme: darkMode ? 'dark' : 'light' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Vendor</label>
                  <input
                    value={editForm.vendor}
                    onChange={e => setEditForm(f => ({ ...f, vendor: e.target.value }))}
                    className="outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Payment Status</label>
                <select
                  value={editForm.payment_status}
                  onChange={e => setEditForm(f => ({ ...f, payment_status: e.target.value as any }))}
                  className="outline-none"
                  style={{ ...inputStyle, colorScheme: darkMode ? 'dark' : 'light' }}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  type="button" onClick={() => setEditingExp(null)}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    )}

    {/* ── Expense Detail Panel ── */}
    {detailExp && (
      <>
        <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setDetailExp(null)} />
        <div className="fixed right-0 top-0 h-full w-96 shadow-xl z-50 flex flex-col" style={{ backgroundColor: colors.bg }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: colors.borderBottom }}>
            <h3 className="text-base font-semibold" style={{ color: colors.text }}>Expense Details</h3>
            <button onClick={() => setDetailExp(null)} style={{ color: colors.textMuted }}>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <p className="text-lg font-semibold" style={{ color: colors.text }}>{detailExp.description}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: colors.text }}>{fmt(detailExp.amount, currency)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Category', value: <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: (CATEGORY_COLORS[detailExp.category] ?? CATEGORY_COLORS.other).bg, color: (CATEGORY_COLORS[detailExp.category] ?? CATEGORY_COLORS.other).text }}>{CATEGORY_LABELS[detailExp.category] ?? detailExp.category}</span> },
                { label: 'Date',     value: fmtDate(detailExp.date) },
                { label: 'Status',   value: detailExp.payment_status },
                ...(detailExp.vendor ? [{ label: 'Vendor', value: detailExp.vendor }] : []),
                { label: 'Added by', value: detailExp.created_by.name },
              ].map(({ label, value }) => (
                <div key={label} className={label === 'Added by' || label === 'Vendor' ? 'col-span-2' : ''}>
                  <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>{label}</p>
                  <span style={{ color: colors.text }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-5 py-4 flex gap-2" style={{ borderTop: colors.borderBottom }}>
            <button
              onClick={() => openEdit(detailExp)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ border: colors.border, color: colors.text }}
            >
              <PencilSquareIcon className="h-4 w-4" /> Edit
            </button>
            <button
              onClick={() => { setDetailExp(null); setConfirmDel({ id: detailExp.id, description: detailExp.description }) }}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              style={{ border: '1px solid #FECACA' }}
            >
              Delete
            </button>
          </div>
        </div>
      </>
    )}

    {/* ── Confirm Delete ── */}
    {confirmDel && (
      <>
        <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setConfirmDel(null)} />
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <p className="text-sm font-medium text-center mb-1" style={{ color: colors.text }}>Delete this expense?</p>
            <p className="text-xs text-center mb-5" style={{ color: colors.textMuted }}>{confirmDel.description}</p>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#DC2626' }}>
                Delete
              </button>
              <button onClick={() => setConfirmDel(null)} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </>
    )}
    </>
  )
}
