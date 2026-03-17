'use client'

/**
 * Budget Detail Page
 * Comprehensive variance analysis and budget tracking dashboard
 */

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeftIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'

interface BudgetItem {
  id: string
  category: string
  subcategory?: string
  description?: string
  budgeted_amount: number
  actual_amount: number
  notes?: string
}

interface Budget {
  id: string
  name: string
  fiscal_year?: string
  start_date?: string
  end_date?: string
  total_budgeted: number
  total_actual: number
  variance: number
  variance_percent: number
  utilization_rate: number
  burn_rate: number
  forecasted_completion?: string
  at_risk: boolean
  category_breakdown: Record<string, {
    budgeted: number
    actual: number
    variance: number
    variancePercent: number
    items: BudgetItem[]
  }>
  project?: {
    id: string
    name: string
    status: string
  }
  budget_items: BudgetItem[]
  items_count: number
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function BudgetDetailPage() {
  const router = useRouter()
  const params = useParams()
  const budgetId = params.id as string

  const [budget, setBudget] = useState<Budget | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (budgetId) {
      loadBudget()
    }
  }, [budgetId])

  async function loadBudget() {
    try {
      setLoading(true)
      const response = await fetch(`/api/budgets/${budgetId}`)
      if (!response.ok) throw new Error('Failed to fetch budget')
      const data = await response.json()
      setBudget(data.budget)
    } catch (error) {
      console.error('Error loading budget:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this budget? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(`/api/budgets/${budgetId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete budget')
      router.push('/financial/budgets')
    } catch (error) {
      console.error('Error deleting budget:', error)
      alert('Failed to delete budget')
    } finally {
      setDeleting(false)
    }
  }

  function exportToCSV() {
    if (!budget) return

    const headers = ['Category', 'Subcategory', 'Description', 'Budgeted', 'Actual', 'Variance', 'Variance %']
    const rows = budget.budget_items.map((item) => {
      const variance = item.budgeted_amount - item.actual_amount
      const variancePercent = item.budgeted_amount > 0 ? ((variance / item.budgeted_amount) * 100).toFixed(2) : '0'
      return [
        item.category,
        item.subcategory || '',
        item.description || '',
        item.budgeted_amount.toFixed(2),
        item.actual_amount.toFixed(2),
        variance.toFixed(2),
        variancePercent,
      ]
    })

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${budget.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!budget) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Budget not found</h2>
        <p className="mt-2 text-gray-600">The budget you're looking for doesn't exist.</p>
        <Link
          href="/financial/budgets"
          className="mt-4 inline-block text-blue-600 hover:text-blue-700"
        >
          Back to Budgets
        </Link>
      </div>
    )
  }

  // Prepare data for charts
  const categoryData = Object.entries(budget.category_breakdown).map(([category, data]) => ({
    category,
    budgeted: data.budgeted,
    actual: data.actual,
    variance: data.variance,
  }))

  const pieData = Object.entries(budget.category_breakdown).map(([category, data]) => ({
    name: category,
    value: data.actual,
  }))

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/financial/budgets"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back to Budgets
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{budget.name}</h1>
                {budget.at_risk && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    At Risk
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                {budget.fiscal_year && <span>FY {budget.fiscal_year}</span>}
                {budget.project && (
                  <>
                    <span>•</span>
                    <span>{budget.project.name}</span>
                  </>
                )}
                {budget.start_date && (
                  <>
                    <span>•</span>
                    <span>
                      {new Date(budget.start_date).toLocaleDateString()}
                      {budget.end_date && ` - ${new Date(budget.end_date).toLocaleDateString()}`}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Export CSV
              </button>
              <Link
                href={`/financial/budgets/${budgetId}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PencilIcon className="w-5 h-5" />
                Edit
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <TrashIcon className="w-5 h-5" />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <ChartBarIcon className="w-4 h-4" />
              Total Budgeted
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(budget.total_budgeted)}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <ChartBarIcon className="w-4 h-4" />
              Total Actual
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(budget.total_actual)}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              {budget.variance >= 0 ? (
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
              )}
              Variance
            </div>
            <p
              className={`text-2xl font-bold ${
                budget.variance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                signDisplay: 'always',
              }).format(budget.variance)}
            </p>
            <p className={`text-sm ${budget.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {budget.variance_percent.toFixed(2)}%
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              Utilization Rate
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {budget.utilization_rate.toFixed(1)}%
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  budget.utilization_rate > 100
                    ? 'bg-red-600'
                    : budget.utilization_rate > 90
                    ? 'bg-yellow-500'
                    : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(budget.utilization_rate, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <CalendarIcon className="w-4 h-4" />
              Burn Rate
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              }).format(budget.burn_rate)}
            </p>
            <p className="text-sm text-gray-500">per month</p>
          </div>
        </div>

        {/* Forecasted Completion */}
        {budget.forecasted_completion && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Forecasted Budget Depletion</p>
                <p className="text-xs text-blue-700">
                  Based on current burn rate, budget will be depleted by{' '}
                  {new Date(budget.forecasted_completion).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown Bar Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="category"
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) =>
                    new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(value)
                  }
                  contentStyle={{
                    backgroundColor: '#FFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="budgeted" name="Budgeted" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Spending Distribution Pie Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${((entry.value / budget.total_actual) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(value)
                  }
                  contentStyle={{
                    backgroundColor: '#FFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Details */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Category Details</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {Object.entries(budget.category_breakdown).map(([category, data]) => (
              <div key={category} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">{category}</h4>
                    <p className="text-sm text-gray-500">{data.items.length} items</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Variance</p>
                    <p
                      className={`text-lg font-bold ${
                        data.variance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        signDisplay: 'always',
                      }).format(data.variance)}
                    </p>
                    <p
                      className={`text-sm ${
                        data.variancePercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {data.variancePercent.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Budgeted</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(data.budgeted)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Actual</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(data.actual)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Utilization</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {data.budgeted > 0 ? ((data.actual / data.budgeted) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {data.items.map((item) => {
                    const itemVariance = item.budgeted_amount - item.actual_amount
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {item.subcategory || item.category}
                          </p>
                          {item.description && (
                            <p className="text-xs text-gray-500">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Budgeted</p>
                            <p className="text-sm font-medium text-gray-900">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                              }).format(item.budgeted_amount)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Actual</p>
                            <p className="text-sm font-medium text-gray-900">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                              }).format(item.actual_amount)}
                            </p>
                          </div>
                          <div className="text-right min-w-[100px]">
                            <p className="text-xs text-gray-500">Variance</p>
                            <p
                              className={`text-sm font-bold ${
                                itemVariance >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                signDisplay: 'always',
                              }).format(itemVariance)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
  )
}
