'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import SustainabilityAccessWrapper from '@/components/sustainability/SustainabilityAccessWrapper'
import { formatCurrency, formatNumber } from '@/lib/sustainability-permissions'

interface DashboardMetrics {
  totalCarbonSaved: number
  wasteDiverted: number
  waterSaved: number
  leedPoints: number
  activeProjects: number
  certifications: number
}

interface CertificationProgress {
  name: string
  currentPoints: number
  targetPoints: number
  level: string
  color: string
}

export default function SustainabilityDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCarbonSaved: 0,
    wasteDiverted: 0,
    waterSaved: 0,
    leedPoints: 0,
    activeProjects: 0,
    certifications: 0
  })

  const [certifications, setCertifications] = useState<CertificationProgress[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load metrics (mock data for now - replace with real queries)
      // In production, these would be aggregated from carbon_footprint, material_waste, water_usage tables
      setMetrics({
        totalCarbonSaved: 127500, // kg CO2e
        wasteDiverted: 78.5, // percentage
        waterSaved: 245000, // gallons
        leedPoints: 67, // total across all projects
        activeProjects: 3,
        certifications: 2
      })

      // Load certification progress
      setCertifications([
        {
          name: 'LEED Gold',
          currentPoints: 67,
          targetPoints: 80,
          level: 'Gold',
          color: 'from-yellow-400 to-yellow-600'
        },
        {
          name: 'WELL Silver',
          currentPoints: 52,
          targetPoints: 60,
          level: 'Silver',
          color: 'from-gray-300 to-gray-500'
        }
      ])

    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCircularProgress = (current: number, target: number) => {
    const percentage = Math.min((current / target) * 100, 100)
    const circumference = 2 * Math.PI * 45 // radius = 45
    const offset = circumference - (percentage / 100) * circumference

    return { percentage, offset, circumference }
  }

  return (
    <SustainabilityAccessWrapper>
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        {/* Hero Metrics Bar - Always Visible */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white sticky top-0 z-10 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold">{formatNumber(metrics.totalCarbonSaved)}</div>
                <div className="text-xs md:text-sm text-green-100">kg CO₂e Saved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold">{metrics.wasteDiverted}%</div>
                <div className="text-xs md:text-sm text-green-100">Waste Diverted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold">{formatNumber(metrics.waterSaved)}</div>
                <div className="text-xs md:text-sm text-green-100">Gallons Saved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold">{metrics.leedPoints}</div>
                <div className="text-xs md:text-sm text-green-100">LEED Points</div>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Sustainability Command Center</h1>
                <p className="text-gray-600 mt-1">Track, optimize, and win with green building</p>
              </div>

              <Link
                href="/sustainability/carbon"
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Log Activity
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <>
              {/* Certification Progress Rings */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Certification Progress</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {certifications.map((cert, index) => {
                    const { percentage, offset, circumference } = getCircularProgress(cert.currentPoints, cert.targetPoints)

                    return (
                      <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                        <div className="flex flex-col items-center">
                          {/* Circular Progress */}
                          <div className="relative w-32 h-32 mb-4">
                            <svg className="transform -rotate-90 w-32 h-32">
                              {/* Background circle */}
                              <circle
                                cx="64"
                                cy="64"
                                r="45"
                                stroke="#e5e7eb"
                                strokeWidth="8"
                                fill="none"
                              />
                              {/* Progress circle */}
                              <circle
                                cx="64"
                                cy="64"
                                r="45"
                                stroke="url(#gradient-{index})"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                className="transition-all duration-500"
                              />
                              <defs>
                                <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" className="text-yellow-400" style={{ stopColor: 'currentColor' }} />
                                  <stop offset="100%" className="text-yellow-600" style={{ stopColor: 'currentColor' }} />
                                </linearGradient>
                              </defs>
                            </svg>
                            {/* Center text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <div className="text-3xl font-bold text-gray-900">{cert.currentPoints}</div>
                              <div className="text-xs text-gray-500">of {cert.targetPoints}</div>
                            </div>
                          </div>

                          {/* Cert details */}
                          <h3 className="font-bold text-gray-900 text-lg mb-1">{cert.name}</h3>
                          <div className={`px-3 py-1 bg-gradient-to-r ${cert.color} text-white rounded-full text-sm font-semibold mb-2`}>
                            {cert.level}
                          </div>
                          <div className="text-sm text-gray-600">
                            {Math.round(percentage)}% Complete
                          </div>
                          <Link
                            href="/sustainability/certifications"
                            className="mt-4 text-green-600 hover:text-green-700 font-medium text-sm"
                          >
                            View Details →
                          </Link>
                        </div>
                      </div>
                    )
                  })}

                  {/* Add New Certification */}
                  <Link
                    href="/sustainability/certifications"
                    className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-green-500 hover:bg-green-50 transition-all flex flex-col items-center justify-center"
                  >
                    <div className="w-32 h-32 flex items-center justify-center mb-4">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="font-semibold text-gray-600">Add Certification</div>
                    <div className="text-sm text-gray-500 mt-1">Start tracking a new cert</div>
                  </Link>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-gray-600">Active Projects</div>
                    <div className="text-3xl">🏗️</div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{metrics.activeProjects}</div>
                  <div className="text-sm text-gray-500 mt-1">With sustainability tracking</div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-gray-600">Tax Credits Found</div>
                    <div className="text-3xl">💰</div>
                  </div>
                  <div className="text-3xl font-bold text-green-600">$127K</div>
                  <div className="text-sm text-gray-500 mt-1">Across all projects</div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-gray-600">Cost Savings</div>
                    <div className="text-3xl">📊</div>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">$84K</div>
                  <div className="text-sm text-gray-500 mt-1">From waste reduction</div>
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Link
                  href="/sustainability/carbon"
                  className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="text-4xl mb-3">🌍</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Carbon Tracker</h3>
                  <p className="text-sm text-gray-600 mb-4">Track Scope 1, 2, 3 emissions</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">{formatNumber(metrics.totalCarbonSaved)}</span>
                    <span className="text-sm text-gray-600">kg CO₂e saved</span>
                  </div>
                </Link>

                <Link
                  href="/sustainability/waste"
                  className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="text-4xl mb-3">♻️</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Waste Management</h3>
                  <p className="text-sm text-gray-600 mb-4">Track and reduce material waste</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-green-600">{metrics.wasteDiverted}%</span>
                    <span className="text-sm text-gray-600">diverted</span>
                  </div>
                </Link>

                <Link
                  href="/sustainability/water"
                  className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="text-4xl mb-3">💧</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Water Monitoring</h3>
                  <p className="text-sm text-gray-600 mb-4">Track water usage & conservation</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-cyan-600">{formatNumber(metrics.waterSaved)}</span>
                    <span className="text-sm text-gray-600">gal saved</span>
                  </div>
                </Link>

                <Link
                  href="/sustainability/materials"
                  className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="text-4xl mb-3">🏢</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Materials Database</h3>
                  <p className="text-sm text-gray-600 mb-4">Sustainable material options</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-purple-600">450+</span>
                    <span className="text-sm text-gray-600">green materials</span>
                  </div>
                </Link>

                <Link
                  href="/sustainability/certifications"
                  className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="text-4xl mb-3">🏆</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Certifications</h3>
                  <p className="text-sm text-gray-600 mb-4">LEED, WELL, BREEAM tracking</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-yellow-600">{metrics.leedPoints}</span>
                    <span className="text-sm text-gray-600">LEED points</span>
                  </div>
                </Link>

                <Link
                  href="/sustainability/esg"
                  className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="text-4xl mb-3">📊</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">ESG Dashboard</h3>
                  <p className="text-sm text-gray-600 mb-4">Environmental, Social, Governance</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-indigo-600">A+</span>
                    <span className="text-sm text-gray-600">ESG score</span>
                  </div>
                </Link>
              </div>

              {/* Value Proposition Banner */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-8 text-white shadow-xl mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-3">💡 Why This Matters</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Win More Bids:</strong> 90% of RFPs require ESG reporting
                      </div>
                      <div>
                        <strong>Save Money:</strong> Average $84K per project in waste savings
                      </div>
                      <div>
                        <strong>Tax Credits:</strong> Identify $10K-$100K+ in green building credits
                      </div>
                      <div>
                        <strong>Competitive Edge:</strong> 23% higher win rate on green projects
                      </div>
                    </div>
                  </div>
                  <div className="ml-8 hidden lg:block">
                    <div className="text-6xl">🚀</div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Sustainability Activity</h2>
                </div>
                <div className="p-12 text-center text-gray-500">
                  <div className="text-4xl mb-2">🌱</div>
                  <p>Start logging carbon emissions, waste, and water usage to see activity here</p>
                  <Link
                    href="/sustainability/carbon"
                    className="mt-4 inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Log Your First Activity
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </SustainabilityAccessWrapper>
  )
}
