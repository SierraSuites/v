'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { clientCommunication, formatCurrency, formatDate } from '@/lib/client-communication-integration'

interface DesignSelection {
  id: string
  project_id: string
  category: string
  room_location: string
  option_name: string
  manufacturer: string
  model: string
  sku: string
  color: string
  finish: string
  price: number
  upgrade_cost: number
  lead_time_days: number
  availability_status: 'in_stock' | 'order_required' | 'discontinued' | 'backorder'
  description: string
  image_urls: string[]
  client_approved: boolean
  approved_date: string | null
  status: 'pending' | 'approved' | 'rejected' | 'ordered' | 'received' | 'installed'
  notes: string
  alternatives: AlternativeOption[]
}

interface AlternativeOption {
  id: string
  name: string
  manufacturer: string
  price: number
  pros: string[]
  cons: string[]
}

interface SelectionCategory {
  name: string
  icon: string
  description: string
}

function DesignSelectionsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')

  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string>(projectId || '')
  const [selections, setSelections] = useState<DesignSelection[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedRoom, setSelectedRoom] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [compareItems, setCompareItems] = useState<DesignSelection[]>([])
  const [editingSelection, setEditingSelection] = useState<DesignSelection | null>(null)

  // Selection categories
  const categories: SelectionCategory[] = [
    { name: 'Flooring', icon: '🏠', description: 'Hardwood, tile, carpet, vinyl' },
    { name: 'Cabinets', icon: '🗄️', description: 'Kitchen, bath, built-ins' },
    { name: 'Countertops', icon: '⬛', description: 'Granite, quartz, marble' },
    { name: 'Fixtures', icon: '🚰', description: 'Faucets, sinks, toilets' },
    { name: 'Lighting', icon: '💡', description: 'Chandeliers, recessed, pendant' },
    { name: 'Paint', icon: '🎨', description: 'Interior and exterior colors' },
    { name: 'Tile', icon: '⬜', description: 'Backsplash, shower, floor' },
    { name: 'Hardware', icon: '🔧', description: 'Knobs, pulls, hinges' },
    { name: 'Appliances', icon: '📱', description: 'Kitchen and laundry' },
    { name: 'Windows', icon: '🪟', description: 'Windows and doors' }
  ]

  // Demo selections
  useEffect(() => {
    if (selectedProject) {
      loadSelections(selectedProject)
    }
  }, [selectedProject])

  const loadSelections = async (projectId: string) => {
    // In production, fetch from database
    const demoSelections: DesignSelection[] = [
      {
        id: '1',
        project_id: projectId,
        category: 'Flooring',
        room_location: 'Master Bedroom',
        option_name: 'European Oak Engineered Hardwood',
        manufacturer: 'Armstrong',
        model: 'Prime Harvest',
        sku: 'APK5423LG',
        color: 'Mystic Taupe',
        finish: 'Low Gloss',
        price: 8450,
        upgrade_cost: 2100,
        lead_time_days: 14,
        availability_status: 'in_stock',
        description: '5" wide planks, wire-brushed texture, 3/8" thick engineered construction',
        image_urls: [],
        client_approved: true,
        approved_date: '2025-12-01',
        status: 'approved',
        notes: 'Client loves the color - matches furniture perfectly',
        alternatives: [
          {
            id: 'alt-1',
            name: 'Classic Oak - Natural',
            manufacturer: 'Bruce',
            price: 6350,
            pros: ['Lower cost', 'Faster delivery (7 days)', 'Classic look'],
            cons: ['Lighter color', 'Less texture', 'Standard finish']
          }
        ]
      },
      {
        id: '2',
        project_id: projectId,
        category: 'Countertops',
        room_location: 'Kitchen',
        option_name: 'Calacatta Quartz',
        manufacturer: 'Cambria',
        model: 'Brittanicca',
        sku: 'CAM-BRIT-3CM',
        color: 'White with Gray Veining',
        finish: 'Polished',
        price: 12800,
        upgrade_cost: 4200,
        lead_time_days: 21,
        availability_status: 'order_required',
        description: '3cm thick, premium quartz with dramatic veining. Includes undermount sink cutout and edge profile.',
        image_urls: [],
        client_approved: false,
        approved_date: null,
        status: 'pending',
        notes: 'Waiting for client to visit showroom',
        alternatives: [
          {
            id: 'alt-2',
            name: 'Carrara Marble',
            manufacturer: 'MSI',
            price: 10600,
            pros: ['Natural stone', 'Classic look', '20% savings'],
            cons: ['Requires sealing', 'Can stain', 'More maintenance']
          },
          {
            id: 'alt-3',
            name: 'White Granite',
            manufacturer: 'Granite Select',
            price: 8600,
            pros: ['Durable', 'Heat resistant', 'Budget-friendly'],
            cons: ['Less dramatic veining', 'Busier pattern']
          }
        ]
      },
      {
        id: '3',
        project_id: projectId,
        category: 'Fixtures',
        room_location: 'Master Bathroom',
        option_name: 'Waterfall Tub Filler',
        manufacturer: 'Kohler',
        model: 'Purist',
        sku: 'K-14661-4',
        color: 'Brushed Nickel',
        finish: 'Brushed',
        price: 1285,
        upgrade_cost: 685,
        lead_time_days: 7,
        availability_status: 'in_stock',
        description: 'Floor-mount tub filler with hand shower, contemporary design',
        image_urls: [],
        client_approved: true,
        approved_date: '2025-11-28',
        status: 'ordered',
        notes: 'Ordered 12/3, expected delivery 12/10',
        alternatives: []
      },
      {
        id: '4',
        project_id: projectId,
        category: 'Lighting',
        room_location: 'Dining Room',
        option_name: 'Modern Linear Chandelier',
        manufacturer: 'Kichler',
        model: 'Barrington',
        sku: 'KCH-43913',
        color: 'Black with Brushed Nickel',
        finish: 'Mixed Metal',
        price: 895,
        upgrade_cost: 345,
        lead_time_days: 10,
        availability_status: 'backorder',
        description: '36" linear fixture, 5-light, adjustable height, LED compatible',
        image_urls: [],
        client_approved: false,
        approved_date: null,
        status: 'pending',
        notes: 'Client requested alternative due to backorder',
        alternatives: [
          {
            id: 'alt-4',
            name: 'Crystal Linear Pendant',
            manufacturer: 'Progress Lighting',
            price: 725,
            pros: ['In stock', 'Lower price', 'Similar style'],
            cons: ['Slightly smaller (30")', 'Different finish options']
          }
        ]
      },
      {
        id: '5',
        project_id: projectId,
        category: 'Tile',
        room_location: 'Kitchen',
        option_name: 'Subway Tile Backsplash',
        manufacturer: 'Daltile',
        model: 'Restore',
        sku: 'DAL-RE01',
        color: 'Bright White',
        finish: 'Glossy',
        price: 1640,
        upgrade_cost: 0,
        lead_time_days: 5,
        availability_status: 'in_stock',
        description: '3x6 ceramic subway tile, bright white gloss finish. Includes grout and installation.',
        image_urls: [],
        client_approved: true,
        approved_date: '2025-11-25',
        status: 'received',
        notes: 'Material on site, ready for installation',
        alternatives: []
      }
    ]

    setSelections(demoSelections)
  }

  const loadProjects = async () => {
    // In production, fetch from database
    const demoProjects = [
      { id: '1', name: 'Custom Home - Oakmont Drive', client_name: 'Johnson Family' },
      { id: '2', name: 'Downtown Loft Conversion', client_name: 'Urban Living Partners' }
    ]
    setProjects(demoProjects)
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const filteredSelections = selections.filter(s => {
    if (selectedCategory !== 'all' && s.category !== selectedCategory) return false
    if (selectedRoom !== 'all' && s.room_location !== selectedRoom) return false
    return true
  })

  const rooms = [...new Set(selections.map(s => s.room_location))].sort()

  const stats = {
    total: selections.length,
    approved: selections.filter(s => s.client_approved).length,
    pending: selections.filter(s => !s.client_approved && s.status === 'pending').length,
    ordered: selections.filter(s => s.status === 'ordered' || s.status === 'received').length,
    total_cost: selections.reduce((sum, s) => sum + s.price, 0),
    upgrade_cost: selections.reduce((sum, s) => sum + s.upgrade_cost, 0)
  }

  const getStatusColor = (status: string): string => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      ordered: 'bg-blue-100 text-blue-800',
      received: 'bg-purple-100 text-purple-800',
      installed: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getAvailabilityColor = (status: string): string => {
    const colors: { [key: string]: string } = {
      in_stock: 'text-green-600',
      order_required: 'text-blue-600',
      backorder: 'text-orange-600',
      discontinued: 'text-red-600'
    }
    return colors[status] || 'text-gray-600'
  }

  const handleApprove = (selection: DesignSelection) => {
    const updated = selections.map(s =>
      s.id === selection.id
        ? { ...s, client_approved: true, approved_date: new Date().toISOString(), status: 'approved' as const }
        : s
    )
    setSelections(updated)
  }

  const handleCompare = (selection: DesignSelection) => {
    if (compareItems.some(item => item.id === selection.id)) {
      setCompareItems(compareItems.filter(item => item.id !== selection.id))
    } else {
      setCompareItems([...compareItems, selection])
    }
  }

  const handleGeneratePackage = () => {
    setShowPackageModal(true)
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-purple-50 via-pink-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🎨 Design Selection Manager
              </h1>
              <p className="text-lg text-gray-600">
                Track material selections and client approvals
              </p>
            </div>
            <div className="flex gap-3">
              {compareItems.length > 0 && (
                <button
                  onClick={() => setShowComparisonModal(true)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                >
                  🔍 Compare ({compareItems.length})
                </button>
              )}
              <button
                onClick={handleGeneratePackage}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                📦 Generate Selection Package
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                + Add Selection
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-linear-to-r from-purple-100 to-pink-100 border-l-4 border-purple-600 p-6 rounded-lg">
            <div className="flex items-start gap-4">
              <div className="text-3xl">💡</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">How Design Selections Work:</h3>
                <p className="text-gray-700">
                  Add material selections for each room and category. Track pricing, lead times, and availability.
                  Compare options side-by-side. Generate professional selection packages for client review and approval.
                  All selections integrate with your project budget automatically.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Selection */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Project
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-medium"
          >
            <option value="">Choose a project...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name} - {project.client_name}
              </option>
            ))}
          </select>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-6 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-600">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Selections</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-600">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-600">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-600">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-3xl font-bold text-blue-600">{stats.ordered}</div>
            <div className="text-sm text-gray-600">Ordered</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-600">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_cost)}</div>
            <div className="text-sm text-gray-600">Total Investment</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-pink-600">
            <div className="text-3xl mb-2">⬆️</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.upgrade_cost)}</div>
            <div className="text-sm text-gray-600">Upgrade Costs</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Filter by Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.name} value={cat.name}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Filter by Room
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Rooms</option>
                {rooms.map(room => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Selections Grid */}
        <div className="grid grid-cols-1 gap-6">
          {filteredSelections.map((selection) => (
            <div key={selection.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">
                        {categories.find(c => c.name === selection.category)?.icon || '📦'}
                      </span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{selection.option_name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-600">{selection.category}</span>
                          <span className="text-sm text-gray-600">•</span>
                          <span className="text-sm text-gray-600">{selection.room_location}</span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(selection.status)}`}>
                            {selection.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {formatCurrency(selection.price)}
                    </div>
                    {selection.upgrade_cost > 0 && (
                      <div className="text-sm text-orange-600">
                        +{formatCurrency(selection.upgrade_cost)} upgrade
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Details */}
                <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-600">Manufacturer</div>
                    <div className="font-semibold text-gray-900">{selection.manufacturer}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Model / SKU</div>
                    <div className="font-semibold text-gray-900">{selection.model}</div>
                    <div className="text-xs text-gray-600">{selection.sku}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Color / Finish</div>
                    <div className="font-semibold text-gray-900">{selection.color}</div>
                    <div className="text-xs text-gray-600">{selection.finish}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Availability</div>
                    <div className={`font-semibold ${getAvailabilityColor(selection.availability_status)}`}>
                      {selection.availability_status === 'in_stock' ? '✓ In Stock' :
                       selection.availability_status === 'order_required' ? '📦 Order Required' :
                       selection.availability_status === 'backorder' ? '⏳ Backordered' :
                       '❌ Discontinued'}
                    </div>
                    <div className="text-xs text-gray-600">{selection.lead_time_days} day lead time</div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-700 mb-4">{selection.description}</p>

                {/* Approval Status */}
                {selection.client_approved ? (
                  <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <span className="text-xl">✅</span>
                      <div>
                        <div className="font-semibold">Client Approved</div>
                        <div className="text-sm">Approved on {formatDate(selection.approved_date!)}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <span className="text-xl">⏳</span>
                        <div>
                          <div className="font-semibold">Awaiting Client Approval</div>
                          <div className="text-sm">Send selection package for review</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleApprove(selection)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm"
                      >
                        Mark as Approved
                      </button>
                    </div>
                  </div>
                )}

                {/* Alternatives */}
                {selection.alternatives.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Alternative Options Considered:</h4>
                    <div className="space-y-2">
                      {selection.alternatives.map((alt, i) => (
                        <div key={i} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-gray-900">{alt.name}</div>
                            <div className="font-semibold text-gray-900">{formatCurrency(alt.price)}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div className="text-green-700 font-semibold mb-1">Pros:</div>
                              <ul className="text-green-700 space-y-1">
                                {alt.pros.map((pro, j) => (
                                  <li key={j}>+ {pro}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div className="text-red-700 font-semibold mb-1">Cons:</div>
                              <ul className="text-red-700 space-y-1">
                                {alt.cons.map((con, j) => (
                                  <li key={j}>- {con}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selection.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">Notes:</div>
                    <div className="text-sm text-gray-700">{selection.notes}</div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => handleCompare(selection)}
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      compareItems.some(item => item.id === selection.id)
                        ? 'bg-purple-600 text-white'
                        : 'border-2 border-purple-600 text-purple-600 hover:bg-purple-50'
                    }`}
                  >
                    {compareItems.some(item => item.id === selection.id) ? '✓ Added to Compare' : 'Compare'}
                  </button>
                  <button
                    onClick={() => setEditingSelection(selection)}
                    className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    Edit
                  </button>
                  <button className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold">
                    View Brochure
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredSelections.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Selections Yet</h3>
              <p className="text-gray-600 mb-6">
                Start adding material and finish selections for your project
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                + Add Your First Selection
              </button>
            </div>
          )}
        </div>

        {/* Selection Package Generation Modal */}
        {showPackageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Generate Selection Package
                </h2>

                <div className="mb-6">
                  <p className="text-gray-700 mb-4">
                    Create a professional document with all material selections for client review and approval.
                  </p>

                  <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Package will include:</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>✓ All {selections.length} material selections with photos</li>
                      <li>✓ Pricing breakdown by category</li>
                      <li>✓ Lead times and availability status</li>
                      <li>✓ Alternative options for pending items</li>
                      <li>✓ Approval checkboxes for each selection</li>
                      <li>✓ Signature page for client sign-off</li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        alert('Generating PDF selection package...')
                        setShowPackageModal(false)
                      }}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 text-left"
                    >
                      <div className="text-3xl mb-2">📕</div>
                      <div className="font-bold text-gray-900 mb-1">PDF Package</div>
                      <div className="text-sm text-gray-600">Print or email to client</div>
                    </button>

                    <button
                      onClick={() => {
                        alert('Generating interactive web link...')
                        setShowPackageModal(false)
                      }}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 text-left"
                    >
                      <div className="text-3xl mb-2">🌐</div>
                      <div className="font-bold text-gray-900 mb-1">Web Link</div>
                      <div className="text-sm text-gray-600">Client can review and approve online</div>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowPackageModal(false)}
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DesignSelectionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <DesignSelectionsContent />
    </Suspense>
  )
}
