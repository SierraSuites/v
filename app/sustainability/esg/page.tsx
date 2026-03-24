'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SustainabilityAccessWrapper from '@/components/sustainability/SustainabilityAccessWrapper'

interface ESGMetrics {
  environmental: {
    carbonReduced: number
    wasteRecycled: number
    waterSaved: number
    greenCertifications: number
  }
  social: {
    safetyIncidents: number
    trainingHours: number
    localHires: number
    communityProjects: number
  }
  governance: {
    complianceScore: number
    auditsPassed: number
    policiesAdopted: number
  }
}

export default function ESGReportPage() {
  const supabase = createClient()
  const [metrics, setMetrics] = useState<ESGMetrics>({
    environmental: { carbonReduced: 0, wasteRecycled: 0, waterSaved: 0, greenCertifications: 0 },
    social: { safetyIncidents: 0, trainingHours: 0, localHires: 0, communityProjects: 0 },
    governance: { complianceScore: 0, auditsPassed: 0, policiesAdopted: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [reportYear] = useState(new Date().getFullYear())

  useEffect(() => { loadMetrics() }, [])

  const loadMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Pull real data from existing sustainability tables
      const [carbonRes, wasteRes, certRes] = await Promise.all([
        supabase.from('carbon_emissions').select('co2_saved').eq('user_id', user.id),
        supabase.from('material_waste').select('quantity, waste_category').eq('user_id', user.id),
        supabase.from('sustainability_certifications').select('id, status').eq('user_id', user.id),
      ])

      const carbonReduced = (carbonRes.data || []).reduce((s: number, r: any) => s + (r.co2_saved || 0), 0)
      const wasteData = wasteRes.data || []
      const wasteRecycled = wasteData
        .filter((w: any) => ['recycled', 'reused', 'donated', 'composted'].includes(w.waste_category))
        .reduce((s: number, w: any) => s + (w.quantity || 0), 0)
      const greenCertifications = (certRes.data || []).filter((c: any) => c.status === 'achieved').length

      setMetrics(prev => ({
        ...prev,
        environmental: { ...prev.environmental, carbonReduced, wasteRecycled, greenCertifications },
      }))
    } catch {
      // Use empty state
    } finally {
      setLoading(false)
    }
  }

  const ESGScore = () => {
    const envScore = Math.min(100, metrics.environmental.carbonReduced > 0 ? 60 : 20 + metrics.environmental.greenCertifications * 10)
    const socialScore = metrics.social.safetyIncidents === 0 ? 80 : 50
    const govScore = metrics.governance.complianceScore || 70
    return Math.round((envScore + socialScore + govScore) / 3)
  }

  const score = ESGScore()
  const scoreColor = score >= 70 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'
  const scoreBg = score >= 70 ? 'from-green-500 to-emerald-600' : score >= 50 ? 'from-yellow-500 to-orange-500' : 'from-red-500 to-red-600'

  if (loading) {
    return (
      <SustainabilityAccessWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </SustainabilityAccessWrapper>
    )
  }

  return (
    <SustainabilityAccessWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/sustainability" className="text-white/80 hover:text-white text-sm mb-2 inline-block">
                  ← Back to Sustainability Hub
                </Link>
                <h1 className="text-4xl font-bold mb-2">📊 ESG Report</h1>
                <p className="text-purple-100">Environmental, Social & Governance — {reportYear}</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 font-semibold shadow-lg"
              >
                🖨️ Export Report
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ESG Score */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-8 flex flex-col md:flex-row items-center gap-8">
            <div className={`w-36 h-36 rounded-full bg-gradient-to-br ${scoreBg} flex flex-col items-center justify-center text-white shadow-xl shrink-0`}>
              <span className="text-5xl font-bold">{score}</span>
              <span className="text-sm font-medium opacity-90">/ 100</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Overall ESG Score</h2>
              <p className={`text-lg font-semibold ${scoreColor} mb-3`}>
                {score >= 70 ? 'Good — above industry average' : score >= 50 ? 'Developing — room for improvement' : 'Needs attention'}
              </p>
              <p className="text-gray-600 text-sm max-w-xl">
                Your ESG score reflects performance across Environmental impact, Social responsibility, and Governance practices.
                Improve by reducing carbon emissions, logging safety training, and earning green certifications.
              </p>
            </div>
          </div>

          {/* Three Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Environmental */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
                <h3 className="text-white font-bold text-lg">🌍 Environmental</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">CO₂ Reduced</span>
                  <span className="font-bold text-gray-900">{metrics.environmental.carbonReduced.toFixed(1)} t</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Waste Diverted</span>
                  <span className="font-bold text-gray-900">{metrics.environmental.wasteRecycled.toFixed(1)} t</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Green Certifications</span>
                  <span className="font-bold text-gray-900">{metrics.environmental.greenCertifications}</span>
                </div>
                <Link href="/sustainability/carbon" className="block mt-4 text-center text-sm text-green-600 hover:text-green-700 font-medium border border-green-200 rounded-lg py-2 hover:bg-green-50">
                  View Carbon Data →
                </Link>
              </div>
            </div>

            {/* Social */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4">
                <h3 className="text-white font-bold text-lg">🤝 Social</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Safety Incidents</span>
                  <span className={`font-bold ${metrics.social.safetyIncidents === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metrics.social.safetyIncidents}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Training Hours</span>
                  <span className="font-bold text-gray-900">{metrics.social.trainingHours} hrs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Local Hires</span>
                  <span className="font-bold text-gray-900">{metrics.social.localHires}</span>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                  Log safety incidents and training in your project management tools to improve this score.
                </div>
              </div>
            </div>

            {/* Governance */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4">
                <h3 className="text-white font-bold text-lg">⚖️ Governance</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Compliance Score</span>
                  <span className="font-bold text-gray-900">{metrics.governance.complianceScore || 70}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Audits Passed</span>
                  <span className="font-bold text-gray-900">{metrics.governance.auditsPassed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Policies Adopted</span>
                  <span className="font-bold text-gray-900">{metrics.governance.policiesAdopted}</span>
                </div>
                <Link href="/sustainability/certifications" className="block mt-4 text-center text-sm text-purple-600 hover:text-purple-700 font-medium border border-purple-200 rounded-lg py-2 hover:bg-purple-50">
                  View Certifications →
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Improve Your ESG Score</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { href: '/sustainability/carbon', icon: '🌿', label: 'Track Carbon Emissions' },
                { href: '/sustainability/waste', icon: '♻️', label: 'Log Waste Diversion' },
                { href: '/sustainability/water', icon: '💧', label: 'Monitor Water Usage' },
                { href: '/sustainability/certifications', icon: '🏆', label: 'Earn Certifications' },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SustainabilityAccessWrapper>
  )
}
