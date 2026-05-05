'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ProjectDetails, DesignSelection } from '@/lib/projects/get-project-details'
import { createClient } from '@/lib/supabase/client'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import { createTask } from '@/lib/supabase/tasks'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'

interface Props {
  project: ProjectDetails
  refreshKey?: number
  onMutate?: () => void
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'ordered' | 'received' | 'installed' | 'rejected'

const STATUS_LABELS: Record<DesignSelection['status'], string> = {
  pending:   'Pending Approval',
  approved:  'Approved',
  rejected:  'Rejected',
  ordered:   'Ordered',
  received:  'Received',
  installed: 'Installed',
}

const STATUS_COLORS: Record<DesignSelection['status'], { bg: string; text: string; border: string }> = {
  pending:   { bg: 'rgba(245,158,11,0.1)',  text: '#D97706', border: '#FDE68A' },
  approved:  { bg: 'rgba(37,99,235,0.1)',   text: '#2563EB', border: '#BFDBFE' },
  rejected:  { bg: 'rgba(220,38,38,0.1)',   text: '#DC2626', border: '#FECACA' },
  ordered:   { bg: 'rgba(124,58,237,0.1)',  text: '#7C3AED', border: '#DDD6FE' },
  received:  { bg: 'rgba(14,165,233,0.1)',  text: '#0EA5E9', border: '#BAE6FD' },
  installed: { bg: 'rgba(22,163,74,0.1)',   text: '#16A34A', border: '#BBF7D0' },
}

const CATEGORIES = [
  'Cabinetry', 'Countertops', 'Appliances', 'Plumbing Fixtures',
  'Lighting', 'Flooring', 'Tile', 'Hardware', 'Paint', 'Doors & Windows',
  'HVAC Equipment', 'Electrical Fixtures', 'Other',
]

const EMPTY_FORM = {
  category: 'Cabinetry',
  room_location: '',
  option_name: '',
  manufacturer: '',
  model: '',
  sku: '',
  color: '',
  finish: '',
  description: '',
  price: '',
  installation_cost: '',
  lead_time_days: '0',
  notes: '',
  status: 'pending' as DesignSelection['status'],
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

// Mini pipeline step shown on each approved/ordered/received/installed card
function PipelineStep({
  label, taskStatus, darkMode,
}: { label: string; taskStatus: string | null; darkMode: boolean }) {
  const done    = taskStatus === 'completed'
  const active  = taskStatus === 'in-progress' || taskStatus === 'review'
  const blocked = taskStatus === 'blocked'

  const bg    = done    ? (darkMode ? 'rgba(22,163,74,0.2)'  : '#F0FDF4') :
                active  ? (darkMode ? 'rgba(37,99,235,0.2)'  : '#EFF6FF') :
                blocked ? (darkMode ? 'rgba(220,38,38,0.2)'  : '#FEF2F2') :
                           (darkMode ? '#374151' : '#F3F4F6')
  const text  = done ? '#16A34A' : active ? '#2563EB' : blocked ? '#DC2626' : '#9CA3AF'

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: bg }}>
        {done
          ? <CheckCircleSolid className="w-4 h-4" style={{ color: '#16A34A' }} />
          : <div className="w-2 h-2 rounded-full" style={{ backgroundColor: text }} />
        }
      </div>
      <span className="text-xs" style={{ color: text }}>{label}</span>
    </div>
  )
}

export default function ProjectDesignSelectionsTab({ project, refreshKey = 0, onMutate }: Props) {
  const { colors, darkMode } = useThemeColors()
  const [selections, setSelections] = useState<DesignSelection[] | null>(null)
  const [tasks, setTasks] = useState<any[] | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [showPanel, setShowPanel] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [signatureTarget, setSignatureTarget] = useState<DesignSelection | null>(null)
  const [signatureForm, setSignatureForm] = useState({ name: '', email: '' })

  useEffect(() => {
    fetchSelections()
    fetchTasks()
  }, [project.id, refreshKey])

  async function fetchSelections() {
    const res = await fetch(`/api/projects/${project.id}/design-selections`)
    if (res.ok) {
      const { selections } = await res.json()
      if (selections) setSelections(selections as DesignSelection[])
    }
  }

  async function fetchTasks() {
    const res = await fetch(`/api/projects/${project.id}/tasks`)
    if (res.ok) {
      const { tasks } = await res.json()
      if (tasks) setTasks(tasks as any)
    }
  }

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowPanel(true)
  }

  function openEdit(sel: DesignSelection) {
    setEditingId(sel.id)
    setForm({
      category:          sel.category,
      room_location:     sel.room_location,
      option_name:       sel.option_name,
      manufacturer:      sel.manufacturer,
      model:             sel.model,
      sku:               sel.sku,
      color:             sel.color,
      finish:            sel.finish,
      description:       sel.description,
      price:             sel.price.toString(),
      installation_cost: sel.installation_cost.toString(),
      lead_time_days:    sel.lead_time_days.toString(),
      notes:             sel.notes,
      status:            sel.status,
    })
    setShowPanel(true)
  }

  async function handleSave() {
    if (!form.option_name.trim() || !form.price) return
    setSaving(true)
    try {
      const basePayload = {
        category:          form.category,
        room_location:     form.room_location,
        option_name:       form.option_name.trim(),
        manufacturer:      form.manufacturer,
        model:             form.model,
        sku:               form.sku,
        color:             form.color,
        finish:            form.finish,
        description:       form.description,
        price:             parseFloat(form.price) || 0,
        installation_cost: parseFloat(form.installation_cost) || 0,
        lead_time_days:    parseInt(form.lead_time_days) || 0,
        notes:             form.notes,
      }

      if (editingId) {
        const original = (selections ?? []).find(s => s.id === editingId)
        const statusChanged = original?.status !== form.status

        if (statusChanged && form.status === 'approved') {
          // Save fields first, then open signature modal
          await fetch(`/api/projects/${project.id}/design-selections/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(basePayload),
          })
          await fetchSelections()
          setShowPanel(false)
          setSaving(false)
          const updated = { ...original!, ...basePayload } as DesignSelection
          openSignatureModal(updated)
          return
        }

        const payload: any = { ...basePayload, status: form.status }

        if (statusChanged && original?.status === 'approved' && form.status !== 'approved') {
          payload.client_approved = false
          payload.approved_date = null
          payload.approved_by_name = null
          payload.approved_by_email = null
        }

        if (statusChanged && form.status === 'pending') {
          await deleteLinkedTasks(editingId)
        }

        await fetch(`/api/projects/${project.id}/design-selections/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch(`/api/projects/${project.id}/design-selections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(basePayload),
        })
      }

      await fetchSelections()
      onMutate?.()
      setShowPanel(false)
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/projects/${project.id}/design-selections/${id}`, { method: 'DELETE' })
    setSelections(prev => (prev ?? []).filter(s => s.id !== id))
    setTasks(prev => prev ? prev.filter((t: any) => t.design_selection_id !== id) : prev)
    setConfirmDeleteId(null)
    onMutate?.()
  }

  function openSignatureModal(sel: DesignSelection) {
    setSignatureTarget(sel)
    setSignatureForm({ name: '', email: '' })
  }

  async function handleClientApproval(e: React.FormEvent) {
    e.preventDefault()
    if (!signatureTarget) return
    if (!signatureForm.name.trim()) { toast.error('Client name is required'); return }
    const sel = signatureTarget
    setSignatureTarget(null)
    await handleApprove(sel, signatureForm.name.trim(), signatureForm.email.trim() || null)
  }

  async function handleApprove(sel: DesignSelection, clientName: string, clientEmail: string | null) {
    setApprovingId(sel.id)
    try {
      const supabase = createClient()

      // 1. Approve the selection with client e-signature
      await supabase.from('design_selections').update({
        status: 'approved',
        client_approved: true,
        approved_date: new Date().toISOString(),
        approved_by_name: clientName,
        approved_by_email: clientEmail,
      }).eq('id', sel.id)

      // 2. Check if tasks already exist for this selection
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('design_selection_id', sel.id)
        .eq('project_id', project.id)

      if (!existingTasks || existingTasks.length === 0) {
        // 3. Auto-generate 3 tasks: order → delivery → installation
        const today = new Date()
        const leadDays = sel.lead_time_days || 14
        const orderDue    = new Date(today); orderDue.setDate(today.getDate() + 3)
        const deliveryDue = new Date(today); deliveryDue.setDate(today.getDate() + leadDays)
        const installDue  = new Date(today); installDue.setDate(today.getDate() + leadDays + 7)

        const toDate = (d: Date) => d.toISOString().split('T')[0]

        const taskDefs = [
          {
            title: `Place order — ${sel.option_name}`,
            selection_task_type: 'order' as const,
            phase: 'pre-construction' as const,
            due_date: toDate(orderDue),
          },
          {
            title: `Receive delivery — ${sel.option_name}`,
            selection_task_type: 'delivery' as const,
            phase: 'pre-construction' as const,
            due_date: toDate(deliveryDue),
          },
          {
            title: `Install — ${sel.option_name}`,
            selection_task_type: 'installation' as const,
            phase: 'finishing' as const,
            due_date: toDate(installDue),
          },
        ]

        let prevTaskId: string | null = null
        for (const def of taskDefs) {
          const { data: created } = await createTask({
            title:             def.title,
            description:       `${sel.category}${sel.room_location ? ` — ${sel.room_location}` : ''}`,
            project_id:        project.id,
            project_name:      project.name,
            trade:             'general',
            phase:             def.phase,
            priority:          null,
            status:            'not-started',
            assignee_id:       null,
            assignee_name:     null,
            assignee_avatar:   null,
            start_date:        null,
            due_date:          def.due_date,
            duration:          1,
            progress:          0,
            estimated_hours:   4,
            actual_hours:      0,
            dependencies:      prevTaskId ? [prevTaskId] : [],
            attachments:       0,
            comments:          0,
            location:          sel.room_location || null,
            weather_dependent: false,
            weather_buffer:    0,
            inspection_required: false,
            inspection_type:   null,
            crew_size:         1,
            equipment:         [],
            materials:         [],
            certifications:    [],
            safety_protocols:  [],
            quality_standards: [],
            documentation:     [],
            notify_inspector:  false,
            client_visibility: false,
            design_selection_id:  sel.id,
            selection_task_type:  def.selection_task_type,
          } as any)
          if (created?.id) prevTaskId = created.id
        }

        toast.success(`Approved by ${clientName} — 3 tasks created for ${sel.option_name}`)
        onMutate?.()
      } else {
        toast.success(`${sel.option_name} approved by ${clientName}`)
      }

      await fetchSelections()
      await fetchTasks()
    } catch {
      toast.error('Failed to approve selection.')
    } finally {
      setApprovingId(null)
    }
  }

  async function deleteLinkedTasks(selId: string) {
    const supabase = createClient()
    await Promise.all([
      supabase.from('tasks').delete().eq('design_selection_id', selId),
      supabase.from('project_expenses').delete().eq('design_selection_id', selId),
    ])
    setTasks(prev => prev ? prev.filter((t: any) => t.design_selection_id !== selId) : prev)
  }

  async function handleReject(sel: DesignSelection) {
    await fetch(`/api/projects/${project.id}/design-selections/${sel.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    })
    setSelections(prev => (prev ?? []).map(s => s.id === sel.id ? { ...s, status: 'rejected' } : s))
    onMutate?.()
  }

  // Derive linked task statuses for a selection's pipeline
  function getLinkedTasks(selId: string) {
    const linked = (tasks ?? []).filter((t: any) => t.design_selection_id === selId)
    return {
      order:    linked.find((t: any) => t.selection_task_type === 'order'),
      delivery: linked.find((t: any) => t.selection_task_type === 'delivery'),
      install:  linked.find((t: any) => t.selection_task_type === 'installation'),
    }
  }

  if (selections === null || tasks === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  const filtered = filter === 'all' ? selections : selections.filter(s => s.status === filter)

  // Stats
  const counts = {
    pending:   selections.filter(s => s.status === 'pending').length,
    approved:  selections.filter(s => s.status === 'approved').length,
    ordered:   selections.filter(s => s.status === 'ordered').length,
    received:  selections.filter(s => s.status === 'received').length,
    installed: selections.filter(s => s.status === 'installed').length,
  }
  const totalValue = selections.reduce((n, s) => n + s.price + s.installation_cost, 0)

  const cardStyle = { backgroundColor: colors.card, border: colors.border, borderRadius: '0.5rem' }

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'all',       label: `All (${selections.length})` },
    { key: 'pending',   label: `Pending (${counts.pending})` },
    { key: 'approved',  label: `Approved (${counts.approved})` },
    { key: 'ordered',   label: `Ordered (${counts.ordered})` },
    { key: 'received',  label: `Received (${counts.received})` },
    { key: 'installed', label: `Installed (${counts.installed})` },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: colors.text }}>Design Selections</h2>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            Manage material and finish choices — approve items to generate procurement tasks automatically
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          Add Selection
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Value',  value: fmt(totalValue),         color: colors.text },
          { label: 'Pending',      value: counts.pending,           color: counts.pending > 0 ? '#D97706' : colors.textMuted },
          { label: 'In Progress',  value: counts.ordered + counts.received, color: '#7C3AED' },
          { label: 'Installed',    value: counts.installed,         color: '#16A34A' },
        ].map(card => (
          <div key={card.label} className="rounded-lg p-4" style={cardStyle}>
            <div className="text-xs mb-1" style={{ color: colors.textMuted }}>{card.label}</div>
            <div className="text-lg font-bold" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={filter === f.key
              ? { backgroundColor: '#2563EB', color: '#FFFFFF' }
              : { backgroundColor: darkMode ? '#1f2937' : '#F3F4F6', color: colors.textMuted }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Selection List */}
      {filtered.length === 0 ? (
        <div className="rounded-lg p-12 text-center" style={cardStyle}>
          <CheckCircleIcon className="h-12 w-12 mx-auto mb-4" style={{ color: darkMode ? '#374151' : '#D1D5DB' }} />
          <h3 className="text-base font-medium mb-1" style={{ color: colors.text }}>
            {filter === 'all' ? 'No selections yet' : `No ${filter} selections`}
          </h3>
          <p className="text-sm" style={{ color: colors.textMuted }}>
            {filter === 'all' ? 'Add selections to track materials and finishes for this project' : 'Nothing to show for this filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sel => {
            const sc    = STATUS_COLORS[sel.status]
            const linked = getLinkedTasks(sel.id)
            const showPipeline = ['approved', 'ordered', 'received', 'installed'].includes(sel.status)

            return (
              <div key={sel.id} className="rounded-lg p-4" style={{ backgroundColor: colors.card, borderRadius: '0.5rem', borderTop: colors.border, borderRight: colors.border, borderBottom: colors.border, borderLeft: `3px solid ${sc.border}` }}>
                <div className="flex items-start gap-4">

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-base font-semibold" style={{ color: colors.text }}>
                        {sel.option_name}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
                      >
                        {STATUS_LABELS[sel.status]}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-xs mb-2" style={{ color: colors.textMuted }}>
                      <span>{sel.category}</span>
                      {sel.room_location && <span>· {sel.room_location}</span>}
                      {sel.manufacturer && <span>· {sel.manufacturer}{sel.model ? ` ${sel.model}` : ''}</span>}
                      {sel.color && <span>· {sel.color}</span>}
                    </div>

                    {/* Price row */}
                    <div className="flex items-center gap-4 text-sm">
                      {sel.price > 0 && (
                        <span style={{ color: colors.text }}>
                          <span style={{ color: colors.textMuted }}>Materials: </span>
                          <span className="font-semibold">{fmt(sel.price)}</span>
                        </span>
                      )}
                      {sel.installation_cost > 0 && (
                        <span style={{ color: colors.text }}>
                          <span style={{ color: colors.textMuted }}>Install: </span>
                          <span className="font-semibold">{fmt(sel.installation_cost)}</span>
                        </span>
                      )}
                      {sel.lead_time_days > 0 && (
                        <span style={{ color: colors.textMuted }}>{sel.lead_time_days}d lead time</span>
                      )}
                    </div>

                    {/* Task pipeline — visible after approval */}
                    {showPipeline && (
                      <div className="flex items-center gap-2 mt-3">
                        <PipelineStep label="Order"    taskStatus={linked.order?.status ?? null}    darkMode={darkMode} />
                        <ChevronRightIcon className="h-3 w-3 shrink-0" style={{ color: colors.textMuted }} />
                        <PipelineStep label="Delivery" taskStatus={linked.delivery?.status ?? null} darkMode={darkMode} />
                        <ChevronRightIcon className="h-3 w-3 shrink-0" style={{ color: colors.textMuted }} />
                        <PipelineStep label="Install"  taskStatus={linked.install?.status ?? null}  darkMode={darkMode} />
                      </div>
                    )}

                    {sel.notes && (
                      <p className="text-xs mt-2 italic" style={{ color: colors.textMuted }}>{sel.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {sel.status === 'pending' && (
                      <>
                        <button
                          onClick={() => openSignatureModal(sel)}
                          disabled={approvingId === sel.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                        >
                          {approvingId === sel.id ? 'Approving…' : 'Get Approval'}
                        </button>
                        <button
                          onClick={() => handleReject(sel)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                          style={{ border: colors.border, color: '#DC2626' }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {sel.status === 'rejected' && (
                      <button
                        onClick={() => openSignatureModal(sel)}
                        disabled={approvingId === sel.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                        style={{ border: colors.border, color: '#2563EB' }}
                      >
                        Re-approve
                      </button>
                    )}
                    {sel.status !== 'pending' && sel.status !== 'rejected' && sel.approved_by_name && (
                      <span className="text-xs" style={{ color: colors.textMuted }}>
                        Signed: {sel.approved_by_name}
                      </span>
                    )}
                    <button
                      onClick={() => openEdit(sel)}
                      className="p-1.5 rounded-lg transition-colors cursor-pointer"
                      style={{ color: colors.textMuted, border: colors.border }}
                      title="Edit"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(sel.id)}
                      className="p-1.5 rounded-lg transition-colors cursor-pointer"
                      style={{ color: colors.textMuted, border: colors.border }}
                      title="Delete"
                      onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = colors.textMuted)}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Panel */}
      {showPanel && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowPanel(false)} />
          <div className="fixed right-0 top-0 h-full w-105 shadow-xl z-50 flex flex-col" style={{ backgroundColor: colors.bg }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: colors.borderBottom }}>
              <h3 className="text-base font-semibold" style={{ color: colors.text }}>
                {editingId ? 'Edit Selection' : 'Add Selection'}
              </h3>
              <button onClick={() => setShowPanel(false)} style={{ color: colors.textMuted }}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Category + Room */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Room / Location</label>
                  <input
                    value={form.room_location}
                    onChange={e => setForm(f => ({ ...f, room_location: e.target.value }))}
                    placeholder="e.g. Kitchen"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                  />
                </div>
              </div>

              {/* Option Name */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>
                  Option Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.option_name}
                  onChange={e => setForm(f => ({ ...f, option_name: e.target.value }))}
                  placeholder="e.g. Custom Shaker Cabinetry"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                />
              </div>

              {/* Manufacturer + Model */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Manufacturer</label>
                  <input
                    value={form.manufacturer}
                    onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Model / SKU</label>
                  <input
                    value={form.model}
                    onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                  />
                </div>
              </div>

              {/* Color + Finish */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Color</label>
                  <input
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Finish</label>
                  <input
                    value={form.finish}
                    onChange={e => setForm(f => ({ ...f, finish: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                  />
                </div>
              </div>

              {/* Price + Install Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>
                    Material Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Installation Cost</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.installation_cost}
                    onChange={e => setForm(f => ({ ...f, installation_cost: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                  />
                </div>
              </div>

              {/* Lead Time */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Lead Time (days)</label>
                <input
                  type="number"
                  min="0"
                  value={form.lead_time_days}
                  onChange={e => setForm(f => ({ ...f, lead_time_days: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any internal notes..."
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                />
              </div>

              {/* Approval Status — edit only */}
              {editingId && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Approval Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as DesignSelection['status'] }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                  >
                    <option value="pending">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="ordered">Ordered</option>
                    <option value="received">Received</option>
                    <option value="installed">Installed</option>
                  </select>
                  {form.status === 'approved' && selections.find(s => s.id === editingId)?.status !== 'approved' && (
                    <p className="text-xs mt-1" style={{ color: '#D97706' }}>
                      Saving will open the client signature modal.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-4 flex gap-3" style={{ borderTop: colors.borderBottom }}>
              <button
                onClick={handleSave}
                disabled={saving || !form.option_name.trim() || !form.price}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Selection'}
              </button>
              <button
                onClick={() => setShowPanel(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ border: colors.border, color: colors.text }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Client Signature Modal */}
      {signatureTarget && createPortal(
        <>
          <div className="fixed inset-0 bg-black/60 z-9999" onClick={() => setSignatureTarget(null)} />
          <div className="fixed inset-0 z-9999 flex items-center justify-center pointer-events-none px-4">
            <div className="pointer-events-auto rounded-xl shadow-xl w-full max-w-md" style={{ backgroundColor: colors.bg, border: colors.border }}>
              <div className="px-6 py-4" style={{ borderBottom: colors.borderBottom }}>
                <h2 className="text-base font-semibold" style={{ color: colors.text }}>Client Approval</h2>
                <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                  The client's typed name serves as an electronic signature under the E-SIGN Act.
                </p>
              </div>

              {/* Selection summary */}
              <div className="mx-6 mt-4 p-3 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                <p className="text-sm font-semibold truncate" style={{ color: colors.text }}>{signatureTarget.option_name}</p>
                <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                  {signatureTarget.category}{signatureTarget.room_location ? ` · ${signatureTarget.room_location}` : ''}
                  {signatureTarget.price > 0 ? ` · ${fmt(signatureTarget.price)}` : ''}
                  {signatureTarget.installation_cost > 0 ? ` + ${fmt(signatureTarget.installation_cost)} install` : ''}
                </p>
              </div>

              <form onSubmit={handleClientApproval} className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.textMuted }}>
                    Client full name <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. James Harmon"
                    value={signatureForm.name}
                    onChange={e => setSignatureForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.textMuted }}>
                    Client email <span className="font-normal" style={{ color: colors.textMuted }}>(optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. james@example.com"
                    value={signatureForm.email}
                    onChange={e => setSignatureForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={!signatureForm.name.trim() || approvingId === signatureTarget.id}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {approvingId === signatureTarget.id ? 'Approving…' : 'Confirm Approval'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureTarget(null)}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>,
        document.getElementById('modal-portal-root') ?? document.body
      )}

      {/* Confirm Delete */}
      {confirmDeleteId && createPortal(
        <>
          <div className="fixed inset-0 bg-black/40 z-9999" onClick={() => setConfirmDeleteId(null)} />
          <div className="fixed inset-0 z-9999 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: colors.bg, border: colors.border }}>
              <p className="text-sm font-medium text-center mb-1" style={{ color: colors.text }}>Delete this selection?</p>
              <p className="text-xs text-center mb-5 px-2" style={{ color: colors.textMuted }}>
                {selections.find(s => s.id === confirmDeleteId)?.option_name}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
                  style={{ backgroundColor: '#DC2626' }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>,
        document.getElementById('modal-portal-root') ?? document.body
      )}
    </div>
  )
}
