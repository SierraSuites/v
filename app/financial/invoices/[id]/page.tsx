'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  getInvoice,
  getPayments,
  updateInvoice,
  sendInvoice,
  recordPayment
} from '@/lib/supabase/financial'
import type { Invoice, Payment, PaymentMethod } from '@/types/financial'
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XMarkIcon,
  BanknotesIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import toast, { Toaster } from 'react-hot-toast'

export default function InvoiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string

  // RBAC: Require canViewFinancials permission
  const { loading: permissionLoading } = usePermissionGuard({
    permission: 'canViewFinancials',
    redirectTo: '/unauthorized'
  })

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  // Record Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('check')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)

  // Actions
  const [sending, setSending] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  useEffect(() => {
    loadData()
  }, [invoiceId])

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

      // Load invoice and payments
      await Promise.all([
        loadInvoice(),
        loadPayments()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error loading invoice details')
    } finally {
      setLoading(false)
    }
  }

  async function loadInvoice() {
    const { data, error } = await getInvoice(invoiceId)
    if (data) {
      setInvoice(data)
    } else if (error) {
      toast.error('Invoice not found')
      router.push('/financial')
    }
  }

  async function loadPayments() {
    if (!profile?.company_id) return
    const { data } = await getPayments(profile.company_id, invoiceId)
    if (data) {
      setPayments(data)
    }
  }

  function openPaymentModal() {
    if (!invoice) return
    setPaymentAmount(invoice.balance_due.toString())
    setPaymentDate(new Date().toISOString().split('T')[0])
    setPaymentMethod('check')
    setReferenceNumber('')
    setPaymentNotes('')
    setShowPaymentModal(true)
  }

  async function handleRecordPayment() {
    if (!invoice || !profile?.company_id) return

    // Validation
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    if (amount > invoice.balance_due) {
      toast.error('Payment amount cannot exceed balance due')
      return
    }

    if (!paymentDate) {
      toast.error('Payment date is required')
      return
    }

    setSavingPayment(true)
    const loadingToast = toast.loading('Recording payment...')

    try {
      const paymentData: Partial<Payment> = {
        invoice_id: invoice.id,
        company_id: profile.company_id,
        payment_date: paymentDate,
        amount,
        payment_method: paymentMethod,
        reference_number: referenceNumber || undefined,
        notes: paymentNotes || undefined
      }

      const { data, error } = await recordPayment(paymentData)

      if (error) {
        toast.error(`Error recording payment: ${error}`, { id: loadingToast })
        return
      }

      toast.success('Payment recorded successfully!', { id: loadingToast })
      setShowPaymentModal(false)

      // Reload data
      await Promise.all([
        loadInvoice(),
        loadPayments()
      ])
    } catch (error: any) {
      console.error('Error recording payment:', error)
      toast.error(error?.message || 'Error recording payment', { id: loadingToast })
    } finally {
      setSavingPayment(false)
    }
  }

  async function handleResendInvoice() {
    if (!invoice) return

    setSending(true)
    const loadingToast = toast.loading('Sending invoice...')

    try {
      const clientName = invoice.contact?.company_name ||
        `${invoice.contact?.first_name} ${invoice.contact?.last_name}`

      await sendInvoice(invoice.id, {
        to: invoice.contact?.email || '',
        subject: `Invoice ${invoice.invoice_number} from ${profile?.company_name || 'The Sierra Suites'}`,
        message: `Dear ${clientName},\n\nPlease find attached invoice ${invoice.invoice_number} for ${formatCurrency(invoice.total_amount)}.\n\nDue date: ${formatDate(invoice.due_date)}\n\nPayment terms: ${invoice.payment_terms}\n\nThank you for your business!`
      })

      // Update invoice status
      await updateInvoice(invoice.id, {
        status: invoice.status === 'draft' ? 'sent' : invoice.status,
        sent_at: invoice.sent_at || new Date().toISOString(),
        last_email_sent_at: new Date().toISOString(),
        email_sent_count: (invoice.email_sent_count || 0) + 1
      })

      toast.success('Invoice sent successfully!', { id: loadingToast })
      await loadInvoice()
    } catch (error: any) {
      console.error('Error sending invoice:', error)
      toast.error(error?.message || 'Error sending invoice', { id: loadingToast })
    } finally {
      setSending(false)
    }
  }

  async function handleMarkAsPaid() {
    if (!invoice) return

    const loadingToast = toast.loading('Marking as paid...')

    try {
      await updateInvoice(invoice.id, {
        status: 'paid',
        paid_at: new Date().toISOString(),
        amount_paid: invoice.total_amount
      })

      toast.success('Invoice marked as paid!', { id: loadingToast })
      await loadInvoice()
    } catch (error: any) {
      console.error('Error marking as paid:', error)
      toast.error(error?.message || 'Error marking as paid', { id: loadingToast })
    }
  }

  async function handleVoidInvoice() {
    if (!invoice) return

    if (!confirm('Are you sure you want to void this invoice? This action cannot be undone.')) {
      return
    }

    const loadingToast = toast.loading('Voiding invoice...')

    try {
      await updateInvoice(invoice.id, {
        status: 'void'
      })

      toast.success('Invoice voided', { id: loadingToast })
      await loadInvoice()
    } catch (error: any) {
      console.error('Error voiding invoice:', error)
      toast.error(error?.message || 'Error voiding invoice', { id: loadingToast })
    }
  }

  async function handleDownloadPDF() {
    if (!invoice) return

    setDownloadingPDF(true)
    const loadingToast = toast.loading('Generating PDF...')

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`)

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoice.invoice_number}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('PDF downloaded', { id: loadingToast })
    } catch (error: any) {
      console.error('Error downloading PDF:', error)
      toast.error(error?.message || 'Error generating PDF', { id: loadingToast })
    } finally {
      setDownloadingPDF(false)
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
      case 'void':
        return 'bg-gray-100 text-gray-500'
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
        return null
    }
  }

  if (loading || permissionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-600 mb-4">The invoice you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/financial')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Financial Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/financial')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Invoices
          </button>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  Invoice {invoice.invoice_number}
                </h1>
                <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                  {getStatusIcon(invoice.status)}
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
              <p className="mt-1 text-gray-600">
                Created {formatDate(invoice.created_at)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {invoice.status !== 'void' && invoice.balance_due > 0 && (
                <button
                  onClick={openPaymentModal}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <BanknotesIcon className="w-5 h-5" />
                  Record Payment
                </button>
              )}

              {invoice.status !== 'void' && (
                <button
                  onClick={handleResendInvoice}
                  disabled={sending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                  {sending ? 'Sending...' : 'Resend Invoice'}
                </button>
              )}

              {invoice.status === 'draft' && (
                <button
                  onClick={() => router.push(`/financial/invoices/${invoice.id}/edit`)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <PencilIcon className="w-5 h-5" />
                  Edit
                </button>
              )}

              <button
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                {downloadingPDF ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>

        {/* Alert for overdue */}
        {invoice.status === 'overdue' && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  This invoice is overdue
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  Due date was {formatDate(invoice.due_date)}. Contact the client for payment.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Bill To */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">BILL TO</h3>
                  <p className="font-semibold text-gray-900">
                    {invoice.contact?.company_name ||
                      `${invoice.contact?.first_name} ${invoice.contact?.last_name}`}
                  </p>
                  {invoice.contact?.email && (
                    <p className="text-sm text-gray-600">{invoice.contact.email}</p>
                  )}
                  {invoice.contact?.phone && (
                    <p className="text-sm text-gray-600">{invoice.contact.phone}</p>
                  )}
                </div>

                {/* Invoice Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">INVOICE DETAILS</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Date:</span>
                      <span className="font-medium">{formatDate(invoice.invoice_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-medium">{formatDate(invoice.due_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Terms:</span>
                      <span className="font-medium">{invoice.payment_terms}</span>
                    </div>
                    {invoice.project && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Project:</span>
                        <span className="font-medium">{invoice.project.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h3>
                <table className="w-full">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left py-2 text-sm font-medium text-gray-500">DESCRIPTION</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-500">QTY</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-500">RATE</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-500">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.line_items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 text-gray-900">{item.description}</td>
                        <td className="py-3 text-right text-gray-600">{item.quantity}</td>
                        <td className="py-3 text-right text-gray-600">{formatCurrency(item.rate)}</td>
                        <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="mt-6 flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.discount_amount && invoice.discount_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium">-{formatCurrency(invoice.discount_amount)}</span>
                      </div>
                    )}
                    {invoice.tax_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax ({(invoice.tax_rate * 100).toFixed(2)}%):</span>
                        <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 pt-2">
                      <span className="font-semibold text-gray-900">Total:</span>
                      <span className="font-bold text-xl text-gray-900">{formatCurrency(invoice.total_amount)}</span>
                    </div>
                    {invoice.amount_paid > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Amount Paid:</span>
                          <span className="font-medium text-green-600">-{formatCurrency(invoice.amount_paid)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-2">
                          <span className="font-semibold text-gray-900">Balance Due:</span>
                          <span className="font-bold text-xl text-blue-600">{formatCurrency(invoice.balance_due)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">NOTES</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* Payment History */}
            {payments.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircleIcon className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(payment.amount)} - {payment.payment_method}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(payment.payment_date)}
                            {payment.reference_number && ` • Ref: ${payment.reference_number}`}
                          </p>
                          {payment.notes && (
                            <p className="text-sm text-gray-500 mt-1">{payment.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {invoice.status !== 'void' && invoice.status !== 'paid' && (
                  <button
                    onClick={handleMarkAsPaid}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    Mark as Paid
                  </button>
                )}
                {invoice.status !== 'void' && (
                  <button
                    onClick={handleVoidInvoice}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                    Void Invoice
                  </button>
                )}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity</h3>
              <div className="space-y-4">
                {invoice.paid_at && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Paid</p>
                      <p className="text-xs text-gray-500">{formatDate(invoice.paid_at)}</p>
                    </div>
                  </div>
                )}
                {invoice.sent_at && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <PaperAirplaneIcon className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Sent to client</p>
                      <p className="text-xs text-gray-500">{formatDate(invoice.sent_at)}</p>
                      {invoice.email_sent_count && invoice.email_sent_count > 1 && (
                        <p className="text-xs text-gray-500">Sent {invoice.email_sent_count} times</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <PencilIcon className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Created</p>
                    <p className="text-xs text-gray-500">{formatDate(invoice.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Record Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Invoice #{invoice.invoice_number}
                  </p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Invoice Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(invoice.total_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">Already Paid:</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(invoice.amount_paid)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-200">
                    <span className="text-gray-600 font-medium">Balance Due:</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(invoice.balance_due)}
                    </span>
                  </div>
                </div>

                {/* Payment Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      min="0"
                      max={invoice.balance_due}
                      step="0.01"
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="check">Check</option>
                    <option value="ach">ACH Transfer</option>
                    <option value="wire">Wire Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Check number, transaction ID, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Optional payment notes"
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={savingPayment}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={savingPayment}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <BanknotesIcon className="w-5 h-5" />
                  {savingPayment ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
