'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SustainabilityAccessWrapper from '@/components/sustainability/SustainabilityAccessWrapper'
import { useConfirm } from '@/components/ui/ConfirmDialog'

interface WaterEntry {
  id: string
  project_id: string | null
  project_name?: string
  date: string
  usage_gallons: number
  source: string
  activity: string
  notes: string | null
  created_at: string
}

interface WaterStats {
  totalUsage: number
  avgPerDay: number
  entryCount: number
  topActivity: string
}

interface Project {
  id: string
  name: string
}

export default function WaterUsagePage() {
  const supabase = createClient()
  const confirm = useConfirm()
  const [entries, setEntries] = useState<WaterEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<WaterStats>({ totalUsage: 0, avgPerDay: 0, entryCount: 0, topActivity: '—' })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    usage_gallons: '',
    source: 'municipal',
    activity: '',
    notes: '',
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name')

      setProjects(projectsData || [])

      // Try loading water usage entries; gracefully handle if table doesn't exist yet
      const { data: waterData } = await supabase
        .from('water_usage')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      const entriesWithProjects = (waterData || []).map((e: WaterEntry) => ({
        ...e,
        project_name: (projectsData || []).find((p: Project) => p.id === e.project_id)?.name || 'No Project',
      }))

      setEntries(entriesWithProjects)
      calculateStats(entriesWithProjects)
    } catch {
      // Table may not exist yet — show empty state
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data: WaterEntry[]) => {
    const totalUsage = data.reduce((sum, e) => sum + (e.usage_gallons || 0), 0)
    const activityCounts: Record<string, number> = {}
    data.forEach(e => { activityCounts[e.activity] = (activityCounts[e.activity] || 0) + 1 })
    const topActivity = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    const days = data.length > 0
      ? Math.max(1, Math.ceil((new Date(data[0].date).getTime() - new Date(data[data.length - 1].date).getTime()) / 86400000) + 1)
      : 1
    setStats({ totalUsage, avgPerDay: totalUsage / days, entryCount: data.length, topActivity })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('water_usage').insert([{
        user_id: user.id,
        project_id: formData.project_id || null,
        date: formData.date,
        usage_gallons: parseFloat(formData.usage_gallons) || 0,
        source: formData.source,
        activity: formData.activity,
        notes: formData.notes || null,
      }])
      setFormData({ project_id: '', date: new Date().toISOString().split('T')[0], usage_gallons: '', source: 'municipal', activity: '', notes: '' })
      setShowModal(false)
      loadData()
    } catch {
      alert('Failed to save entry')
    }
  }

  const handleDelete = async (id: string) => {
    if (!await confirm({ description: 'Delete this entry?', destructive: true })) return
    await supabase.from('water_usage').delete().eq('id', id)
    loadData()
  }

  const formatNum = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)

  if (loading) {
    return (
      <SustainabilityAccessWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </SustainabilityAccessWrapper>
    )
  }

  return (
    <SustainabilityAccessWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/sustainability" className="text-white/80 hover:text-white text-sm mb-2 inline-block">
                  ← Back to Sustainability Hub
                </Link>
                <h1 className="text-4xl font-bold mb-2">💧 Water Usage</h1>
                <p className="text-blue-100">Track and reduce water consumption across your projects</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold shadow-lg"
              >
                + Log Usage
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Usage', value: `${formatNum(stats.totalUsage)} gal`, icon: '💧', color: 'border-blue-500' },
              { label: 'Avg per Day', value: `${formatNum(stats.avgPerDay)} gal`, icon: '📅', color: 'border-cyan-500' },
              { label: 'Entries Logged', value: stats.entryCount.toString(), icon: '📋', color: 'border-green-500' },
              { label: 'Top Activity', value: stats.topActivity, icon: '🏗️', color: 'border-purple-500' },
            ].map(stat => (
              <div key={stat.label} className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${stat.color}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-600">{stat.label}</div>
                  <div className="text-2xl">{stat.icon}</div>
                </div>
                <div className="text-2xl font-bold text-gray-900 truncate">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Info Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">💡 Water Conservation Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div><strong className="text-blue-900">Concrete Curing:</strong><p className="text-gray-700">Use curing blankets to reduce water needs by up to 50%</p></div>
              <div><strong className="text-blue-900">Site Dewatering:</strong><p className="text-gray-700">Recirculate dewatering discharge where possible</p></div>
              <div><strong className="text-blue-900">LEED Credits:</strong><p className="text-gray-700">20% reduction vs baseline = WEc3 credit (1–2 pts)</p></div>
            </div>
          </div>

          {/* Entries */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Water Usage Log</h2>
            </div>

            {entries.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-6xl mb-4">💧</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No entries yet</h3>
                <p className="text-gray-600 mb-6">Start tracking water usage to identify savings opportunities</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Log First Entry
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {entries.map(entry => (
                  <div key={entry.id} className="px-6 py-4 flex items-start justify-between hover:bg-gray-50">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{entry.activity}</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">{entry.source}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(entry.date).toLocaleDateString()} · {entry.project_name}
                      </div>
                      {entry.notes && <div className="text-sm text-gray-600 mt-1">{entry.notes}</div>}
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-bold text-blue-600">{formatNum(entry.usage_gallons)} gal</span>
                      <button onClick={() => handleDelete(entry.id)} className="text-red-400 hover:text-red-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Log Water Usage</h2>
                <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usage (gallons) *</label>
                    <input type="number" step="0.1" required value={formData.usage_gallons} onChange={e => setFormData({ ...formData, usage_gallons: e.target.value })}
                      placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activity *</label>
                  <input type="text" required value={formData.activity} onChange={e => setFormData({ ...formData, activity: e.target.value })}
                    placeholder="e.g., Concrete curing, Site cleanup" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    <select value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="municipal">Municipal</option>
                      <option value="well">Well</option>
                      <option value="recycled">Recycled</option>
                      <option value="rainwater">Rainwater</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                    <select value={formData.project_id} onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="">No Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Save Entry</button>
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SustainabilityAccessWrapper>
  )
}
