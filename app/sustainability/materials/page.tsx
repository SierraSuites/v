'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SustainabilityAccessWrapper from '@/components/sustainability/SustainabilityAccessWrapper'
import { CARBON_FACTORS } from '@/lib/sustainability-permissions'

interface Material {
  id: string
  name: string
  category: string
  manufacturer: string | null
  carbon_per_unit: number
  unit: string
  recycled_content_percentage: number | null
  certifications: string[] | null
  epd_url: string | null
  hpd_url: string | null
  leed_points: number | null
  well_points: number | null
  cost_premium_percentage: number | null
  notes: string | null
  created_at: string
}

interface MaterialComparison {
  standard: Material | null
  alternative: Material | null
  quantity: number
  unit: string
}

export default function MaterialsDatabasePage() {
  const supabase = createClient()
  const [materials, setMaterials] = useState<Material[]>([])
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [comparison, setComparison] = useState<MaterialComparison>({
    standard: null,
    alternative: null,
    quantity: 100,
    unit: 'cubic yards'
  })

  const categories = [
    'all',
    'Concrete & Cement',
    'Steel & Metal',
    'Wood & Lumber',
    'Insulation',
    'Flooring',
    'Roofing',
    'Drywall & Plaster',
    'Paint & Coatings',
    'Glass',
    'Other'
  ]

  const [formData, setFormData] = useState({
    name: '',
    category: 'Concrete & Cement',
    manufacturer: '',
    carbon_per_unit: '',
    unit: 'cubic yards',
    recycled_content_percentage: '',
    certifications: [] as string[],
    epd_url: '',
    hpd_url: '',
    leed_points: '',
    well_points: '',
    cost_premium_percentage: '',
    notes: ''
  })

  const availableCertifications = [
    'LEED Approved',
    'FSC Certified',
    'Cradle to Cradle',
    'GreenGuard',
    'Energy Star',
    'EPA Safer Choice',
    'SCS Certified',
    'NSF Certified',
    'Living Product Challenge',
    'Carbon Neutral'
  ]

  useEffect(() => {
    loadMaterials()
  }, [])

  useEffect(() => {
    filterMaterials()
  }, [materials, searchTerm, selectedCategory])

  const loadMaterials = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('sustainable_materials')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setMaterials(data || [])
    } catch (error) {
      console.error('Error loading materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterMaterials = () => {
    let filtered = materials

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(m => m.category === selectedCategory)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.category.toLowerCase().includes(term) ||
        (m.manufacturer && m.manufacturer.toLowerCase().includes(term))
      )
    }

    setFilteredMaterials(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const materialData = {
        user_id: user.id,
        name: formData.name,
        category: formData.category,
        manufacturer: formData.manufacturer || null,
        carbon_per_unit: parseFloat(formData.carbon_per_unit) || 0,
        unit: formData.unit,
        recycled_content_percentage: formData.recycled_content_percentage ? parseFloat(formData.recycled_content_percentage) : null,
        certifications: formData.certifications.length > 0 ? formData.certifications : null,
        epd_url: formData.epd_url || null,
        hpd_url: formData.hpd_url || null,
        leed_points: formData.leed_points ? parseFloat(formData.leed_points) : null,
        well_points: formData.well_points ? parseFloat(formData.well_points) : null,
        cost_premium_percentage: formData.cost_premium_percentage ? parseFloat(formData.cost_premium_percentage) : null,
        notes: formData.notes || null
      }

      const { error } = await supabase
        .from('sustainable_materials')
        .insert([materialData])

      if (error) throw error

      // Reset form
      setFormData({
        name: '',
        category: 'Concrete & Cement',
        manufacturer: '',
        carbon_per_unit: '',
        unit: 'cubic yards',
        recycled_content_percentage: '',
        certifications: [],
        epd_url: '',
        hpd_url: '',
        leed_points: '',
        well_points: '',
        cost_premium_percentage: '',
        notes: ''
      })
      setShowAddModal(false)
      loadMaterials()
    } catch (error) {
      console.error('Error adding material:', error)
      alert('Failed to add material')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return

    try {
      const { error } = await supabase
        .from('sustainable_materials')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadMaterials()
    } catch (error) {
      console.error('Error deleting material:', error)
      alert('Failed to delete material')
    }
  }

  const toggleCertification = (cert: string) => {
    if (formData.certifications.includes(cert)) {
      setFormData({
        ...formData,
        certifications: formData.certifications.filter(c => c !== cert)
      })
    } else {
      setFormData({
        ...formData,
        certifications: [...formData.certifications, cert]
      })
    }
  }

  const calculateComparison = () => {
    if (!comparison.standard || !comparison.alternative) return null

    const standardCarbon = comparison.standard.carbon_per_unit * comparison.quantity
    const alternativeCarbon = comparison.alternative.carbon_per_unit * comparison.quantity
    const carbonSavings = standardCarbon - alternativeCarbon
    const carbonReduction = standardCarbon > 0 ? ((carbonSavings / standardCarbon) * 100) : 0

    return {
      standardCarbon,
      alternativeCarbon,
      carbonSavings,
      carbonReduction
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Concrete & Cement': return '🏗️'
      case 'Steel & Metal': return '⚙️'
      case 'Wood & Lumber': return '🌲'
      case 'Insulation': return '🧊'
      case 'Flooring': return '📐'
      case 'Roofing': return '🏠'
      case 'Drywall & Plaster': return '🧱'
      case 'Paint & Coatings': return '🎨'
      case 'Glass': return '🪟'
      default: return '📦'
    }
  }

  if (loading) {
    return (
      <SustainabilityAccessWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading materials database...</p>
          </div>
        </div>
      </SustainabilityAccessWrapper>
    )
  }

  const comparisonResults = calculateComparison()

  return (
    <SustainabilityAccessWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/sustainability" className="text-white/80 hover:text-white text-sm mb-2 inline-block">
                  ← Back to Sustainability Hub
                </Link>
                <h1 className="text-4xl font-bold mb-2">🏢 Sustainable Materials Database</h1>
                <p className="text-blue-100">Compare carbon footprints, certifications, and LEED points</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowComparisonModal(true)}
                  className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
                >
                  🔍 Compare Materials
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
                >
                  + Add Material
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Total Materials</div>
                <div className="text-2xl">📚</div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{materials.length}</div>
              <div className="text-xs text-gray-500 mt-1">in database</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Certified Materials</div>
                <div className="text-2xl">✅</div>
              </div>
              <div className="text-3xl font-bold text-green-600">
                {materials.filter(m => m.certifications && m.certifications.length > 0).length}
              </div>
              <div className="text-xs text-gray-500 mt-1">with eco certifications</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">LEED Eligible</div>
                <div className="text-2xl">🏆</div>
              </div>
              <div className="text-3xl font-bold text-purple-600">
                {materials.filter(m => m.leed_points && m.leed_points > 0).length}
              </div>
              <div className="text-xs text-gray-500 mt-1">contribute to LEED</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Avg Carbon</div>
                <div className="text-2xl">🌍</div>
              </div>
              <div className="text-3xl font-bold text-orange-600">
                {materials.length > 0 ? formatNumber(materials.reduce((sum, m) => sum + m.carbon_per_unit, 0) / materials.length) : 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">kg CO₂e per unit</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Materials</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, category, or manufacturer..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : `${getCategoryIcon(cat)} ${cat}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Educational Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Understanding Material Certifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong className="text-blue-900">EPD (Environmental Product Declaration):</strong>
                <p className="text-gray-700">Third-party verified lifecycle environmental impact data</p>
              </div>
              <div>
                <strong className="text-blue-900">HPD (Health Product Declaration):</strong>
                <p className="text-gray-700">Full disclosure of ingredients and health impacts</p>
              </div>
              <div>
                <strong className="text-blue-900">LEED MR Credits:</strong>
                <p className="text-gray-700">Materials & Resources credits for sustainable materials (up to 13 pts)</p>
              </div>
            </div>
          </div>

          {/* Materials List */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Materials Catalog ({filteredMaterials.length})
              </h2>
            </div>

            {filteredMaterials.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-6xl mb-4">🏗️</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {materials.length === 0 ? 'No materials in database yet' : 'No materials match your filters'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {materials.length === 0
                    ? 'Start building your sustainable materials library'
                    : 'Try adjusting your search or category filter'}
                </p>
                {materials.length === 0 && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Add First Material
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredMaterials.map((material) => (
                  <div key={material.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getCategoryIcon(material.category)}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{material.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="font-medium">{material.category}</span>
                              {material.manufacturer && (
                                <>
                                  <span>•</span>
                                  <span>{material.manufacturer}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <div className="text-xs text-gray-600">Carbon Footprint</div>
                            <div className="font-semibold text-orange-600">
                              {formatNumber(material.carbon_per_unit)} kg CO₂e
                            </div>
                            <div className="text-xs text-gray-500">per {material.unit}</div>
                          </div>

                          {material.recycled_content_percentage !== null && (
                            <div>
                              <div className="text-xs text-gray-600">Recycled Content</div>
                              <div className="font-semibold text-green-600">
                                {material.recycled_content_percentage}%
                              </div>
                            </div>
                          )}

                          {material.leed_points !== null && material.leed_points > 0 && (
                            <div>
                              <div className="text-xs text-gray-600">LEED Contribution</div>
                              <div className="font-semibold text-purple-600">
                                +{material.leed_points} {material.leed_points === 1 ? 'point' : 'points'}
                              </div>
                            </div>
                          )}

                          {material.cost_premium_percentage !== null && (
                            <div>
                              <div className="text-xs text-gray-600">Cost Premium</div>
                              <div className="font-semibold text-blue-600">
                                {material.cost_premium_percentage > 0 ? '+' : ''}{material.cost_premium_percentage}%
                              </div>
                            </div>
                          )}
                        </div>

                        {material.certifications && material.certifications.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-gray-600 mb-1">Certifications</div>
                            <div className="flex flex-wrap gap-2">
                              {material.certifications.map((cert, idx) => (
                                <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                  ✓ {cert}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {(material.epd_url || material.hpd_url) && (
                          <div className="flex gap-3 mb-3">
                            {material.epd_url && (
                              <a
                                href={material.epd_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 underline"
                              >
                                📄 View EPD
                              </a>
                            )}
                            {material.hpd_url && (
                              <a
                                href={material.hpd_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 underline"
                              >
                                📄 View HPD
                              </a>
                            )}
                          </div>
                        )}

                        {material.notes && (
                          <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                            <strong>Notes:</strong> {material.notes}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(material.id)}
                        className="ml-4 text-red-600 hover:text-red-800 transition-colors"
                        title="Delete material"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Add Material Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Add Sustainable Material</h2>
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
                      Material Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Low-Carbon Concrete Mix 3000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {categories.filter(c => c !== 'all').map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="e.g., CarbonCure Technologies"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-orange-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">🌍 Carbon Footprint</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Carbon per Unit (kg CO₂e) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.carbon_per_unit}
                        onChange={(e) => setFormData({ ...formData, carbon_per_unit: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="cubic yards">Cubic Yards</option>
                        <option value="tons">Tons</option>
                        <option value="square feet">Square Feet</option>
                        <option value="linear feet">Linear Feet</option>
                        <option value="gallons">Gallons</option>
                        <option value="units">Units</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recycled Content (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.recycled_content_percentage}
                      onChange={(e) => setFormData({ ...formData, recycled_content_percentage: e.target.value })}
                      placeholder="0-100"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cost Premium (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.cost_premium_percentage}
                      onChange={(e) => setFormData({ ...formData, cost_premium_percentage: e.target.value })}
                      placeholder="e.g., +15 or -5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-600 mt-1">Positive = more expensive, Negative = cheaper</p>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Certifications
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableCertifications.map((cert) => (
                      <label key={cert} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.certifications.includes(cert)}
                          onChange={() => toggleCertification(cert)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{cert}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      LEED Points
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.leed_points}
                      onChange={(e) => setFormData({ ...formData, leed_points: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      WELL Points
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.well_points}
                      onChange={(e) => setFormData({ ...formData, well_points: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      EPD URL
                    </label>
                    <input
                      type="url"
                      value={formData.epd_url}
                      onChange={(e) => setFormData({ ...formData, epd_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      HPD URL
                    </label>
                    <input
                      type="url"
                      value={formData.hpd_url}
                      onChange={(e) => setFormData({ ...formData, hpd_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional information about this material..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Add Material
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

        {/* Material Comparison Modal */}
        {showComparisonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold">🔍 Material Switcher Calculator</h2>
                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Compare the carbon footprint of standard materials vs sustainable alternatives. See exactly how much CO₂ you'll save by switching.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Standard Material
                    </label>
                    <select
                      value={comparison.standard?.id || ''}
                      onChange={(e) => {
                        const material = materials.find(m => m.id === e.target.value)
                        setComparison({ ...comparison, standard: material || null })
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">-- Select Standard Material --</option>
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name} ({formatNumber(material.carbon_per_unit)} kg CO₂e/{material.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sustainable Alternative
                    </label>
                    <select
                      value={comparison.alternative?.id || ''}
                      onChange={(e) => {
                        const material = materials.find(m => m.id === e.target.value)
                        setComparison({ ...comparison, alternative: material || null })
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">-- Select Alternative --</option>
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name} ({formatNumber(material.carbon_per_unit)} kg CO₂e/{material.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity ({comparison.standard?.unit || comparison.alternative?.unit || 'units'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={comparison.quantity}
                    onChange={(e) => setComparison({ ...comparison, quantity: parseFloat(e.target.value) || 0 })}
                    placeholder="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {comparisonResults && comparison.standard && comparison.alternative && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-green-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Comparison Results</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white rounded-lg p-4 shadow">
                        <div className="text-xs text-gray-600 mb-1">Standard Material</div>
                        <div className="text-2xl font-bold text-red-600">
                          {formatNumber(comparisonResults.standardCarbon)} kg
                        </div>
                        <div className="text-xs text-gray-500">CO₂e emissions</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 shadow">
                        <div className="text-xs text-gray-600 mb-1">Sustainable Alternative</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatNumber(comparisonResults.alternativeCarbon)} kg
                        </div>
                        <div className="text-xs text-gray-500">CO₂e emissions</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 shadow border-2 border-green-500">
                        <div className="text-xs text-gray-600 mb-1">Carbon Savings</div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatNumber(comparisonResults.carbonSavings)} kg
                        </div>
                        <div className="text-xs text-green-700 font-semibold">
                          {formatNumber(comparisonResults.carbonReduction)}% reduction
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 shadow">
                      <div className="text-sm text-gray-700 mb-2">
                        <strong>Equivalence:</strong>
                      </div>
                      <div className="text-sm text-gray-600">
                        This carbon savings is equivalent to:
                      </div>
                      <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                        <li>{formatNumber(comparisonResults.carbonSavings / 411)} cars off the road for a year</li>
                        <li>{formatNumber(comparisonResults.carbonSavings * 0.00045)} acres of forest preserved</li>
                        <li>{formatNumber(comparisonResults.carbonSavings / 8.89)} barrels of oil not consumed</li>
                      </ul>
                    </div>

                    {comparison.alternative.cost_premium_percentage !== null && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm">
                          <strong>Cost Impact:</strong> {comparison.alternative.cost_premium_percentage > 0 ? '+' : ''}{comparison.alternative.cost_premium_percentage}% premium
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          For every ${100} of standard material, the alternative costs ${100 + comparison.alternative.cost_premium_percentage}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(!comparison.standard || !comparison.alternative) && (
                  <div className="text-center py-8 text-gray-500">
                    Select both materials to see comparison results
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={() => setShowComparisonModal(false)}
                    className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SustainabilityAccessWrapper>
  )
}
