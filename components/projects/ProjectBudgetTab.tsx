'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserCompany } from '@/lib/auth/get-user-company'
import { ProjectDetails } from '@/lib/projects/get-project-details'
import { useThemeColors } from '@/lib/hooks/useThemeColors'

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
  vendor: string | null
  payment_status: 'pending' | 'paid' | 'overdue'
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
  onSpentChange?: (spent: number) => void
}

export default function ProjectBudgetTab({ project, onSpentChange }: ProjectBudgetTabProps) {
  const projectId = project.id
  const { darkMode, colors } = useThemeColors()
  const [budgetData, setBudgetData] = useState<BudgetData | null>({
    estimated_budget: project.estimated_budget,
    total_expenses: project.spent,
    remaining: project.budgetRemaining,
    percentage_used: project.budgetPercentage,
    currency: project.currency,
  })
  const [expenses, setExpenses] = useState<Expense[]>(
    project.expenses.map(e => ({
      id: e.id,
      category: e.category,
      description: e.description || '',
      amount: e.amount,
      date: e.date,
      vendor: e.vendor,
      payment_status: e.payment_status,
      created_by: { name: 'Unknown', avatar: '' }
    }))
  )
  const [loading, setLoading] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; description: string } | null>(null)
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editForm, setEditForm] = useState({ category: '', description: '', amount: '', date: '', vendor: '', payment_status: 'pending' as 'pending' | 'paid' | 'overdue' })

  // New expense form state
  const [newExpense, setNewExpense] = useState({
    category: 'materials',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    payment_status: 'pending' as 'pending' | 'paid' | 'overdue'
  })

  useEffect(() => {
    loadBudgetData()
  }, [projectId])

  async function loadBudgetData() {
    try {
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
        .select('id, category, description, amount, date, vendor, payment_status, created_by')
        .eq('project_id', projectId)
        .order('date', { ascending: false })

      if (expensesError) throw expensesError

      // Fetch names for all unique creators in one query
      const creatorIds = [...new Set((expensesData || []).map((e: any) => e.created_by).filter(Boolean))]
      const creatorMap: Record<string, { full_name: string | null, avatar_url: string | null }> = {}
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name, avatar_url')
          .in('id', creatorIds)
        profiles?.forEach((p: any) => { creatorMap[p.id] = p })
      }

      const formattedExpenses: Expense[] = (expensesData || []).map((exp: any) => ({
        id: exp.id,
        category: exp.category,
        description: exp.description,
        amount: exp.amount,
        date: exp.date,
        vendor: exp.vendor,
        payment_status: exp.payment_status || 'pending',
        created_by: {
          name: creatorMap[exp.created_by]?.full_name || 'Unknown',
          avatar: creatorMap[exp.created_by]?.avatar_url || ''
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
    } catch (error: any) {
      console.error('Failed to load budget data:', error?.message, error?.code, error?.details, error)
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
          payment_status: newExpense.payment_status,
          created_by: profile.id
        })

      if (error) throw error

      const addedAmount = parseFloat(newExpense.amount)

      // Update expenses list instantly
      setExpenses(prev => [{
        id: crypto.randomUUID(),
        category: newExpense.category,
        description: newExpense.description,
        amount: addedAmount,
        date: newExpense.date,
        vendor: newExpense.vendor || null,
        payment_status: newExpense.payment_status,
        created_by: { name: profile.full_name ?? 'You', avatar: profile.avatar_url ?? '' }
      }, ...prev])

      // Update stat cards instantly
      setBudgetData(prev => {
        if (!prev) return prev
        const newTotal = prev.total_expenses + addedAmount
        const newRemaining = prev.estimated_budget - newTotal
        const newPct = prev.estimated_budget > 0 ? (newTotal / prev.estimated_budget) * 100 : 0
        return { ...prev, total_expenses: newTotal, remaining: newRemaining, percentage_used: newPct }
      })
      onSpentChange?.(budgetData ? budgetData.total_expenses + addedAmount : addedAmount)

      // Reset form
      setNewExpense({
        category: 'materials',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        vendor: '',
        payment_status: 'pending'
      })
      setShowAddExpense(false)
    } catch (error: any) {
      console.error('Failed to add expense:', error?.code, error?.message, error?.details)
      alert('Failed to add expense. Please try again.')
    }
  }

  function handleDeleteExpense(expenseId: string, description: string) {
    setConfirmDelete({ id: expenseId, description })
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
      materials:      'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      labor:          'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      equipment:      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      permits:        'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
      subcontractors: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      utilities:      'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
      insurance:      'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      other:          'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300'
    }
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300'
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

  function openEditExpense(expense: Expense) {
    setEditingExpense(expense)
    setEditForm({
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      date: expense.date,
      vendor: expense.vendor ?? '',
      payment_status: expense.payment_status
    })
    setDetailExpense(null)
  }

  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!editingExpense) return
    const supabase = createClient()
    const updatedAmount = parseFloat(editForm.amount)
    const { error } = await supabase
      .from('project_expenses')
      .update({
        category: editForm.category,
        description: editForm.description,
        amount: updatedAmount,
        date: editForm.date,
        vendor: editForm.vendor || null,
        payment_status: editForm.payment_status
      })
      .eq('id', editingExpense.id)
    if (error) { console.error('Failed to update expense:', error?.message); return }

    const diff = updatedAmount - editingExpense.amount
    setExpenses(prev => prev.map(e => e.id === editingExpense.id
      ? { ...e, category: editForm.category, description: editForm.description, amount: updatedAmount, date: editForm.date, vendor: editForm.vendor || null, payment_status: editForm.payment_status }
      : e
    ))
    if (budgetData && diff !== 0) {
      const newTotal = budgetData.total_expenses + diff
      const newRemaining = budgetData.estimated_budget - newTotal
      const newPct = budgetData.estimated_budget > 0 ? (newTotal / budgetData.estimated_budget) * 100 : 0
      setBudgetData({ ...budgetData, total_expenses: newTotal, remaining: newRemaining, percentage_used: newPct })
      onSpentChange?.(newTotal)
    }
    setEditingExpense(null)
  }

  async function confirmDeleteExpense() {
    if (!confirmDelete) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('project_expenses').delete().eq('id', confirmDelete.id)
      if (error) throw error
      const deleted = expenses.find(e => e.id === confirmDelete.id)
      setExpenses(prev => prev.filter(e => e.id !== confirmDelete.id))
      if (deleted && budgetData) {
        const newTotal = budgetData.total_expenses - deleted.amount
        const newRemaining = budgetData.estimated_budget - newTotal
        const newPct = budgetData.estimated_budget > 0 ? (newTotal / budgetData.estimated_budget) * 100 : 0
        setBudgetData({ ...budgetData, total_expenses: newTotal, remaining: newRemaining, percentage_used: newPct })
        onSpentChange?.(newTotal)
      }
    } catch (error: any) {
      console.error('Failed to delete expense:', error?.message)
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Budget</h2>
          <p className="text-sm text-gray-500 mt-1">Track project expenses and budget allocation</p>
        </div>
        <button
          onClick={() => setShowAddExpense(true)}
          className="inline-flex items-center cursor-pointer gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Budget</p>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: darkMode ? 'rgba(37,99,235,0.2)' : '#dbeafe' }}>
              <svg className="w-5 h-5" style={{ color: darkMode ? '#60a5fa' : '#2563eb' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: darkMode ? 'rgba(234,88,12,0.2)' : '#ffedd5' }}>
              <svg className="w-5 h-5" style={{ color: darkMode ? '#fb923c' : '#ea580c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
              backgroundColor: darkMode
                ? budgetStatus === 'over' ? 'rgba(220,38,38,0.2)' : budgetStatus === 'warning' ? 'rgba(202,138,4,0.2)' : 'rgba(22,163,74,0.2)'
                : budgetStatus === 'over' ? '#fee2e2' : budgetStatus === 'warning' ? '#fef9c3' : '#dcfce7'
            }}>
              <svg className="w-5 h-5" style={{
                color: darkMode
                  ? budgetStatus === 'over' ? '#f87171' : budgetStatus === 'warning' ? '#facc15' : '#4ade80'
                  : budgetStatus === 'over' ? '#dc2626' : budgetStatus === 'warning' ? '#ca8a04' : '#16a34a'
              }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Expense History Header */}
      <h3 className="text-lg font-semibold text-gray-900">Expense History</h3>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-xl w-full max-w-lg flex flex-col"
            style={{ backgroundColor: colors.bg, boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: colors.borderBottom }}
            >
              <div>
                <h2 className="text-2xl font-bold" style={{ color: colors.text }}>Add Expense</h2>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>Record a new project expense</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddExpense(false)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <svg className="w-6 h-6" style={{ color: colors.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleAddExpense}>
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Description <span className="text-[#FF6B6B]">*</span>
                  </label>
                  <textarea
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                    rows={2}
                    placeholder="What was this expense for?"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Category
                    </label>
                    <select
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]"
                      style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text, colorScheme: darkMode ? 'dark' : 'light' }}
                      required
                    >
                      {categories.slice(1).map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Amount ({budgetData.currency}) <span className="text-[#FF6B6B]">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Date <span className="text-[#FF6B6B]">*</span>
                    </label>
                    <input
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
                      required
                    />
                  </div>

                  {/* Vendor */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Vendor
                    </label>
                    <input
                      type="text"
                      value={newExpense.vendor}
                      onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
                      placeholder="Vendor name"
                    />
                  </div>

                  {/* Payment Status */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Payment Status
                    </label>
                    <select
                      value={newExpense.payment_status}
                      onChange={(e) => setNewExpense({ ...newExpense, payment_status: e.target.value as 'pending' | 'paid' | 'overdue' })}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]"
                      style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text, colorScheme: darkMode ? 'dark' : 'light' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className="px-6 py-4 flex items-center justify-end gap-3"
                style={{ borderTop: colors.borderBottom }}
              >
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                  style={{ border: colors.border, color: colors.text }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-[#FF6B6B] text-white font-medium hover:bg-[#FF5252] transition-colors"
                  style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)" }}
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
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
              onClick={() => setDetailExpense(expense)}
              className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
            >
              {/* Category Icon */}
              <div className="text-3xl shrink-0">
                {getCategoryIcon(expense.category)}
              </div>

              {/* Expense Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <h4 className="font-medium text-gray-900">{expense.description}</h4>
                  <span className="text-lg font-bold text-gray-900 shrink-0">
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
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
                      {expense.created_by.avatar && expense.created_by.avatar !== '?' ? (
                        <img src={expense.created_by.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (expense.created_by.name?.[0] ?? '?').toUpperCase()
                      )}
                    </div>
                    <span className="hidden sm:inline">{expense.created_by.name}</span>
                  </span>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={e => { e.stopPropagation(); handleDeleteExpense(expense.id, expense.description) }}
                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors shrink-0"
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

    {/* Expense Detail Panel */}
    {detailExpense && (
      <>
        <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setDetailExpense(null)} />
        <div
          className="fixed right-0 top-0 h-full w-96 shadow-xl z-50 flex flex-col"
          style={{ backgroundColor: darkMode ? colors.bg : '#ffffff' }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: `1px solid ${darkMode ? colors.border : '#e5e7eb'}` }}
          >
            <h3 className="text-base font-semibold" style={{ color: darkMode ? colors.text : '#111827' }}>Expense Details</h3>
            <button onClick={() => setDetailExpense(null)} style={{ color: darkMode ? '#9ca3af' : '#9ca3af' }} className="hover:opacity-70">
              <span className="text-xl leading-none">&times;</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Title & Amount */}
            <div>
              <p className="text-lg font-semibold" style={{ color: darkMode ? colors.text : '#111827' }}>{detailExpense.description}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: darkMode ? colors.text : '#111827' }}>{formatCurrency(detailExpense.amount, budgetData?.currency ?? 'USD')}</p>
            </div>

            {/* Details */}
            <section>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3 pb-1.5"
                style={{ color: darkMode ? '#6b7280' : '#9ca3af', borderBottom: `1px solid ${darkMode ? colors.border : '#f3f4f6'}` }}
              >Overview</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs mb-0.5" style={{ color: darkMode ? '#6b7280' : '#9ca3af' }}>Category</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(detailExpense.category)}`}>{detailExpense.category}</span>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: darkMode ? '#6b7280' : '#9ca3af' }}>Payment Status</p>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${
                    detailExpense.payment_status === 'paid'
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : detailExpense.payment_status === 'overdue'
                      ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>{detailExpense.payment_status}</span>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: darkMode ? '#6b7280' : '#9ca3af' }}>Date</p>
                  <span className="font-medium" style={{ color: darkMode ? colors.text : '#374151' }}>{formatDate(detailExpense.date)}</span>
                </div>
                {detailExpense.vendor && (
                  <div className="col-span-2">
                    <p className="text-xs mb-0.5" style={{ color: darkMode ? '#6b7280' : '#9ca3af' }}>Vendor</p>
                    <span className="font-medium" style={{ color: darkMode ? colors.text : '#374151' }}>{detailExpense.vendor}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Added By */}
            <section>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3 pb-1.5"
                style={{ color: darkMode ? '#6b7280' : '#9ca3af', borderBottom: `1px solid ${darkMode ? colors.border : '#f3f4f6'}` }}
              >Added By</p>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold overflow-hidden shrink-0">
                  {detailExpense.created_by.avatar ? (
                    <img src={detailExpense.created_by.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (detailExpense.created_by.name?.[0] ?? '?').toUpperCase()
                  )}
                </div>
                <span className="font-medium" style={{ color: darkMode ? colors.text : '#374151' }}>{detailExpense.created_by.name}</span>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div
            className="px-5 py-4 flex gap-2"
            style={{ borderTop: `1px solid ${darkMode ? colors.border : '#e5e7eb'}` }}
          >
            <button
              onClick={() => openEditExpense(detailExpense)}
              className="flex items-center gap-1.5 px-4 py-2 border rounded-lg text-sm font-medium transition-colors cursor-pointer"
              style={{ borderColor: darkMode ? colors.border : '#e5e7eb', color: darkMode ? colors.text : '#374151' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = darkMode ? colors.bgAlt : '#f9fafb')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
            <button
              onClick={e => { e.stopPropagation(); setDetailExpense(null); handleDeleteExpense(detailExpense.id, detailExpense.description) }}
              className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors cursor-pointer dark:border-red-800 dark:hover:bg-red-900/30"
            >
              Delete
            </button>
          </div>
        </div>
      </>
    )}

    {/* Edit Expense Modal */}
    {editingExpense && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-base font-semibold text-gray-900">Edit Expense</h3>
            <button onClick={() => setEditingExpense(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>
          <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <input
                required
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select
                  value={editForm.category}
                  onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text, colorScheme: darkMode ? 'dark' : 'light' }}
                >
                  {['materials','labor','equipment','permits','subcontractors','utilities','insurance','other'].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.amount}
                  onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                <input
                  required
                  type="date"
                  value={editForm.date}
                  onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Vendor (optional)</label>
                <input
                  value={editForm.vendor}
                  onChange={e => setEditForm(f => ({ ...f, vendor: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Payment Status</label>
              <select
                value={editForm.payment_status}
                onChange={e => setEditForm(f => ({ ...f, payment_status: e.target.value as 'pending' | 'paid' | 'overdue' }))}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]"
                style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text, colorScheme: darkMode ? 'dark' : 'light' }}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditingExpense(null)} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Delete confirmation modal */}
    {confirmDelete && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
          <p className="text-sm text-gray-800 text-center">
            Are you sure you want to delete expense &ldquo;{confirmDelete.description}&rdquo;?
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={confirmDeleteExpense}
              className="px-5 py-2 rounded-full bg-white border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              OK
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-5 py-2 rounded-full bg-white border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
