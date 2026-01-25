'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  getInvoices,
  getFinancialStats,
  getAgingReport,
  subscribeToInvoices,
  subscribeToPayments
} from '@/lib/supabase/financial'
import type { Invoice, FinancialStats } from '@/types/financial'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

export default function FinancialPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<FinancialStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')

  // Tabs
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'expenses'>('invoices')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!profile?.company_id) return

    // Real-time subscriptions
    const unsubInvoices = subscribeToInvoices(profile.company_id, (payload) => {
      if (payload.eventType === 'INSERT') {
        setInvoices((prev) => [payload.new as Invoice, ...prev])
      } else if (payload.eventType === 'UPDATE') {
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === payload.new.id ? payload.new as Invoice : inv))
        )
      } else if (payload.eventType === 'DELETE') {
        setInvoices((prev) => prev.filter((inv) => inv.id !== payload.old.id))
      }
    })

    const unsubPayments = subscribeToPayments(profile.company_id, () => {
      // Reload stats when payments change
      loadFinancialStats()
    })

    return () => {
      unsubInvoices()
      unsubPayments()
    }
  }, [profile?.company_id])

  async function loadData() {
    try {
      // Get user profile
      const {
        data: { user }
      } = await supabase.auth.getUser()

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

      // Load invoices and stats
      await Promise.all([
        loadInvoices(profileData.company_id),
        loadFinancialStats(profileData.company_id)
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadInvoices(companyId: string) {
    const { data, error } = await getInvoices(companyId)
    if (data) {
      setInvoices(data)
    }
  }

  async function loadFinancialStats(companyId?: string) {
    const id = companyId || profile?.company_id
    if (!id) return

    const { data, error } = await getFinancialStats(id)
    if (data) {
      setStats(data)
    }
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      searchQuery === '' ||
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.contact?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.contact?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.contact?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      selectedStatus === 'all' || invoice.status === selectedStatus

    const matchesProject =
      selectedProject === 'all' || invoice.project_id === selectedProject

    return matchesSearch && matchesStatus && matchesProject
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'sent':
      case 'viewed':
        return 'bg-blue-100 text-blue-800'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'cancelled':
      case 'void':
        return 'bg-gray-100 text-gray-500 line-through'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case 'overdue':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
      case 'partial':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />
      default:
        return <DocumentTextIcon className="w-5 h-5 text-gray-400" />
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading financial data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Management</h1>
            <p className="mt-1 text-gray-600">
              Invoices, payments, and expense tracking
            </p>
          </div>
          <button
            onClick={() => router.push('/financial/invoices/new')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Financial Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Outstanding */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {formatCurrency(stats.total_outstanding)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {stats.total_invoices} invoices
                </p>
              </div>
              <BanknotesIcon className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          {/* Overdue */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="mt-2 text-3xl font-bold text-red-600">
                  {formatCurrency(stats.total_overdue)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {stats.overdue_invoices} invoices
                </p>
              </div>
              <ExclamationTriangleIcon className="w-12 h-12 text-red-500 opacity-20" />
            </div>
          </div>

          {/* This Month Revenue */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month Revenue</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {formatCurrency(stats.month_revenue)}
                </p>
                <p className="mt-1 text-sm text-green-600">
                  {stats.month_profit_margin.toFixed(1)}% margin
                </p>
              </div>
              <CurrencyDollarIcon className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>

          {/* YTD Profit */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">YTD Profit</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {formatCurrency(stats.ytd_profit)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {stats.ytd_profit_margin.toFixed(1)}% margin
                </p>
              </div>
              <CheckCircleIcon className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </div>
        </div>
      )}

      {/* Aging Report Alert */}
      {stats && stats.total_overdue > 0 && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Action Required: Overdue Invoices
              </h3>
              <p className="mt-1 text-sm text-red-700">
                You have {stats.overdue_invoices} overdue invoices totaling{' '}
                {formatCurrency(stats.total_overdue)}. Contact clients for payment.
              </p>
              <button
                onClick={() => setSelectedStatus('overdue')}
                className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline"
              >
                View overdue invoices →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'invoices'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invoices
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'expenses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Expenses
            </button>
          </nav>
        </div>
      </div>

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-lg shadow-sm">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Invoice List */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-lg font-medium">No invoices found</p>
                      <p className="mt-1 text-sm">
                        Create your first invoice to get started
                      </p>
                      <button
                        onClick={() => router.push('/financial/invoices/new')}
                        className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Create Invoice →
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/financial/invoices/${invoice.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(invoice.status)}
                          <span className="ml-2 text-sm font-medium text-gray-900">
                            {invoice.invoice_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.contact?.company_name ||
                            `${invoice.contact?.first_name} ${invoice.contact?.last_name}`}
                        </div>
                        {invoice.project?.name && (
                          <div className="text-sm text-gray-500">
                            {invoice.project.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(invoice.invoice_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(invoice.due_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.balance_due)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            invoice.status
                          )}`}
                        >
                          {invoice.status.charAt(0).toUpperCase() +
                            invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/financial/invoices/${invoice.id}`)
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <BanknotesIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Payments Module</h3>
          <p className="mt-2 text-gray-600">Payment tracking coming soon</p>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <CurrencyDollarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Expenses Module</h3>
          <p className="mt-2 text-gray-600">Expense tracking coming soon</p>
        </div>
      )}
    </div>
  )
}
