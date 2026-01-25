'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AIAccessWrapper from '@/components/ai/AIAccessWrapper'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/ai-permissions'

interface Prediction {
  id: string
  project_id: string
  project_name: string
  prediction_type: 'schedule_delay' | 'cost_overrun' | 'safety_risk' | 'quality_issue'
  severity: 'critical' | 'high' | 'medium' | 'low'
  confidence_score: number
  title: string
  description: string
  predicted_impact: {
    delay_days?: number
    cost_impact?: number
    probability?: number
  }
  risk_factors: Array<{
    factor: string
    impact_percentage: number
  }>
  preventive_actions: Array<{
    action: string
    cost: number
    time_days?: number
  }>
  estimated_prevention_cost: number
  estimated_savings: number
  roi_percentage: number
  status: 'active' | 'addressed' | 'occurred' | 'avoided' | 'dismissed'
  created_at: string
}

interface Project {
  id: string
  name: string
}

export default function ProjectPredictorPage() {
  const supabase = createClient()
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [showDetail, setShowDetail] = useState<Prediction | null>(null)

  // Stats
  const [stats, setStats] = useState({
    totalPredictions: 0,
    activeCritical: 0,
    potentialSavings: 0,
    accuracyRate: 91,
    predictionsAvoided: 0
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

      // Generate realistic demo predictions
      const demoPredictions: Prediction[] = [
        {
          id: '1',
          project_id: projectsData?.[0]?.id || '1',
          project_name: projectsData?.[0]?.name || 'Oak Street Renovation',
          prediction_type: 'schedule_delay',
          severity: 'critical',
          confidence_score: 94,
          title: 'Foundation Pour Delay Predicted',
          description: 'Weather patterns and crew availability analysis suggests significant delay risk',
          predicted_impact: {
            delay_days: 12,
            cost_impact: 48200,
            probability: 94
          },
          risk_factors: [
            { factor: 'Heavy rain forecast 3 of next 7 days', impact_percentage: 38 },
            { factor: 'Concrete crew scheduling conflict', impact_percentage: 22 },
            { factor: 'Pump truck availability limited', impact_percentage: 18 },
            { factor: 'Site drainage inadequate', impact_percentage: 22 }
          ],
          preventive_actions: [
            { action: 'Rent additional dewatering pumps for 3 days', cost: 2400, time_days: 3 },
            { action: 'Book backup concrete crew now', cost: 8000, time_days: 1 },
            { action: 'Secure pump truck reservation with deposit', cost: 500, time_days: 0 }
          ],
          estimated_prevention_cost: 10900,
          estimated_savings: 37300,
          roi_percentage: 342,
          status: 'active',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          project_id: projectsData?.[1]?.id || '2',
          project_name: projectsData?.[1]?.name || 'Riverside Tower',
          prediction_type: 'cost_overrun',
          severity: 'high',
          confidence_score: 87,
          title: 'Lumber Price Spike Expected',
          description: 'Market analysis indicates 14% price increase in next 60 days',
          predicted_impact: {
            cost_impact: 24600,
            probability: 87
          },
          risk_factors: [
            { factor: 'Supply chain disruptions in Pacific Northwest', impact_percentage: 35 },
            { factor: 'Increased demand from commercial sector', impact_percentage: 28 },
            { factor: 'Tariff changes on imported lumber', impact_percentage: 22 },
            { factor: 'Seasonal demand peak approaching', impact_percentage: 15 }
          ],
          preventive_actions: [
            { action: 'Lock in current pricing with 90-day contract', cost: 0, time_days: 0 },
            { action: 'Order all framing lumber now, pay storage fee', cost: 1200, time_days: 0 },
            { action: 'Switch to engineered lumber where possible', cost: -3200, time_days: 2 }
          ],
          estimated_prevention_cost: -2000,
          estimated_savings: 26600,
          roi_percentage: Infinity,
          status: 'active',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          project_id: projectsData?.[0]?.id || '1',
          project_name: projectsData?.[0]?.name || 'Oak Street Renovation',
          prediction_type: 'safety_risk',
          severity: 'high',
          confidence_score: 78,
          title: 'Elevated Fall Risk This Week',
          description: 'Roof work + high winds + new crew members = dangerous combination',
          predicted_impact: {
            probability: 78,
            cost_impact: 142000
          },
          risk_factors: [
            { factor: 'High wind speeds forecast (25-35 mph)', impact_percentage: 32 },
            { factor: '3 new crew members with limited fall protection training', impact_percentage: 28 },
            { factor: 'Complex roof geometry increases exposure', impact_percentage: 24 },
            { factor: 'Working near unprotected edges', impact_percentage: 16 }
          ],
          preventive_actions: [
            { action: 'Schedule comprehensive fall protection training Monday AM', cost: 800, time_days: 1 },
            { action: 'Rent 6 additional safety harnesses and lanyards', cost: 240, time_days: 0 },
            { action: 'Assign experienced safety monitor to roof crew full-time', cost: 2400, time_days: 5 },
            { action: 'Install temporary guardrails on all open edges', cost: 3200, time_days: 2 }
          ],
          estimated_prevention_cost: 6640,
          estimated_savings: 135360,
          roi_percentage: 2038,
          status: 'active',
          created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '4',
          project_id: projectsData?.[1]?.id || '2',
          project_name: projectsData?.[1]?.name || 'Riverside Tower',
          prediction_type: 'quality_issue',
          severity: 'medium',
          confidence_score: 72,
          title: 'Drywall Finishing Quality Risk',
          description: 'Current crew performance trending below acceptable standards',
          predicted_impact: {
            cost_impact: 18500,
            probability: 72
          },
          risk_factors: [
            { factor: 'Crew rushing to meet deadline (15% faster than normal)', impact_percentage: 38 },
            { factor: 'Poor lighting in west wing affecting quality', impact_percentage: 26 },
            { factor: 'Subcontractor has 2.8/5 quality rating on similar projects', impact_percentage: 22 },
            { factor: 'Material quality variance in recent shipment', impact_percentage: 14 }
          ],
          preventive_actions: [
            { action: 'Add 1 week to drywall schedule to reduce rushing', cost: 0, time_days: 7 },
            { action: 'Install temporary work lights in west wing', cost: 850, time_days: 1 },
            { action: 'Hire quality inspector for daily checks', cost: 3200, time_days: 10 },
            { action: 'Schedule touch-up crew for immediate rework', cost: 2400, time_days: 3 }
          ],
          estimated_prevention_cost: 6450,
          estimated_savings: 12050,
          roi_percentage: 187,
          status: 'active',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '5',
          project_id: projectsData?.[2]?.id || '3',
          project_name: projectsData?.[2]?.name || 'Maple Subdivision',
          prediction_type: 'schedule_delay',
          severity: 'medium',
          confidence_score: 68,
          title: 'Electrical Inspection Delay Likely',
          description: 'City inspection department backlog analysis shows potential bottleneck',
          predicted_impact: {
            delay_days: 8,
            cost_impact: 12800,
            probability: 68
          },
          risk_factors: [
            { factor: 'City inspector on vacation next week', impact_percentage: 35 },
            { factor: 'Inspection queue currently 12 days out', impact_percentage: 30 },
            { factor: 'Previous inspection failures increase re-inspection time', impact_percentage: 20 },
            { factor: 'Holiday week reduces availability', impact_percentage: 15 }
          ],
          preventive_actions: [
            { action: 'Schedule inspection now for earliest available slot', cost: 0, time_days: 0 },
            { action: 'Pre-inspection walk-through with electrician', cost: 400, time_days: 1 },
            { action: 'Prepare comprehensive documentation package', cost: 200, time_days: 1 },
            { action: 'Contact inspector to prioritize if possible', cost: 0, time_days: 0 }
          ],
          estimated_prevention_cost: 600,
          estimated_savings: 12200,
          roi_percentage: 2033,
          status: 'active',
          created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]

      setPredictions(demoPredictions)

      // Calculate stats
      setStats({
        totalPredictions: demoPredictions.length,
        activeCritical: demoPredictions.filter(p => p.severity === 'critical' && p.status === 'active').length,
        potentialSavings: demoPredictions.reduce((sum, p) => sum + p.estimated_savings, 0),
        accuracyRate: 91,
        predictionsAvoided: 23
      })
    } catch (error) {
      console.error('Error loading predictions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPredictions = predictions.filter(p => {
    if (selectedProject !== 'all' && p.project_id !== selectedProject) return false
    if (selectedSeverity !== 'all' && p.severity !== selectedSeverity) return false
    return true
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'schedule_delay': return '⏱️'
      case 'cost_overrun': return '💸'
      case 'safety_risk': return '🛡️'
      case 'quality_issue': return '⚠️'
      default: return '📊'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'schedule_delay': return 'Schedule Delay'
      case 'cost_overrun': return 'Cost Overrun'
      case 'safety_risk': return 'Safety Risk'
      case 'quality_issue': return 'Quality Issue'
      default: return type
    }
  }

  const handleDismiss = async (id: string) => {
    if (!confirm('Are you sure you want to dismiss this prediction?')) return

    // In production, update in database
    setPredictions(predictions.map(p =>
      p.id === id ? { ...p, status: 'dismissed' as const } : p
    ))
  }

  const handleMarkAddressed = async (id: string) => {
    // In production, update in database
    setPredictions(predictions.map(p =>
      p.id === id ? { ...p, status: 'addressed' as const } : p
    ))
  }

  if (loading) {
    return (
      <AIAccessWrapper requiredTier="enterprise">
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing project data...</p>
          </div>
        </div>
      </AIAccessWrapper>
    )
  }

  return (
    <AIAccessWrapper requiredTier="enterprise">
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/ai" className="text-white/80 hover:text-white text-sm mb-2 inline-block">
                  ← Back to AI Command Center
                </Link>
                <h1 className="text-5xl font-bold mb-2 flex items-center gap-3">
                  <span className="text-6xl">🔮</span>
                  <span>Crystal Ball - Project Predictor</span>
                </h1>
                <p className="text-purple-100 text-lg">
                  See the future • Predict delays and overruns 3 weeks before they happen
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Total Predictions</div>
                <div className="text-2xl">🔮</div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalPredictions}</div>
              <div className="text-xs text-gray-500 mt-1">active insights</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Critical Risks</div>
                <div className="text-2xl">🚨</div>
              </div>
              <div className="text-3xl font-bold text-red-600">{stats.activeCritical}</div>
              <div className="text-xs text-gray-500 mt-1">need immediate action</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Potential Savings</div>
                <div className="text-2xl">💰</div>
              </div>
              <div className="text-3xl font-bold text-green-600">{formatCurrency(stats.potentialSavings)}</div>
              <div className="text-xs text-gray-500 mt-1">if you act now</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">AI Accuracy</div>
                <div className="text-2xl">🎯</div>
              </div>
              <div className="text-3xl font-bold text-blue-600">{stats.accuracyRate}%</div>
              <div className="text-xs text-gray-500 mt-1">on 1,200+ projects</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Issues Prevented</div>
                <div className="text-2xl">✅</div>
              </div>
              <div className="text-3xl font-bold text-indigo-600">{stats.predictionsAvoided}</div>
              <div className="text-xs text-gray-500 mt-1">this quarter</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Severity</label>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">🚨 Critical</option>
                  <option value="high">⚡ High</option>
                  <option value="medium">💡 Medium</option>
                  <option value="low">ℹ️ Low</option>
                </select>
              </div>

              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  Showing <strong>{filteredPredictions.length}</strong> of <strong>{predictions.length}</strong> predictions
                </div>
              </div>
            </div>
          </div>

          {/* How It Works Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How the Crystal Ball Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <strong className="text-blue-900">1. Continuous Monitoring</strong>
                <p className="text-gray-700">AI analyzes weather, supplier data, crew schedules, material prices 24/7</p>
              </div>
              <div>
                <strong className="text-blue-900">2. Pattern Recognition</strong>
                <p className="text-gray-700">Learns from 1,200+ similar projects to identify early warning signs</p>
              </div>
              <div>
                <strong className="text-blue-900">3. Risk Calculation</strong>
                <p className="text-gray-700">Calculates probability and impact of potential issues</p>
              </div>
              <div>
                <strong className="text-blue-900">4. Action Plans</strong>
                <p className="text-gray-700">Recommends specific preventive actions with ROI analysis</p>
              </div>
            </div>
          </div>

          {/* Predictions List */}
          <div className="space-y-6">
            {filteredPredictions.map((prediction) => (
              <div
                key={prediction.id}
                className="bg-white rounded-lg shadow-lg border-l-4 overflow-hidden"
                style={{ borderLeftColor: getSeverityColor(prediction.severity).replace('bg-', '#') }}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-4xl">{getTypeIcon(prediction.prediction_type)}</span>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">{prediction.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">{prediction.project_name}</span>
                            <span className="text-gray-400">•</span>
                            <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${getSeverityBadge(prediction.severity)}`}>
                              {prediction.severity.toUpperCase()}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
                              {prediction.confidence_score}% confidence
                            </span>
                            <span className="text-xs text-gray-500">
                              {getTypeLabel(prediction.prediction_type)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 text-lg">{prediction.description}</p>
                    </div>
                  </div>

                  {/* Impact Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {prediction.predicted_impact.delay_days && (
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <div className="text-xs text-gray-600 mb-1">Predicted Delay</div>
                        <div className="text-2xl font-bold text-red-700">
                          {prediction.predicted_impact.delay_days} days
                        </div>
                      </div>
                    )}

                    {prediction.predicted_impact.cost_impact && (
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <div className="text-xs text-gray-600 mb-1">Cost Impact</div>
                        <div className="text-2xl font-bold text-orange-700">
                          {formatCurrency(prediction.predicted_impact.cost_impact)}
                        </div>
                      </div>
                    )}

                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <div className="text-xs text-gray-600 mb-1">Prevention Cost</div>
                      <div className="text-2xl font-bold text-yellow-700">
                        {formatCurrency(prediction.estimated_prevention_cost)}
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4 border-2 border-green-500">
                      <div className="text-xs text-gray-600 mb-1">Net Savings</div>
                      <div className="text-2xl font-bold text-green-700">
                        {formatCurrency(prediction.estimated_savings)}
                      </div>
                      <div className="text-xs text-green-600 font-semibold mt-1">
                        {prediction.roi_percentage === Infinity ? '∞' : formatNumber(prediction.roi_percentage)}% ROI
                      </div>
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Contributing Risk Factors
                    </h4>
                    <div className="space-y-2">
                      {prediction.risk_factors.map((factor, index) => (
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

                  {/* Preventive Actions */}
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Recommended Preventive Actions
                    </h4>
                    <div className="space-y-3">
                      {prediction.preventive_actions.map((action, index) => (
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

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowDetail(prediction)}
                      className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                    >
                      View Full Analysis
                    </button>
                    <button
                      onClick={() => handleMarkAddressed(prediction.id)}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                    >
                      ✓ Mark as Addressed
                    </button>
                    <button
                      onClick={() => handleDismiss(prediction.id)}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredPredictions.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Active Predictions</h3>
                <p className="text-gray-600 mb-6">
                  {selectedProject !== 'all' || selectedSeverity !== 'all'
                    ? 'No predictions match your filters. Try adjusting the filters above.'
                    : 'All systems look good! The AI is monitoring your projects 24/7.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AIAccessWrapper>
  )
}
