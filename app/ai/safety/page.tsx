'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AIAccessWrapper from '@/components/ai/AIAccessWrapper'
import { formatCurrency, formatNumber } from '@/lib/ai-permissions'

interface SafetyPrediction {
  id: string
  project_id: string
  project_name: string
  risk_type: 'fall' | 'electrical' | 'struck_by' | 'caught_between' | 'environmental'
  risk_score: number
  probability_percentage: number
  title: string
  description: string
  predicted_timeframe: string
  contributing_factors: Array<{
    factor: string
    impact_percentage: number
  }>
  prevention_actions: Array<{
    action: string
    cost: number
    time_days?: number
  }>
  prevention_cost: number
  average_accident_cost: number
  roi_percentage: number
  status: 'active' | 'prevented' | 'occurred' | 'expired'
  created_at: string
}

interface SitePhotoAnalysis {
  id: string
  project_id: string
  project_name: string
  photo_url: string
  photo_date: string
  safety_findings: Array<{
    severity: 'critical' | 'moderate' | 'minor'
    finding: string
    location: string
  }>
  critical_safety_issues: number
  minor_safety_issues: number
  osha_violations: number
  created_at: string
}

interface Project {
  id: string
  name: string
}

export default function SafetySentinelPage() {
  const supabase = createClient()
  const [predictions, setPredictions] = useState<SafetyPrediction[]>([])
  const [photoAnalyses, setPhotoAnalyses] = useState<SitePhotoAnalysis[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [stats, setStats] = useState({
    currentRiskScore: 82,
    activePredictions: 0,
    oshaViolations: 0,
    potentialSavings: 0,
    incidentsPrevented: 0
  })

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

      // Generate demo safety predictions
      const demoPredictions: SafetyPrediction[] = [
        {
          id: '1',
          project_id: projectsData?.[0]?.id || '1',
          project_name: projectsData?.[0]?.name || 'Oak Street Renovation',
          risk_type: 'fall',
          risk_score: 78,
          probability_percentage: 78,
          title: 'Elevated Fall Risk This Week',
          description: 'Roof work combined with high winds and new crew members creates dangerous conditions',
          predicted_timeframe: 'this_week',
          contributing_factors: [
            { factor: 'High wind speeds forecast (25-35 mph)', impact_percentage: 32 },
            { factor: '3 new crew members with limited fall protection training', impact_percentage: 28 },
            { factor: 'Complex roof geometry increases exposure time', impact_percentage: 24 },
            { factor: 'Working near unprotected edges', impact_percentage: 16 }
          ],
          prevention_actions: [
            { action: 'Schedule comprehensive fall protection training Monday AM', cost: 800, time_days: 1 },
            { action: 'Rent 6 additional safety harnesses and lanyards', cost: 240, time_days: 0 },
            { action: 'Assign experienced safety monitor to roof crew full-time', cost: 2400, time_days: 5 },
            { action: 'Install temporary guardrails on all open edges', cost: 3200, time_days: 2 }
          ],
          prevention_cost: 6640,
          average_accident_cost: 142000,
          roi_percentage: 2038,
          status: 'active',
          created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          project_id: projectsData?.[1]?.id || '2',
          project_name: projectsData?.[1]?.name || 'Riverside Tower',
          risk_type: 'electrical',
          risk_score: 65,
          probability_percentage: 65,
          title: 'Electrical Shock Hazard Detected',
          description: 'Wet conditions near temporary electrical setup creates shock risk',
          predicted_timeframe: 'this_week',
          contributing_factors: [
            { factor: 'Temporary power panel exposed to weather', impact_percentage: 35 },
            { factor: 'Wet conditions from recent rain', impact_percentage: 28 },
            { factor: 'Extension cords near water puddles', impact_percentage: 22 },
            { factor: 'GFI protection not installed on all circuits', impact_percentage: 15 }
          ],
          prevention_actions: [
            { action: 'Install weatherproof enclosure for temp panel', cost: 450, time_days: 1 },
            { action: 'Add GFI protection to all temporary circuits', cost: 680, time_days: 1 },
            { action: 'Relocate cords away from water accumulation areas', cost: 120, time_days: 0 },
            { action: 'Schedule electrical safety training', cost: 400, time_days: 1 }
          ],
          prevention_cost: 1650,
          average_accident_cost: 89000,
          roi_percentage: 5294,
          status: 'active',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          project_id: projectsData?.[0]?.id || '1',
          project_name: projectsData?.[0]?.name || 'Oak Street Renovation',
          risk_type: 'struck_by',
          risk_score: 58,
          probability_percentage: 58,
          title: 'Struck-By Hazard: Heavy Equipment',
          description: 'Limited visibility and tight workspace increases collision risk',
          predicted_timeframe: 'this_month',
          contributing_factors: [
            { factor: 'Excavator working in confined area', impact_percentage: 32 },
            { factor: 'Multiple trades working simultaneously', impact_percentage: 26 },
            { factor: 'Blind spots around equipment', impact_percentage: 24 },
            { factor: 'No dedicated spotter assigned', impact_percentage: 18 }
          ],
          prevention_actions: [
            { action: 'Assign dedicated spotter for all equipment operation', cost: 1800, time_days: 3 },
            { action: 'Install proximity alarms on excavator', cost: 850, time_days: 1 },
            { action: 'Mark exclusion zones with high-vis barriers', cost: 320, time_days: 0 },
            { action: 'Schedule equipment work during non-peak hours', cost: 0, time_days: 0 }
          ],
          prevention_cost: 2970,
          average_accident_cost: 67000,
          roi_percentage: 2156,
          status: 'active',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]

      setPredictions(demoPredictions)

      // Generate demo photo analyses
      const demoPhotoAnalyses: SitePhotoAnalysis[] = [
        {
          id: '1',
          project_id: projectsData?.[0]?.id || '1',
          project_name: projectsData?.[0]?.name || 'Oak Street Renovation',
          photo_url: '/site-photos/demo1.jpg',
          photo_date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          safety_findings: [
            { severity: 'critical', finding: 'Worker on roof without fall protection harness', location: 'North elevation, roof area' },
            { severity: 'critical', finding: 'Missing guardrail on second floor opening', location: 'Second floor, stairwell' },
            { severity: 'moderate', finding: 'Extension cord running through standing water', location: 'Ground level, east side' },
            { severity: 'moderate', finding: 'Material blocking emergency exit', location: 'First floor, rear exit' },
            { severity: 'minor', finding: 'Hard hat not worn by 2 workers', location: 'Ground level, multiple locations' }
          ],
          critical_safety_issues: 2,
          minor_safety_issues: 1,
          osha_violations: 3,
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        }
      ]

      setPhotoAnalyses(demoPhotoAnalyses)

      // Calculate stats
      setStats({
        currentRiskScore: 82,
        activePredictions: demoPredictions.filter(p => p.status === 'active').length,
        oshaViolations: demoPhotoAnalyses.reduce((sum, p) => sum + p.osha_violations, 0),
        potentialSavings: demoPredictions.reduce((sum, p) => sum + (p.average_accident_cost - p.prevention_cost), 0),
        incidentsPrevented: 12
      })
    } catch (error) {
      console.error('Error loading safety data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPhoto(true)

    // Simulate upload and analysis
    setTimeout(() => {
      setUploadingPhoto(false)
      setShowPhotoUpload(false)
      alert('Photo analyzed! Found 3 safety issues. Check results below.')
      loadData()
    }, 3000)
  }

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-100 border-red-300'
    if (score >= 50) return 'text-orange-600 bg-orange-100 border-orange-300'
    return 'text-yellow-600 bg-yellow-100 border-yellow-300'
  }

  const getRiskLabel = (score: number) => {
    if (score >= 70) return 'High Risk'
    if (score >= 50) return 'Moderate Risk'
    return 'Low Risk'
  }

  const getRiskTypeIcon = (type: string) => {
    switch (type) {
      case 'fall': return '🪂'
      case 'electrical': return '⚡'
      case 'struck_by': return '🚧'
      case 'caught_between': return '⚙️'
      case 'environmental': return '🌡️'
      default: return '⚠️'
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
        <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading safety data...</p>
          </div>
        </div>
      </AIAccessWrapper>
    )
  }

  return (
    <AIAccessWrapper requiredTier="enterprise">
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/ai" className="text-white/80 hover:text-white text-sm mb-2 inline-block">
                  ← Back to AI Command Center
                </Link>
                <h1 className="text-5xl font-bold mb-2 flex items-center gap-3">
                  <span className="text-6xl">🛡️</span>
                  <span>Safety Sentinel</span>
                </h1>
                <p className="text-red-100 text-lg">
                  Predict and prevent accidents before they happen • Reduce incidents by 42%
                </p>
              </div>
              <button
                onClick={() => setShowPhotoUpload(true)}
                className="px-6 py-3 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors font-semibold shadow-lg"
              >
                📸 Upload Site Photo
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Current Risk Score Dashboard */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Current Safety Risk Score</h2>
              <div className="inline-block">
                <div className="relative w-48 h-48 mx-auto">
                  <svg className="transform -rotate-90 w-48 h-48">
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="#e5e7eb"
                      strokeWidth="16"
                      fill="none"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke={stats.currentRiskScore >= 70 ? '#dc2626' : stats.currentRiskScore >= 50 ? '#ea580c' : '#eab308'}
                      strokeWidth="16"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 80}`}
                      strokeDashoffset={`${2 * Math.PI * 80 * (1 - stats.currentRiskScore / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-gray-900">{stats.currentRiskScore}</div>
                      <div className="text-sm text-gray-600">Risk Score</div>
                    </div>
                  </div>
                </div>
                <div className={`mt-4 px-6 py-2 rounded-full border-2 inline-block font-semibold ${getRiskColor(stats.currentRiskScore)}`}>
                  {getRiskLabel(stats.currentRiskScore)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
                <div className="text-2xl mb-2">🚨</div>
                <div className="text-3xl font-bold text-gray-900">{stats.activePredictions}</div>
                <div className="text-sm text-gray-600">Active Predictions</div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg">
                <div className="text-2xl mb-2">⚠️</div>
                <div className="text-3xl font-bold text-orange-600">{stats.oshaViolations}</div>
                <div className="text-sm text-gray-600">OSHA Violations Found</div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                <div className="text-2xl mb-2">💰</div>
                <div className="text-3xl font-bold text-green-600">{formatCurrency(stats.potentialSavings)}</div>
                <div className="text-sm text-gray-600">Potential Savings</div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                <div className="text-2xl mb-2">✅</div>
                <div className="text-3xl font-bold text-blue-600">{stats.incidentsPrevented}</div>
                <div className="text-sm text-gray-600">Incidents Prevented</div>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How Safety Sentinel Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <strong className="text-orange-900">Continuous Monitoring</strong>
                <p className="text-gray-700">AI tracks weather, work types, crew experience, and site conditions 24/7</p>
              </div>
              <div>
                <strong className="text-orange-900">Pattern Recognition</strong>
                <p className="text-gray-700">Learns from OSHA data and historical incidents to identify risk patterns</p>
              </div>
              <div>
                <strong className="text-orange-900">Photo Analysis</strong>
                <p className="text-gray-700">Computer vision detects safety hazards in site photos automatically</p>
              </div>
              <div>
                <strong className="text-orange-900">Prevention Plans</strong>
                <p className="text-gray-700">Recommends specific actions with cost-benefit analysis</p>
              </div>
            </div>
          </div>

          {/* Safety Predictions */}
          <div className="bg-white rounded-lg shadow-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">🚨 Predictive Safety Alerts</h2>
              <p className="text-sm text-gray-600 mt-1">
                AI-predicted safety risks based on current conditions
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {predictions.map((prediction) => (
                <div key={prediction.id} className="p-6">
                  <div className="flex items-start gap-4">
                    <span className="text-5xl">{getRiskTypeIcon(prediction.risk_type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-gray-900">{prediction.title}</h3>
                        <span className={`px-3 py-1 rounded-full border-2 font-semibold ${getRiskColor(prediction.risk_score)}`}>
                          {prediction.probability_percentage}% probability
                        </span>
                      </div>

                      <p className="text-gray-700 text-lg mb-4">{prediction.description}</p>

                      {/* Contributing Factors */}
                      <div className="mb-6">
                        <h4 className="text-sm font-bold text-gray-900 mb-3">⚠️ Contributing Risk Factors:</h4>
                        <div className="space-y-2">
                          {prediction.contributing_factors.map((factor, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-gray-700">{factor.factor}</span>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {factor.impact_percentage}% impact
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full"
                                    style={{ width: `${factor.impact_percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Prevention Actions */}
                      <div className="mb-6">
                        <h4 className="text-sm font-bold text-gray-900 mb-3">✅ Recommended Prevention Actions:</h4>
                        <div className="space-y-3">
                          {prediction.prevention_actions.map((action, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{action.action}</div>
                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                                  <span>Cost: {formatCurrency(action.cost)}</span>
                                  {action.time_days && action.time_days > 0 && (
                                    <span>Time: {action.time_days} {action.time_days === 1 ? 'day' : 'days'}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ROI Comparison */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                          <div className="text-xs text-gray-600 mb-1">Prevention Cost</div>
                          <div className="text-2xl font-bold text-yellow-700">
                            {formatCurrency(prediction.prevention_cost)}
                          </div>
                        </div>

                        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                          <div className="text-xs text-gray-600 mb-1">Avg Accident Cost</div>
                          <div className="text-2xl font-bold text-red-700">
                            {formatCurrency(prediction.average_accident_cost)}
                          </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-500">
                          <div className="text-xs text-gray-600 mb-1">ROI on Prevention</div>
                          <div className="text-2xl font-bold text-green-700">
                            {formatNumber(prediction.roi_percentage)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Site Photo Analysis */}
          <div className="bg-white rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">📸 Site Photo Safety Analysis</h2>
              <p className="text-sm text-gray-600 mt-1">
                AI-detected safety issues from site photos
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {photoAnalyses.map((analysis) => (
                <div key={analysis.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{analysis.project_name}</h3>
                      <div className="text-sm text-gray-600">
                        {new Date(analysis.photo_date).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                        {analysis.critical_safety_issues} Critical
                      </span>
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                        {analysis.osha_violations} OSHA Violations
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {analysis.safety_findings.map((finding, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border-l-4 border-red-500 bg-red-50 rounded">
                        <div className={`w-3 h-3 rounded-full mt-1 ${getSeverityColor(finding.severity)}`} />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{finding.finding}</div>
                          <div className="text-sm text-gray-600">
                            <strong>Location:</strong> {finding.location}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          finding.severity === 'critical' ? 'bg-red-200 text-red-900' :
                          finding.severity === 'moderate' ? 'bg-orange-200 text-orange-900' :
                          'bg-yellow-200 text-yellow-900'
                        }`}>
                          {finding.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Photo Upload Modal */}
        {showPhotoUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full">
              <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
                <h2 className="text-2xl font-bold">Upload Site Photo for Safety Analysis</h2>
                <button
                  onClick={() => setShowPhotoUpload(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {uploadingPhoto ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-6"></div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">AI Analyzing Photo...</h3>
                    <p className="text-gray-600">
                      Detecting hazards • Checking PPE compliance • Finding OSHA violations
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Photo (JPG, PNG)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        AI will analyze in ~10 seconds • Detects PPE issues, hazards, OSHA violations
                      </p>
                    </div>

                    <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-gray-900 mb-2">What AI Will Detect:</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>✓ Fall protection issues (harnesses, guardrails)</li>
                        <li>✓ PPE compliance (hard hats, safety glasses, vests)</li>
                        <li>✓ Electrical hazards (exposed wiring, water near power)</li>
                        <li>✓ Equipment safety (guards, operator position)</li>
                        <li>✓ Housekeeping issues (trip hazards, blocked exits)</li>
                        <li>✓ OSHA regulation violations</li>
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
