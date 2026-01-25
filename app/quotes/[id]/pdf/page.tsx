'use client'

// ============================================================
// PROFESSIONAL PDF QUOTE PAGE
// Beautiful, printable quote with branding
// ============================================================

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import type { QuoteWithRelations } from '@/types/quotes'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function QuotePDFPage({ params }: PageProps) {
  const router = useRouter()
  const { id } = use(params)
  const printRef = useRef<HTMLDivElement>(null)

  const [quote, setQuote] = useState<QuoteWithRelations | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuote()
  }, [id])

  async function loadQuote() {
    try {
      const response = await fetch(`/api/quotes/${id}`)
      const data = await response.json()

      if (data.data) {
        setQuote(data.data)
      }
    } catch (error) {
      console.error('Error loading quote:', error)
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  function handleDownload() {
    // In a real implementation, you'd generate a proper PDF file
    // For now, we'll use the browser's print-to-PDF
    window.print()
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quote...</p>
        </div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Quote not found</p>
          <button onClick={() => router.push('/quotes')} className="mt-4 text-blue-600 hover:text-blue-700">
            Back to Quotes
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Print/Download Actions (hidden on print) */}
      <div className="print:hidden bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push(`/quotes/${id}`)}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Back to Quote
          </button>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              🖨️ Print
            </button>
            <button
              onClick={handleDownload}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              📥 Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div ref={printRef} className="bg-white">
        <div className="max-w-4xl mx-auto p-12">
          {/* Header */}
          <div className="flex justify-between items-start mb-12 pb-8 border-b-4 border-blue-600">
            <div>
              <h1 className="text-5xl font-bold text-gray-900 mb-2">QUOTE</h1>
              <div className="text-gray-600">
                <div className="text-lg font-semibold">{quote.quote_number}</div>
                <div className="text-sm mt-1">Date: {formatDate(quote.quote_date)}</div>
                {quote.valid_until && (
                  <div className="text-sm">Valid Until: {formatDate(quote.valid_until)}</div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {formatCurrency(quote.total_amount, quote.currency)}
              </div>
              <div className="text-sm text-gray-600">Total Amount</div>
            </div>
          </div>

          {/* From/To Section */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            {/* From (Company) */}
            <div>
              <div className="text-sm font-bold text-gray-600 uppercase mb-3">From</div>
              <div className="text-lg font-bold text-gray-900 mb-1">The Sierra Suites</div>
              <div className="text-sm text-gray-600">
                <div>Construction Management Software</div>
                <div className="mt-2">Email: info@sierrasuites.com</div>
                <div>Phone: (555) 123-4567</div>
              </div>
            </div>

            {/* To (Client) */}
            <div>
              <div className="text-sm font-bold text-gray-600 uppercase mb-3">To</div>
              {quote.client ? (
                <div>
                  <div className="text-lg font-bold text-gray-900 mb-1">{quote.client.contact_name}</div>
                  {quote.client.company_name && (
                    <div className="text-sm text-gray-700 font-semibold">{quote.client.company_name}</div>
                  )}
                  <div className="text-sm text-gray-600 mt-2">
                    {quote.client.email && <div>Email: {quote.client.email}</div>}
                    {quote.client.phone && <div>Phone: {quote.client.phone}</div>}
                    {quote.client.address && <div className="mt-1">{quote.client.address}</div>}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">No client specified</div>
              )}
            </div>
          </div>

          {/* Quote Title & Description */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{quote.title}</h2>
            {quote.description && <p className="text-gray-700">{quote.description}</p>}
          </div>

          {/* Line Items */}
          <div className="mb-12">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">#</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Description</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Qty</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Unit Price</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quote.items && quote.items.length > 0 ? (
                  quote.items.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{item.description}</div>
                        {item.category && <div className="text-xs text-gray-500 mt-1">{item.category}</div>}
                        {item.notes && <div className="text-xs text-gray-600 mt-1 italic">{item.notes}</div>}
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mb-12">
            <div className="max-w-md ml-auto">
              <div className="space-y-2 mb-4">
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
              </div>

              <div className="border-t-2 border-gray-300 pt-3 flex justify-between text-2xl font-bold text-blue-600">
                <span>Total:</span>
                <span>{formatCurrency(quote.total_amount, quote.currency)}</span>
              </div>

              {quote.deposit_required > 0 && (
                <div className="mt-4 bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                  <div className="flex justify-between text-orange-700">
                    <span className="font-semibold">Deposit Required ({quote.deposit_required}%):</span>
                    <span className="text-xl font-bold">{formatCurrency(quote.deposit_amount, quote.currency)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Terms */}
          {quote.payment_terms && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Payment Terms</h3>
              <p className="text-gray-700">{quote.payment_terms}</p>
            </div>
          )}

          {/* Terms & Conditions */}
          {quote.terms_conditions && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Terms & Conditions</h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded border border-gray-200">
                {quote.terms_conditions}
              </div>
            </div>
          )}

          {/* Notes */}
          {quote.notes && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Additional Notes</h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-16 pt-8 border-t-2 border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-2">Thank you for your business!</p>
            <p className="text-xs text-gray-500">
              This quote is valid until {quote.valid_until ? formatDate(quote.valid_until) : 'acceptance'}
            </p>
            {quote.status === 'approved' && quote.approved_at && (
              <div className="mt-4 inline-block bg-green-100 border-2 border-green-500 rounded-lg px-6 py-3">
                <div className="text-lg font-bold text-green-700">✓ APPROVED</div>
                <div className="text-xs text-green-600 mt-1">Approved on {formatDate(quote.approved_at)}</div>
              </div>
            )}
          </div>

          {/* Watermark for drafts */}
          {quote.status === 'draft' && (
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50 print:block hidden">
              <div
                className="text-9xl font-bold text-gray-300 opacity-20 transform -rotate-45"
                style={{ fontSize: '200px' }}
              >
                DRAFT
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          @page {
            size: A4;
            margin: 0.5in;
          }
        }
      `}</style>
    </>
  )
}
