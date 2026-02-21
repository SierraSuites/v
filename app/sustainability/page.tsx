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
      <div className="min-h-screen bg-linear-to-b from-green-50 to-white">
        {/* Hero Metrics Bar - Always Visible */}
        <div className="bg-linear-to-r from-green-600 to-emerald-600 text-white sticky top-0 z-10 shadow-lg">
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
            <div className="space-y-6 animate-pulse">
              <div className="h-7 bg-gray-200 rounded w-56 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4" />
                    <div className="h-4 bg-gray-200 rounded w-24 mx-auto mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-16 mx-auto" />
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
                <div className="h-48 bg-gray-200 rounded" />
              </div>
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
                      <div key={index} className="rounded-xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
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
                          <div className={`px-3 py-1 bg-linear-to-r ${cert.color} text-white rounded-full text-sm font-semibold mb-2`}>
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
                    className="bg-linear-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-green-500 hover:bg-green-50 transition-all flex flex-col items-center justify-center"
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

              {/* Spec lines 162-193: Waste Diversion Goal Indicator */}
              <div className="rounded-xl p-6 mb-8" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold" style={{ color: '#1A1A1A' }}>Waste Diversion Progress</h3>
                    <p className="text-xs" style={{ color: '#4A4A4A' }}>Goal: 75% diversion rate</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold" style={{ color: metrics.wasteDiverted >= 75 ? '#22C55E' : '#F59E0B' }}>
                      {metrics.wasteDiverted}%
                    </span>
                    {metrics.wasteDiverted >= 75 ? (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>✅ On Track</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>⚠️ Below Target</span>
                    )}
                  </div>
                </div>
                <div className="relative w-full rounded-full h-3" style={{ backgroundColor: '#E0E0E0' }}>
                  <div className="h-3 rounded-full transition-all" style={{ width: `${metrics.wasteDiverted}%`, backgroundColor: metrics.wasteDiverted >= 75 ? '#22C55E' : '#F59E0B' }} />
                  {/* Goal marker */}
                  <div className="absolute top-0 h-3 w-0.5" style={{ left: '75%', backgroundColor: '#1A1A1A' }} />
                </div>
                <div className="flex justify-between text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  <span>0%</span>
                  <span style={{ marginLeft: '50%' }}>75% Goal</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Quick Stats Grid with gradient icons */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="rounded-xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium" style={{ color: '#4A4A4A' }}>Active Projects</div>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6A9BFD 0%, #8BB5FE 100%)' }}>
                      <span className="text-white text-sm">🏗️</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{metrics.activeProjects}</div>
                  <div className="text-xs mt-1" style={{ color: '#4A4A4A' }}>With sustainability tracking</div>
                </div>

                <div className="rounded-xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium" style={{ color: '#4A4A4A' }}>Tax Credits Found</div>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6BCB77 0%, #85D68D 100%)' }}>
                      <span className="text-white text-sm">💰</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: '#22C55E' }}>$127K</div>
                  <div className="text-xs mt-1" style={{ color: '#4A4A4A' }}>Across all projects</div>
                </div>

                <div className="rounded-xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium" style={{ color: '#4A4A4A' }}>Cost Savings</div>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #38BDF8 0%, #7DD3FC 100%)' }}>
                      <span className="text-white text-sm">📊</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: '#3B82F6' }}>$84K</div>
                  <div className="text-xs mt-1" style={{ color: '#4A4A4A' }}>From waste reduction</div>
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Link
                  href="/sustainability/carbon"
                  className="bg-linear-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
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
                  className="bg-linear-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
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
                  className="bg-linear-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
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
                  className="bg-linear-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
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
                  className="bg-linear-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
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
                  className="bg-linear-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
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
              <div className="bg-linear-to-r from-green-600 to-emerald-600 rounded-xl p-8 text-white shadow-xl mb-8">
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
              <div className="rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
                <div className="px-6 py-4" style={{ borderBottom: '1px solid #E0E0E0' }}>
                  <h2 className="text-lg font-semibold" style={{ color: '#1A1A1A' }}>Recent Sustainability Activity</h2>
                </div>
                <div className="p-12 text-center" style={{ color: '#4A4A4A' }}>
                  <div className="text-4xl mb-2">🌱</div>
                  <p>Start logging carbon emissions, waste, and water usage to see activity here</p>
                  <Link
                    href="/sustainability/carbon"
                    className="mt-4 inline-block px-6 py-3 text-white rounded-lg transition-colors"
                    style={{ background: 'linear-gradient(to bottom, #22C55E 0%, #16A34A 100%)' }}
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
