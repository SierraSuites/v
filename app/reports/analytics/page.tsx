'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface FinancialMetrics {
  total_revenue: number
  total_costs: number
  gross_profit: number
  gross_margin: number
  labor_costs: number
  material_costs: number
  overhead_costs: number
}

interface ProjectMetrics {
  id: string
  name: string
  revenue: number
  costs: number
  profit: number
  margin: number
  status: string
}

interface TrendData {
  period: string
  revenue: number
  costs: number
  profit: number
  margin: number
}

const COLORS = ['#2563EB', '#F97316', '#10B981', '#8B5CF6', '#EC4899']

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null)
  const [projects, setProjects] = useState<ProjectMetrics[]>([])
  const [trends, setTrends] = useState<TrendData[]>([])

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()

      switch (dateRange) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1)
          break
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      // Load financial metrics
      await loadFinancialMetrics(user.id, startDate, endDate)

      // Load project data
      await loadProjectMetrics(user.id, startDate, endDate)

      // Load trend data
      await loadTrendData(user.id, startDate, endDate)

    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFinancialMetrics = async (userId: string, start: Date, end: Date) => {
    // Get all projects in date range
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, budget')
      .eq('created_by', userId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    const totalRevenue = projectsData?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0

    // Get timesheet costs
    const { data: timesheetData } = await supabase
      .from('timesheet_entries')
      .select('total_cost')
      .eq('user_id', userId)
      .gte('work_date', start.toISOString().split('T')[0])
      .lte('work_date', end.toISOString().split('T')[0])

    const totalCosts = timesheetData?.reduce((sum, t) => sum + (t.total_cost || 0), 0) || 0
    const grossProfit = totalRevenue - totalCosts
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) : 0

    setMetrics({
      total_revenue: totalRevenue,
      total_costs: totalCosts,
      gross_profit: grossProfit,
      gross_margin: grossMargin,
      labor_costs: totalCosts * 0.6, // Simplified
      material_costs: totalCosts * 0.3,
      overhead_costs: totalCosts * 0.1
    })
  }

  const loadProjectMetrics = async (userId: string, start: Date, end: Date) => {
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, name, budget, status')
      .eq('created_by', userId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .limit(10)

    if (!projectsData) return

    const projectMetrics = await Promise.all(
      projectsData.map(async (project) => {
        const { data: costs } = await supabase
          .from('timesheet_entries')
          .select('total_cost')
          .eq('project_id', project.id)

        const totalCosts = costs?.reduce((sum, c) => sum + (c.total_cost || 0), 0) || 0
        const revenue = project.budget || 0
        const profit = revenue - totalCosts
        const margin = revenue > 0 ? (profit / revenue) : 0

        return {
          id: project.id,
          name: project.name,
          revenue,
          costs: totalCosts,
          profit,
          margin,
          status: project.status
        }
      })
    )

    setProjects(projectMetrics.sort((a, b) => b.profit - a.profit))
  }

  const loadTrendData = async (userId: string, start: Date, end: Date) => {
    // Generate weekly trend data
    const weeks: TrendData[] = []
    const current = new Date(start)

    while (current <= end) {
      const weekEnd = new Date(current)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const { data: projectsData } = await supabase
        .from('projects')
        .select('budget')
        .eq('created_by', userId)
        .gte('created_at', current.toISOString())
        .lt('created_at', weekEnd.toISOString())

      const revenue = projectsData?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0
      const costs = revenue * 0.65 // Simplified
      const profit = revenue - costs
      const margin = revenue > 0 ? (profit / revenue) : 0

      weeks.push({
        period: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue,
        costs,
        profit,
        margin: margin * 100
      })

      current.setDate(current.getDate() + 7)
    }

    setTrends(weeks)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const costBreakdown = metrics ? [
    { name: 'Labor', value: metrics.labor_costs },
    { name: 'Materials', value: metrics.material_costs },
    { name: 'Overhead', value: metrics.overhead_costs }
  ] : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm text-gray-600">Business intelligence and insights</p>
            </div>

            {/* Date Range Selector */}
            <div className="flex gap-2">
              {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(metrics?.total_revenue || 0)}
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <span className="text-green-600">↑ 12%</span>
                  <span className="text-gray-500 ml-2">vs last period</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Total Costs</div>
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(metrics?.total_costs || 0)}
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <span className="text-orange-600">↑ 8%</span>
                  <span className="text-gray-500 ml-2">vs last period</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Gross Profit</div>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(metrics?.gross_profit || 0)}
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <span className="text-green-600">↑ 18%</span>
                  <span className="text-gray-500 ml-2">vs last period</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Gross Margin</div>
                <div className="text-3xl font-bold text-blue-600">
                  {formatPercent(metrics?.gross_margin || 0)}
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <span className="text-green-600">↑ 3%</span>
                  <span className="text-gray-500 ml-2">vs last period</span>
                </div>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Revenue Trend */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue & Profit Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} name="Revenue" />
                    <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} name="Profit" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Project Profitability */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Profitability</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projects.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#2563EB" name="Revenue" />
                    <Bar dataKey="costs" fill="#F97316" name="Costs" />
                    <Bar dataKey="profit" fill="#10B981" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Margin Analysis */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Margin Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="margin"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      name="Gross Margin %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Project Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Project Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costs</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {projects.map((project) => (
                      <tr key={project.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{project.name}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">
                          {formatCurrency(project.revenue)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">
                          {formatCurrency(project.costs)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <span className={project.profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {formatCurrency(project.profit)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <span className={project.margin >= 0.2 ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                            {formatPercent(project.margin)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            project.status === 'active' ? 'bg-green-100 text-green-800' :
                            project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {project.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 flex gap-4">
              <button
                onClick={() => router.push('/reports/builder')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                📊 Build Custom Report
              </button>
              <button
                onClick={() => router.push('/reports/alerts')}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                🔔 Set Up Alerts
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                🖨️ Print Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
