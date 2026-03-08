'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useThemeColors } from '@/lib/hooks/useThemeColors'

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
  const { colors } = useThemeColors()
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
      color: '#3B82F6',
      description: 'End-of-day project updates',
      time: '3 min'
    },
    {
      type: 'weekly_timesheet',
      name: 'Weekly Timesheet',
      icon: '⏱️',
      color: '#22C55E',
      description: 'Crew hours & payroll',
      time: '5 min'
    },
    {
      type: 'budget',
      name: 'Budget Report',
      icon: '💰',
      color: '#A855F7',
      description: 'Cost analysis & forecasting',
      time: '2 min'
    },
    {
      type: 'safety',
      name: 'Safety Report',
      icon: '⚠️',
      color: '#F97316',
      description: 'Safety incidents & inspections',
      time: '4 min'
    },
    {
      type: 'progress',
      name: 'Progress Report',
      icon: '📊',
      color: '#14B8A6',
      description: 'Project milestones & timeline',
      time: '6 min'
    },
    {
      type: 'custom',
      name: 'Custom Report',
      icon: '✨',
      color: '#6B7280',
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0f17]">
      {/* Header */}
      <div className="sticky top-0 z-10" style={{ backgroundColor: colors.bg, borderBottom: colors.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.text }}>ReportCenter</h1>
              <p className="text-sm" style={{ color: colors.textMuted }}>Generate professional reports from your data</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{ color: colors.textMuted }}
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
          <div className="rounded-lg shadow p-6" style={{ backgroundColor: colors.bg }}>
            <div className="text-3xl font-bold" style={{ color: colors.text }}>{stats.total}</div>
            <div className="text-sm" style={{ color: colors.textMuted }}>Total Reports</div>
          </div>
          <div className="rounded-xl p-5" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium" style={{ color: colors.textMuted }}>This Week</div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #38BDF8 0%, #7DD3FC 100%)' }}>
                <span className="text-white text-sm">📊</span>
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: '#3B82F6' }}>{stats.this_week}</div>
          </div>
          <div className="rounded-xl p-5" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium" style={{ color: colors.textMuted }}>Sent to Clients</div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6BCB77 0%, #85D68D 100%)' }}>
                <span className="text-white text-sm">✓</span>
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: '#22C55E' }}>{stats.sent_to_clients}</div>
          </div>
          <div className="rounded-xl p-5" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium" style={{ color: colors.textMuted }}>Pending Review</div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' }}>
                <span className="text-white text-sm">⏳</span>
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{stats.pending_review}</div>
          </div>
        </div>

        {/* Quick Generate Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>Quick Generate</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTypes.map((reportType) => (
              <Link
                key={reportType.type}
                href={`/reports/${reportType.type}/new`}
                className="rounded-xl hover:shadow-md transition-all p-6 group hover:-translate-y-0.5"
                style={{ backgroundColor: colors.bg, borderTop: colors.border, borderRight: colors.border, borderBottom: colors.border, borderLeft: `4px solid ${reportType.color}` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl">{reportType.icon}</div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: colors.textMuted }}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {reportType.time}
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2 transition-colors" style={{ color: colors.text }}>
                  {reportType.name}
                </h3>
                <p className="text-sm" style={{ color: colors.textMuted }}>{reportType.description}</p>
                <div className="mt-4 flex items-center text-sm font-medium" style={{ color: reportType.color }}>
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
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>Recent Reports</h2>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : ''
                }`}
                style={filter !== 'all' ? { backgroundColor: colors.bg, color: colors.textMuted } : {}}
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
                      : ''
                  }`}
                  style={filter !== rt.type ? { backgroundColor: colors.bg, color: colors.textMuted } : {}}
                >
                  {rt.icon} {rt.name}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-6" style={{ backgroundColor: colors.bg }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    </div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ backgroundColor: colors.bg, border: colors.border }}>
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: colors.text }}>No reports yet</h3>
              <p className="mb-6" style={{ color: colors.textMuted }}>Generate your first report using the quick generate buttons above</p>
            </div>
          ) : (
            <div className="rounded-xl divide-y" style={{ backgroundColor: colors.bg, border: colors.border, borderColor: 'inherit' }}>
              {reports.map((report) => {
                const typeInfo = getReportTypeInfo(report.report_type)
                return (
                  <Link
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className="p-4 sm:p-6 transition-colors block"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="text-3xl">{typeInfo.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold truncate" style={{ color: colors.text }}>
                              {report.title}
                            </h3>
                            <span className="text-sm font-mono" style={{ color: colors.textMuted }}>
                              {report.report_number}
                            </span>
                          </div>

                          {report.project && (
                            <div className="text-sm mb-2" style={{ color: colors.textMuted }}>
                              Project: {report.project.name}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: colors.textMuted }}>
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
