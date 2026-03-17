'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'

// ============================================
// TYPES
// ============================================

type IncidentType = 'injury' | 'near_miss' | 'property_damage' | 'environmental' | 'vehicle'
type Severity = 'minor' | 'moderate' | 'serious' | 'critical' | 'fatal'

interface Project {
  id: string
  name: string
  address: string
}

interface FormData {
  projectId: string
  incidentDate: string
  incidentTime: string
  locationDescription: string
  incidentType: IncidentType
  severity: Severity
  description: string
  injuredPersonName: string
  injuredPersonRole: string
  injuredPersonCompany: string
  immediateCause: string
  rootCause: string
  contributingFactors: string[]
  injuryType: string
  bodyPartAffected: string
  treatmentProvided: string
  medicalFacility: string
  daysAwayFromWork: number
  daysOfRestrictedWork: number
  isOshaRecordable: boolean
  oshaClassification: string
  immediateActionsTaken: string
  preventiveMeasures: string[]
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function NewIncidentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [formData, setFormData] = useState<Partial<FormData>>({
    projectId: '',
    incidentDate: new Date().toISOString().split('T')[0],
    incidentTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
    locationDescription: '',
    incidentType: 'near_miss',
    severity: 'minor',
    description: '',
    injuredPersonName: '',
    injuredPersonRole: '',
    injuredPersonCompany: '',
    immediateCause: '',
    rootCause: '',
    contributingFactors: [],
    injuryType: '',
    bodyPartAffected: '',
    treatmentProvided: '',
    medicalFacility: '',
    daysAwayFromWork: 0,
    daysOfRestrictedWork: 0,
    isOshaRecordable: false,
    oshaClassification: '',
    immediateActionsTaken: '',
    preventiveMeasures: []
  })

  // Load projects
  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, address')
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.locationDescription || !formData.description) {
        toast.error('Please fill in all required fields')
        setLoading(false)
        return
      }

      const response = await fetch('/api/safety/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create incident')
      }

      toast.success('Incident reported successfully')
      router.push('/compliance/incidents')
    } catch (error: any) {
      console.error('Error creating incident:', error)
      toast.error(error.message || 'Failed to report incident')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleArrayItem = (field: 'contributingFactors' | 'preventiveMeasures', item: string) => {
    const current = formData[field] || []
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item]
    updateField(field, updated)
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/compliance/incidents"
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Report Safety Incident</h1>
              <p className="mt-1 text-sm text-gray-600">
                Document workplace safety incidents for investigation and compliance
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project (Optional)
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => updateField('projectId', e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select project...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incident Type <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.incidentType}
                  onChange={(e) => updateField('incidentType', e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="injury">Injury</option>
                  <option value="near_miss">Near Miss</option>
                  <option value="property_damage">Property Damage</option>
                  <option value="environmental">Environmental</option>
                  <option value="vehicle">Vehicle</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={formData.incidentDate}
                  onChange={(e) => updateField('incidentDate', e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time <span className="text-red-600">*</span>
                </label>
                <input
                  type="time"
                  value={formData.incidentTime}
                  onChange={(e) => updateField('incidentTime', e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => updateField('severity', e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="serious">Serious</option>
                  <option value="critical">Critical</option>
                  <option value="fatal">Fatal</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Description <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.locationDescription}
                  onChange={(e) => updateField('locationDescription', e.target.value)}
                  placeholder="e.g., Second floor, near elevator"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incident Description <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Provide a detailed description of what happened..."
                  rows={4}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Injured Person Information (if applicable) */}
          {formData.incidentType === 'injury' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Injured Person Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.injuredPersonName}
                    onChange={(e) => updateField('injuredPersonName', e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role/Job Title
                  </label>
                  <input
                    type="text"
                    value={formData.injuredPersonRole}
                    onChange={(e) => updateField('injuredPersonRole', e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    value={formData.injuredPersonCompany}
                    onChange={(e) => updateField('injuredPersonCompany', e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Injury Type
                  </label>
                  <input
                    type="text"
                    value={formData.injuryType}
                    onChange={(e) => updateField('injuryType', e.target.value)}
                    placeholder="e.g., Laceration, Sprain, Fracture"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Body Part Affected
                  </label>
                  <input
                    type="text"
                    value={formData.bodyPartAffected}
                    onChange={(e) => updateField('bodyPartAffected', e.target.value)}
                    placeholder="e.g., Right hand, Lower back"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Treatment Provided
                  </label>
                  <input
                    type="text"
                    value={formData.treatmentProvided}
                    onChange={(e) => updateField('treatmentProvided', e.target.value)}
                    placeholder="e.g., First aid, Emergency room"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Facility
                  </label>
                  <input
                    type="text"
                    value={formData.medicalFacility}
                    onChange={(e) => updateField('medicalFacility', e.target.value)}
                    placeholder="Hospital or clinic name"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Days Away from Work
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.daysAwayFromWork}
                    onChange={(e) => updateField('daysAwayFromWork', parseInt(e.target.value) || 0)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Days of Restricted Work
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.daysOfRestrictedWork}
                    onChange={(e) => updateField('daysOfRestrictedWork', parseInt(e.target.value) || 0)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Root Cause Analysis */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Root Cause Analysis</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Immediate Cause
                </label>
                <textarea
                  value={formData.immediateCause}
                  onChange={(e) => updateField('immediateCause', e.target.value)}
                  placeholder="What directly caused the incident?"
                  rows={3}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Root Cause
                </label>
                <textarea
                  value={formData.rootCause}
                  onChange={(e) => updateField('rootCause', e.target.value)}
                  placeholder="What underlying conditions allowed this to happen?"
                  rows={3}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Immediate Actions Taken
                </label>
                <textarea
                  value={formData.immediateActionsTaken}
                  onChange={(e) => updateField('immediateActionsTaken', e.target.value)}
                  placeholder="What actions were taken immediately after the incident?"
                  rows={3}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* OSHA Compliance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">OSHA Compliance</h2>
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={formData.isOshaRecordable}
                    onChange={(e) => updateField('isOshaRecordable', e.target.checked)}
                    className="w-4 h-4 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700">
                    OSHA Recordable
                  </label>
                  <p className="text-sm text-gray-500">
                    This incident meets OSHA recording criteria (injury/illness requiring medical treatment beyond first aid, days away from work, or job restriction)
                  </p>
                </div>
              </div>

              {formData.isOshaRecordable && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OSHA Classification
                  </label>
                  <select
                    value={formData.oshaClassification}
                    onChange={(e) => updateField('oshaClassification', e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select classification...</option>
                    <option value="injury">Injury</option>
                    <option value="skin_disorder">Skin Disorder</option>
                    <option value="respiratory_condition">Respiratory Condition</option>
                    <option value="poisoning">Poisoning</option>
                    <option value="hearing_loss">Hearing Loss</option>
                    <option value="other_illness">Other Illness</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/compliance/incidents"
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Reporting...
                </span>
              ) : (
                'Report Incident'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
