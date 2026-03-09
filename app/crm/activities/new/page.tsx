'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

const activityTypes = [
  { value: 'call', label: '📞 Phone Call' },
  { value: 'email', label: '✉️ Email' },
  { value: 'meeting', label: '🤝 Meeting' },
  { value: 'site_visit', label: '🏗️ Site Visit' },
  { value: 'quote_sent', label: '📄 Quote Sent' },
  { value: 'follow_up', label: '🔔 Follow Up' },
  { value: 'proposal', label: '📋 Proposal' },
  { value: 'contract', label: '📝 Contract' },
]

export default function NewActivityPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const preContactId = searchParams.get('contact_id') || ''
  const preLeadId = searchParams.get('lead_id') || ''

  const [contacts, setContacts] = useState<{ id: string; full_name: string; company: string | null }[]>([])
  const [leads, setLeads] = useState<{ id: string; title: string }[]>([])
  const [saving, setSaving] = useState(false)

  // Form fields
  const [activityType, setActivityType] = useState('call')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 16))
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [priority, setPriority] = useState('normal')
  const [contactId, setContactId] = useState(preContactId)
  const [leadId, setLeadId] = useState(preLeadId)
  const [outcome, setOutcome] = useState('')
  const [status, setStatus] = useState('scheduled')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [contactsRes, leadsRes] = await Promise.all([
      supabase.from('crm_contacts').select('id, full_name, company').eq('user_id', user.id).eq('status', 'active').order('full_name'),
      supabase.from('crm_leads').select('id, title').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false })
    ])

    setContacts(contactsRes.data || [])
    setLeads(leadsRes.data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim()) return
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('crm_activities').insert({
        user_id: user.id,
        activity_type: activityType,
        subject: subject.trim(),
        description: description.trim() || null,
        scheduled_date: scheduledDate,
        duration_minutes: durationMinutes || null,
        priority,
        status,
        contact_id: contactId || null,
        lead_id: leadId || null,
        outcome: outcome.trim() || null,
        completed_date: status === 'completed' ? new Date().toISOString() : null,
      })

      if (error) throw error

      // Update last_contact_date if contact selected
      if (contactId) {
        await supabase.from('crm_contacts').update({ last_contact_date: new Date().toISOString() }).eq('id', contactId)
      }

      // Navigate back
      if (preContactId) router.push(`/crm/contacts/${preContactId}`)
      else if (preLeadId) router.push(`/crm/leads/${preLeadId}`)
      else router.push('/crm/activities')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/crm/activities" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeftIcon className="w-4 h-4" /> Back to Activities
        </Link>

        <div className="bg-white rounded-xl border p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-6">Log Activity</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Activity Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
              <div className="grid grid-cols-4 gap-2">
                {activityTypes.map(type => (
                  <button key={type.value} type="button" onClick={() => setActivityType(type.value)}
                    className={`p-2 text-xs rounded-lg border text-center transition-colors ${activityType === type.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} required
                placeholder="e.g. Initial call with John Smith"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Contact & Lead */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                <select value={contactId} onChange={e => setContactId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No contact</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name}{c.company ? ` (${c.company})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Related Lead</label>
                <select value={leadId} onChange={e => setLeadId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No lead</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date & Time</label>
                <input type="datetime-local" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <select value={durationMinutes} onChange={e => setDurationMinutes(parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {[15, 30, 45, 60, 90, 120].map(d => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={3} placeholder="Any notes or agenda..."
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Outcome (shown if completed) */}
            {status === 'completed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                <textarea value={outcome} onChange={e => setOutcome(e.target.value)}
                  rows={2} placeholder="What happened? What was agreed?"
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving || !subject.trim()}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Log Activity'}
              </button>
              <button type="button" onClick={() => router.back()}
                className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
