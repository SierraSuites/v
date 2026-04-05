'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UserIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { useConfirm } from '@/components/ui/ConfirmDialog'

interface Lead {
  id: string
  title: string
  description: string | null
  contact_id: string | null
  contact: { full_name: string; company: string | null; email: string | null } | null
  stage: string
  estimated_value: number | null
  probability: number
  weighted_value: number | null
  expected_close_date: string | null
  next_action: string | null
  next_action_date: string | null
  lead_source: string | null
  tags: string[] | null
  is_active: boolean
  created_at: string
}

interface Activity {
  id: string
  activity_type: string
  subject: string
  status: string
  scheduled_date: string
  outcome: string | null
}

const stages = [
  { id: 'new', label: 'New', color: 'bg-gray-400' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-400' },
  { id: 'qualified', label: 'Qualified', color: 'bg-purple-400' },
  { id: 'proposal_sent', label: 'Proposal Sent', color: 'bg-yellow-400' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-400' },
  { id: 'won', label: 'Won', color: 'bg-green-400' },
  { id: 'lost', label: 'Lost', color: 'bg-red-400' },
]

const stageProbability: Record<string, number> = {
  new: 10, contacted: 25, qualified: 50, proposal_sent: 75,
  negotiation: 90, won: 100, lost: 0
}

const activityTypeIcons: Record<string, string> = {
  call: '📞', email: '✉️', meeting: '🤝', site_visit: '🏗️',
  quote_sent: '📄', follow_up: '🔔', proposal: '📋', contract: '📝'
}

export default function LeadDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()
  const confirm = useConfirm()

  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Lead>>({})

  useEffect(() => { loadLead() }, [id])

  async function loadLead() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [leadRes, activitiesRes] = await Promise.all([
        supabase.from('crm_leads').select(`*, contact:crm_contacts(full_name, company, email)`)
          .eq('id', id).eq('user_id', user.id).single(),
        supabase.from('crm_activities').select('id, activity_type, subject, status, scheduled_date, outcome')
          .eq('lead_id', id).order('scheduled_date', { ascending: false }).limit(10)
      ])

      if (leadRes.error) { router.push('/crm/leads'); return }
      setLead(leadRes.data)
      setEditForm(leadRes.data)
      setActivities(activitiesRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleStageChange(newStage: string) {
    if (!lead) return
    const prob = stageProbability[newStage] ?? lead.probability
    const { error } = await supabase.from('crm_leads').update({ stage: newStage, probability: prob }).eq('id', id)
    if (!error) setLead({ ...lead, stage: newStage, probability: prob })
  }

  async function handleSave() {
    if (!lead) return
    setSaving(true)
    try {
      const updates = {
        title: editForm.title,
        description: editForm.description,
        estimated_value: editForm.estimated_value,
        probability: editForm.probability,
        expected_close_date: editForm.expected_close_date,
        next_action: editForm.next_action,
        next_action_date: editForm.next_action_date,
        lead_source: editForm.lead_source,
      }
      const { error } = await supabase.from('crm_leads').update(updates).eq('id', id)
      if (error) throw error
      setLead(prev => prev ? ({ ...prev, ...updates } as Lead) : prev)
      setEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!await confirm({ description: 'Delete this lead? This cannot be undone.', destructive: true })) return
    const { error } = await supabase.from('crm_leads').update({ is_active: false }).eq('id', id)
    if (!error) router.push('/crm/leads')
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  if (!lead) return null

  const weightedValue = lead.estimated_value ? (lead.estimated_value * lead.probability) / 100 : 0
  const currentStageIndex = stages.findIndex(s => s.id === lead.stage)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/crm/leads" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="w-4 h-4" /> Back to Pipeline
          </Link>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
                  <XMarkIcon className="w-4 h-4" /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <CheckIcon className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
                  <PencilIcon className="w-4 h-4" /> Edit
                </button>
                <button onClick={handleDelete} className="flex items-center gap-1 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                  <TrashIcon className="w-4 h-4" /> Archive
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stage Progress Bar */}
        <div className="bg-white rounded-xl border p-5 mb-6">
          <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Pipeline Stage</p>
          <div className="flex items-center gap-1">
            {stages.slice(0, 5).map((stage, i) => (
              <button key={stage.id} onClick={() => handleStageChange(stage.id)}
                className={`flex-1 h-2 rounded-full transition-all ${i <= currentStageIndex && lead.stage !== 'lost' ? stage.color : 'bg-gray-200'}`}
                title={stage.label} />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {stages.slice(0, 5).map(stage => (
              <button key={stage.id} onClick={() => handleStageChange(stage.id)}
                className={`text-xs ${lead.stage === stage.id ? 'text-blue-600 font-semibold' : 'text-gray-400 hover:text-gray-600'}`}>
                {stage.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => handleStageChange('won')}
              className={`px-3 py-1 text-xs rounded-full font-medium ${lead.stage === 'won' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
              ✓ Won
            </button>
            <button onClick={() => handleStageChange('lost')}
              className={`px-3 py-1 text-xs rounded-full font-medium ${lead.stage === 'lost' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
              ✗ Lost
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main */}
          <div className="col-span-2 space-y-4">
            {/* Lead Info */}
            <div className="bg-white rounded-xl border p-6">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Title</label>
                    <input value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Description</label>
                    <textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      rows={3} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Estimated Value ($)</label>
                      <input type="number" value={editForm.estimated_value || ''} onChange={e => setEditForm(f => ({ ...f, estimated_value: parseFloat(e.target.value) || null }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Probability (%)</label>
                      <input type="number" min="0" max="100" value={editForm.probability || 0} onChange={e => setEditForm(f => ({ ...f, probability: parseInt(e.target.value) || 0 }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Expected Close Date</label>
                      <input type="date" value={editForm.expected_close_date || ''} onChange={e => setEditForm(f => ({ ...f, expected_close_date: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Lead Source</label>
                      <select value={editForm.lead_source || ''} onChange={e => setEditForm(f => ({ ...f, lead_source: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm">
                        <option value="">Select...</option>
                        {['referral', 'website', 'cold_call', 'trade_show', 'social_media', 'repeat_client', 'other'].map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{lead.title}</h1>
                  {lead.description && <p className="text-gray-600 text-sm mb-4">{lead.description}</p>}
                  <div className="flex flex-wrap gap-1">
                    {lead.tags?.map(tag => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Next Action */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Next Action</h2>
              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Action</label>
                    <input value={editForm.next_action || ''} onChange={e => setEditForm(f => ({ ...f, next_action: e.target.value }))}
                      placeholder="e.g. Follow up call" className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
                    <input type="date" value={editForm.next_action_date || ''} onChange={e => setEditForm(f => ({ ...f, next_action_date: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              ) : lead.next_action ? (
                <div className={`p-3 rounded-lg ${lead.next_action_date && new Date(lead.next_action_date) < new Date() ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className="text-sm font-medium text-gray-900">{lead.next_action}</p>
                  {lead.next_action_date && (
                    <p className="text-xs text-gray-500 mt-1">Due {new Date(lead.next_action_date).toLocaleDateString()}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No next action set</p>
              )}
            </div>

            {/* Activities */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Activities</h2>
                <Link href={`/crm/activities/new?lead_id=${id}`}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                  <PlusIcon className="w-4 h-4" /> Log Activity
                </Link>
              </div>
              {activities.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No activities yet</p>
              ) : (
                <div className="space-y-3">
                  {activities.map(a => (
                    <div key={a.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-xl">{activityTypeIcons[a.activity_type] || '📌'}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{a.subject}</p>
                        <p className="text-xs text-gray-500">{new Date(a.scheduled_date).toLocaleDateString()}</p>
                        {a.outcome && <p className="text-xs text-gray-600 mt-1 italic">{a.outcome}</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Value Cards */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Deal Value</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Estimated Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Probability</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${lead.probability}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{lead.probability}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Weighted Value</p>
                  <p className="text-lg font-semibold text-blue-600">
                    ${weightedValue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact */}
            {lead.contact && (
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Contact</h3>
                <Link href={`/crm/contacts/${lead.contact_id}`} className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                    {lead.contact.full_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{lead.contact.full_name}</p>
                    {lead.contact.company && <p className="text-xs text-gray-500">{lead.contact.company}</p>}
                    {lead.contact.email && <p className="text-xs text-gray-400">{lead.contact.email}</p>}
                  </div>
                </Link>
              </div>
            )}

            {/* Details */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
              <div className="space-y-2 text-sm">
                {lead.expected_close_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Close Date</span>
                    <span className="text-gray-700">{new Date(lead.expected_close_date).toLocaleDateString()}</span>
                  </div>
                )}
                {lead.lead_source && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source</span>
                    <span className="text-gray-700 capitalize">{lead.lead_source.replace('_', ' ')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-700">{new Date(lead.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
