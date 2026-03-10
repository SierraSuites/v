'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeftIcon, BoltIcon } from '@heroicons/react/24/outline'

const triggerTypes = [
  { value: 'schedule', label: '📅 Schedule', desc: 'Run on a recurring schedule' },
  { value: 'event', label: '🔔 Event', desc: 'Trigger when something happens' },
  { value: 'threshold', label: '📊 Threshold', desc: 'Trigger when a metric crosses a value' },
  { value: 'manual', label: '👤 Manual', desc: 'Run on demand only' },
]

const reportTypes = [
  { value: 'daily', label: 'Daily Progress' },
  { value: 'weekly_timesheet', label: 'Weekly Timesheet' },
  { value: 'budget', label: 'Budget Summary' },
  { value: 'safety', label: 'Safety Report' },
  { value: 'progress', label: 'Progress Report' },
  { value: 'custom', label: 'Custom Report' },
]

export default function AutomationBuilderPage() {
  const router = useRouter()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState('schedule')
  const [reportType, setReportType] = useState('daily')
  const [frequency, setFrequency] = useState('weekly')
  const [scheduleDay, setScheduleDay] = useState(5) // Friday
  const [scheduleTime, setScheduleTime] = useState('08:00')
  const [recipients, setRecipients] = useState('')
  const [emailSubject, setEmailSubject] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const nextRun = new Date()
      nextRun.setDate(nextRun.getDate() + 7)

      const { error } = await supabase.from('report_workflows').insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        trigger_type: triggerType,
        report_type: reportType,
        schedule_frequency: triggerType === 'schedule' ? frequency : null,
        schedule_day: triggerType === 'schedule' ? scheduleDay : null,
        schedule_time: triggerType === 'schedule' ? scheduleTime : null,
        email_recipients: recipients.split(',').map(r => r.trim()).filter(Boolean),
        email_subject: emailSubject.trim() || null,
        is_active: true,
        next_run_at: triggerType === 'schedule' ? nextRun.toISOString() : null,
        run_count: 0,
        success_count: 0,
        failure_count: 0,
      })

      if (!error) router.push('/reports/automation')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/reports/automation" className="text-gray-400 hover:text-gray-600">
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Build Workflow</h1>
            <p className="text-sm text-gray-500">Automate report generation and delivery</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Name */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Workflow Details</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Workflow Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} required
                  placeholder="e.g. Weekly Client Progress Reports"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="What does this workflow do?"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Report Type</label>
                <select value={reportType} onChange={e => setReportType(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  {reportTypes.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Trigger */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Trigger</h2>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {triggerTypes.map(t => (
                <button key={t.value} type="button" onClick={() => setTriggerType(t.value)}
                  className={`p-3 text-left rounded-lg border transition-colors ${triggerType === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-gray-500">{t.desc}</p>
                </button>
              ))}
            </div>

            {triggerType === 'schedule' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Frequency</label>
                  <select value={frequency} onChange={e => setFrequency(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                {frequency === 'weekly' && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Day of Week</label>
                    <select value={scheduleDay} onChange={e => setScheduleDay(parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => (
                        <option key={i} value={i}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Time</label>
                  <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Delivery */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Delivery</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email Recipients (comma-separated)</label>
                <input value={recipients} onChange={e => setRecipients(e.target.value)}
                  placeholder="client@company.com, manager@company.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email Subject</label>
                <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                  placeholder="e.g. Weekly Progress Report - {project_name}"
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving || !name.trim()}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              <BoltIcon className="w-4 h-4" />
              {saving ? 'Creating...' : 'Create Workflow'}
            </button>
            <Link href="/reports/automation" className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
