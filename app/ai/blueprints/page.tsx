'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AIAccessWrapper from '@/components/ai/AIAccessWrapper'
import { formatCurrency, formatNumber } from '@/lib/ai-permissions'

interface BlueprintAnalysis {
  id: string
  project_id: string
  project_name: string
  blueprint_name: string
  blueprint_type: string
  blueprint_url: string
  findings: Finding[]
  clash_detections: Clash[]
  material_takeoff: MaterialItem[]
  critical_issues_count: number
  warning_issues_count: number
  opportunity_count: number
  estimated_cost_impact: number
  estimated_savings_opportunities: number
  analysis_status: 'processing' | 'completed' | 'failed'
  created_at: string
}

interface Finding {
  id: string
  type: 'critical' | 'warning' | 'opportunity'
  category: string
  title: string
  description: string
  page_number: number
  detail_reference: string
  cost_impact: number
  time_impact_days: number
  recommended_solution: string
  alternative_options?: string[]
}

interface Clash {
  system1: string
  system2: string
  location: string
  severity: 'critical' | 'moderate' | 'minor'
  description: string
}

interface MaterialItem {
  material: string
  quantity: number
  unit: string
  category: string
}

interface Project {
  id: string
  name: string
}

export default function BlueprintAnalyzerPage() {
  const supabase = createClient()
  const [analyses, setAnalyses] = useState<BlueprintAnalysis[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedAnalysis, setSelectedAnalysis] = useState<BlueprintAnalysis | null>(null)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    project_id: '',
    blueprint_name: '',
    blueprint_type: 'architectural'
  })

  const blueprintTypes = [
    'Architectural',
    'Structural',
    'Electrical',
    'Plumbing',
    'Mechanical',
    'Civil'
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name')

      setProjects(projectsData || [])

      // Generate demo analyses
      const demoAnalyses: BlueprintAnalysis[] = [
        {
          id: '1',
          project_id: projectsData?.[0]?.id || '1',
          project_name: projectsData?.[0]?.name || 'Oak Street Renovation',
          blueprint_name: 'Architectural Plans - Sheet A-4',
          blueprint_type: 'Architectural',
          blueprint_url: '/blueprints/demo.pdf',
          findings: [
            {
              id: '1',
              type: 'critical',
              category: 'Structural Conflict',
              title: 'Beam Interferes with HVAC Duct',
              description: 'Steel beam at gridline 3 conflicts with main supply duct routing',
              page_number: 4,
              detail_reference: 'Detail 3.2',
              cost_impact: 8500,
              time_impact_days: 3,
              recommended_solution: 'Move duct 6" north per Detail B-7 alternative or reduce beam depth to W12x26',
              alternative_options: [
                'Reroute duct through adjacent bay',
                'Use smaller beam with flitch plate reinforcement',
                'Lower ceiling in this area only'
              ]
            },
            {
              id: '2',
              type: 'warning',
              category: 'Missing Detail',
              title: 'Missing Waterproofing at Balcony',
              description: 'No waterproofing detail shown at balcony-to-wall connection',
              page_number: 9,
              detail_reference: 'Section 5',
              cost_impact: 3200,
              time_impact_days: 1,
              recommended_solution: 'Add typical balcony waterproofing detail from library (Detail W-3)',
              alternative_options: [
                'Use pre-fabricated through-wall flashing',
                'Install liquid-applied membrane system'
              ]
            },
            {
              id: '3',
              type: 'opportunity',
              category: 'Value Engineering',
              title: 'Simplify Roof Framing',
              description: 'Complex stick-framed roof could be simplified with pre-fabricated trusses',
              page_number: 3,
              detail_reference: 'Roof Framing Plan',
              cost_impact: -3200,
              time_impact_days: -4,
              recommended_solution: 'Use pre-fabricated trusses instead of stick framing - saves labor and materials',
              alternative_options: [
                'Hybrid approach: trusses for main spans, stick frame complex areas',
                'Engineered lumber to reduce material waste'
              ]
            },
            {
              id: '4',
              type: 'critical',
              category: 'Code Violation',
              title: 'Stair Width Below Code Minimum',
              description: 'Egress stairwell measures 34" clear width, code requires 36" minimum',
              page_number: 2,
              detail_reference: 'Stair Section A',
              cost_impact: 12000,
              time_impact_days: 5,
              recommended_solution: 'Widen stairwell to 36" clear - requires adjusting adjacent walls',
              alternative_options: [
                'Relocate stair to adjacent bay with more space',
                'Use thinner wall finish to gain required width'
              ]
            },
            {
              id: '5',
              type: 'warning',
              category: 'Coordination Issue',
              title: 'Door Swing Conflicts with Switch',
              description: 'Entry door swings into light switch location on wall',
              page_number: 7,
              detail_reference: 'Room 104',
              cost_impact: 150,
              time_impact_days: 0,
              recommended_solution: 'Relocate switch to opposite side of door frame',
              alternative_options: [
                'Reverse door swing direction',
                'Use motion-sensor switch instead'
              ]
            }
          ],
          clash_detections: [
            {
              system1: 'Structural',
              system2: 'HVAC',
              location: 'Gridline 3, Second Floor',
              severity: 'critical',
              description: 'W16x31 beam conflicts with 24" supply duct'
            },
            {
              system1: 'Electrical',
              system2: 'Plumbing',
              location: 'Chase Wall, Unit 2B',
              severity: 'moderate',
              description: 'Electrical conduit intersects with plumbing vent stack'
            },
            {
              system1: 'Architectural',
              system2: 'Structural',
              location: 'West Elevation',
              severity: 'critical',
              description: 'Column placement conflicts with intended window opening'
            },
            {
              system1: 'Plumbing',
              system2: 'Electrical',
              location: 'Basement Ceiling',
              severity: 'minor',
              description: 'Sprinkler pipe within 6" of electrical panel - code clearance issue'
            }
          ],
          material_takeoff: [
            { material: '2x6 Studs', quantity: 428, unit: 'linear feet', category: 'Framing' },
            { material: 'Drywall 4x8 sheets', quantity: 145, unit: 'sheets', category: 'Finishes' },
            { material: 'Concrete', quantity: 42, unit: 'cubic yards', category: 'Foundation' },
            { material: 'Roofing Shingles', quantity: 28, unit: 'squares', category: 'Roofing' },
            { material: 'Windows', quantity: 18, unit: 'units', category: 'Openings' },
            { material: 'Doors', quantity: 12, unit: 'units', category: 'Openings' },
            { material: 'Insulation R-30', quantity: 2400, unit: 'square feet', category: 'Insulation' },
            { material: 'OSB Sheathing 4x8', quantity: 89, unit: 'sheets', category: 'Sheathing' }
          ],
          critical_issues_count: 2,
          warning_issues_count: 2,
          opportunity_count: 1,
          estimated_cost_impact: 23850,
          estimated_savings_opportunities: 3200,
          analysis_status: 'completed',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]

      setAnalyses(demoAnalyses)
      if (demoAnalyses.length > 0) {
        setSelectedAnalysis(demoAnalyses[0])
      }
    } catch (error) {
      console.error('Error loading blueprint data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    // Simulate upload
    setTimeout(() => {
      setUploading(false)
      setAnalyzing(true)

      // Simulate AI analysis
      setTimeout(() => {
        setAnalyzing(false)
        setShowUploadModal(false)
        alert('Blueprint analyzed successfully! Check the results below.')
        loadData()
      }, 3000)
    }, 2000)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'opportunity': return 'bg-green-100 text-green-800 border-green-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'critical': return '🚨'
      case 'warning': return '⚠️'
      case 'opportunity': return '💡'
      default: return '•'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'moderate': return 'bg-orange-500'
      case 'minor': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <AIAccessWrapper requiredTier="enterprise">
        <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading blueprint analyses...</p>
          </div>
        </div>
      </AIAccessWrapper>
    )
  }

  return (
    <AIAccessWrapper requiredTier="enterprise">
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/ai" className="text-white/80 hover:text-white text-sm mb-2 inline-block">
                  ← Back to AI Command Center
                </Link>
                <h1 className="text-5xl font-bold mb-2 flex items-center gap-3">
                  <span className="text-6xl">📐</span>
                  <span>Blueprint Intelligence</span>
                </h1>
                <p className="text-indigo-100 text-lg">
                  AI reads drawings and finds conflicts before construction • Catch $8,500 average in errors
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-semibold shadow-lg"
              >
                + Upload Blueprint
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {selectedAnalysis && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-600">Critical Issues</div>
                    <div className="text-2xl">🚨</div>
                  </div>
                  <div className="text-3xl font-bold text-red-600">{selectedAnalysis.critical_issues_count}</div>
                  <div className="text-xs text-gray-500 mt-1">must fix before build</div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-600">Warnings</div>
                    <div className="text-2xl">⚠️</div>
                  </div>
                  <div className="text-3xl font-bold text-yellow-600">{selectedAnalysis.warning_issues_count}</div>
                  <div className="text-xs text-gray-500 mt-1">need attention</div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-600">Opportunities</div>
                    <div className="text-2xl">💡</div>
                  </div>
                  <div className="text-3xl font-bold text-green-600">{selectedAnalysis.opportunity_count}</div>
                  <div className="text-xs text-gray-500 mt-1">cost savings found</div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-600">Cost Impact</div>
                    <div className="text-2xl">💸</div>
                  </div>
                  <div className="text-3xl font-bold text-orange-600">
                    {formatCurrency(selectedAnalysis.estimated_cost_impact)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">potential rework cost</div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-600">Savings Found</div>
                    <div className="text-2xl">✨</div>
                  </div>
                  <div className="text-3xl font-bold text-indigo-600">
                    {formatCurrency(selectedAnalysis.estimated_savings_opportunities)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">value engineering</div>
                </div>
              </div>

              {/* How It Works */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  What AI Analyzes in Your Blueprints
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <strong className="text-blue-900">Clash Detection</strong>
                    <p className="text-gray-700">Finds conflicts between structural, MEP, and architectural systems</p>
                  </div>
                  <div>
                    <strong className="text-blue-900">Code Compliance</strong>
                    <p className="text-gray-700">Checks dimensions, clearances, egress paths against building codes</p>
                  </div>
                  <div>
                    <strong className="text-blue-900">Missing Details</strong>
                    <p className="text-gray-700">Identifies incomplete specifications and missing construction details</p>
                  </div>
                  <div>
                    <strong className="text-blue-900">Material Takeoff</strong>
                    <p className="text-gray-700">Extracts quantities for accurate material ordering</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-lg shadow-lg mb-8">
                <div className="border-b border-gray-200">
                  <div className="flex gap-4 px-6">
                    {['Findings', 'Clash Detection', 'Material Takeoff'].map((tab) => (
                      <button
                        key={tab}
                        className="px-4 py-4 font-semibold border-b-2 border-indigo-600 text-indigo-600"
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Findings Tab */}
                <div className="p-6">
                  <div className="space-y-6">
                    {selectedAnalysis.findings.map((finding) => (
                      <div
                        key={finding.id}
                        className={`border-2 rounded-lg p-6 ${getTypeColor(finding.type)}`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-3xl">{getTypeIcon(finding.type)}</span>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{finding.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${getTypeColor(finding.type)}`}>
                                    {finding.type.toUpperCase()}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    {finding.category}
                                  </span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-600">
                                    Page {finding.page_number}, {finding.detail_reference}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-gray-700 mb-4">{finding.description}</p>

                            {/* Impact */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                              <div className="bg-white rounded-lg p-3 border">
                                <div className="text-xs text-gray-600">Cost Impact</div>
                                <div className="text-lg font-bold text-gray-900">
                                  {finding.cost_impact > 0 ? '+' : ''}{formatCurrency(Math.abs(finding.cost_impact))}
                                </div>
                              </div>
                              {finding.time_impact_days !== 0 && (
                                <div className="bg-white rounded-lg p-3 border">
                                  <div className="text-xs text-gray-600">Time Impact</div>
                                  <div className="text-lg font-bold text-gray-900">
                                    {finding.time_impact_days > 0 ? '+' : ''}{finding.time_impact_days} days
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Solution */}
                            <div className="bg-white rounded-lg p-4 border-l-4 border-green-500 mb-3">
                              <div className="text-sm font-bold text-gray-900 mb-2">✅ Recommended Solution:</div>
                              <p className="text-gray-700">{finding.recommended_solution}</p>
                            </div>

                            {/* Alternative Options */}
                            {finding.alternative_options && finding.alternative_options.length > 0 && (
                              <div>
                                <div className="text-sm font-bold text-gray-900 mb-2">Alternative Options:</div>
                                <ul className="space-y-1">
                                  {finding.alternative_options.map((option, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                      <span className="text-indigo-600 font-bold">{index + 1}.</span>
                                      <span>{option}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Clash Detection */}
              <div className="bg-white rounded-lg shadow-lg mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Clash Detection Results</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    System-to-system conflicts that need coordination
                  </p>
                </div>

                <div className="p-6 space-y-4">
                  {selectedAnalysis.clash_detections.map((clash, index) => (
                    <div key={index} className="border-l-4 border-red-500 bg-red-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-3 h-3 rounded-full ${getSeverityColor(clash.severity)}`} />
                            <span className="font-bold text-gray-900 text-lg">
                              {clash.system1} ↔ {clash.system2}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              {clash.severity}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mb-1">
                            <strong>Location:</strong> {clash.location}
                          </div>
                          <p className="text-gray-700">{clash.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Material Takeoff */}
              <div className="bg-white rounded-lg shadow-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">AI Material Takeoff</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Quantities extracted from blueprints for ordering
                  </p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedAnalysis.material_takeoff.map((item, index) => (
                      <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                        <div className="text-xs text-gray-600 mb-1">{item.category}</div>
                        <div className="font-bold text-gray-900 text-lg mb-1">{item.material}</div>
                        <div className="text-2xl font-bold text-indigo-600">
                          {formatNumber(item.quantity)} <span className="text-sm text-gray-600">{item.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold">
                      📋 Export to Material Order
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {!selectedAnalysis && analyses.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">📐</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Blueprints Analyzed Yet</h3>
              <p className="text-gray-600 mb-6">
                Upload your first blueprint to see AI-powered conflict detection and analysis
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-8 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold text-lg shadow-lg"
              >
                Upload First Blueprint
              </button>
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
                <h2 className="text-2xl font-bold">Upload Blueprint for AI Analysis</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {uploading || analyzing ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-6"></div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {uploading ? 'Uploading Blueprint...' : 'AI Analyzing...'}
                    </h3>
                    <p className="text-gray-600">
                      {uploading
                        ? 'Processing your file...'
                        : 'Finding conflicts • Checking code compliance • Extracting quantities'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project
                      </label>
                      <select
                        value={uploadForm.project_id}
                        onChange={(e) => setUploadForm({ ...uploadForm, project_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Select project...</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Blueprint Name
                      </label>
                      <input
                        type="text"
                        value={uploadForm.blueprint_name}
                        onChange={(e) => setUploadForm({ ...uploadForm, blueprint_name: e.target.value })}
                        placeholder="e.g., Architectural Plans - Sheet A-4"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Blueprint Type
                      </label>
                      <select
                        value={uploadForm.blueprint_type}
                        onChange={(e) => setUploadForm({ ...uploadForm, blueprint_type: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        {blueprintTypes.map((type) => (
                          <option key={type} value={type.toLowerCase()}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload File (PDF)
                      </label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Accepts: PDF files up to 50MB • AI will analyze in ~60 seconds
                      </p>
                    </div>

                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-gray-900 mb-2">What AI Will Check:</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>✓ Structural/MEP/Architectural conflicts</li>
                        <li>✓ Building code compliance</li>
                        <li>✓ Missing or incomplete details</li>
                        <li>✓ Material quantities for takeoff</li>
                        <li>✓ Value engineering opportunities</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AIAccessWrapper>
  )
}
