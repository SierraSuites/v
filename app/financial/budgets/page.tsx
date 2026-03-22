'use client'

/**
 * Budgets List Page
 * View all budgets with variance analysis
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  PlusIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'

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
  project?: {
    id: string
    name: string
    status: string
  }
  created_at: string
}

export default function BudgetsPage() {
  const router = useRouter()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'at-risk' | 'on-track'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadBudgets()
  }, [])

  async function loadBudgets() {
    try {
      setLoading(true)
      const response = await fetch('/api/budgets')
      if (!response.ok) throw new Error('Failed to fetch budgets')
      const data = await response.json()
      setBudgets(data.budgets || [])
    } catch (error) {
      console.error('Error loading budgets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBudgets = budgets.filter(budget => {
    // Filter by status
    if (filter === 'at-risk' && budget.variance_percent >= -10) return false
    if (filter === 'on-track' && budget.variance_percent < -10) return false

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        budget.name.toLowerCase().includes(term) ||
        budget.project?.name.toLowerCase().includes(term) ||
        budget.fiscal_year?.toLowerCase().includes(term)
      )
    }

    return true
  })

  const summary = {
    total: budgets.length,
    atRisk: budgets.filter(b => b.variance_percent < -10).length,
    onTrack: budgets.filter(b => b.variance_percent >= -10).length,
    totalBudgeted: budgets.reduce((sum, b) => sum + b.total_budgeted, 0),
    totalActual: budgets.reduce((sum, b) => sum + b.total_actual, 0),
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Budgets</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track and manage project budgets and cost variance
            </p>
          </div>
          <Link
            href="/financial/budgets/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            New Budget
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Budgets</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">At Risk</p>
                <p className="text-2xl font-bold text-gray-900">{summary.atRisk}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">On Track</p>
                <p className="text-2xl font-bold text-gray-900">{summary.onTrack}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm text-gray-500">Total Variance</p>
              <p
                className={`text-2xl font-bold ${
                  summary.totalBudgeted - summary.totalActual >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  signDisplay: 'always',
                }).format(summary.totalBudgeted - summary.totalActual)}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search budgets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('at-risk')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'at-risk'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                At Risk
              </button>
              <button
                onClick={() => setFilter('on-track')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'on-track'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                On Track
              </button>
            </div>
          </div>
        </div>

        {/* Budgets Table */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">Loading budgets...</p>
          </div>
        ) : filteredBudgets.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No budgets found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchTerm || filter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first budget'}
            </p>
            {!searchTerm && filter === 'all' && (
              <Link
                href="/financial/budgets/new"
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                Create Budget
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budgeted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variance
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilization
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBudgets.map((budget) => (
                  <tr
                    key={budget.id}
                    onClick={() => router.push(`/financial/budgets/${budget.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{budget.name}</div>
                        {budget.fiscal_year && (
                          <div className="text-sm text-gray-500">FY {budget.fiscal_year}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{budget.project?.name || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(budget.total_budgeted)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(budget.total_actual)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div
                        className={`text-sm font-medium ${
                          budget.variance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          signDisplay: 'always',
                        }).format(budget.variance)}
                      </div>
                      <div
                        className={`text-xs ${
                          budget.variance_percent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        ({budget.variance_percent.toFixed(1)}%)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {budget.utilization_rate.toFixed(1)}%
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className={`h-1.5 rounded-full ${
                            budget.utilization_rate > 100
                              ? 'bg-red-600'
                              : budget.utilization_rate > 90
                              ? 'bg-yellow-500'
                              : 'bg-green-600'
                          }`}
                          style={{ width: `${Math.min(budget.utilization_rate, 100)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {budget.variance_percent < -10 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          At Risk
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="w-4 h-4" />
                          On Track
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
  )
}
