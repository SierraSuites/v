'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AIAccessWrapper from '@/components/ai/AIAccessWrapper'
import { AI_DEMO_PREDICTIONS, formatCurrency, formatNumber } from '@/lib/ai-permissions'

interface ProjectHealth {
  id: string
  name: string
  health_score: number
  status: string
  at_risk: boolean
  warning_message?: string
}

interface AIRecommendation {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  estimated_savings: number
  action: string
}

interface ChatMessage {
  role: 'user' | 'ai'
  content: string
  timestamp: Date
}

export default function AICommandCenter() {
  const supabase = createClient()
  const [projects, setProjects] = useState<ProjectHealth[]>([])
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [predictions, setPredictions] = useState(AI_DEMO_PREDICTIONS)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'ai',
      content: "👋 Hi! I'm Sierra, your AI Construction Co-Pilot. I've analyzed 4,287 projects and I'm here to help you build better. Ask me anything!",
      timestamp: new Date()
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [aiTyping, setAiTyping] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    totalProjectsMonitored: 0,
    highRiskProjects: 0,
    activeRecommendations: 0,
    estimatedSavings: 0,
    accuracyRate: 89
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load projects with health scores
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      // Generate mock health scores (in production, this would be AI-calculated)
      const projectsWithHealth: ProjectHealth[] = (projectsData || []).map((project, index) => {
        const healthScore = index === 1 ? 67 : index === 2 ? 45 : 92 - (index * 3)
        const atRisk = healthScore < 70

        return {
          ...project,
          health_score: healthScore,
          at_risk: atRisk,
          warning_message: atRisk
            ? index === 1
              ? 'Budget overrun predicted'
              : '14-day delay likely'
            : undefined
        }
      })

      setProjects(projectsWithHealth)

      // Load AI recommendations
      const mockRecommendations: AIRecommendation[] = [
        {
          id: '1',
          priority: 'high',
          title: 'Order windows 2 weeks early for Riverside project',
          description: 'Supplier lead times increased from 4 to 6 weeks based on market analysis',
          estimated_savings: 0,
          action: 'Click to place order with verified supplier'
        },
        {
          id: '2',
          priority: 'medium',
          title: 'Reschedule concrete pour from Tuesday to Thursday',
          description: 'Temperature will be 12°F warmer on Thursday, resulting in better curing conditions',
          estimated_savings: 0,
          action: 'Click to reschedule with crew and supplier'
        },
        {
          id: '3',
          priority: 'low',
          title: 'Consider switching to LED lighting on all projects',
          description: 'Current projects use 43% more energy than LED equivalent',
          estimated_savings: 8400,
          action: 'View energy comparison report'
        }
      ]

      setRecommendations(mockRecommendations)

      // Calculate stats
      setStats({
        totalProjectsMonitored: projectsWithHealth.length,
        highRiskProjects: projectsWithHealth.filter(p => p.at_risk).length,
        activeRecommendations: mockRecommendations.length,
        estimatedSavings: predictions.reduce((sum, p) => sum + (p.savings || 0), 0) + 8400,
        accuracyRate: 89
      })
    } catch (error) {
      console.error('Error loading AI data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    }
    setChatMessages([...chatMessages, userMessage])
    setChatInput('')
    setAiTyping(true)

    // Simulate AI response (in production, this would call an AI API)
    setTimeout(() => {
      const responses = [
        "Based on your last 3 projects, here are optimizations:\n1. Pre-cut all drywall using layout from AI Blueprint Analyzer (save 8 hours)\n2. Use lift instead of manual carrying (reduce labor by 30%)\n3. Schedule taping during non-peak hours (avoid $75/hour overtime)\n4. Order from Supplier B instead of A (save $0.18/sq ft)\n\nTotal time savings: 32 hours per project\nTotal cost savings: $2,100 per project",
        "I've analyzed your question. The AI predicts this project has a 23% chance of delay due to weather patterns. I recommend scheduling the critical outdoor work during the first two weeks when conditions are optimal.",
        "Looking at your historical data, projects in this price range typically have a 15% contingency. I recommend adjusting to 18% based on current market volatility in lumber and steel prices.",
        "Great question! I've found that your most successful projects share these characteristics: 1) Early material ordering (2+ weeks before needed), 2) Crew size of 8-12 during framing phase, 3) Bi-weekly client check-ins."
      ]

      const randomResponse = responses[Math.floor(Math.random() * responses.length)]

      const aiMessage: ChatMessage = {
        role: 'ai',
        content: randomResponse,
        timestamp: new Date()
      }

      setChatMessages(prev => [...prev, aiMessage])
      setAiTyping(false)
    }, 1500)
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getHealthStatus = (score: number) => {
    if (score >= 80) return { label: 'Healthy', icon: '✅' }
    if (score >= 60) return { label: 'Warning', icon: '⚠️' }
    return { label: 'At Risk', icon: '🚨' }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🚨'
      case 'high': return '⚡'
      case 'medium': return '💡'
      case 'low': return 'ℹ️'
      default: return '•'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      default: return 'bg-blue-500'
    }
  }

  if (loading) {
    return (
      <AIAccessWrapper requiredTier="enterprise">
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing AI Command Center...</p>
          </div>
        </div>
      </AIAccessWrapper>
    )
  }

  return (
    <AIAccessWrapper requiredTier="enterprise">
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-5xl font-bold mb-2 flex items-center gap-3">
                  <span className="text-6xl">🎯</span>
                  <span>AI Command Center</span>
                </h1>
                <p className="text-blue-100 text-lg">
                  Mission control for your construction projects • Powered by AI analyzing 4,287+ projects
                </p>
              </div>
              <div className="hidden md:block">
                <div className="bg-white/10 backdrop-blur rounded-lg px-6 py-4">
                  <div className="text-sm text-blue-100 mb-1">AI Accuracy</div>
                  <div className="text-4xl font-bold">{stats.accuracyRate}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Projects Monitored</div>
                <div className="text-2xl">📊</div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalProjectsMonitored}</div>
              <div className="text-xs text-gray-500 mt-1">AI tracking in real-time</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">High Risk Projects</div>
                <div className="text-2xl">🚨</div>
              </div>
              <div className="text-3xl font-bold text-red-600">{stats.highRiskProjects}</div>
              <div className="text-xs text-gray-500 mt-1">require immediate attention</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Active Recommendations</div>
                <div className="text-2xl">💡</div>
              </div>
              <div className="text-3xl font-bold text-orange-600">{stats.activeRecommendations}</div>
              <div className="text-xs text-gray-500 mt-1">AI suggestions pending</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Estimated Savings</div>
                <div className="text-2xl">💰</div>
              </div>
              <div className="text-3xl font-bold text-green-600">{formatCurrency(stats.estimatedSavings)}</div>
              <div className="text-xs text-gray-500 mt-1">if you act on AI insights</div>
            </div>
          </div>

          {/* Quick Access to AI Tools */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 mb-8 border-2 border-indigo-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">AI Tools</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/ai/predictor"
                className="bg-white rounded-lg p-4 hover:shadow-lg transition-all transform hover:scale-105 border-2 border-transparent hover:border-blue-500"
              >
                <div className="text-4xl mb-2">🔮</div>
                <div className="font-semibold text-gray-900 text-sm">Project Predictor</div>
                <div className="text-xs text-gray-600 mt-1">Crystal Ball analytics</div>
              </Link>

              <Link
                href="/ai/estimator"
                className="bg-white rounded-lg p-4 hover:shadow-lg transition-all transform hover:scale-105 border-2 border-transparent hover:border-green-500"
              >
                <div className="text-4xl mb-2">⚡</div>
                <div className="font-semibold text-gray-900 text-sm">Smart Estimator</div>
                <div className="text-xs text-gray-600 mt-1">2-minute quotes</div>
              </Link>

              <Link
                href="/ai/blueprints"
                className="bg-white rounded-lg p-4 hover:shadow-lg transition-all transform hover:scale-105 border-2 border-transparent hover:border-purple-500"
              >
                <div className="text-4xl mb-2">📐</div>
                <div className="font-semibold text-gray-900 text-sm">Blueprint Analyzer</div>
                <div className="text-xs text-gray-600 mt-1">Find conflicts</div>
              </Link>

              <Link
                href="/ai/safety"
                className="bg-white rounded-lg p-4 hover:shadow-lg transition-all transform hover:scale-105 border-2 border-transparent hover:border-red-500"
              >
                <div className="text-4xl mb-2">🛡️</div>
                <div className="font-semibold text-gray-900 text-sm">Safety Sentinel</div>
                <div className="text-xs text-gray-600 mt-1">Predict accidents</div>
              </Link>

              <Link
                href="/ai/materials"
                className="bg-white rounded-lg p-4 hover:shadow-lg transition-all transform hover:scale-105 border-2 border-transparent hover:border-orange-500"
              >
                <div className="text-4xl mb-2">💎</div>
                <div className="font-semibold text-gray-900 text-sm">Material Optimizer</div>
                <div className="text-xs text-gray-600 mt-1">Save 15-30%</div>
              </Link>

              <Link
                href="/ai/site"
                className="bg-white rounded-lg p-4 hover:shadow-lg transition-all transform hover:scale-105 border-2 border-transparent hover:border-teal-500"
              >
                <div className="text-4xl mb-2">📸</div>
                <div className="font-semibold text-gray-900 text-sm">Site Intelligence</div>
                <div className="text-xs text-gray-600 mt-1">Photo analysis</div>
              </Link>

              <Link
                href="/ai/contracts"
                className="bg-white rounded-lg p-4 hover:shadow-lg transition-all transform hover:scale-105 border-2 border-transparent hover:border-yellow-500"
              >
                <div className="text-4xl mb-2">⚖️</div>
                <div className="font-semibold text-gray-900 text-sm">Contract Guardian</div>
                <div className="text-xs text-gray-600 mt-1">Legal risk review</div>
              </Link>

              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 opacity-60">
                <div className="text-4xl mb-2">🚀</div>
                <div className="font-semibold text-gray-600 text-sm">More AI Tools</div>
                <div className="text-xs text-gray-500 mt-1">Coming soon</div>
              </div>
            </div>
          </div>

          {/* Main Grid - 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* LEFT COLUMN - Project Health & Predictions */}
            <div className="space-y-8">
              {/* Project Health Matrix */}
              <div className="bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Live Project Health Monitor</h2>
                  <Link href="/projects" className="text-sm text-blue-600 hover:text-blue-800">
                    View All →
                  </Link>
                </div>

                {projects.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
                    <p className="text-gray-600 mb-6">Create a project to see AI-powered health monitoring</p>
                    <Link
                      href="/projects"
                      className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      Create Project
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {projects.map((project) => {
                      const healthStatus = getHealthStatus(project.health_score)
                      return (
                        <div key={project.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">{project.name}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getHealthColor(project.health_score)}`}>
                              {healthStatus.icon} {project.health_score}
                            </span>
                          </div>

                          {/* Health Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${project.health_score >= 80 ? 'bg-green-500' : project.health_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${project.health_score}%` }}
                            />
                          </div>

                          {project.warning_message && (
                            <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 rounded px-3 py-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span>{project.warning_message}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Critical Predictions */}
              <div className="bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">🔮 Critical Predictions</h2>
                  <Link href="/ai/predictor" className="text-sm text-blue-600 hover:text-blue-800">
                    View All →
                  </Link>
                </div>

                <div className="divide-y divide-gray-200">
                  {predictions.slice(0, 3).map((prediction) => (
                    <div key={prediction.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1.5 ${getSeverityColor(prediction.severity)}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{prediction.title}</h3>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {prediction.confidence}% confident
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{prediction.description}</p>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-red-50 rounded px-2 py-1">
                              <div className="text-gray-600">Impact</div>
                              <div className="font-semibold text-red-700">
                                {prediction.impact.delay_days && `${prediction.impact.delay_days} days delay`}
                                {prediction.impact.cost_impact && formatCurrency(prediction.impact.cost_impact)}
                              </div>
                            </div>
                            <div className="bg-green-50 rounded px-2 py-1">
                              <div className="text-gray-600">Can Save</div>
                              <div className="font-semibold text-green-700">
                                {formatCurrency(prediction.savings)}
                              </div>
                            </div>
                          </div>

                          <button className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
                            View Prevention Plan →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Recommendations & Chat */}
            <div className="space-y-8">
              {/* AI Recommendations Stream */}
              <div className="bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">💡 AI Recommendations</h2>
                </div>

                <div className="divide-y divide-gray-200">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getPriorityIcon(rec.priority)}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${getPriorityColor(rec.priority)}`}>
                              {rec.priority.toUpperCase()}
                            </span>
                            {rec.estimated_savings > 0 && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                                Save {formatCurrency(rec.estimated_savings)}
                              </span>
                            )}
                          </div>

                          <h3 className="font-semibold text-gray-900 mb-1">{rec.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{rec.description}</p>

                          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                            {rec.action} →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Chat Interface */}
              <div className="bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl">🦺</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Ask Sierra</h2>
                    <p className="text-xs text-gray-600">Your AI Construction Expert</p>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
                  {chatMessages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {aiTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg px-4 py-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleChatSubmit} className="px-6 py-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about delays, costs, materials, safety..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={aiTyping}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {['How can I speed up drywall?', 'What\'s my biggest risk?', 'Material savings ideas?'].map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setChatInput(suggestion)}
                        className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Bottom Banner - AI Learning */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-green-200">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🧠</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Your AI is getting smarter!</h3>
                <p className="text-gray-700">
                  I've learned from 127 decisions you made this month. My predictions are now 89% accurate for your specific business.
                </p>
              </div>
              <Link
                href="/ai/predictor"
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold whitespace-nowrap"
              >
                See What I Learned
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AIAccessWrapper>
  )
}
