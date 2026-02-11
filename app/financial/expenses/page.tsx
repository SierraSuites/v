'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  getExpenses,
  deleteExpense,
  updateExpense
} from '@/lib/supabase/financial'
import type { Expense, ExpenseCategory, PaymentStatus } from '@/types/financial'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import toast, { Toaster } from 'react-hot-toast'

export default function ExpensesPage() {
  const router = useRouter()

  // RBAC: Require canViewFinancials permission
  const { loading: permissionLoading } = usePermissionGuard({
    permission: 'canViewFinancials',
    redirectTo: '/unauthorized'
  })

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [billableFilter, setBillableFilter] = useState<'all' | 'billable' | 'non-billable'>('all')

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    billable: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterExpenses()
  }, [expenses, searchQuery, categoryFilter, statusFilter, billableFilter])

  async function loadData() {
    try {
      const supabase = createClient()

      // Get user profile
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData?.company_id) {
        console.error('No company_id found')
        return
      }

      setProfile(profileData)
      await loadExpenses(profileData.company_id)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error loading expenses')
    } finally {
      setLoading(false)
    }
  }

  async function loadExpenses(companyId: string) {
    try {
      const { data, error } = await getExpenses(companyId)

      if (error) {
        throw new Error(error)
      }

      const expenseList = data || []
      setExpenses(expenseList)

      // Calculate stats
      const total = expenseList.reduce((sum, exp) => sum + exp.amount, 0)
      const pending = expenseList
        .filter(exp => exp.payment_status === 'pending')
        .reduce((sum, exp) => sum + exp.amount, 0)
      const paid = expenseList
        .filter(exp => exp.payment_status === 'paid')
        .reduce((sum, exp) => sum + exp.amount, 0)
      const billable = expenseList
        .filter(exp => exp.billable_to_client)
        .reduce((sum, exp) => sum + exp.amount, 0)

      setStats({ total, pending, paid, billable })
    } catch (error: any) {
      console.error('Error loading expenses:', error)
      toast.error(error?.message || 'Error loading expenses')
    }
  }

  function filterExpenses() {
    let filtered = [...expenses]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        exp =>
          exp.vendor.toLowerCase().includes(query) ||
          exp.description.toLowerCase().includes(query) ||
          exp.category.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(exp => exp.category === categoryFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(exp => exp.payment_status === statusFilter)
    }

    // Billable filter
    if (billableFilter === 'billable') {
      filtered = filtered.filter(exp => exp.billable_to_client)
    } else if (billableFilter === 'non-billable') {
      filtered = filtered.filter(exp => !exp.billable_to_client)
    }

    setFilteredExpenses(filtered)
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return
    }

    const loadingToast = toast.loading('Deleting expense...')

    try {
      const { error } = await deleteExpense(expenseId)

      if (error) {
        throw new Error(error)
      }

      toast.success('Expense deleted', { id: loadingToast })
      await loadExpenses(profile.company_id)
    } catch (error: any) {
      console.error('Error deleting expense:', error)
      toast.error(error?.message || 'Error deleting expense', { id: loadingToast })
    }
  }

  async function handleMarkAsPaid(expenseId: string) {
    const loadingToast = toast.loading('Marking as paid...')

    try {
      await updateExpense(expenseId, {
        payment_status: 'paid',
        paid_at: new Date().toISOString()
      })

      toast.success('Expense marked as paid', { id: loadingToast })
      await loadExpenses(profile.company_id)
    } catch (error: any) {
      console.error('Error marking as paid:', error)
      toast.error(error?.message || 'Error updating expense', { id: loadingToast })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-gray-600" />
      default:
        return null
    }
  }

  const getCategoryLabel = (category: ExpenseCategory) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (loading || permissionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading expenses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Tracking</h1>
            <p className="text-gray-600 mt-1">Manage and track business expenses</p>
          </div>
          <button
            onClick={() => router.push('/financial/expenses/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5" />
            New Expense
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pending)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Paid</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paid)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Billable</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.billable)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-6 bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="materials">Materials</option>
            <option value="labor">Labor</option>
            <option value="subcontractors">Subcontractors</option>
            <option value="equipment">Equipment</option>
            <option value="equipment_rental">Equipment Rental</option>
            <option value="permits">Permits</option>
            <option value="utilities">Utilities</option>
            <option value="insurance">Insurance</option>
            <option value="professional_fees">Professional Fees</option>
            <option value="travel">Travel</option>
            <option value="office">Office</option>
            <option value="marketing">Marketing</option>
            <option value="other">Other</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Billable Filter */}
          <select
            value={billableFilter}
            onChange={(e) => setBillableFilter(e.target.value as 'all' | 'billable' | 'non-billable')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Expenses</option>
            <option value="billable">Billable Only</option>
            <option value="non-billable">Non-Billable Only</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Billable
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-lg font-medium">No expenses found</p>
                  <p className="text-sm mt-1">Get started by creating your first expense</p>
                </td>
              </tr>
            ) : (
              filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(expense.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {expense.vendor}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {getCategoryLabel(expense.category)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(expense.payment_status)}`}>
                      {getStatusIcon(expense.payment_status)}
                      {expense.payment_status.charAt(0).toUpperCase() + expense.payment_status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {expense.billable_to_client ? (
                      <span className="text-blue-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {expense.receipt_url && (
                        <a
                          href={expense.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                          title="View Receipt"
                        >
                          <DocumentTextIcon className="w-5 h-5" />
                        </a>
                      )}
                      {expense.payment_status === 'pending' && (
                        <button
                          onClick={() => handleMarkAsPaid(expense.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Mark as Paid"
                        >
                          <CheckCircleIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/financial/expenses/${expense.id}/edit`)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
