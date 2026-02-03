'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Project {
  id: string
  name: string
  location: string
  status: string
}

interface Task {
  id: string
  title: string
  status: string
  assigned_to?: string
}

interface Photo {
  id: string
  url: string
  caption: string
  taken_at: string
}

interface CrewMember {
  id: string
  name: string
  role: string
  hours: number
}

interface WeatherData {
  temp: number
  condition: string
  humidity: number
  wind_speed: number
}

interface DailyReportData {
  project_id: string
  report_date: string
  weather: WeatherData | null
  tasks_completed: Task[]
  photos: Photo[]
  crew: CrewMember[]
  notes: string
  issues: string
  tomorrow_plan: string
  materials_used: string
}

export default function NewDailyReportPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [formData, setFormData] = useState<DailyReportData>({
    project_id: '',
    report_date: new Date().toISOString().split('T')[0],
    weather: null,
    tasks_completed: [],
    photos: [],
    crew: [],
    notes: '',
    issues: '',
    tomorrow_plan: '',
    materials_used: ''
  })

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingField, setRecordingField] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (formData.project_id && currentStep === 2) {
      autoLoadData()
    }
  }, [formData.project_id, currentStep])

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, location, status')
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const autoLoadData = async () => {
    try {
      setLoading(true)

      // Load weather data
      await fetchWeather()

      // Load tasks completed today
      const today = new Date().toISOString().split('T')[0]
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, status, assigned_to')
        .eq('project_id', formData.project_id)
        .eq('status', 'completed')
        .gte('updated_at', today)

      if (!tasksError && tasks) {
        setFormData(prev => ({ ...prev, tasks_completed: tasks }))
      }

      // Load photos from today
      const { data: photos, error: photosError } = await supabase
        .from('fieldsnap_photos')
        .select('id, url, caption, taken_at')
        .eq('project_id', formData.project_id)
        .gte('taken_at', today)
        .order('taken_at', { ascending: false })
        .limit(6)

      if (!photosError && photos) {
        setFormData(prev => ({ ...prev, photos }))
      }

    } catch (error) {
      console.error('Error auto-loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWeather = async () => {
    try {
      const project = projects.find(p => p.id === formData.project_id)
      if (!project?.location) return

      // Mock weather data - replace with actual API call
      const weatherData: WeatherData = {
        temp: 72,
        condition: 'Partly Cloudy',
        humidity: 65,
        wind_speed: 8
      }

      setFormData(prev => ({ ...prev, weather: weatherData }))
    } catch (error) {
      console.error('Error fetching weather:', error)
    }
  }

  const startVoiceRecording = (field: string) => {
    setRecordingField(field)
    setIsRecording(true)

    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Voice recording not supported in this browser')
      setIsRecording(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('')

      setFormData(prev => ({
        ...prev,
        [field]: transcript
      }))
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsRecording(false)
      setRecordingField(null)
    }

    recognition.onend = () => {
      setIsRecording(false)
      setRecordingField(null)
    }

    recognition.start()
  }

  const addCrewMember = () => {
    setFormData(prev => ({
      ...prev,
      crew: [...prev.crew, { id: Date.now().toString(), name: '', role: '', hours: 8 }]
    }))
  }

  const updateCrewMember = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      crew: prev.crew.map(member =>
        member.id === id ? { ...member, [field]: value } : member
      )
    }))
  }

  const removeCrewMember = (id: string) => {
    setFormData(prev => ({
      ...prev,
      crew: prev.crew.filter(member => member.id !== id)
    }))
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      const reportData = {
        report_type: 'daily',
        title: `Daily Report - ${projects.find(p => p.id === formData.project_id)?.name}`,
        project_id: formData.project_id,
        date_range_start: formData.report_date,
        date_range_end: formData.report_date,
        status: 'draft',
        data_snapshot: formData,
        sections: [
          {
            id: 'header',
            type: 'info',
            data: {
              date: formData.report_date,
              weather: formData.weather
            }
          },
          {
            id: 'tasks',
            type: 'table',
            title: 'Tasks Completed Today',
            data: formData.tasks_completed
          },
          {
            id: 'photos',
            type: 'gallery',
            title: 'Progress Photos',
            data: formData.photos
          },
          {
            id: 'crew',
            type: 'table',
            title: 'Crew Attendance',
            data: formData.crew
          },
          {
            id: 'notes',
            type: 'text',
            title: 'Notes',
            data: formData.notes
          },
          {
            id: 'issues',
            type: 'text',
            title: 'Issues & Concerns',
            data: formData.issues
          },
          {
            id: 'tomorrow',
            type: 'text',
            title: 'Tomorrow\'s Plan',
            data: formData.tomorrow_plan
          },
          {
            id: 'materials',
            type: 'text',
            title: 'Materials Used',
            data: formData.materials_used
          }
        ],
        summary: {
          tasks_count: formData.tasks_completed.length,
          photos_count: formData.photos.length,
          crew_count: formData.crew.length,
          total_hours: formData.crew.reduce((sum, member) => sum + member.hours, 0)
        }
      }

      const { data, error } = await supabase
        .from('reports')
        .insert([reportData])
        .select()
        .single()

      if (error) throw error

      router.push(`/reports/${data.id}`)
    } catch (error) {
      console.error('Error creating report:', error)
      alert('Failed to create report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectedProject = projects.find(p => p.id === formData.project_id)

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      {/* Mobile-Optimized Header */}
      <div className="bg-blue-600 text-white sticky top-0 z-20 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center flex-1">
              <h1 className="text-lg font-bold">Daily Progress Report</h1>
              <p className="text-xs text-blue-200">Step {currentStep} of 4</p>
            </div>
            <div className="w-10"></div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 bg-blue-700 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Step 1: Project Selection */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Select Project</h2>

              <div className="space-y-3">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setFormData(prev => ({ ...prev, project_id: project.id }))}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      formData.project_id === project.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{project.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{project.location}</div>
                  </button>
                ))}
              </div>

              {projects.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🏗️</div>
                  <p className="text-gray-600">No active projects found</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Date
              </label>
              <input
                type="date"
                value={formData.report_date}
                onChange={(e) => setFormData(prev => ({ ...prev, report_date: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
              />
            </div>
          </div>
        )}

        {/* Step 2: Auto-Data & Weather */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading data from TaskFlow & FieldSnap...</p>
              </div>
            ) : (
              <>
                {/* Weather Widget */}
                <div className="bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm opacity-90">Weather</div>
                      <div className="text-4xl font-bold mt-1">
                        {formData.weather?.temp}°F
                      </div>
                      <div className="text-sm opacity-90 mt-1">
                        {formData.weather?.condition}
                      </div>
                    </div>
                    <div className="text-right text-sm opacity-90">
                      <div>Humidity: {formData.weather?.humidity}%</div>
                      <div>Wind: {formData.weather?.wind_speed} mph</div>
                    </div>
                  </div>
                </div>

                {/* Tasks Completed */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Tasks Completed Today ({formData.tasks_completed.length})
                  </h3>

                  {formData.tasks_completed.length > 0 ? (
                    <div className="space-y-2">
                      {formData.tasks_completed.map((task) => (
                        <div key={task.id} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                          <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{task.title}</div>
                            {task.assigned_to && (
                              <div className="text-sm text-gray-600">Assigned to: {task.assigned_to}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-3xl mb-2">📋</div>
                      <p>No tasks completed today</p>
                    </div>
                  )}
                </div>

                {/* Photos from FieldSnap */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>📸</span>
                    Progress Photos ({formData.photos.length})
                  </h3>

                  {formData.photos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {formData.photos.map((photo) => (
                        <div key={photo.id} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={photo.url}
                            alt={photo.caption}
                            className="w-full h-full object-cover"
                          />
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2">
                              {photo.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-3xl mb-2">📷</div>
                      <p>No photos taken today</p>
                    </div>
                  )}
                </div>

                {/* Crew Attendance */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Crew Attendance</h3>
                    <button
                      onClick={addCrewMember}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.crew.map((member) => (
                      <div key={member.id} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Name"
                          value={member.name}
                          onChange={(e) => updateCrewMember(member.id, 'name', e.target.value)}
                          className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Role"
                          value={member.role}
                          onChange={(e) => updateCrewMember(member.id, 'role', e.target.value)}
                          className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Hrs"
                          value={member.hours}
                          onChange={(e) => updateCrewMember(member.id, 'hours', parseFloat(e.target.value))}
                          className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          onClick={() => removeCrewMember(member.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {formData.crew.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-3xl mb-2">👷</div>
                      <p>No crew members added</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Voice Notes */}
        {currentStep === 3 && (
          <div className="space-y-4">
            {/* Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Today's Notes</h3>
                <button
                  onClick={() => startVoiceRecording('notes')}
                  disabled={isRecording}
                  className={`p-3 rounded-full transition-all ${
                    isRecording && recordingField === 'notes'
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="What happened today? Tap the mic to use voice input..."
                rows={6}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              />
              {isRecording && recordingField === 'notes' && (
                <div className="mt-2 text-sm text-red-600 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                  Recording... Tap mic again to stop
                </div>
              )}
            </div>

            {/* Issues & Concerns */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Issues & Concerns</h3>
                <button
                  onClick={() => startVoiceRecording('issues')}
                  disabled={isRecording}
                  className={`p-3 rounded-full transition-all ${
                    isRecording && recordingField === 'issues'
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <textarea
                value={formData.issues}
                onChange={(e) => setFormData(prev => ({ ...prev, issues: e.target.value }))}
                placeholder="Any problems, delays, or safety concerns?"
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* Tomorrow's Plan */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Tomorrow's Plan</h3>
                <button
                  onClick={() => startVoiceRecording('tomorrow_plan')}
                  disabled={isRecording}
                  className={`p-3 rounded-full transition-all ${
                    isRecording && recordingField === 'tomorrow_plan'
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <textarea
                value={formData.tomorrow_plan}
                onChange={(e) => setFormData(prev => ({ ...prev, tomorrow_plan: e.target.value }))}
                placeholder="What's the plan for tomorrow?"
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* Materials Used */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Materials Used</h3>
                <button
                  onClick={() => startVoiceRecording('materials_used')}
                  disabled={isRecording}
                  className={`p-3 rounded-full transition-all ${
                    isRecording && recordingField === 'materials_used'
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <textarea
                value={formData.materials_used}
                onChange={(e) => setFormData(prev => ({ ...prev, materials_used: e.target.value }))}
                placeholder="List materials and quantities used today"
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 4: Preview & Submit */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Report</h2>

              {/* Project Info */}
              <div className="mb-6 pb-6 border-b">
                <div className="text-sm text-gray-600">Project</div>
                <div className="text-lg font-semibold text-gray-900">{selectedProject?.name}</div>
                <div className="text-sm text-gray-600 mt-1">{formData.report_date}</div>
              </div>

              {/* Weather */}
              {formData.weather && (
                <div className="mb-6 pb-6 border-b">
                  <div className="text-sm font-medium text-gray-700 mb-2">Weather</div>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-gray-900">{formData.weather.temp}°F</div>
                    <div className="text-gray-600">{formData.weather.condition}</div>
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{formData.tasks_completed.length}</div>
                  <div className="text-sm text-gray-600">Tasks Completed</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{formData.photos.length}</div>
                  <div className="text-sm text-gray-600">Photos Attached</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">{formData.crew.length}</div>
                  <div className="text-sm text-gray-600">Crew Members</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    {formData.crew.reduce((sum, m) => sum + m.hours, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Hours</div>
                </div>
              </div>

              {/* Notes Preview */}
              {formData.notes && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Notes</div>
                  <div className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {formData.notes}
                  </div>
                </div>
              )}

              {formData.issues && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Issues & Concerns</div>
                  <div className="text-gray-900 whitespace-pre-wrap bg-orange-50 p-4 rounded-lg">
                    {formData.issues}
                  </div>
                </div>
              )}

              {formData.tomorrow_plan && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Tomorrow's Plan</div>
                  <div className="text-gray-900 whitespace-pre-wrap bg-green-50 p-4 rounded-lg">
                    {formData.tomorrow_plan}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile-Sticky Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 md:relative md:shadow-none">
        <div className="max-w-4xl mx-auto flex gap-3">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              ← Back
            </button>
          )}

          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 1 && !formData.project_id}
              className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Create Report
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
