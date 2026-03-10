'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'

interface CashFlowWeek {
  week_number: number
  week_start: string
  week_end: string
  beginning_balance: number
  invoices_due: number
  expected_payments: number
  total_cash_in: number
  payroll: number
  materials: number
  subcontractors: number
  operating_expenses: number
  total_cash_out: number
  net_change: number
  ending_balance: number
  alerts: string[]
}

interface Invoice {
  id: string
  invoice_number: string
  total_amount: number
  amount_paid: number
  balance_due: number
  due_date: string
  status: string
  contact?: { full_name: string } | null
}

interface Expense {
  id: string
  amount: number
  date: string
  category: string
  payment_status: string
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

export default function CashFlowPage() {
  const router = useRouter()
  const supabase = createClient()

  const { loading: permissionLoading } = usePermissionGuard({ permission: 'canViewFinancials', redirectTo: '/unauthorized' })

  const [loading, setLoading] = useState(true)
  const [weeks, setWeeks] = useState<CashFlowWeek[]>([])
  const [currentBalance, setCurrentBalance] = useState(0)
  const [outstandingAR, setOutstandingAR] = useState(0)
  const [overdueAR, setOverdueAR] = useState(0)
  const [pendingExpenses, setPendingExpenses] = useState(0)
  const [upcomingInvoices, setUpcomingInvoices] = useState<Invoice[]>([])
  const [weeksToShow, setWeeksToShow] = useState(8)
  const [manualBalance, setManualBalance] = useState<string>('')
  const [editingBalance, setEditingBalance] = useState(false)

  useEffect(() => {
    if (!permissionLoading) loadCashFlow()
  }, [permissionLoading])

  async function loadCashFlow() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Load invoices (outstanding/upcoming)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, amount_paid, balance_due, due_date, status, contact:contacts(full_name)')
        .in('status', ['sent', 'viewed', 'partial', 'overdue'])
        .order('due_date', { ascending: true })

      // Load pending expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, amount, date, category, payment_status')
        .eq('payment_status', 'pending')
        .gte('date', formatDate(new Date()))
        .order('date', { ascending: true })

      const invoiceList: Invoice[] = (invoices || []).map((inv: any) => ({
        ...inv,
        contact: Array.isArray(inv.contact) ? (inv.contact[0] ?? null) : inv.contact,
      }))
      const expenseList: Expense[] = expenses || []

      const today = new Date()
      const totalOutstanding = invoiceList.reduce((s, i) => s + (i.balance_due || 0), 0)
      const totalOverdue = invoiceList
        .filter(i => i.status === 'overdue' || (i.due_date && new Date(i.due_date) < today))
        .reduce((s, i) => s + (i.balance_due || 0), 0)
      const totalPendingExpenses = expenseList.reduce((s, e) => s + (e.amount || 0), 0)

      setOutstandingAR(totalOutstanding)
      setOverdueAR(totalOverdue)
      setPendingExpenses(totalPendingExpenses)
      setUpcomingInvoices(invoiceList.slice(0, 10) as Invoice[])

      // Build 12-week forecast
      const startingBalance = parseFloat(manualBalance) || 0
      const forecastWeeks = buildForecast(invoiceList, expenseList, startingBalance, 12)
      setWeeks(forecastWeeks)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function buildForecast(invoices: Invoice[], expenses: Expense[], startBalance: number, numWeeks: number): CashFlowWeek[] {
    const today = new Date()
    const weekStart = startOfWeek(today)
    let balance = startBalance
    const result: CashFlowWeek[] = []

    for (let w = 0; w < numWeeks; w++) {
      const wStart = addDays(weekStart, w * 7)
      const wEnd = addDays(wStart, 6)
      const wStartStr = formatDate(wStart)
      const wEndStr = formatDate(wEnd)

      // Invoices due this week (50% collection rate assumption)
      const weekInvoices = invoices.filter(i => {
        if (!i.due_date) return false
        const due = i.due_date.split('T')[0]
        return due >= wStartStr && due <= wEndStr
      })
      const invoicesDue = weekInvoices.reduce((s, i) => s + (i.balance_due || 0), 0)
      const expectedPayments = invoicesDue * 0.7 // 70% collection rate

      // Expenses due this week
      const weekExpenses = expenses.filter(e => {
        if (!e.date) return false
        const d = e.date.split('T')[0]
        return d >= wStartStr && d <= wEndStr
      })
      const materialsOut = weekExpenses.filter(e => e.category === 'materials').reduce((s, e) => s + e.amount, 0)
      const subOut = weekExpenses.filter(e => e.category === 'subcontractors').reduce((s, e) => s + e.amount, 0)
      const otherOut = weekExpenses.filter(e => !['materials', 'subcontractors', 'payroll'].includes(e.category)).reduce((s, e) => s + e.amount, 0)

      const totalCashIn = expectedPayments
      const totalCashOut = materialsOut + subOut + otherOut
      const netChange = totalCashIn - totalCashOut
      const endingBalance = balance + netChange

      // Alerts
      const alerts: string[] = []
      if (endingBalance < 0) alerts.push('⚠️ Projected negative balance')
      if (endingBalance < 10000 && endingBalance >= 0) alerts.push('⚠️ Balance below $10K safety threshold')

      result.push({
        week_number: w + 1,
        week_start: wStartStr,
        week_end: wEndStr,
        beginning_balance: balance,
        invoices_due: invoicesDue,
        expected_payments: expectedPayments,
        total_cash_in: totalCashIn,
        payroll: 0,
        materials: materialsOut,
        subcontractors: subOut,
        operating_expenses: otherOut,
        total_cash_out: totalCashOut,
        net_change: netChange,
        ending_balance: endingBalance,
        alerts,
      })

      balance = endingBalance
    }

    return result
  }

  function handleBalanceSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEditingBalance(false)
    const balance = parseFloat(manualBalance) || 0
    setCurrentBalance(balance)
    // Rebuild forecast with new balance
    loadCashFlow()
  }

  const projectedLow = weeks.length > 0 ? Math.min(...weeks.map(w => w.ending_balance)) : 0
  const projectedLowWeek = weeks.find(w => w.ending_balance === projectedLow)
  const visibleWeeks = weeks.slice(0, weeksToShow)

  if (loading || permissionLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/financial" className="text-gray-400 hover:text-gray-600">
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cash Flow Forecast</h1>
              <p className="text-sm text-gray-500">12-week rolling projection based on invoices and expenses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={weeksToShow} onChange={e => setWeeksToShow(parseInt(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value={4}>4 weeks</option>
              <option value={8}>8 weeks</option>
              <option value={12}>12 weeks</option>
            </select>
          </div>
        </div>

        {/* Current Balance Input */}
        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex items-center gap-4">
            <BanknotesIcon className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-0.5">Current Bank Balance</p>
              {editingBalance ? (
                <form onSubmit={handleBalanceSubmit} className="flex items-center gap-2">
                  <span className="text-gray-500">$</span>
                  <input type="number" value={manualBalance} onChange={e => setManualBalance(e.target.value)}
                    autoFocus placeholder="Enter current balance"
                    className="border rounded px-2 py-1 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="submit" className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg">Set</button>
                  <button type="button" onClick={() => setEditingBalance(false)} className="text-xs text-gray-500">Cancel</button>
                </form>
              ) : (
                <button onClick={() => setEditingBalance(true)} className="text-lg font-bold text-gray-900 hover:text-blue-600">
                  {manualBalance ? formatCurrency(parseFloat(manualBalance)) : 'Click to set current balance →'}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400">Enter your actual bank balance to get accurate projections</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-5">
            <p className="text-xs text-gray-500 mb-1">Outstanding AR</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(outstandingAR)}</p>
            <p className="text-xs text-gray-400 mt-1">Expected to collect</p>
          </div>
          <div className={`rounded-xl border p-5 ${overdueAR > 0 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
            <p className="text-xs text-gray-500 mb-1">Overdue AR</p>
            <p className={`text-2xl font-bold ${overdueAR > 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(overdueAR)}</p>
            <p className="text-xs text-gray-400 mt-1">Needs follow-up</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-xs text-gray-500 mb-1">Pending Expenses</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(pendingExpenses)}</p>
            <p className="text-xs text-gray-400 mt-1">Bills to pay</p>
          </div>
          <div className={`rounded-xl border p-5 ${projectedLow < 0 ? 'bg-red-50 border-red-200' : projectedLow < 10000 ? 'bg-yellow-50 border-yellow-200' : 'bg-white'}`}>
            <p className="text-xs text-gray-500 mb-1">Projected Low Point</p>
            <p className={`text-2xl font-bold ${projectedLow < 0 ? 'text-red-600' : projectedLow < 10000 ? 'text-yellow-600' : 'text-gray-900'}`}>
              {formatCurrency(projectedLow)}
            </p>
            {projectedLowWeek && (
              <p className="text-xs text-gray-400 mt-1">Week of {new Date(projectedLowWeek.week_start).toLocaleDateString()}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Weekly Forecast Table */}
          <div className="col-span-2">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h2 className="font-semibold text-gray-900">Weekly Forecast</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Week</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Opening</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium text-green-600">Cash In</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium text-red-500">Cash Out</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Net</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleWeeks.map((week, i) => {
                      const isLow = week.ending_balance < 0
                      const isWarn = !isLow && week.ending_balance < 10000
                      return (
                        <tr key={week.week_number} className={`border-t ${isLow ? 'bg-red-50' : isWarn ? 'bg-yellow-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">Week {week.week_number}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(week.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                              {new Date(week.week_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                            {week.alerts.map((a, ai) => (
                              <p key={ai} className="text-xs text-red-600 mt-0.5">{a}</p>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{formatCurrency(week.beginning_balance)}</td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium tabular-nums">+{formatCurrency(week.total_cash_in)}</td>
                          <td className="px-4 py-3 text-right text-red-500 font-medium tabular-nums">-{formatCurrency(week.total_cash_out)}</td>
                          <td className={`px-4 py-3 text-right font-medium tabular-nums ${week.net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {week.net_change >= 0 ? '+' : ''}{formatCurrency(week.net_change)}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold tabular-nums ${isLow ? 'text-red-600' : isWarn ? 'text-yellow-600' : 'text-gray-900'}`}>
                            {formatCurrency(week.ending_balance)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Upcoming Invoices */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Upcoming Invoices</h3>
              {upcomingInvoices.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">No outstanding invoices</p>
              ) : (
                <div className="space-y-2">
                  {upcomingInvoices.slice(0, 6).map(inv => {
                    const isOverdue = inv.status === 'overdue' || (inv.due_date && new Date(inv.due_date) < new Date())
                    return (
                      <Link key={inv.id} href={`/financial/invoices/${inv.id}`}
                        className="block p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-900">#{inv.invoice_number}</p>
                            <p className="text-xs text-gray-500">{(inv.contact as any)?.full_name || 'Unknown'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-gray-900">{formatCurrency(inv.balance_due)}</p>
                            <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                              {isOverdue ? 'Overdue' : `Due ${new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
              <Link href="/financial" className="block text-center text-xs text-blue-600 hover:text-blue-700 mt-3">
                View all invoices →
              </Link>
            </div>

            {/* Assumptions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="font-semibold text-blue-900 mb-2 text-sm">Forecast Assumptions</h3>
              <ul className="space-y-1.5 text-xs text-blue-800">
                <li>• 70% collection rate on invoices due each week</li>
                <li>• Pending expenses allocated to scheduled dates</li>
                <li>• Does not include unscheduled payroll</li>
                <li>• Enter your bank balance above for accurate projections</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Improve Cash Flow</h3>
              <div className="space-y-2">
                <Link href="/financial/invoices/new"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                  Send a new invoice
                </Link>
                <Link href="/financial/aging"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
                  <ExclamationTriangleIcon className="w-4 h-4 text-orange-500" />
                  Chase overdue invoices
                </Link>
                <Link href="/financial/expenses/new"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
                  <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                  Log an expense
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
