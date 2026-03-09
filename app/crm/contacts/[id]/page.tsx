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
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  TagIcon,
  CalendarDaysIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface Contact {
  id: string
  first_name: string
  last_name: string
  full_name: string
  email: string | null
  phone: string | null
  mobile: string | null
  company: string | null
  title: string | null
  category: string
  contact_type: string | null
  lead_source: string | null
  status: string
  website: string | null
  linkedin_url: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  notes: string | null
  tags: string[] | null
  project_types_interested: string[] | null
  preferred_contract_method: string | null
  trade_specialties: string[] | null
  annual_volume: number | null
  last_contact_date: string | null
  created_at: string
}

interface Activity {
  id: string
  activity_type: string
  subject: string
  status: string
  priority: string
  scheduled_date: string
  outcome: string | null
}

interface Lead {
  id: string
  title: string
  stage: string
  estimated_value: number | null
  probability: number
  expected_close_date: string | null
}

const categoryColors: Record<string, string> = {
  client: 'bg-green-100 text-green-700',
  prospect: 'bg-blue-100 text-blue-700',
  vendor: 'bg-purple-100 text-purple-700',
  subcontractor: 'bg-orange-100 text-orange-700',
  partner: 'bg-yellow-100 text-yellow-700',
}

const activityTypeIcons: Record<string, string> = {
  call: '📞', email: '✉️', meeting: '🤝', site_visit: '🏗️',
  quote_sent: '📄', follow_up: '🔔', proposal: '📋', contract: '📝'
}

const stageColors: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  qualified: 'bg-purple-100 text-purple-700',
  proposal_sent: 'bg-yellow-100 text-yellow-700',
  negotiation: 'bg-orange-100 text-orange-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

export default function ContactDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [contact, setContact] = useState<Contact | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Contact>>({})

  useEffect(() => {
    loadContact()
  }, [id])

  async function loadContact() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [contactRes, activitiesRes, leadsRes] = await Promise.all([
        supabase.from('crm_contacts').select('*').eq('id', id).eq('user_id', user.id).single(),
        supabase.from('crm_activities').select('id, activity_type, subject, status, priority, scheduled_date, outcome')
          .eq('contact_id', id).order('scheduled_date', { ascending: false }).limit(10),
        supabase.from('crm_leads').select('id, title, stage, estimated_value, probability, expected_close_date')
          .eq('contact_id', id).eq('is_active', true).order('created_at', { ascending: false })
      ])

      if (contactRes.error) { router.push('/crm/contacts'); return }
      setContact(contactRes.data)
      setEditForm(contactRes.data)
      setActivities(activitiesRes.data || [])
      setLeads(leadsRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!contact) return
    setSaving(true)
    try {
      const { error } = await supabase.from('crm_contacts').update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone: editForm.phone,
        mobile: editForm.mobile,
        company: editForm.company,
        title: editForm.title,
        category: editForm.category,
        status: editForm.status,
        website: editForm.website,
        notes: editForm.notes,
        tags: editForm.tags,
      }).eq('id', id)
      if (error) throw error
      setContact({ ...contact, ...editForm })
      setEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this contact? This cannot be undone.')) return
    const { error } = await supabase.from('crm_contacts').delete().eq('id', id)
    if (!error) router.push('/crm/contacts')
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  if (!contact) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/crm/contacts" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Contacts
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
                  <TrashIcon className="w-4 h-4" /> Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="col-span-2 space-y-4">
            {/* Contact Card */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600 flex-shrink-0">
                  {contact.first_name?.[0]}{contact.last_name?.[0]}
                </div>
                <div className="flex-1">
                  {editing ? (
                    <div className="grid grid-cols-2 gap-3">
                      <input value={editForm.first_name || ''} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                        placeholder="First name" className="border rounded-lg px-3 py-2 text-sm" />
                      <input value={editForm.last_name || ''} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                        placeholder="Last name" className="border rounded-lg px-3 py-2 text-sm" />
                      <input value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Job title" className="border rounded-lg px-3 py-2 text-sm" />
                      <input value={editForm.company || ''} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))}
                        placeholder="Company" className="border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold text-gray-900">{contact.full_name}</h1>
                      {contact.title && <p className="text-gray-500">{contact.title}</p>}
                      {contact.company && <p className="text-gray-600 font-medium">{contact.company}</p>}
                      <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full font-medium ${categoryColors[contact.category] || 'bg-gray-100 text-gray-700'}`}>
                        {contact.category}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Contact Details</h2>
              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Email</label>
                    <input value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                    <input value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Mobile</label>
                    <input value={editForm.mobile || ''} onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Website</label>
                    <input value={editForm.website || ''} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Status</label>
                    <select value={editForm.status || 'active'} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Category</label>
                    <select value={editForm.category || 'prospect'} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="client">Client</option>
                      <option value="prospect">Prospect</option>
                      <option value="vendor">Vendor</option>
                      <option value="subcontractor">Subcontractor</option>
                      <option value="partner">Partner</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {contact.email && (
                    <div className="flex items-center gap-3">
                      <EnvelopeIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline text-sm">{contact.email}</a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-3">
                      <PhoneIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <a href={`tel:${contact.phone}`} className="text-sm text-gray-700">{contact.phone}</a>
                    </div>
                  )}
                  {contact.mobile && (
                    <div className="flex items-center gap-3">
                      <PhoneIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{contact.mobile} <span className="text-xs text-gray-400">(mobile)</span></span>
                    </div>
                  )}
                  {contact.company && (
                    <div className="flex items-center gap-3">
                      <BuildingOfficeIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{contact.company}</span>
                    </div>
                  )}
                  {contact.website && (
                    <div className="flex items-center gap-3">
                      <BriefcaseIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">{contact.website}</a>
                    </div>
                  )}
                  {contact.tags && contact.tags.length > 0 && (
                    <div className="flex items-center gap-3">
                      <TagIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map(tag => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {contact.last_contact_date && (
                    <div className="flex items-center gap-3">
                      <CalendarDaysIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-500">Last contacted {new Date(contact.last_contact_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Notes</h2>
              {editing ? (
                <textarea value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={4} placeholder="Add notes about this contact..."
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{contact.notes || 'No notes yet.'}</p>
              )}
            </div>

            {/* Activities */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Recent Activities</h2>
                <Link href={`/crm/activities/new?contact_id=${id}`}
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
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{a.subject}</p>
                        <p className="text-xs text-gray-500">{new Date(a.scheduled_date).toLocaleDateString()} · {a.activity_type.replace('_', ' ')}</p>
                        {a.outcome && <p className="text-xs text-gray-600 mt-1 italic">{a.outcome}</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'completed' ? 'bg-green-100 text-green-700' : a.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
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
            {/* Leads */}
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Deals / Leads</h3>
                <Link href={`/crm/leads/new?contact_id=${id}`} className="text-blue-600 hover:text-blue-700">
                  <PlusIcon className="w-4 h-4" />
                </Link>
              </div>
              {leads.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">No active deals</p>
              ) : (
                <div className="space-y-2">
                  {leads.map(lead => (
                    <Link key={lead.id} href={`/crm/leads/${lead.id}`}
                      className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <p className="text-sm font-medium text-gray-900 truncate">{lead.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${stageColors[lead.stage] || 'bg-gray-100 text-gray-700'}`}>
                          {lead.stage.replace('_', ' ')}
                        </span>
                        {lead.estimated_value && (
                          <span className="text-xs font-medium text-gray-700">
                            ${lead.estimated_value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-medium ${contact.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>{contact.status}</span>
                </div>
                {contact.lead_source && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source</span>
                    <span className="text-gray-700">{contact.lead_source.replace('_', ' ')}</span>
                  </div>
                )}
                {contact.annual_volume && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Annual Volume</span>
                    <span className="text-gray-700">${contact.annual_volume.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Added</span>
                  <span className="text-gray-700">{new Date(contact.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {contact.email && (
                  <a href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" /> Send Email
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
                    <PhoneIcon className="w-4 h-4 text-gray-400" /> Call
                  </a>
                )}
                <Link href={`/crm/activities/new?contact_id=${id}`}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
                  <CalendarDaysIcon className="w-4 h-4 text-gray-400" /> Log Activity
                </Link>
                <Link href={`/quotes/new?contact_id=${id}`}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
                  <BriefcaseIcon className="w-4 h-4 text-gray-400" /> Create Quote
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
