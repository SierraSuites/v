'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Invoice } from '@/types/financial'
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import toast, { Toaster } from 'react-hot-toast'

interface AgingBucket {
  range: string
  count: number
  amount: number
  invoices: Invoice[]
}

interface ClientSummary {
  clientId: string
  clientName: string
  totalOutstanding: number
  oldestInvoice: number // days overdue
  invoiceCount: number
  current: number
  aging_31_60: number
  aging_61_90: number
  aging_90_plus: number
  riskLevel: 'low' | 'medium' | 'high'
  recommendation: string
}

export default function AgingReportPage() {
  const router = useRouter()

  // RBAC: Require canViewFinancials permission
  const { loading: permissionLoading } = usePermissionGuard({
    permission: 'canViewFinancials',
    redirectTo: '/unauthorized'
  })

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  // Aging buckets
  const [agingData, setAgingData] = useState<AgingBucket[]>([])
  const [clientSummaries, setClientSummaries] = useState<ClientSummary[]>([])

  // Totals
  const [totalOutstanding, setTotalOutstanding] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

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
      await loadInvoices(profileData.company_id)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error loading aging report')
    } finally {
      setLoading(false)
    }
  }

  async function loadInvoices(companyId: string) {
    try {
      const supabase = createClient()

      // Get all outstanding invoices
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          contact:crm_contacts(id, company_name, first_name, last_name, email, phone)
        `)
        .eq('company_id', companyId)
        .gt('balance_due', 0)
        .neq('status', 'void')
        .order('due_date', { ascending: true })

      if (error) throw error

      const invoiceList = data || []
      setInvoices(invoiceList)

      // Calculate aging
      calculateAging(invoiceList)
      calculateClientSummaries(invoiceList)

      const total = invoiceList.reduce((sum, inv) => sum + inv.balance_due, 0)
      setTotalOutstanding(total)
    } catch (error: any) {
      console.error('Error loading invoices:', error)
      toast.error(error?.message || 'Error loading invoices')
    }
  }

  function calculateAging(invoiceList: Invoice[]) {
    const today = new Date()

    const buckets: AgingBucket[] = [
      { range: 'Current (0-30 days)', count: 0, amount: 0, invoices: [] },
      { range: '31-60 days', count: 0, amount: 0, invoices: [] },
      { range: '61-90 days', count: 0, amount: 0, invoices: [] },
      { range: '90+ days', count: 0, amount: 0, invoices: [] },
    ]

    invoiceList.forEach((invoice) => {
      const dueDate = new Date(invoice.due_date)
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      let bucketIndex = 0
      if (daysOverdue > 90) bucketIndex = 3
      else if (daysOverdue > 60) bucketIndex = 2
      else if (daysOverdue > 30) bucketIndex = 1
      else bucketIndex = 0

      buckets[bucketIndex].count++
      buckets[bucketIndex].amount += invoice.balance_due
      buckets[bucketIndex].invoices.push(invoice)
    })

    setAgingData(buckets)
  }

  function calculateClientSummaries(invoiceList: Invoice[]) {
    const clientMap = new Map<string, ClientSummary>()
    const today = new Date()

    invoiceList.forEach((invoice) => {
      const clientId = invoice.contact_id
      const clientName =
        invoice.contact?.company_name ||
        `${invoice.contact?.first_name} ${invoice.contact?.last_name}`

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          clientId,
          clientName,
          totalOutstanding: 0,
          oldestInvoice: 0,
          invoiceCount: 0,
          current: 0,
          aging_31_60: 0,
          aging_61_90: 0,
          aging_90_plus: 0,
          riskLevel: 'low',
          recommendation: ''
        })
      }

      const summary = clientMap.get(clientId)!
      const dueDate = new Date(invoice.due_date)
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      summary.totalOutstanding += invoice.balance_due
      summary.invoiceCount++
      summary.oldestInvoice = Math.max(summary.oldestInvoice, daysOverdue)

      // Bucket amounts
      if (daysOverdue > 90) {
        summary.aging_90_plus += invoice.balance_due
      } else if (daysOverdue > 60) {
        summary.aging_61_90 += invoice.balance_due
      } else if (daysOverdue > 30) {
        summary.aging_31_60 += invoice.balance_due
      } else {
        summary.current += invoice.balance_due
      }
    })

    // Determine risk level and recommendations
    clientMap.forEach((summary) => {
      const percentOverdue90 = (summary.aging_90_plus / summary.totalOutstanding) * 100

      if (percentOverdue90 > 50 || summary.oldestInvoice > 120) {
        summary.riskLevel = 'high'
        summary.recommendation = 'Urgent: Consider collections agency or payment plan'
      } else if (percentOverdue90 > 20 || summary.oldestInvoice > 60) {
        summary.riskLevel = 'medium'
        summary.recommendation = 'Send final notice and schedule call to discuss payment'
      } else if (summary.oldestInvoice > 30) {
        summary.riskLevel = 'medium'
        summary.recommendation = 'Send friendly reminder email'
      } else {
        summary.riskLevel = 'low'
        summary.recommendation = 'Monitor - no action needed yet'
      }
    })

    // Sort by risk level and total outstanding
    const summaries = Array.from(clientMap.values()).sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 }
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
      }
      return b.totalOutstanding - a.totalOutstanding
    })

    setClientSummaries(summaries)
  }

  function exportToCSV() {
    if (clientSummaries.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = [
      'Client',
      'Total Outstanding',
      'Invoice Count',
      'Oldest Invoice (days)',
      'Current (0-30)',
      '31-60 days',
      '61-90 days',
      '90+ days',
      'Risk Level',
      'Recommendation'
    ]

    const rows = clientSummaries.map(summary => [
      summary.clientName,
      summary.totalOutstanding.toFixed(2),
      summary.invoiceCount,
      summary.oldestInvoice,
      summary.current.toFixed(2),
      summary.aging_31_60.toFixed(2),
      summary.aging_61_90.toFixed(2),
      summary.aging_90_plus.toFixed(2),
      summary.riskLevel.toUpperCase(),
      summary.recommendation
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
    a.download = `aging-report-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast.success('Aging report exported')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getRiskColor = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
    }
  }

  const getRiskIcon = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'high':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
      case 'medium':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />
      case 'low':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />
    }
  }

  if (loading || permissionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating aging report...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Accounts Receivable Aging</h1>
            <p className="text-gray-600 mt-1">Track overdue invoices and collection priorities</p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Aging Buckets */}
      <div className="max-w-7xl mx-auto mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        {agingData.map((bucket, index) => (
          <div
            key={index}
            className={`bg-white rounded-lg shadow-sm p-6 ${
              index === 3 ? 'border-2 border-red-300' : ''
            }`}
          >
            <p className="text-sm text-gray-600 mb-1">{bucket.range}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(bucket.amount)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {bucket.count} invoice{bucket.count !== 1 ? 's' : ''}
            </p>
          </div>
        ))}
      </div>

      {/* Total Outstanding */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium mb-1">Total Accounts Receivable</p>
              <p className="text-4xl font-bold text-blue-900">{formatCurrency(totalOutstanding)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-600">Outstanding Invoices</p>
              <p className="text-3xl font-bold text-blue-900">{invoices.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Client Summaries with Recommendations */}
      <div className="max-w-7xl mx-auto mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Client Summary & Recommendations</h2>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Outstanding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  31-60
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  61-90
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  90+
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recommendation
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientSummaries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <CheckCircleIcon className="w-12 h-12 mx-auto mb-3 text-green-400" />
                    <p className="text-lg font-medium">All caught up!</p>
                    <p className="text-sm mt-1">No outstanding invoices</p>
                  </td>
                </tr>
              ) : (
                clientSummaries.map((summary) => (
                  <tr key={summary.clientId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-gray-900">{summary.clientName}</p>
                        <p className="text-xs text-gray-500">
                          {summary.invoiceCount} invoice{summary.invoiceCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {formatCurrency(summary.totalOutstanding)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatCurrency(summary.current)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                      {formatCurrency(summary.aging_31_60)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                      {formatCurrency(summary.aging_61_90)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                      {formatCurrency(summary.aging_90_plus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(
                          summary.riskLevel
                        )}`}
                      >
                        {getRiskIcon(summary.riskLevel)}
                        {summary.riskLevel.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                      <p>{summary.recommendation}</p>
                      {summary.riskLevel !== 'low' && (
                        <button
                          onClick={() => router.push(`/crm/contacts?search=${summary.clientName}`)}
                          className="text-blue-600 hover:text-blue-900 text-xs mt-1 flex items-center gap-1"
                        >
                          <PaperAirplaneIcon className="w-3 h-3" />
                          Take Action
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collection Tips */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-3">Collection Best Practices</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-yellow-800">
            <div>
              <p className="font-medium mb-1">📧 30 Days Past Due</p>
              <p>Send a friendly email reminder with invoice attached</p>
            </div>
            <div>
              <p className="font-medium mb-1">📞 60 Days Past Due</p>
              <p>Make a personal phone call to discuss payment arrangements</p>
            </div>
            <div>
              <p className="font-medium mb-1">⚠️ 90+ Days Past Due</p>
              <p>Send final notice and consider collections or legal action</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
