'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Activity {
  id: string
  activity_type: string
  subject: string
  description: string | null
  scheduled_date: string
  duration_minutes: number | null
  status: string
  priority: string
  outcome: string | null
  contact_id: string | null
  lead_id: string | null
  contact: {
    full_name: string
    company: string | null
  } | null
  lead: {
    title: string
  } | null
  created_at: string
}

export default function ActivitiesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [activities, setActivities] = useState<Activity[]>([])
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline')

  useEffect(() => {
    loadActivities()
  }, [])

  useEffect(() => {
    filterActivities()
  }, [activities, selectedType, selectedStatus])

  const loadActivities = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('crm_activities')
        .select(`
          *,
          contact:crm_contacts(full_name, company),
          lead:crm_leads(title)
        `)
        .eq('user_id', user.id)
        .order('scheduled_date', { ascending: false })

      if (error) throw error

      setActivities(data || [])
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterActivities = () => {
    let filtered = activities

    if (selectedType !== 'all') {
      filtered = filtered.filter(a => a.activity_type === selectedType)
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(a => a.status === selectedStatus)
    }

    setFilteredActivities(filtered)
  }

  const completeActivity = async (id: string, outcome: string) => {
    try {
      const { error } = await supabase
        .from('crm_activities')
        .update({
          status: 'completed',
          outcome: outcome,
          completed_date: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      loadActivities()
    } catch (error) {
      console.error('Error completing activity:', error)
      alert('Failed to complete activity')
    }
  }

  const deleteActivity = async (id: string) => {
    if (!confirm('Delete this activity?')) return

    try {
      const { error } = await supabase
        .from('crm_activities')
        .delete()
        .eq('id', id)

      if (error) throw error

      loadActivities()
    } catch (error) {
      console.error('Error deleting activity:', error)
      alert('Failed to delete activity')
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return '📞'
      case 'email': return '📧'
      case 'meeting': return '🤝'
      case 'site_visit': return '🏗️'
      case 'quote_sent': return '📋'
      case 'follow_up': return '🔔'
      case 'proposal': return '📄'
      case 'contract': return '📝'
      default: return '📌'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'overdue': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-300'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'low': return 'bg-green-100 text-green-700 border-green-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isOverdue = (activity: Activity) => {
    return activity.status === 'scheduled' && new Date(activity.scheduled_date) < new Date()
  }

  const groupByDate = () => {
    const grouped: Record<string, Activity[]> = {}

    filteredActivities.forEach(activity => {
      const date = formatDate(activity.scheduled_date)
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(activity)
    })

    return Object.entries(grouped).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
  }

  const stats = {
    total: activities.length,
    scheduled: activities.filter(a => a.status === 'scheduled').length,
    completed: activities.filter(a => a.status === 'completed').length,
    overdue: activities.filter(a => isOverdue(a)).length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Link
                  href="/crm"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Activities</h1>
                  <p className="text-gray-600 mt-1">Track calls, meetings, and follow-ups</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Calendar
                </button>
              </div>

              <Link
                href="/crm/activities/new"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Activity
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Activities</div>
              <div className="text-2xl">📅</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500 mt-1">All time</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Scheduled</div>
              <div className="text-2xl">📌</div>
            </div>
            <div className="text-3xl font-bold text-blue-600">{stats.scheduled}</div>
            <div className="text-sm text-gray-500 mt-1">Upcoming</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Completed</div>
              <div className="text-2xl">✅</div>
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500 mt-1">Done</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Overdue</div>
              <div className="text-2xl">⚠️</div>
            </div>
            <div className="text-3xl font-bold text-orange-600">{stats.overdue}</div>
            <div className="text-sm text-gray-500 mt-1">Needs attention</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types ({activities.length})</option>
                <option value="call">Calls ({activities.filter(a => a.activity_type === 'call').length})</option>
                <option value="email">Emails ({activities.filter(a => a.activity_type === 'email').length})</option>
                <option value="meeting">Meetings ({activities.filter(a => a.activity_type === 'meeting').length})</option>
                <option value="site_visit">Site Visits ({activities.filter(a => a.activity_type === 'site_visit').length})</option>
                <option value="follow_up">Follow Ups ({activities.filter(a => a.activity_type === 'follow_up').length})</option>
                <option value="quote_sent">Quotes Sent ({activities.filter(a => a.activity_type === 'quote_sent').length})</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Activities List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No activities found</h3>
            <p className="text-gray-600 mb-6">
              {selectedType !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Start tracking your customer interactions'}
            </p>
            {selectedType === 'all' && selectedStatus === 'all' && (
              <Link
                href="/crm/activities/new"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Activity
              </Link>
            )}
          </div>
        ) : viewMode === 'timeline' ? (
          <div className="space-y-8">
            {groupByDate().map(([date, dateActivities]) => (
              <div key={date}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 sticky top-[120px] bg-gray-50 py-2">
                  {date}
                </h3>

                <div className="space-y-4">
                  {dateActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`bg-white rounded-lg shadow p-6 ${
                        isOverdue(activity) ? 'border-l-4 border-orange-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Icon */}
                          <div className="text-3xl">{getActivityIcon(activity.activity_type)}</div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {activity.subject}
                              </h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                                {activity.status}
                              </span>
                              {activity.priority !== 'low' && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(activity.priority)}`}>
                                  {activity.priority} priority
                                </span>
                              )}
                            </div>

                            {activity.description && (
                              <p className="text-sm text-gray-600 mb-3">{activity.description}</p>
                            )}

                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatDateTime(activity.scheduled_date)}
                              </div>

                              {activity.duration_minutes && (
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  {activity.duration_minutes} min
                                </div>
                              )}

                              {activity.contact && (
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  {activity.contact.full_name}
                                  {activity.contact.company && ` (${activity.contact.company})`}
                                </div>
                              )}

                              {activity.lead && (
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  {activity.lead.title}
                                </div>
                              )}
                            </div>

                            {activity.outcome && (
                              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="text-xs font-medium text-green-900 mb-1">Outcome:</div>
                                <div className="text-sm text-green-800">{activity.outcome}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          {activity.status === 'scheduled' && (
                            <button
                              onClick={() => {
                                const outcome = prompt('Enter outcome:')
                                if (outcome) completeActivity(activity.id, outcome)
                              }}
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                              title="Complete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}

                          <Link
                            href={`/crm/activities/${activity.id}/edit`}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>

                          <button
                            onClick={() => deleteActivity(activity.id)}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Calendar View Placeholder
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📆</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Calendar View Coming Soon</h3>
            <p className="text-gray-600">Full calendar integration with drag-and-drop scheduling</p>
          </div>
        )}
      </div>
    </div>
  )
}
