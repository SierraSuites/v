'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SustainabilityAccessWrapper from '@/components/sustainability/SustainabilityAccessWrapper'

interface Certification {
  id: string
  project_id: string | null
  project_name?: string
  cert_type: 'LEED' | 'WELL' | 'BREEAM' | 'Living Building Challenge' | 'ENERGY STAR' | 'Green Globes'
  target_level: string
  current_points: number
  target_points: number
  percentage_complete: number
  submission_deadline: string | null
  status: 'planning' | 'in_progress' | 'submitted' | 'certified' | 'on_hold'
  consultant_name: string | null
  consultant_email: string | null
  notes: string | null
  created_at: string
}

interface Requirement {
  id: string
  certification_id: string
  category: string
  requirement_code: string
  description: string
  points_possible: number
  points_achieved: number
  status: 'not_started' | 'in_progress' | 'completed' | 'na'
  documentation_url: string | null
  deadline: string | null
  notes: string | null
  created_at: string
}

interface Project {
  id: string
  name: string
}

export default function CertificationsPage() {
  const supabase = createClient()
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddCertModal, setShowAddCertModal] = useState(false)
  const [showAddReqModal, setShowAddReqModal] = useState(false)
  const [showRequirementsView, setShowRequirementsView] = useState(false)

  const [certFormData, setCertFormData] = useState({
    project_id: '',
    cert_type: 'LEED' as Certification['cert_type'],
    target_level: 'Gold',
    current_points: '0',
    target_points: '60',
    submission_deadline: '',
    status: 'planning' as Certification['status'],
    consultant_name: '',
    consultant_email: '',
    notes: ''
  })

  const [reqFormData, setReqFormData] = useState({
    category: '',
    requirement_code: '',
    description: '',
    points_possible: '',
    points_achieved: '0',
    status: 'not_started' as Requirement['status'],
    documentation_url: '',
    deadline: '',
    notes: ''
  })

  const certificationTypes = [
    'LEED',
    'WELL',
    'BREEAM',
    'Living Building Challenge',
    'ENERGY STAR',
    'Green Globes'
  ]

  const leedLevels = {
    'LEED': ['Certified (40-49)', 'Silver (50-59)', 'Gold (60-79)', 'Platinum (80+)'],
    'WELL': ['Silver', 'Gold', 'Platinum'],
    'BREEAM': ['Pass', 'Good', 'Very Good', 'Excellent', 'Outstanding'],
    'Living Building Challenge': ['Petal Certified', 'Living Certified'],
    'ENERGY STAR': ['Certified'],
    'Green Globes': ['1 Globe', '2 Globes', '3 Globes', '4 Globes']
  }

  const leedCategories = [
    'Location & Transportation (LT)',
    'Sustainable Sites (SS)',
    'Water Efficiency (WE)',
    'Energy & Atmosphere (EA)',
    'Materials & Resources (MR)',
    'Indoor Environmental Quality (EQ)',
    'Innovation (IN)',
    'Regional Priority (RP)'
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load certifications
      const { data: certsData, error: certsError } = await supabase
        .from('certification_requirements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (certsError) throw certsError

      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name')

      if (projectsError) throw projectsError

      // Merge project names
      const certsWithProjects = (certsData || []).map((cert: any) => {
        const project = projectsData?.find((p: Project) => p.id === cert.project_id)
        return {
          ...cert,
          cert_type: cert.certification_type,
          project_name: project?.name || 'No Project'
        }
      })

      setCertifications(certsWithProjects)
      setProjects(projectsData || [])
    } catch (error) {
      console.error('Error loading certifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCertSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const current = parseFloat(certFormData.current_points) || 0
      const target = parseFloat(certFormData.target_points) || 1
      const percentage = Math.min((current / target) * 100, 100)

      const certData = {
        user_id: user.id,
        project_id: certFormData.project_id || null,
        certification_type: certFormData.cert_type,
        target_level: certFormData.target_level,
        current_points: current,
        target_points: target,
        percentage_complete: percentage,
        submission_deadline: certFormData.submission_deadline || null,
        status: certFormData.status,
        consultant_name: certFormData.consultant_name || null,
        consultant_email: certFormData.consultant_email || null,
        notes: certFormData.notes || null
      }

      const { error } = await supabase
        .from('certification_requirements')
        .insert([certData])

      if (error) throw error

      setCertFormData({
        project_id: '',
        cert_type: 'LEED',
        target_level: 'Gold',
        current_points: '0',
        target_points: '60',
        submission_deadline: '',
        status: 'planning',
        consultant_name: '',
        consultant_email: '',
        notes: ''
      })
      setShowAddCertModal(false)
      loadData()
    } catch (error) {
      console.error('Error adding certification:', error)
      alert('Failed to add certification')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this certification?')) return

    try {
      const { error } = await supabase
        .from('certification_requirements')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Error deleting certification:', error)
      alert('Failed to delete certification')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'submitted': return 'bg-purple-100 text-purple-800'
      case 'certified': return 'bg-green-100 text-green-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planning': return '📋'
      case 'in_progress': return '🚀'
      case 'submitted': return '📤'
      case 'certified': return '🏆'
      case 'on_hold': return '⏸️'
      default: return '📌'
    }
  }

  const getCertIcon = (certType: string) => {
    switch (certType) {
      case 'LEED': return '🌿'
      case 'WELL': return '💚'
      case 'BREEAM': return '🌍'
      case 'Living Building Challenge': return '🌱'
      case 'ENERGY STAR': return '⭐'
      case 'Green Globes': return '🌐'
      default: return '🏅'
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500'
    if (percentage >= 75) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(num)
  }

  if (loading) {
    return (
      <SustainabilityAccessWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading certifications...</p>
          </div>
        </div>
      </SustainabilityAccessWrapper>
    )
  }

  return (
    <SustainabilityAccessWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/sustainability" className="text-white/80 hover:text-white text-sm mb-2 inline-block">
                  ← Back to Sustainability Hub
                </Link>
                <h1 className="text-4xl font-bold mb-2">🏆 Certification Assistant</h1>
                <p className="text-purple-100">Track LEED, WELL, BREEAM, and other green building certifications</p>
              </div>
              <button
                onClick={() => setShowAddCertModal(true)}
                className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold shadow-lg"
              >
                + New Certification
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Active Certifications</div>
                <div className="text-2xl">🏅</div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{certifications.length}</div>
              <div className="text-xs text-gray-500 mt-1">being pursued</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Certified</div>
                <div className="text-2xl">🏆</div>
              </div>
              <div className="text-3xl font-bold text-green-600">
                {certifications.filter(c => c.status === 'certified').length}
              </div>
              <div className="text-xs text-gray-500 mt-1">completed</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">In Progress</div>
                <div className="text-2xl">🚀</div>
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {certifications.filter(c => c.status === 'in_progress' || c.status === 'submitted').length}
              </div>
              <div className="text-xs text-gray-500 mt-1">active pursuits</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Avg Progress</div>
                <div className="text-2xl">📊</div>
              </div>
              <div className="text-3xl font-bold text-orange-600">
                {certifications.length > 0
                  ? formatNumber(certifications.reduce((sum, c) => sum + c.percentage_complete, 0) / certifications.length)
                  : 0}%
              </div>
              <div className="text-xs text-gray-500 mt-1">across all certs</div>
            </div>
          </div>

          {/* Educational Banner */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Certification Quick Reference
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong className="text-purple-900">LEED (Leadership in Energy & Environmental Design):</strong>
                <p className="text-gray-700">Most popular in North America. 40-110 points across 8 categories.</p>
              </div>
              <div>
                <strong className="text-purple-900">WELL Building Standard:</strong>
                <p className="text-gray-700">Focuses on human health & wellness. 110 total points available.</p>
              </div>
              <div>
                <strong className="text-purple-900">BREEAM:</strong>
                <p className="text-gray-700">Popular in UK/Europe. Percentage-based scoring system.</p>
              </div>
            </div>
          </div>

          {/* Certifications List */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Certifications ({certifications.length})</h2>
            </div>

            {certifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No certifications yet</h3>
                <p className="text-gray-600 mb-6">Start tracking LEED, WELL, or other green building certifications</p>
                <button
                  onClick={() => setShowAddCertModal(true)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  Add First Certification
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {certifications.map((cert) => (
                  <div key={cert.id} className="px-6 py-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-3xl">{getCertIcon(cert.cert_type)}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-xl">
                              {cert.cert_type} - {cert.target_level}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              {cert.project_name && <span>{cert.project_name}</span>}
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(cert.status)}`}>
                                {getStatusIcon(cert.status)} {cert.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Progress: {cert.current_points} / {cert.target_points} points
                            </span>
                            <span className="text-sm font-bold text-purple-600">
                              {formatNumber(cert.percentage_complete)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(cert.percentage_complete)}`}
                              style={{ width: `${Math.min(cert.percentage_complete, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                          {cert.submission_deadline && (
                            <div>
                              <div className="text-xs text-gray-600">Deadline</div>
                              <div className="font-semibold text-gray-900">
                                {new Date(cert.submission_deadline).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {Math.ceil((new Date(cert.submission_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left
                              </div>
                            </div>
                          )}

                          {cert.consultant_name && (
                            <div>
                              <div className="text-xs text-gray-600">Consultant</div>
                              <div className="font-semibold text-gray-900">{cert.consultant_name}</div>
                              {cert.consultant_email && (
                                <a href={`mailto:${cert.consultant_email}`} className="text-xs text-blue-600 hover:underline">
                                  {cert.consultant_email}
                                </a>
                              )}
                            </div>
                          )}

                          <div>
                            <div className="text-xs text-gray-600">Points Needed</div>
                            <div className="font-semibold text-orange-600">
                              {cert.target_points - cert.current_points} more
                            </div>
                            <div className="text-xs text-gray-500">to reach {cert.target_level}</div>
                          </div>
                        </div>

                        {cert.notes && (
                          <div className="text-sm text-gray-600 bg-gray-50 rounded p-3 mb-3">
                            <strong>Notes:</strong> {cert.notes}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(cert.id)}
                        className="ml-4 text-red-600 hover:text-red-800 transition-colors"
                        title="Delete certification"
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

          {/* LEED Quick Reference */}
          {certifications.some(c => c.cert_type === 'LEED') && (
            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🌿 LEED v4 Point Distribution</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="text-sm font-semibold text-gray-900">Location & Transportation</div>
                  <div className="text-2xl font-bold text-blue-600">16 pts</div>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="text-sm font-semibold text-gray-900">Sustainable Sites</div>
                  <div className="text-2xl font-bold text-green-600">10 pts</div>
                </div>
                <div className="border-l-4 border-cyan-500 pl-4">
                  <div className="text-sm font-semibold text-gray-900">Water Efficiency</div>
                  <div className="text-2xl font-bold text-cyan-600">11 pts</div>
                </div>
                <div className="border-l-4 border-orange-500 pl-4">
                  <div className="text-sm font-semibold text-gray-900">Energy & Atmosphere</div>
                  <div className="text-2xl font-bold text-orange-600">33 pts</div>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <div className="text-sm font-semibold text-gray-900">Materials & Resources</div>
                  <div className="text-2xl font-bold text-purple-600">13 pts</div>
                </div>
                <div className="border-l-4 border-pink-500 pl-4">
                  <div className="text-sm font-semibold text-gray-900">Indoor Environmental Quality</div>
                  <div className="text-2xl font-bold text-pink-600">16 pts</div>
                </div>
                <div className="border-l-4 border-yellow-500 pl-4">
                  <div className="text-sm font-semibold text-gray-900">Innovation</div>
                  <div className="text-2xl font-bold text-yellow-600">6 pts</div>
                </div>
                <div className="border-l-4 border-red-500 pl-4">
                  <div className="text-sm font-semibold text-gray-900">Regional Priority</div>
                  <div className="text-2xl font-bold text-red-600">4 pts</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
                <strong>Total:</strong> 110 possible points | <strong>Levels:</strong> Certified (40-49), Silver (50-59), Gold (60-79), Platinum (80+)
              </div>
            </div>
          )}
        </div>

        {/* Add Certification Modal */}
        {showAddCertModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Add Certification</h2>
                <button
                  onClick={() => setShowAddCertModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCertSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certification Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={certFormData.cert_type}
                      onChange={(e) => setCertFormData({ ...certFormData, cert_type: e.target.value as Certification['cert_type'] })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    >
                      {certificationTypes.map((type) => (
                        <option key={type} value={type}>
                          {getCertIcon(type)} {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={certFormData.target_level}
                      onChange={(e) => setCertFormData({ ...certFormData, target_level: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    >
                      {leedLevels[certFormData.cert_type]?.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project (Optional)
                  </label>
                  <select
                    value={certFormData.project_id}
                    onChange={(e) => setCertFormData({ ...certFormData, project_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">-- No Project --</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">📊 Points Tracking</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Points <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={certFormData.current_points}
                        onChange={(e) => setCertFormData({ ...certFormData, current_points: e.target.value })}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Points <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={certFormData.target_points}
                        onChange={(e) => setCertFormData({ ...certFormData, target_points: e.target.value })}
                        placeholder="60"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {certFormData.current_points && certFormData.target_points && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <div className="text-sm font-semibold text-gray-900">
                        Progress: <span className="text-purple-600">
                          {formatNumber((parseFloat(certFormData.current_points) / parseFloat(certFormData.target_points)) * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={certFormData.status}
                      onChange={(e) => setCertFormData({ ...certFormData, status: e.target.value as Certification['status'] })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    >
                      <option value="planning">📋 Planning</option>
                      <option value="in_progress">🚀 In Progress</option>
                      <option value="submitted">📤 Submitted</option>
                      <option value="certified">🏆 Certified</option>
                      <option value="on_hold">⏸️ On Hold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Submission Deadline
                    </label>
                    <input
                      type="date"
                      value={certFormData.submission_deadline}
                      onChange={(e) => setCertFormData({ ...certFormData, submission_deadline: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consultant Name
                    </label>
                    <input
                      type="text"
                      value={certFormData.consultant_name}
                      onChange={(e) => setCertFormData({ ...certFormData, consultant_name: e.target.value })}
                      placeholder="Jane Smith"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consultant Email
                    </label>
                    <input
                      type="email"
                      value={certFormData.consultant_email}
                      onChange={(e) => setCertFormData({ ...certFormData, consultant_email: e.target.value })}
                      placeholder="jane@greenconsulting.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={certFormData.notes}
                    onChange={(e) => setCertFormData({ ...certFormData, notes: e.target.value })}
                    placeholder="Additional details about this certification pursuit..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                  >
                    Add Certification
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCertModal(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SustainabilityAccessWrapper>
  )
}
