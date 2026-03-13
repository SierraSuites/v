'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeftIcon, BellIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

interface Alert {
  id: string
  name: string
  metric: string
  condition: string
  threshold: number
  email_recipients: string[]
  is_active: boolean
  created_at: string
}

const metricOptions = [
  { value: 'budget_usage', label: 'Budget Usage (%)' },
  { value: 'overdue_invoices', label: 'Overdue Invoices Count' },
  { value: 'outstanding_ar', label: 'Outstanding AR ($)' },
  { value: 'project_completion', label: 'Project Completion (%)' },
  { value: 'expense_total', label: 'Monthly Expenses ($)' },
]

export default function ReportAlertsPage() {
  const supabase = createClient()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [metric, setMetric] = useState('budget_usage')
  const [condition, setCondition] = useState('greater_than')
  const [threshold, setThreshold] = useState('')
  const [recipients, setRecipients] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAlerts() }, [])

  async function loadAlerts() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('report_alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setAlerts(data || [])
    } catch { setAlerts([]) } finally { setLoading(false) }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !threshold) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('report_alerts').insert({
        user_id: user.id, name: name.trim(), metric, condition, threshold: parseFloat(threshold),
        email_recipients: recipients.split(',').map(r => r.trim()).filter(Boolean),
        is_active: true,
      }).select().single()
      if (data) setAlerts(prev => [data, ...prev])
      setShowAdd(false); setName(''); setThreshold(''); setRecipients('')
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  async function toggleAlert(id: string, is_active: boolean) {
    await supabase.from('report_alerts').update({ is_active: !is_active }).eq('id', id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_active: !is_active } : a))
  }

  async function deleteAlert(id: string) {
    if (!confirm('Delete this alert?')) return
    await supabase.from('report_alerts').delete().eq('id', id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/reports" className="text-gray-400 hover:text-gray-600"><ArrowLeftIcon className="w-5 h-5" /></Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Report Alerts</h1>
              <p className="text-sm text-gray-500">Get notified when key metrics hit thresholds</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            <PlusIcon className="w-4 h-4" /> New Alert
          </button>
        </div>

        {showAdd && (
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Create Alert</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Alert Name</label>
                <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. High Budget Usage"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Metric</label>
                  <select value={metric} onChange={e => setMetric(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {metricOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Condition</label>
                  <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="greater_than">Greater than</option>
                    <option value="less_than">Less than</option>
                    <option value="equals">Equals</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Threshold</label>
                  <input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} required placeholder="e.g. 90"
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email Recipients (comma-separated)</label>
                <input value={recipients} onChange={e => setRecipients(e.target.value)} placeholder="you@company.com, manager@company.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Create Alert'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : alerts.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No alerts configured</p>
              <p className="text-sm text-gray-400 mt-1">Create alerts to get notified when key metrics change</p>
            </div>
          ) : alerts.map(alert => (
            <div key={alert.id} className="bg-white rounded-xl border p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${alert.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div>
                  <p className="font-medium text-gray-900">{alert.name}</p>
                  <p className="text-xs text-gray-500">
                    {metricOptions.find(m => m.value === alert.metric)?.label} {alert.condition.replace('_', ' ')} {alert.threshold}
                  </p>
                  {alert.email_recipients?.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">→ {alert.email_recipients.join(', ')}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleAlert(alert.id, alert.is_active)}
                  className={`px-3 py-1 text-xs rounded-full ${alert.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {alert.is_active ? 'Active' : 'Paused'}
                </button>
                <button onClick={() => deleteAlert(alert.id)} className="text-gray-300 hover:text-red-500">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
