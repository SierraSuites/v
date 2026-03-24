'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SustainabilityAccessWrapper from '@/components/sustainability/SustainabilityAccessWrapper'

interface WasteEntry {
  id: string
  project_id: string | null
  project_name?: string
  date: string
  material_type: string
  quantity: number
  unit: string
  waste_category: 'landfill' | 'recycled' | 'reused' | 'donated' | 'composted'
  cost_lost: number
  disposal_cost: number
  total_cost: number
  location: string | null
  notes: string | null
  photo_urls: string[] | null
  created_at: string
}

interface WasteStats {
  totalWaste: number
  totalCost: number
  diversionRate: number
  landfillWaste: number
  recycledWaste: number
  reusedWaste: number
  donatedWaste: number
  compostedWaste: number
  costLost: number
  disposalCost: number
}

interface Project {
  id: string
  name: string
}

export default function WasteManagementPage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<WasteEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<WasteStats>({
    totalWaste: 0,
    totalCost: 0,
    diversionRate: 0,
    landfillWaste: 0,
    recycledWaste: 0,
    reusedWaste: 0,
    donatedWaste: 0,
    compostedWaste: 0,
    costLost: 0,
    disposalCost: 0
  })
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    material_type: '',
    quantity: '',
    unit: 'tons',
    waste_category: 'landfill' as 'landfill' | 'recycled' | 'reused' | 'donated' | 'composted',
    cost_lost: '',
    disposal_cost: '',
    location: '',
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load waste entries
      const { data: wasteData, error: wasteError } = await supabase
        .from('material_waste')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (wasteError) throw wasteError

      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name')

      if (projectsError) throw projectsError

      // Merge project names
      const entriesWithProjects = wasteData.map((entry: WasteEntry) => {
        const project = projectsData.find((p: Project) => p.id === entry.project_id)
        return {
          ...entry,
          project_name: project?.name || 'No Project'
        }
      })

      setEntries(entriesWithProjects)
      setProjects(projectsData || [])
      calculateStats(entriesWithProjects)
    } catch (error) {
      console.error('Error loading waste data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data: WasteEntry[]) => {
    const totalWaste = data.reduce((sum, entry) => sum + (entry.quantity || 0), 0)
    const totalCost = data.reduce((sum, entry) => sum + (entry.total_cost || 0), 0)
    const costLost = data.reduce((sum, entry) => sum + (entry.cost_lost || 0), 0)
    const disposalCost = data.reduce((sum, entry) => sum + (entry.disposal_cost || 0), 0)

    const landfillWaste = data
      .filter(e => e.waste_category === 'landfill')
      .reduce((sum, e) => sum + (e.quantity || 0), 0)

    const recycledWaste = data
      .filter(e => e.waste_category === 'recycled')
      .reduce((sum, e) => sum + (e.quantity || 0), 0)

    const reusedWaste = data
      .filter(e => e.waste_category === 'reused')
      .reduce((sum, e) => sum + (e.quantity || 0), 0)

    const donatedWaste = data
      .filter(e => e.waste_category === 'donated')
      .reduce((sum, e) => sum + (e.quantity || 0), 0)

    const compostedWaste = data
      .filter(e => e.waste_category === 'composted')
      .reduce((sum, e) => sum + (e.quantity || 0), 0)

    const divertedWaste = recycledWaste + reusedWaste + donatedWaste + compostedWaste
    const diversionRate = totalWaste > 0 ? (divertedWaste / totalWaste) * 100 : 0

    setStats({
      totalWaste,
      totalCost,
      diversionRate,
      landfillWaste,
      recycledWaste,
      reusedWaste,
      donatedWaste,
      compostedWaste,
      costLost,
      disposalCost
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const quantity = parseFloat(formData.quantity) || 0
      const cost_lost = parseFloat(formData.cost_lost) || 0
      const disposal_cost = parseFloat(formData.disposal_cost) || 0
      const total_cost = cost_lost + disposal_cost

      const wasteData = {
        user_id: user.id,
        project_id: formData.project_id || null,
        date: formData.date,
        material_type: formData.material_type,
        quantity,
        unit: formData.unit,
        waste_category: formData.waste_category,
        cost_lost,
        disposal_cost,
        total_cost,
        location: formData.location || null,
        notes: formData.notes || null
      }

      const { error } = await supabase
        .from('material_waste')
        .insert([wasteData])

      if (error) throw error

      // Reset form
      setFormData({
        project_id: '',
        date: new Date().toISOString().split('T')[0],
        material_type: '',
        quantity: '',
        unit: 'tons',
        waste_category: 'landfill',
        cost_lost: '',
        disposal_cost: '',
        location: '',
        notes: ''
      })
      setShowAddModal(false)
      loadData()
    } catch (error) {
      console.error('Error adding waste entry:', error)
      alert('Failed to add waste entry')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this waste entry?')) return

    try {
      const { error } = await supabase
        .from('material_waste')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Failed to delete entry')
    }
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Project', 'Material Type', 'Quantity', 'Unit', 'Category', 'Cost Lost', 'Disposal Cost', 'Total Cost', 'Location', 'Notes']
    const rows = entries.map(entry => [
      entry.date,
      entry.project_name || '',
      entry.material_type,
      entry.quantity,
      entry.unit,
      entry.waste_category,
      entry.cost_lost,
      entry.disposal_cost,
      entry.total_cost,
      entry.location || '',
      entry.notes || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `waste-management-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(num)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'landfill': return 'bg-red-100 text-red-800'
      case 'recycled': return 'bg-green-100 text-green-800'
      case 'reused': return 'bg-blue-100 text-blue-800'
      case 'donated': return 'bg-purple-100 text-purple-800'
      case 'composted': return 'bg-amber-100 text-amber-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'landfill': return '🗑️'
      case 'recycled': return '♻️'
      case 'reused': return '🔄'
      case 'donated': return '🎁'
      case 'composted': return '🌱'
      default: return '📦'
    }
  }

  if (loading) {
    return (
      <SustainabilityAccessWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading waste data...</p>
          </div>
        </div>
      </SustainabilityAccessWrapper>
    )
  }

  return (
    <SustainabilityAccessWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/sustainability" className="text-white/80 hover:text-white text-sm mb-2 inline-block">
                  ← Back to Sustainability Hub
                </Link>
                <h1 className="text-4xl font-bold mb-2">♻️ Waste Management</h1>
                <p className="text-orange-100">Track material waste, reduce costs, and increase diversion rates</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-semibold shadow-lg"
              >
                + Log Waste
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Total Waste</div>
                <div className="text-2xl">📊</div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalWaste)}</div>
              <div className="text-xs text-gray-500 mt-1">tons tracked</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Diversion Rate</div>
                <div className="text-2xl">♻️</div>
              </div>
              <div className="text-3xl font-bold text-green-600">{formatNumber(stats.diversionRate)}%</div>
              <div className="text-xs text-gray-500 mt-1">
                {formatNumber(stats.recycledWaste + stats.reusedWaste + stats.donatedWaste + stats.compostedWaste)} tons diverted
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Total Cost Impact</div>
                <div className="text-2xl">💸</div>
              </div>
              <div className="text-3xl font-bold text-red-600">{formatCurrency(stats.totalCost)}</div>
              <div className="text-xs text-gray-500 mt-1">
                {formatCurrency(stats.costLost)} lost + {formatCurrency(stats.disposalCost)} disposal
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Avg Cost per Ton</div>
                <div className="text-2xl">📈</div>
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {stats.totalWaste > 0 ? formatCurrency(stats.totalCost / stats.totalWaste) : '$0'}
              </div>
              <div className="text-xs text-gray-500 mt-1">total cost / total waste</div>
            </div>
          </div>

          {/* Waste Breakdown */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Waste Stream Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-4xl mb-2">🗑️</div>
                <div className="text-2xl font-bold text-red-600">{formatNumber(stats.landfillWaste)}</div>
                <div className="text-sm text-gray-600">tons</div>
                <div className="text-xs font-semibold text-gray-900 mt-1">Landfill</div>
                <div className="text-xs text-gray-500">
                  {stats.totalWaste > 0 ? formatNumber((stats.landfillWaste / stats.totalWaste) * 100) : 0}%
                </div>
              </div>

              <div className="text-center">
                <div className="text-4xl mb-2">♻️</div>
                <div className="text-2xl font-bold text-green-600">{formatNumber(stats.recycledWaste)}</div>
                <div className="text-sm text-gray-600">tons</div>
                <div className="text-xs font-semibold text-gray-900 mt-1">Recycled</div>
                <div className="text-xs text-gray-500">
                  {stats.totalWaste > 0 ? formatNumber((stats.recycledWaste / stats.totalWaste) * 100) : 0}%
                </div>
              </div>

              <div className="text-center">
                <div className="text-4xl mb-2">🔄</div>
                <div className="text-2xl font-bold text-blue-600">{formatNumber(stats.reusedWaste)}</div>
                <div className="text-sm text-gray-600">tons</div>
                <div className="text-xs font-semibold text-gray-900 mt-1">Reused</div>
                <div className="text-xs text-gray-500">
                  {stats.totalWaste > 0 ? formatNumber((stats.reusedWaste / stats.totalWaste) * 100) : 0}%
                </div>
              </div>

              <div className="text-center">
                <div className="text-4xl mb-2">🎁</div>
                <div className="text-2xl font-bold text-purple-600">{formatNumber(stats.donatedWaste)}</div>
                <div className="text-sm text-gray-600">tons</div>
                <div className="text-xs font-semibold text-gray-900 mt-1">Donated</div>
                <div className="text-xs text-gray-500">
                  {stats.totalWaste > 0 ? formatNumber((stats.donatedWaste / stats.totalWaste) * 100) : 0}%
                </div>
              </div>

              <div className="text-center">
                <div className="text-4xl mb-2">🌱</div>
                <div className="text-2xl font-bold text-amber-600">{formatNumber(stats.compostedWaste)}</div>
                <div className="text-sm text-gray-600">tons</div>
                <div className="text-xs font-semibold text-gray-900 mt-1">Composted</div>
                <div className="text-xs text-gray-500">
                  {stats.totalWaste > 0 ? formatNumber((stats.compostedWaste / stats.totalWaste) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Educational Banner */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Industry Benchmarks
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong className="text-green-900">Commercial Construction:</strong>
                <p className="text-gray-700">Target 75% diversion rate (LEED Silver minimum)</p>
              </div>
              <div>
                <strong className="text-green-900">Waste Cost:</strong>
                <p className="text-gray-700">Average $50-$150 per ton disposal + material value lost</p>
              </div>
              <div>
                <strong className="text-green-900">LEED Credits:</strong>
                <p className="text-gray-700">50% diversion = 1 pt, 75% = 2 pts (MRc5)</p>
              </div>
            </div>
          </div>

          {/* Waste Entries */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Waste Entries</h2>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Export CSV
              </button>
            </div>

            {entries.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No waste entries yet</h3>
                <p className="text-gray-600 mb-6">Start tracking material waste to identify cost savings opportunities</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                >
                  Log First Waste Entry
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {entries.map((entry) => (
                  <div key={entry.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getCategoryIcon(entry.waste_category)}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">{entry.material_type}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span>{new Date(entry.date).toLocaleDateString()}</span>
                              {entry.project_name && (
                                <>
                                  <span>•</span>
                                  <span>{entry.project_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <div className="text-xs text-gray-600">Quantity</div>
                            <div className="font-semibold text-gray-900">
                              {formatNumber(entry.quantity)} {entry.unit}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-gray-600">Category</div>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getCategoryColor(entry.waste_category)}`}>
                              {entry.waste_category}
                            </span>
                          </div>

                          <div>
                            <div className="text-xs text-gray-600">Material Value Lost</div>
                            <div className="font-semibold text-red-600">{formatCurrency(entry.cost_lost)}</div>
                          </div>

                          <div>
                            <div className="text-xs text-gray-600">Disposal Cost</div>
                            <div className="font-semibold text-orange-600">{formatCurrency(entry.disposal_cost)}</div>
                          </div>
                        </div>

                        {entry.location && (
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>Location:</strong> {entry.location}
                          </div>
                        )}

                        {entry.notes && (
                          <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                            <strong>Notes:</strong> {entry.notes}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="ml-4 text-red-600 hover:text-red-800 transition-colors"
                        title="Delete entry"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-sm font-semibold text-gray-900">
                        Total Cost Impact: <span className="text-red-600">{formatCurrency(entry.total_cost)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Waste Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Log Waste Entry</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project (Optional)
                    </label>
                    <select
                      value={formData.project_id}
                      onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">-- No Project --</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.material_type}
                      onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                      placeholder="e.g., Concrete, Wood, Drywall"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Waste Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.waste_category}
                      onChange={(e) => setFormData({ ...formData, waste_category: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    >
                      <option value="landfill">🗑️ Landfill</option>
                      <option value="recycled">♻️ Recycled</option>
                      <option value="reused">🔄 Reused</option>
                      <option value="donated">🎁 Donated</option>
                      <option value="composted">🌱 Composted</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    >
                      <option value="tons">Tons</option>
                      <option value="cubic yards">Cubic Yards</option>
                      <option value="pounds">Pounds</option>
                      <option value="units">Units</option>
                    </select>
                  </div>
                </div>

                <div className="bg-red-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">💸 Cost Impact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Material Value Lost ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.cost_lost}
                        onChange={(e) => setFormData({ ...formData, cost_lost: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-600 mt-1">Cost of material that went to waste</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Disposal Cost ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.disposal_cost}
                        onChange={(e) => setFormData({ ...formData, disposal_cost: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-600 mt-1">Cost to haul and dispose</p>
                    </div>
                  </div>

                  {(formData.cost_lost || formData.disposal_cost) && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <div className="text-sm font-semibold text-gray-900">
                        Total Cost Impact: <span className="text-red-600">
                          {formatCurrency((parseFloat(formData.cost_lost) || 0) + (parseFloat(formData.disposal_cost) || 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., 3rd Floor, Parking Lot"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional details, cause of waste, prevention ideas..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                  >
                    Log Waste Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SustainabilityAccessWrapper>
  )
}
