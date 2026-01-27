'use client'

export const dynamic = 'force-dynamic'

// ============================================================
// INCREDIBLE QUOTE DETAIL PAGE
// Beautiful timeline, status tracking, and actions
// ============================================================

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { QuoteWithRelations, QuoteActivity, QuoteStatus } from '@/types/quotes'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function QuoteDetailPage({ params }: PageProps) {
  const router = useRouter()
  const { id } = use(params)

  const [quote, setQuote] = useState<QuoteWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)

  useEffect(() => {
    loadQuote()
  }, [id])

  async function loadQuote() {
    try {
      setLoading(true)
      const response = await fetch(`/api/quotes/${id}`)
      const data = await response.json()

      if (data.data) {
        setQuote(data.data)
      } else {
        router.push('/quotes')
      }
    } catch (error) {
      console.error('Error loading quote:', error)
      router.push('/quotes')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(newStatus: QuoteStatus) {
    if (!quote) return

    setStatusUpdating(true)
    try {
      const response = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        await loadQuote()
      } else {
        alert('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status')
    } finally {
      setStatusUpdating(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this quote? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/quotes/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/quotes')
      } else {
        alert('Failed to delete quote')
      }
    } catch (error) {
      console.error('Error deleting quote:', error)
      alert('Error deleting quote')
    }
  }

  async function handleDuplicate() {
    try {
      const response = await fetch(`/api/quotes/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate' }),
      })

      if (response.ok) {
        const { data } = await response.json()
        router.push(`/quotes/${data.id}`)
      } else {
        alert('Failed to duplicate quote')
      }
    } catch (error) {
      console.error('Error duplicating quote:', error)
      alert('Error duplicating quote')
    }
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString))
  }

  function formatDateTime(dateString: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateString))
  }

  function getStatusColor(status: QuoteStatus): string {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-300'
      case 'sent':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'viewed':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'expired':
        return 'bg-gray-100 text-gray-500 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  function getStatusIcon(status: QuoteStatus): string {
    switch (status) {
      case 'draft':
        return '📝'
      case 'sent':
        return '📧'
      case 'viewed':
        return '👁️'
      case 'approved':
        return '✅'
      case 'rejected':
        return '❌'
      case 'expired':
        return '⏰'
      default:
        return '📄'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quote...</p>
        </div>
      </div>
    )
  }

  if (!quote) {
    return null
  }

  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/quotes" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
            ← Back to Quotes
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{quote.title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-lg text-gray-600">{quote.quote_number}</span>
                <span
                  className={`px-4 py-1 rounded-full text-sm font-bold uppercase border-2 ${getStatusColor(
                    quote.status
                  )}`}
                >
                  {getStatusIcon(quote.status)} {quote.status}
                </span>
                {isExpired && (
                  <span className="px-4 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700 border-2 border-red-300">
                    ⚠️ EXPIRED
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Total Amount</div>
              <div className="text-4xl font-bold text-blue-600">{formatCurrency(quote.total_amount, quote.currency)}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link
                  href={`/quotes/${id}/edit`}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-semibold shadow hover:shadow-lg"
                >
                  ✏️ Edit
                </Link>
                <button
                  onClick={handleDuplicate}
                  className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold shadow hover:shadow-lg"
                >
                  📋 Duplicate
                </button>
                <Link
                  href={`/quotes/${id}/pdf`}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center font-semibold shadow hover:shadow-lg"
                >
                  📄 PDF
                </Link>
                <button
                  onClick={handleDelete}
                  className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold shadow hover:shadow-lg"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>

            {/* Client Information */}
            {quote.client && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Client Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Name</div>
                    <div className="font-semibold text-gray-900">{quote.client.contact_name}</div>
                  </div>
                  {quote.client.company_name && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Company</div>
                      <div className="font-semibold text-gray-900">{quote.client.company_name}</div>
                    </div>
                  )}
                  {quote.client.email && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Email</div>
                      <div className="font-semibold text-gray-900">
                        <a href={`mailto:${quote.client.email}`} className="text-blue-600 hover:text-blue-700">
                          {quote.client.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {quote.client.phone && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Phone</div>
                      <div className="font-semibold text-gray-900">
                        <a href={`tel:${quote.client.phone}`} className="text-blue-600 hover:text-blue-700">
                          {quote.client.phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Line Items */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Line Items</h2>

              {quote.items && quote.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Qty</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Unit Price</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {quote.items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{item.description}</div>
                            {item.category && (
                              <div className="text-xs text-gray-500 mt-1">Category: {item.category}</div>
                            )}
                            {item.notes && <div className="text-xs text-gray-500 mt-1">Note: {item.notes}</div>}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            {formatCurrency(item.unit_price, quote.currency)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                            {formatCurrency(item.line_total, quote.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No line items</p>
              )}

              {/* Pricing Summary */}
              <div className="mt-6 border-t-2 border-gray-200 pt-4">
                <div className="max-w-md ml-auto space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(quote.subtotal, quote.currency)}</span>
                  </div>
                  {quote.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>
                        Discount
                        {quote.discount_type === 'percentage' && ` (${quote.discount_value}%)`}:
                      </span>
                      <span className="font-semibold">-{formatCurrency(quote.discount_amount, quote.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-700">
                    <span>Tax ({quote.tax_rate}%):</span>
                    <span className="font-semibold">{formatCurrency(quote.tax_amount, quote.currency)}</span>
                  </div>
                  <div className="border-t-2 border-gray-300 pt-2 flex justify-between text-xl font-bold text-blue-600">
                    <span>Total:</span>
                    <span>{formatCurrency(quote.total_amount, quote.currency)}</span>
                  </div>
                  {quote.deposit_required > 0 && (
                    <div className="flex justify-between text-orange-600 bg-orange-50 px-3 py-2 rounded">
                      <span className="font-semibold">Deposit Required ({quote.deposit_required}%):</span>
                      <span className="font-bold">{formatCurrency(quote.deposit_amount, quote.currency)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            {quote.terms_conditions && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Terms & Conditions</h2>
                <div className="text-gray-700 whitespace-pre-wrap text-sm">{quote.terms_conditions}</div>
              </div>
            )}

            {/* Notes */}
            {quote.notes && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Notes</h2>
                <div className="text-gray-700 whitespace-pre-wrap">{quote.notes}</div>
              </div>
            )}

            {/* Internal Notes */}
            {quote.internal_notes && (
              <div className="bg-yellow-50 rounded-xl shadow-lg p-6 border-2 border-yellow-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🔒 Internal Notes (Private)</h2>
                <div className="text-gray-700 whitespace-pre-wrap">{quote.internal_notes}</div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Management */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Update Status</h2>
              <div className="space-y-2">
                {(['draft', 'sent', 'viewed', 'approved', 'rejected'] as QuoteStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(status)}
                    disabled={statusUpdating || quote.status === status}
                    className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      quote.status === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {getStatusIcon(status)} {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Quote Details */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quote Details</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-600 mb-1">Quote Date</div>
                  <div className="font-semibold text-gray-900">{formatDate(quote.quote_date)}</div>
                </div>
                {quote.valid_until && (
                  <div>
                    <div className="text-gray-600 mb-1">Valid Until</div>
                    <div className={`font-semibold ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatDate(quote.valid_until)}
                      {isExpired && ' (Expired)'}
                    </div>
                  </div>
                )}
                {quote.payment_terms && (
                  <div>
                    <div className="text-gray-600 mb-1">Payment Terms</div>
                    <div className="font-semibold text-gray-900">{quote.payment_terms}</div>
                  </div>
                )}
                <div>
                  <div className="text-gray-600 mb-1">Currency</div>
                  <div className="font-semibold text-gray-900">{quote.currency}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Created</div>
                  <div className="font-semibold text-gray-900">{formatDateTime(quote.created_at)}</div>
                </div>
                {quote.updated_at !== quote.created_at && (
                  <div>
                    <div className="text-gray-600 mb-1">Last Updated</div>
                    <div className="font-semibold text-gray-900">{formatDateTime(quote.updated_at)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Activity Timeline</h2>

              <div className="space-y-4">
                {quote.activities && quote.activities.length > 0 ? (
                  quote.activities.map((activity: QuoteActivity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">
                        {activity.activity_type === 'created' && '🎉'}
                        {activity.activity_type === 'status_changed' && '🔄'}
                        {activity.activity_type === 'sent' && '📧'}
                        {activity.activity_type === 'viewed' && '👁️'}
                        {activity.activity_type === 'approved' && '✅'}
                        {activity.activity_type === 'rejected' && '❌'}
                        {activity.activity_type === 'edited' && '✏️'}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">{activity.description}</div>
                        <div className="text-xs text-gray-500 mt-1">{formatDateTime(activity.created_at)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-gray-500 text-sm">No activity yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tracking Stats */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 border-2 border-purple-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tracking</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Views</span>
                  <span className="text-2xl font-bold text-purple-600">{quote.view_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Emails Sent</span>
                  <span className="text-2xl font-bold text-purple-600">{quote.email_sent_count || 0}</span>
                </div>
                {quote.sent_at && (
                  <div className="pt-3 border-t border-purple-200">
                    <div className="text-xs text-gray-600 mb-1">First Sent</div>
                    <div className="text-sm font-semibold text-gray-900">{formatDateTime(quote.sent_at)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
