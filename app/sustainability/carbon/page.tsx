'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import SustainabilityAccessWrapper from '@/components/sustainability/SustainabilityAccessWrapper'
import { formatNumber, CARBON_FACTORS } from '@/lib/sustainability-permissions'

interface CarbonEntry {
  id: string
  project_id: string | null
  date: string
  scope_1_total: number
  scope_2_total: number
  scope_3_total: number
  total_emissions: number
  notes: string | null
  verified: boolean
}

export default function CarbonTrackerPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<CarbonEntry[]>([])
  const [showAddModal, setShowAddModal] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    // Scope 1: Direct Emissions
    scope_1_diesel: '',
    scope_1_gasoline: '',
    scope_1_natural_gas: '',
    // Scope 2: Indirect Emissions
    scope_2_electricity: '',
    scope_2_heating: '',
    // Scope 3: Supply Chain (Pro feature)
    scope_3_materials: '',
    scope_3_transportation: '',
    scope_3_waste: '',
    notes: ''
  })

  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load carbon entries
      const { data: carbonData, error: carbonError } = await supabase
        .from('carbon_footprint')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(50)

      if (carbonError) throw carbonError
      setEntries(carbonData || [])

      // Load projects for dropdown
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, project_name, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('project_name', { ascending: true })

      if (projectsError) throw projectsError
      setProjects(projectsData || [])

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Calculate scope totals
      const scope_1_total = (parseFloat(formData.scope_1_diesel) || 0) +
                            (parseFloat(formData.scope_1_gasoline) || 0) +
                            (parseFloat(formData.scope_1_natural_gas) || 0)

      const scope_2_total = (parseFloat(formData.scope_2_electricity) || 0) +
                            (parseFloat(formData.scope_2_heating) || 0)

      const scope_3_total = (parseFloat(formData.scope_3_materials) || 0) +
                            (parseFloat(formData.scope_3_transportation) || 0) +
                            (parseFloat(formData.scope_3_waste) || 0)

      const carbonData = {
        user_id: user.id,
        project_id: formData.project_id || null,
        date: formData.date,
        reporting_period: 'daily',
        scope_1_diesel: parseFloat(formData.scope_1_diesel) || 0,
        scope_1_gasoline: parseFloat(formData.scope_1_gasoline) || 0,
        scope_1_natural_gas: parseFloat(formData.scope_1_natural_gas) || 0,
        scope_1_total,
        scope_2_electricity: parseFloat(formData.scope_2_electricity) || 0,
        scope_2_heating: parseFloat(formData.scope_2_heating) || 0,
        scope_2_total,
        scope_3_materials: parseFloat(formData.scope_3_materials) || 0,
        scope_3_transportation: parseFloat(formData.scope_3_transportation) || 0,
        scope_3_waste: parseFloat(formData.scope_3_waste) || 0,
        scope_3_total,
        notes: formData.notes || null
      }

      const { error } = await supabase
        .from('carbon_footprint')
        .insert([carbonData])

      if (error) throw error

      // Reset form and close modal
      setFormData({
        project_id: '',
        date: new Date().toISOString().split('T')[0],
        scope_1_diesel: '',
        scope_1_gasoline: '',
        scope_1_natural_gas: '',
        scope_2_electricity: '',
        scope_2_heating: '',
        scope_3_materials: '',
        scope_3_transportation: '',
        scope_3_waste: '',
        notes: ''
      })
      setShowAddModal(false)
      loadData()

    } catch (error: any) {
      console.error('Error logging carbon:', error)
      alert(`Failed to log carbon: ${error.message}`)
    }
  }

  const getTotalEmissions = () => {
    return entries.reduce((sum, entry) => sum + entry.total_emissions, 0)
  }

  const getAverageByScope = () => {
    if (entries.length === 0) return { scope1: 0, scope2: 0, scope3: 0 }

    return {
      scope1: entries.reduce((sum, e) => sum + e.scope_1_total, 0) / entries.length,
      scope2: entries.reduce((sum, e) => sum + e.scope_2_total, 0) / entries.length,
      scope3: entries.reduce((sum, e) => sum + e.scope_3_total, 0) / entries.length
    }
  }

  const averages = getAverageByScope()

  return (
    <SustainabilityAccessWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/sustainability"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Carbon Tracker</h1>
                    <p className="text-gray-600 mt-1">Track Scope 1, 2, and 3 emissions</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Log Emissions
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Total Emissions</div>
                <div className="text-2xl">🌍</div>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {formatNumber(getTotalEmissions())}
              </div>
              <div className="text-sm text-gray-500 mt-1">kg CO₂e</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Scope 1 (Avg)</div>
                <div className="text-2xl">🚜</div>
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {formatNumber(averages.scope1)}
              </div>
              <div className="text-sm text-gray-500 mt-1">Direct emissions</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Scope 2 (Avg)</div>
                <div className="text-2xl">⚡</div>
              </div>
              <div className="text-3xl font-bold text-purple-600">
                {formatNumber(averages.scope2)}
              </div>
              <div className="text-sm text-gray-500 mt-1">Energy indirect</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Scope 3 (Avg)</div>
                <div className="text-2xl">🚛</div>
              </div>
              <div className="text-3xl font-bold text-orange-600">
                {formatNumber(averages.scope3)}
              </div>
              <div className="text-sm text-gray-500 mt-1">Supply chain</div>
            </div>
          </div>

          {/* Helpful Info Banner */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="text-3xl">💡</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Understanding Carbon Scopes</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                  <div>
                    <strong className="text-blue-900">Scope 1:</strong> Direct emissions from equipment you own (diesel generators, company vehicles)
                  </div>
                  <div>
                    <strong className="text-purple-900">Scope 2:</strong> Indirect emissions from purchased energy (electricity for site offices)
                  </div>
                  <div>
                    <strong className="text-orange-900">Scope 3:</strong> Value chain emissions (material production, transportation, waste)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Entries List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Emission Entries ({entries.length})
              </h2>
              <button
                onClick={() => {/* Export functionality */}}
                className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading emissions data...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="text-6xl mb-4">🌍</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No emissions logged yet</h3>
                <p className="text-gray-600 mb-6">Start tracking your carbon footprint</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Log Your First Entry
                </button>
              </div>
            ) : (
              <div className="divide-y">
                {entries.map((entry) => (
                  <div key={entry.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(entry.date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          {entry.verified && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              ✓ Verified
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <div className="text-xs text-gray-500">Scope 1</div>
                            <div className="text-lg font-semibold text-blue-600">
                              {formatNumber(entry.scope_1_total)} kg
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Scope 2</div>
                            <div className="text-lg font-semibold text-purple-600">
                              {formatNumber(entry.scope_2_total)} kg
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Scope 3</div>
                            <div className="text-lg font-semibold text-orange-600">
                              {formatNumber(entry.scope_3_total)} kg
                            </div>
                          </div>
                        </div>

                        {entry.notes && (
                          <div className="text-sm text-gray-600 mt-2">
                            📝 {entry.notes}
                          </div>
                        )}
                      </div>

                      <div className="ml-4 text-right">
                        <div className="text-xs text-gray-500 mb-1">Total</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatNumber(entry.total_emissions)}
                        </div>
                        <div className="text-xs text-gray-500">kg CO₂e</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Entry Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Log Carbon Emissions</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project (Optional)
                    </label>
                    <select
                      value={formData.project_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select project...</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.project_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>

                {/* Scope 1 */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🚜</span>
                    Scope 1: Direct Emissions (kg CO₂e)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Diesel
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.scope_1_diesel}
                        onChange={(e) => setFormData(prev => ({ ...prev, scope_1_diesel: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gasoline
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.scope_1_gasoline}
                        onChange={(e) => setFormData(prev => ({ ...prev, scope_1_gasoline: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Natural Gas
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.scope_1_natural_gas}
                        onChange={(e) => setFormData(prev => ({ ...prev, scope_1_natural_gas: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Scope 2 */}
                <div className="bg-purple-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    Scope 2: Indirect Energy Emissions (kg CO₂e)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Electricity
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.scope_2_electricity}
                        onChange={(e) => setFormData(prev => ({ ...prev, scope_2_electricity: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Heating/Cooling
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.scope_2_heating}
                        onChange={(e) => setFormData(prev => ({ ...prev, scope_2_heating: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Scope 3 */}
                <div className="bg-orange-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🚛</span>
                    Scope 3: Supply Chain Emissions (kg CO₂e)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Materials
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.scope_3_materials}
                        onChange={(e) => setFormData(prev => ({ ...prev, scope_3_materials: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Transportation
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.scope_3_transportation}
                        onChange={(e) => setFormData(prev => ({ ...prev, scope_3_transportation: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Waste
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.scope_3_waste}
                        onChange={(e) => setFormData(prev => ({ ...prev, scope_3_waste: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Any additional context..."
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Log Emissions
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
