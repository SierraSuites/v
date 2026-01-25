'use client'
nexport const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AIAccessWrapper from '@/components/ai/AIAccessWrapper'

interface SiteMedia {
  id: string
  project_id: string
  project_name: string
  media_type: 'photo' | 'video' | 'drone'
  file_name: string
  upload_date: string
  location: string
  analysis_status: 'pending' | 'analyzing' | 'completed'
}

interface MediaAnalysis {
  id: string
  media_id: string
  file_name: string
  media_type: 'photo' | 'video' | 'drone'
  upload_date: string
  analysis_summary: string
  progress_assessment: {
    overall_completion: number
    areas_completed: string[]
    areas_in_progress: string[]
    areas_not_started: string[]
    on_schedule: boolean
    days_ahead_or_behind: number
  }
  quality_issues: {
    severity: 'critical' | 'moderate' | 'minor'
    issue: string
    location: string
    recommendation: string
    estimated_cost_to_fix: number
  }[]
  safety_hazards: {
    severity: 'critical' | 'moderate' | 'minor'
    hazard: string
    location: string
    immediate_action_required: boolean
    osha_reference?: string
  }[]
  material_inventory: {
    material: string
    estimated_quantity: number
    unit: string
    location: string
    condition: 'good' | 'damaged' | 'needs_protection'
  }[]
  blueprint_deviations: {
    deviation_type: 'critical' | 'moderate' | 'minor'
    description: string
    location: string
    requires_rework: boolean
    estimated_rework_cost?: number
  }[]
  workers_identified: number
  equipment_identified: string[]
  weather_conditions: string
  confidence_score: number
}

export default function SiteIntelligencePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'analyses' | 'upload'>('analyses')
  const [selectedAnalysis, setSelectedAnalysis] = useState<MediaAnalysis | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string>('all')

  // Demo data - Media analyses
  const [analyses, setAnalyses] = useState<MediaAnalysis[]>([
    {
      id: 'analysis-1',
      media_id: 'media-1',
      file_name: 'riverside_foundation_progress_dec4.jpg',
      media_type: 'photo',
      upload_date: '2025-12-04',
      analysis_summary: 'Foundation pour 87% complete. Minor formwork issue on north wall. On schedule, 2 days ahead of plan.',
      progress_assessment: {
        overall_completion: 87,
        areas_completed: ['South foundation wall', 'East foundation wall', 'Footer drainage system', 'Rebar placement'],
        areas_in_progress: ['North foundation wall (forms being adjusted)', 'Waterproofing preparation'],
        areas_not_started: ['Backfill', 'Foundation curing'],
        on_schedule: true,
        days_ahead_or_behind: 2
      },
      quality_issues: [
        {
          severity: 'moderate',
          issue: 'Formwork misalignment on north wall',
          location: 'North foundation wall, grid line 4-5',
          recommendation: 'Adjust forms before concrete pour. Add additional bracing.',
          estimated_cost_to_fix: 800
        },
        {
          severity: 'minor',
          issue: 'Uneven rebar spacing in section B',
          location: 'East wall, section B',
          recommendation: 'Adjust spacing to 12" on center per spec',
          estimated_cost_to_fix: 200
        }
      ],
      safety_hazards: [
        {
          severity: 'critical',
          hazard: 'Open excavation without barriers',
          location: 'West side of foundation',
          immediate_action_required: true,
          osha_reference: 'OSHA 1926.651(k)(1)'
        },
        {
          severity: 'moderate',
          hazard: 'Worker without hard hat',
          location: 'North wall area',
          immediate_action_required: true,
          osha_reference: 'OSHA 1926.100'
        }
      ],
      material_inventory: [
        {
          material: 'Rebar bundles (#4)',
          estimated_quantity: 24,
          unit: 'bundles',
          location: 'Northeast corner staging area',
          condition: 'good'
        },
        {
          material: 'Concrete forms (4x8)',
          estimated_quantity: 48,
          unit: 'sheets',
          location: 'On-site throughout foundation',
          condition: 'good'
        },
        {
          material: 'Lumber (2x4)',
          estimated_quantity: 320,
          unit: 'linear feet',
          location: 'South staging area',
          condition: 'needs_protection'
        }
      ],
      blueprint_deviations: [
        {
          deviation_type: 'moderate',
          description: 'Foundation wall thickness measures 10" instead of specified 12"',
          location: 'North wall, grid line 3',
          requires_rework: true,
          estimated_rework_cost: 4200
        }
      ],
      workers_identified: 8,
      equipment_identified: ['Concrete pump truck', 'Excavator', 'Skid steer', '2 pickup trucks'],
      weather_conditions: 'Clear skies, dry conditions',
      confidence_score: 94
    },
    {
      id: 'analysis-2',
      media_id: 'media-2',
      file_name: 'loft_framing_drone_dec3.mp4',
      media_type: 'drone',
      upload_date: '2025-12-03',
      analysis_summary: 'Framing 62% complete. Excellent progress on floors 1-2. Minor safety concerns on roof level. 1 day behind schedule.',
      progress_assessment: {
        overall_completion: 62,
        areas_completed: ['First floor framing', 'Second floor decking', 'Stairwell framing', 'Interior wall layout'],
        areas_in_progress: ['Third floor framing', 'Roof trusses installation', 'Exterior wall sheathing'],
        areas_not_started: ['Roof sheathing', 'Window rough-ins', 'Exterior trim'],
        on_schedule: false,
        days_ahead_or_behind: -1
      },
      quality_issues: [
        {
          severity: 'critical',
          issue: 'Missing hurricane ties on roof trusses',
          location: 'Roof level, sections A-C',
          recommendation: 'Install hurricane ties immediately before inspection',
          estimated_cost_to_fix: 1200
        },
        {
          severity: 'moderate',
          issue: 'Wall framing out of plumb',
          location: 'Third floor, north wall',
          recommendation: 'Re-plumb wall before sheathing installation',
          estimated_cost_to_fix: 600
        }
      ],
      safety_hazards: [
        {
          severity: 'critical',
          hazard: 'No fall protection on roof level',
          location: 'Roof work area',
          immediate_action_required: true,
          osha_reference: 'OSHA 1926.501(b)(13)'
        },
        {
          severity: 'moderate',
          hazard: 'Unsecured ladder at third floor',
          location: 'East elevation',
          immediate_action_required: true,
          osha_reference: 'OSHA 1926.1053'
        },
        {
          severity: 'minor',
          hazard: 'Extension cord through standing water',
          location: 'First floor, northwest corner',
          immediate_action_required: false
        }
      ],
      material_inventory: [
        {
          material: '2x6 studs',
          estimated_quantity: 180,
          unit: 'pieces',
          location: 'First floor staging',
          condition: 'good'
        },
        {
          material: 'Roof trusses',
          estimated_quantity: 12,
          unit: 'pieces',
          location: 'Ground level, south side',
          condition: 'good'
        },
        {
          material: 'OSB sheathing 4x8',
          estimated_quantity: 64,
          unit: 'sheets',
          location: 'Second floor',
          condition: 'damaged'
        }
      ],
      blueprint_deviations: [],
      workers_identified: 12,
      equipment_identified: ['Boom lift', 'Forklift', 'Compressor', '4 pickup trucks'],
      weather_conditions: 'Partly cloudy, light wind',
      confidence_score: 91
    },
    {
      id: 'analysis-3',
      media_id: 'media-3',
      file_name: 'commercial_hvac_install_dec2.jpg',
      media_type: 'photo',
      upload_date: '2025-12-02',
      analysis_summary: 'HVAC rough-in 45% complete. Ductwork installation proceeding well. Equipment delivery on schedule.',
      progress_assessment: {
        overall_completion: 45,
        areas_completed: ['Main trunk line installation', 'Supply register placement floor 1', 'Return air system'],
        areas_in_progress: ['Branch duct installation', 'Equipment mounting', 'Electrical connections'],
        areas_not_started: ['Insulation wrapping', 'Damper installation', 'Controls wiring', 'Testing and balancing'],
        on_schedule: true,
        days_ahead_or_behind: 0
      },
      quality_issues: [
        {
          severity: 'moderate',
          issue: 'Duct support spacing exceeds code',
          location: 'Main trunk line, section C',
          recommendation: 'Add hangers every 8 feet per code requirement',
          estimated_cost_to_fix: 400
        }
      ],
      safety_hazards: [
        {
          severity: 'moderate',
          hazard: 'Loose electrical wiring near ductwork',
          location: 'Ceiling space, grid 4-5',
          immediate_action_required: true
        }
      ],
      material_inventory: [
        {
          material: 'Rectangular duct (various sizes)',
          estimated_quantity: 180,
          unit: 'linear feet',
          location: 'On-site in ceiling',
          condition: 'good'
        },
        {
          material: 'Round flex duct 6"',
          estimated_quantity: 240,
          unit: 'linear feet',
          location: 'Staging area floor 1',
          condition: 'good'
        }
      ],
      blueprint_deviations: [
        {
          deviation_type: 'minor',
          description: 'Supply register relocated 2 feet west',
          location: 'Room 104',
          requires_rework: false
        }
      ],
      workers_identified: 5,
      equipment_identified: ['Scissor lift', 'Sheet metal brake', 'Plasma cutter'],
      weather_conditions: 'Indoor installation',
      confidence_score: 88
    }
  ])

  // Calculate stats
  const stats = {
    totalAnalyses: analyses.length,
    criticalIssues: analyses.reduce((sum, a) =>
      sum + a.quality_issues.filter(q => q.severity === 'critical').length +
      a.safety_hazards.filter(s => s.severity === 'critical').length, 0
    ),
    avgProgressCompletion: Math.round(
      analyses.reduce((sum, a) => sum + a.progress_assessment.overall_completion, 0) / analyses.length
    ),
    projectsAhead: analyses.filter(a => a.progress_assessment.days_ahead_or_behind > 0).length,
    projectsBehind: analyses.filter(a => a.progress_assessment.days_ahead_or_behind < 0).length,
    avgAIConfidence: Math.round(
      analyses.reduce((sum, a) => sum + a.confidence_score, 0) / analyses.length
    )
  }

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploadingFiles(true)

    // Simulate upload and analysis
    setTimeout(() => {
      alert(`✅ ${files.length} file(s) uploaded! AI analysis will complete in 2-3 minutes.`)
      setUploadingFiles(false)
      setShowUploadModal(false)
    }, 2000)
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getMediaTypeIcon = (type: string): string => {
    if (type === 'photo') return '📷'
    if (type === 'video') return '🎥'
    if (type === 'drone') return '🚁'
    return '📄'
  }

  const getSeverityColor = (severity: string): string => {
    if (severity === 'critical') return 'text-red-700 bg-red-100'
    if (severity === 'moderate') return 'text-orange-700 bg-orange-100'
    return 'text-yellow-700 bg-yellow-100'
  }

  const getScheduleStatusColor = (days: number): string => {
    if (days > 0) return 'text-green-700 bg-green-100'
    if (days < 0) return 'text-red-700 bg-red-100'
    return 'text-blue-700 bg-blue-100'
  }

  const getScheduleStatusText = (days: number): string => {
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ahead`
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) > 1 ? 's' : ''} behind`
    return 'On schedule'
  }

  return (
    <AIAccessWrapper requiredTier="enterprise">
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-indigo-50 to-white p-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🔍 Site Intelligence
              </h1>
              <p className="text-lg text-gray-600">
                AI-powered photo and video analysis for your construction sites
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold shadow-lg"
            >
              📤 Upload Site Media
            </button>
          </div>

          {/* How It Works Banner */}
          <div className="bg-gradient-to-r from-purple-100 to-indigo-100 border-l-4 border-purple-600 p-6 rounded-lg mb-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🤖</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">How AI Site Intelligence Works:</h3>
                <p className="text-gray-700">
                  Upload photos, videos, or drone footage from your construction site. Our AI analyzes the media to assess progress vs blueprints,
                  detect quality issues, identify safety hazards, track material inventory, and spot deviations from plans.
                  It's like having a superinten dent review every inch of your site 24/7. Users catch problems <span className="font-bold text-purple-700">3-4 weeks earlier</span> with AI analysis!
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-6 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-600">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalAnalyses}</div>
              <div className="text-sm text-gray-600">Total Analyses</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-600">
              <div className="text-3xl mb-2">🚨</div>
              <div className="text-3xl font-bold text-red-600">{stats.criticalIssues}</div>
              <div className="text-sm text-gray-600">Critical Issues</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-600">
              <div className="text-3xl mb-2">✓</div>
              <div className="text-3xl font-bold text-gray-900">{stats.avgProgressCompletion}%</div>
              <div className="text-sm text-gray-600">Avg Progress</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-600">
              <div className="text-3xl mb-2">⏩</div>
              <div className="text-3xl font-bold text-green-600">{stats.projectsAhead}</div>
              <div className="text-sm text-gray-600">Projects Ahead</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-600">
              <div className="text-3xl mb-2">⏰</div>
              <div className="text-3xl font-bold text-orange-600">{stats.projectsBehind}</div>
              <div className="text-sm text-gray-600">Projects Behind</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-600">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-3xl font-bold text-gray-900">{stats.avgAIConfidence}%</div>
              <div className="text-sm text-gray-600">AI Accuracy</div>
            </div>
          </div>

          {/* Analyses List */}
          <div className="space-y-6">
            {analyses.length === 0 ? (
              <div className="bg-white p-12 rounded-lg shadow-md text-center">
                <div className="text-6xl mb-4">📸</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Analyses Yet</h3>
                <p className="text-gray-600 mb-6">
                  Upload site photos, videos, or drone footage to get started with AI-powered site intelligence.
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                >
                  📤 Upload Your First Media
                </button>
              </div>
            ) : (
              analyses.map((analysis) => (
                <div key={analysis.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-3xl">{getMediaTypeIcon(analysis.media_type)}</span>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{analysis.file_name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-gray-600">
                                Uploaded {formatDate(analysis.upload_date)}
                              </span>
                              <span className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold">
                                {analysis.confidence_score}% AI confidence
                              </span>
                              <span className={`text-sm px-3 py-1 rounded-full font-semibold ${
                                getScheduleStatusColor(analysis.progress_assessment.days_ahead_or_behind)
                              }`}>
                                {getScheduleStatusText(analysis.progress_assessment.days_ahead_or_behind)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-purple-600 mb-1">
                          {analysis.progress_assessment.overall_completion}%
                        </div>
                        <div className="text-sm text-gray-600">Complete</div>
                      </div>
                    </div>

                    {/* AI Summary */}
                    <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-4 rounded">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">🤖</div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">AI Analysis Summary:</h4>
                          <p className="text-gray-700">{analysis.analysis_summary}</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Assessment */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span>📊</span> Progress Assessment
                      </h4>

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Overall Completion</span>
                          <span className="text-sm font-bold text-gray-900">
                            {analysis.progress_assessment.overall_completion}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-purple-600 h-3 rounded-full transition-all"
                            style={{ width: `${analysis.progress_assessment.overall_completion}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h5 className="font-semibold text-green-900 mb-2">✓ Completed</h5>
                          <ul className="space-y-1 text-sm text-green-700">
                            {analysis.progress_assessment.areas_completed.map((area, i) => (
                              <li key={i}>• {area}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h5 className="font-semibold text-blue-900 mb-2">⏳ In Progress</h5>
                          <ul className="space-y-1 text-sm text-blue-700">
                            {analysis.progress_assessment.areas_in_progress.map((area, i) => (
                              <li key={i}>• {area}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h5 className="font-semibold text-gray-900 mb-2">○ Not Started</h5>
                          <ul className="space-y-1 text-sm text-gray-700">
                            {analysis.progress_assessment.areas_not_started.map((area, i) => (
                              <li key={i}>• {area}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Safety Hazards */}
                    {analysis.safety_hazards.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span>🛡️</span> Safety Hazards Detected ({analysis.safety_hazards.length})
                        </h4>
                        <div className="space-y-3">
                          {analysis.safety_hazards.map((hazard, i) => (
                            <div key={i} className={`p-4 rounded-lg border-l-4 ${
                              hazard.severity === 'critical' ? 'bg-red-50 border-red-600' :
                              hazard.severity === 'moderate' ? 'bg-orange-50 border-orange-600' :
                              'bg-yellow-50 border-yellow-600'
                            }`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getSeverityColor(hazard.severity)}`}>
                                      {hazard.severity.toUpperCase()}
                                    </span>
                                    {hazard.immediate_action_required && (
                                      <span className="px-2 py-1 rounded text-xs font-bold bg-red-600 text-white">
                                        IMMEDIATE ACTION REQUIRED
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-semibold text-gray-900 mb-1">{hazard.hazard}</div>
                                  <div className="text-sm text-gray-600">Location: {hazard.location}</div>
                                  {hazard.osha_reference && (
                                    <div className="text-sm text-gray-600 mt-1">
                                      OSHA Reference: <span className="font-mono">{hazard.osha_reference}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quality Issues */}
                    {analysis.quality_issues.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span>⚠️</span> Quality Issues Detected ({analysis.quality_issues.length})
                        </h4>
                        <div className="space-y-3">
                          {analysis.quality_issues.map((issue, i) => (
                            <div key={i} className={`p-4 rounded-lg border-l-4 ${
                              issue.severity === 'critical' ? 'bg-red-50 border-red-600' :
                              issue.severity === 'moderate' ? 'bg-orange-50 border-orange-600' :
                              'bg-yellow-50 border-yellow-600'
                            }`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getSeverityColor(issue.severity)}`}>
                                      {issue.severity.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="font-semibold text-gray-900 mb-1">{issue.issue}</div>
                                  <div className="text-sm text-gray-600 mb-2">Location: {issue.location}</div>
                                  <div className="text-sm text-gray-700 mb-2">
                                    ✓ Recommendation: {issue.recommendation}
                                  </div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    Est. Cost to Fix: {formatCurrency(issue.estimated_cost_to_fix)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Blueprint Deviations */}
                    {analysis.blueprint_deviations.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span>📐</span> Blueprint Deviations Detected ({analysis.blueprint_deviations.length})
                        </h4>
                        <div className="space-y-3">
                          {analysis.blueprint_deviations.map((deviation, i) => (
                            <div key={i} className={`p-4 rounded-lg border-l-4 ${
                              deviation.deviation_type === 'critical' ? 'bg-red-50 border-red-600' :
                              deviation.deviation_type === 'moderate' ? 'bg-orange-50 border-orange-600' :
                              'bg-yellow-50 border-yellow-600'
                            }`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getSeverityColor(deviation.deviation_type)}`}>
                                      {deviation.deviation_type.toUpperCase()}
                                    </span>
                                    {deviation.requires_rework && (
                                      <span className="px-2 py-1 rounded text-xs font-bold bg-red-600 text-white">
                                        REQUIRES REWORK
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-semibold text-gray-900 mb-1">{deviation.description}</div>
                                  <div className="text-sm text-gray-600 mb-2">Location: {deviation.location}</div>
                                  {deviation.estimated_rework_cost && (
                                    <div className="text-sm font-semibold text-gray-900">
                                      Est. Rework Cost: {formatCurrency(deviation.estimated_rework_cost)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Material Inventory */}
                    {analysis.material_inventory.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span>📦</span> Material Inventory Detected ({analysis.material_inventory.length} items)
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {analysis.material_inventory.map((item, i) => (
                            <div key={i} className="bg-gray-50 p-3 rounded-lg border">
                              <div className="font-semibold text-gray-900 mb-1">{item.material}</div>
                              <div className="text-sm text-gray-700 mb-1">
                                {item.estimated_quantity} {item.unit}
                              </div>
                              <div className="text-sm text-gray-600 mb-2">📍 {item.location}</div>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                item.condition === 'good' ? 'bg-green-100 text-green-700' :
                                item.condition === 'damaged' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {item.condition === 'good' ? '✓ Good condition' :
                                 item.condition === 'damaged' ? '⚠️ Damaged' :
                                 '⚠️ Needs protection'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Site Details */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Workers Identified:</span>
                          <div className="font-semibold text-gray-900">{analysis.workers_identified} people</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Equipment Identified:</span>
                          <div className="font-semibold text-gray-900">{analysis.equipment_identified.join(', ')}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Weather Conditions:</span>
                          <div className="font-semibold text-gray-900">{analysis.weather_conditions}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Upload Site Media for AI Analysis
                </h2>

                <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">💡</div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Pro Tips for Best Results:</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Take photos from multiple angles for comprehensive analysis</li>
                        <li>• Include wide shots for overall progress, close-ups for quality details</li>
                        <li>• Upload daily for accurate progress tracking</li>
                        <li>• Drone footage gives best overall site assessment</li>
                        <li>• Good lighting improves AI accuracy by 15-20%</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Select Project
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                    <option>Riverside Medical Center</option>
                    <option>Downtown Loft Conversion</option>
                    <option>Commercial HVAC Install</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Upload Photos or Videos
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-3">📤</div>
                    <p className="text-gray-600 mb-4">
                      Drag and drop files here, or click to browse
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => handleUploadFiles(e.target.files)}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold cursor-pointer inline-block"
                    >
                      Choose Files
                    </label>
                    <p className="text-xs text-gray-500 mt-3">
                      Supports JPG, PNG, MP4, MOV • Max 100MB per file
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">⏱️</div>
                    <div className="text-sm text-gray-700">
                      <strong>Analysis Time:</strong> Photos analyze in 30-60 seconds. Videos take 2-3 minutes.
                      You'll receive an email when analysis is complete.
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                    disabled={uploadingFiles}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AIAccessWrapper>
  )
}
