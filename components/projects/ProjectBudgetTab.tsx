'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserCompany } from '@/lib/auth/get-user-company'
import { ProjectDetails } from '@/lib/projects/get-project-details'

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
  vendor: string | null
  receipt_url: string | null
  created_by: {
    name: string
    avatar: string
  }
}

interface BudgetData {
  estimated_budget: number
  total_expenses: number
  remaining: number
  percentage_used: number
  currency: string
}

interface ProjectBudgetTabProps {
  project: ProjectDetails
}

export default function ProjectBudgetTab({ project }: ProjectBudgetTabProps) {
  const projectId = project.id
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // New expense form state
  const [newExpense, setNewExpense] = useState({
    category: 'materials',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    vendor: ''
  })

  useEffect(() => {
    loadBudgetData()
  }, [projectId])

  async function loadBudgetData() {
    try {
      setLoading(true)
      const supabase = createClient()

      // Load project budget info
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('estimated_budget, currency')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError

      // Load all expenses for this project
      const { data: expensesData, error: expensesError } = await supabase
        .from('project_expenses')
        .select(`
          id,
          category,
          description,
          amount,
          date,
          vendor,
          receipt_url,
          created_by:user_profiles!project_expenses_created_by_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .order('date', { ascending: false })

      if (expensesError) throw expensesError

      const formattedExpenses: Expense[] = (expensesData || []).map(exp => ({
        id: exp.id,
        category: exp.category,
        description: exp.description,
        amount: exp.amount,
        date: exp.date,
        vendor: exp.vendor,
        receipt_url: exp.receipt_url,
        created_by: {
          name: (exp.created_by as any)?.full_name || 'Unknown',
          avatar: getInitials((exp.created_by as any)?.full_name || 'Unknown')
        }
      }))

      const totalExpenses = formattedExpenses.reduce((sum, exp) => sum + exp.amount, 0)
      const estimatedBudget = project.estimated_budget || 0
      const remaining = estimatedBudget - totalExpenses
      const percentageUsed = estimatedBudget > 0 ? (totalExpenses / estimatedBudget) * 100 : 0

      setBudgetData({
        estimated_budget: estimatedBudget,
        total_expenses: totalExpenses,
        remaining,
        percentage_used: percentageUsed,
        currency: project.currency || 'USD'
      })

      setExpenses(formattedExpenses)
    } catch (error) {
      console.error('Failed to load budget data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()

    try {
      const supabase = createClient()
      const profile = await getUserCompany()

      if (!profile) {
        throw new Error('Not authenticated')
      }

      const { error } = await supabase
        .from('project_expenses')
        .insert({
          project_id: projectId,
          category: newExpense.category,
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          date: newExpense.date,
          vendor: newExpense.vendor || null,
          created_by: profile.id
        })

      if (error) throw error

      // Reset form
      setNewExpense({
        category: 'materials',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        vendor: ''
      })
      setShowAddExpense(false)

      // Reload data
      await loadBudgetData()
    } catch (error) {
      console.error('Failed to add expense:', error)
      alert('Failed to add expense. Please try again.')
    }
  }

  async function handleDeleteExpense(expenseId: string, description: string) {
    if (!confirm(`Are you sure you want to delete expense "${description}"?`)) {
      return
    }

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('project_expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error

      // Reload data
      await loadBudgetData()
    } catch (error) {
      console.error('Failed to delete expense:', error)
      alert('Failed to delete expense. Please try again.')
    }
  }

  function getInitials(name: string): string {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  function getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      materials: '🧱',
      labor: '👷',
      equipment: '🚜',
      permits: '📋',
      subcontractors: '🔧',
      utilities: '⚡',
      insurance: '🛡️',
      other: '📦'
    }
    return icons[category] || '📦'
  }

  function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      materials: 'bg-blue-100 text-blue-800',
      labor: 'bg-green-100 text-green-800',
      equipment: 'bg-yellow-100 text-yellow-800',
      permits: 'bg-purple-100 text-purple-800',
      subcontractors: 'bg-orange-100 text-orange-800',
      utilities: 'bg-cyan-100 text-cyan-800',
      insurance: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const categories = [
    { value: 'all', label: 'All Expenses' },
    { value: 'materials', label: 'Materials' },
    { value: 'labor', label: 'Labor' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'permits', label: 'Permits' },
    { value: 'subcontractors', label: 'Subcontractors' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'other', label: 'Other' }
  ]

  const filteredExpenses = categoryFilter === 'all'
    ? expenses
    : expenses.filter(exp => exp.category === categoryFilter)

  // Calculate expenses by category for the chart
  const expensesByCategory = categories.slice(1).map(cat => {
    const total = expenses
      .filter(exp => exp.category === cat.value)
      .reduce((sum, exp) => sum + exp.amount, 0)
    return {
      category: cat.label,
      amount: total,
      percentage: budgetData && budgetData.total_expenses > 0
        ? (total / budgetData.total_expenses) * 100
        : 0
    }
  }).filter(item => item.amount > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!budgetData) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Failed to load budget data</p>
      </div>
    )
  }

  const budgetStatus = budgetData.percentage_used > 100
    ? 'over'
    : budgetData.percentage_used > 90
    ? 'warning'
    : 'healthy'

  return (
    <div className="space-y-6">
      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Budget</p>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(budgetData.estimated_budget, budgetData.currency)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Estimated budget</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Spent</p>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(budgetData.total_expenses, budgetData.currency)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {budgetData.percentage_used.toFixed(1)}% of budget
          </p>
        </div>

        <div className={`bg-white border rounded-lg p-6 ${
          budgetStatus === 'over' ? 'border-red-300 bg-red-50' :
          budgetStatus === 'warning' ? 'border-yellow-300 bg-yellow-50' :
          'border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Remaining</p>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              budgetStatus === 'over' ? 'bg-red-100' :
              budgetStatus === 'warning' ? 'bg-yellow-100' :
              'bg-green-100'
            }`}>
              <svg className={`w-5 h-5 ${
                budgetStatus === 'over' ? 'text-red-600' :
                budgetStatus === 'warning' ? 'text-yellow-600' :
                'text-green-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className={`text-3xl font-bold ${
            budgetStatus === 'over' ? 'text-red-600' :
            budgetStatus === 'warning' ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {formatCurrency(Math.abs(budgetData.remaining), budgetData.currency)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {budgetStatus === 'over' ? 'Over budget' : 'Remaining'}
          </p>
        </div>
      </div>

      {/* Budget Progress Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Budget Usage</h3>
          <span className={`text-sm font-medium ${
            budgetStatus === 'over' ? 'text-red-600' :
            budgetStatus === 'warning' ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {budgetData.percentage_used.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${
              budgetStatus === 'over' ? 'bg-red-600' :
              budgetStatus === 'warning' ? 'bg-yellow-500' :
              'bg-green-600'
            }`}
            style={{ width: `${Math.min(budgetData.percentage_used, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Expenses by Category */}
      {expensesByCategory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
          <div className="space-y-3">
            {expensesByCategory.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{item.category}</span>
                  <span className="text-gray-900 font-semibold">
                    {formatCurrency(item.amount, budgetData.currency)} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Expense Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Expense History</h3>
        <button
          onClick={() => setShowAddExpense(!showAddExpense)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* Add Expense Form */}
      {showAddExpense && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">New Expense</h4>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {categories.slice(1).map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ({budgetData.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor (Optional)
                </label>
                <input
                  type="text"
                  value={newExpense.vendor}
                  onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Vendor name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="What was this expense for?"
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddExpense(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Expense
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(cat.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              categoryFilter === cat.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Expenses List */}
      <div className="space-y-3">
        {filteredExpenses.length > 0 ? (
          filteredExpenses.map(expense => (
            <div
              key={expense.id}
              className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              {/* Category Icon */}
              <div className="text-3xl flex-shrink-0">
                {getCategoryIcon(expense.category)}
              </div>

              {/* Expense Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <h4 className="font-medium text-gray-900">{expense.description}</h4>
                  <span className="text-lg font-bold text-gray-900 flex-shrink-0">
                    {formatCurrency(expense.amount, budgetData.currency)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(expense.category)}`}>
                    {expense.category}
                  </span>
                  <span>{formatDate(expense.date)}</span>
                  {expense.vendor && (
                    <>
                      <span>•</span>
                      <span>{expense.vendor}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {expense.created_by.avatar}
                    </div>
                    <span className="hidden sm:inline">{expense.created_by.name}</span>
                  </span>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => handleDeleteExpense(expense.id, expense.description)}
                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors flex-shrink-0"
                title="Delete"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {categoryFilter === 'all' ? '' : categoryFilter} expenses yet
            </h3>
            <p className="text-gray-600">
              {categoryFilter === 'all'
                ? 'Add your first expense to track project costs'
                : `Add ${categoryFilter} expenses to see them here`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
