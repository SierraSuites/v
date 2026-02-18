'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Report {
  id: string
  report_number: string
  report_type: string
  title: string
  date_range_start: string
  date_range_end: string
  status: string
  sent_to_client: boolean
  client_viewed: boolean
  created_at: string
  project?: {
    name: string
  }
}

interface ReportStats {
  total: number
  this_week: number
  sent_to_clients: number
  pending_review: number
}

export default function ReportsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState<ReportStats>({
    total: 0,
    this_week: 0,
    sent_to_clients: 0,
    pending_review: 0
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadReports()
  }, [filter])

  const loadReports = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('reports')
        .select(`
          *,
          project:projects(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (filter !== 'all') {
        query = query.eq('report_type', filter)
      }

      const { data, error } = await query

      if (error) throw error

      setReports(data || [])

      // Calculate stats
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const allReports = data || []
      setStats({
        total: allReports.length,
        this_week: allReports.filter(r => new Date(r.created_at) > weekAgo).length,
        sent_to_clients: allReports.filter(r => r.sent_to_client).length,
        pending_review: allReports.filter(r => r.status === 'draft').length
      })

    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const reportTypes = [
    {
      type: 'daily',
      name: 'Daily Progress',
      icon: '📋',
      color: 'bg-blue-500',
      description: 'End-of-day project updates',
      time: '3 min'
    },
    {
      type: 'weekly_timesheet',
      name: 'Weekly Timesheet',
      icon: '⏱️',
      color: 'bg-green-500',
      description: 'Crew hours & payroll',
      time: '5 min'
    },
    {
      type: 'budget',
      name: 'Budget Report',
      icon: '💰',
      color: 'bg-purple-500',
      description: 'Cost analysis & forecasting',
      time: '2 min'
    },
    {
      type: 'safety',
      name: 'Safety Report',
      icon: '⚠️',
      color: 'bg-orange-500',
      description: 'Safety incidents & inspections',
      time: '4 min'
    },
    {
      type: 'progress',
      name: 'Progress Report',
      icon: '📊',
      color: 'bg-teal-500',
      description: 'Project milestones & timeline',
      time: '6 min'
    },
    {
      type: 'custom',
      name: 'Custom Report',
      icon: '✨',
      color: 'bg-gray-500',
      description: 'Build your own template',
      time: '10 min'
    }
  ]

  const getReportTypeInfo = (type: string) => {
    return reportTypes.find(rt => rt.type === type) || reportTypes[reportTypes.length - 1]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ReportCenter</h1>
              <p className="text-sm text-gray-600">Generate professional reports from your data</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Reports</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{stats.this_week}</div>
            <div className="text-sm text-gray-600">This Week</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">{stats.sent_to_clients}</div>
            <div className="text-sm text-gray-600">Sent to Clients</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-orange-600">{stats.pending_review}</div>
            <div className="text-sm text-gray-600">Pending Review</div>
          </div>
        </div>

        {/* Quick Generate Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Generate</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTypes.map((reportType) => (
              <Link
                key={reportType.type}
                href={`/reports/${reportType.type}/new`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-all p-6 border-2 border-transparent hover:border-blue-300 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl">{reportType.icon}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {reportType.time}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {reportType.name}
                </h3>
                <p className="text-sm text-gray-600">{reportType.description}</p>
                <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                  Generate Now
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Reports */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Reports</h2>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                All
              </button>
              {reportTypes.map((rt) => (
                <button
                  key={rt.type}
                  onClick={() => setFilter(rt.type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    filter === rt.type
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {rt.icon} {rt.name}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No reports yet</h3>
              <p className="text-gray-600 mb-6">Generate your first report using the quick generate buttons above</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow divide-y">
              {reports.map((report) => {
                const typeInfo = getReportTypeInfo(report.report_type)
                return (
                  <Link
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className="p-4 sm:p-6 hover:bg-gray-50 transition-colors block"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="text-3xl">{typeInfo.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {report.title}
                            </h3>
                            <span className="text-sm text-gray-500 font-mono">
                              {report.report_number}
                            </span>
                          </div>

                          {report.project && (
                            <div className="text-sm text-gray-600 mb-2">
                              Project: {report.project.name}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                            <span>{formatDate(report.date_range_start)}</span>
                            {report.date_range_start !== report.date_range_end && (
                              <>
                                <span>→</span>
                                <span>{formatDate(report.date_range_end)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {report.sent_to_client && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Sent
                          </span>
                        )}
                        {report.client_viewed && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            👁️ Viewed
                          </span>
                        )}
                        {report.status === 'draft' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Draft
                          </span>
                        )}
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
