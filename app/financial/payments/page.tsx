'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Payment, PaymentMethod } from '@/types/financial'
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import toast, { Toaster } from 'react-hot-toast'

export default function PaymentHistoryPage() {
  const router = useRouter()

  // RBAC: Require canViewFinancials permission
  const { loading: permissionLoading } = usePermissionGuard({
    permission: 'canViewFinancials',
    redirectTo: '/unauthorized'
  })

  const [payments, setPayments] = useState<Payment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Stats
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    thisMonth: 0,
    lastMonth: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterPayments()
  }, [payments, searchQuery, methodFilter, dateFrom, dateTo])

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
      await loadPayments(profileData.company_id)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error loading payment history')
    } finally {
      setLoading(false)
    }
  }

  async function loadPayments(companyId: string) {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          invoice:invoices(invoice_number, total_amount, contact:crm_contacts(id, company_name, first_name, last_name))
        `)
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false })

      if (error) throw error

      const paymentList = data || []
      setPayments(paymentList)

      // Calculate stats
      const totalAmount = paymentList.reduce((sum, p) => sum + p.amount, 0)
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

      const thisMonth = paymentList
        .filter(p => new Date(p.payment_date) >= thisMonthStart)
        .reduce((sum, p) => sum + p.amount, 0)

      const lastMonth = paymentList
        .filter(p => {
          const date = new Date(p.payment_date)
          return date >= lastMonthStart && date <= lastMonthEnd
        })
        .reduce((sum, p) => sum + p.amount, 0)

      setStats({
        totalPayments: paymentList.length,
        totalAmount,
        thisMonth,
        lastMonth
      })
    } catch (error: any) {
      console.error('Error loading payments:', error)
      toast.error(error?.message || 'Error loading payments')
    }
  }

  function filterPayments() {
    let filtered = [...payments]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        payment =>
          payment.invoice?.invoice_number?.toLowerCase().includes(query) ||
          payment.reference_number?.toLowerCase().includes(query) ||
          payment.payment_method.toLowerCase().includes(query) ||
          payment.invoice?.contact?.company_name?.toLowerCase().includes(query) ||
          `${payment.invoice?.contact?.first_name} ${payment.invoice?.contact?.last_name}`
            .toLowerCase()
            .includes(query)
      )
    }

    // Method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter(p => p.payment_method === methodFilter)
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(
        p => new Date(p.payment_date) >= new Date(dateFrom)
      )
    }
    if (dateTo) {
      filtered = filtered.filter(
        p => new Date(p.payment_date) <= new Date(dateTo)
      )
    }

    setFilteredPayments(filtered)
  }

  function exportToCSV() {
    if (filteredPayments.length === 0) {
      toast.error('No payments to export')
      return
    }

    const headers = [
      'Date',
      'Invoice Number',
      'Client',
      'Amount',
      'Payment Method',
      'Reference Number',
      'Notes'
    ]

    const rows = filteredPayments.map(payment => [
      formatDate(payment.payment_date),
      payment.invoice?.invoice_number || '',
      payment.invoice?.contact?.company_name ||
        `${payment.invoice?.contact?.first_name} ${payment.invoice?.contact?.last_name}`,
      payment.amount.toFixed(2),
      payment.payment_method,
      payment.reference_number || '',
      payment.notes || ''
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast.success('Payment history exported')
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

  const getMethodLabel = (method: PaymentMethod) => {
    const labels: Record<PaymentMethod, string> = {
      check: 'Check',
      ach: 'ACH Transfer',
      wire: 'Wire Transfer',
      credit_card: 'Credit Card',
      debit_card: 'Debit Card',
      cash: 'Cash',
      other: 'Other'
    }
    return labels[method] || method
  }

  if (loading || permissionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <button
          onClick={() => router.push('/financial')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Financial Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
            <p className="text-gray-600 mt-1">Complete record of all received payments</p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Total Payments</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalPayments}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Total Amount</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.totalAmount)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">This Month</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(stats.thisMonth)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Last Month</p>
          <p className="text-2xl font-bold text-gray-600">
            {formatCurrency(stats.lastMonth)}
          </p>
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
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Methods</option>
            <option value="check">Check</option>
            <option value="ach">ACH Transfer</option>
            <option value="wire">Wire Transfer</option>
            <option value="credit_card">Credit Card</option>
            <option value="debit_card">Debit Card</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>

          {/* Date From */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Date To */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reference
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <CheckCircleIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-lg font-medium">No payments found</p>
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(payment.payment_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() =>
                        router.push(`/financial/invoices/${payment.invoice_id}`)
                      }
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      {payment.invoice?.invoice_number || 'N/A'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.invoice?.contact?.company_name ||
                      `${payment.invoice?.contact?.first_name} ${payment.invoice?.contact?.last_name}` ||
                      'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {getMethodLabel(payment.payment_method)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {payment.reference_number || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {payment.notes || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Summary Footer */}
        {filteredPayments.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
              </p>
              <p className="text-lg font-bold text-gray-900">
                Total: {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
