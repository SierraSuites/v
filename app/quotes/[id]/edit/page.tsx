'use client'

export const dynamic = 'force-dynamic'


// ============================================================
// QUOTE EDIT PAGE
// Seamless editing experience with live preview
// ============================================================

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import type { QuoteWithRelations, QuoteItemFormData } from '@/types/quotes'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditQuotePage({ params }: PageProps) {
  const router = useRouter()
  const { id } = use(params)

  const [quote, setQuote] = useState<QuoteWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state (initialized when quote loads)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [lineItems, setLineItems] = useState<QuoteItemFormData[]>([])
  const [taxRate, setTaxRate] = useState(0)
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed')
  const [discountValue, setDiscountValue] = useState(0)
  const [depositRequired, setDepositRequired] = useState(0)
  const [termsConditions, setTermsConditions] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  useEffect(() => {
    loadQuote()
  }, [id])

  async function loadQuote() {
    try {
      setLoading(true)
      const response = await fetch(`/api/quotes/${id}`)
      const data = await response.json()

      if (data.data) {
        const q = data.data
        setQuote(q)

        // Populate form
        setTitle(q.title)
        setDescription(q.description || '')
        setTaxRate(q.tax_rate)
        setDiscountType(q.discount_type)
        setDiscountValue(q.discount_value)
        setDepositRequired(q.deposit_required)
        setTermsConditions(q.terms_conditions || '')
        setPaymentTerms(q.payment_terms || '')
        setNotes(q.notes || '')
        setInternalNotes(q.internal_notes || '')

        // Load line items
        if (q.items && q.items.length > 0) {
          setLineItems(
            q.items.map((item: any) => ({
              category: item.category || '',
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              tax_rate: item.tax_rate,
              is_optional: item.is_optional,
              notes: item.notes || '',
            }))
          )
        }
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

  function calculateTotals() {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

    let discount = 0
    if (discountType === 'percentage') {
      discount = subtotal * (discountValue / 100)
    } else {
      discount = discountValue
    }

    const taxableAmount = subtotal - discount
    const tax = taxableAmount * (taxRate / 100)
    const total = taxableAmount + tax
    const deposit = total * (depositRequired / 100)

    return { subtotal, tax, discount, total, deposit }
  }

  async function handleSave() {
    if (!title.trim()) {
      alert('Please enter a quote title')
      return
    }

    setSaving(true)

    try {
      const totals = calculateTotals()

      // Update quote
      const quoteResponse = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          tax_rate: taxRate,
          discount_type: discountType,
          discount_value: discountValue,
          deposit_required: depositRequired,
          terms_conditions: termsConditions,
          payment_terms: paymentTerms,
          notes,
          internal_notes: internalNotes,
          subtotal: totals.subtotal,
          tax_amount: totals.tax,
          discount_amount: totals.discount,
          total_amount: totals.total,
          deposit_amount: totals.deposit,
        }),
      })

      if (!quoteResponse.ok) {
        throw new Error('Failed to update quote')
      }

      // TODO: Update line items (would need delete all + re-add or update individual items)
      // For now, we'll just update the quote header

      router.push(`/quotes/${id}`)
    } catch (error) {
      console.error('Error saving quote:', error)
      alert('Failed to save quote. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: quote?.currency || 'USD',
    }).format(amount)
  }

  const totals = calculateTotals()

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

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-orange-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Edit Quote</h1>
          <p className="text-gray-600">{quote.quote_number}</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          {/* Basic Info */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Line Items (Read-only for now - full editing would be complex) */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Line Items</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-4">
                Note: Line item editing coming soon. For now, use duplicate + edit to modify line items.
              </p>
              {lineItems.length > 0 && (
                <div className="space-y-2">
                  {lineItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm py-2 border-b border-gray-200">
                      <span className="text-gray-700">
                        {item.quantity} × {item.description}
                      </span>
                      <span className="font-semibold">{formatCurrency(item.quantity * item.unit_price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tax Rate (%)</label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Deposit Required (%)</label>
                <input
                  type="number"
                  value={depositRequired}
                  onChange={(e) => setDepositRequired(parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percentage')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Discount {discountType === 'percentage' ? '(%)' : `(${quote.currency})`}
                </label>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Totals Preview */}
            <div className="mt-6 p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
              <h3 className="font-bold text-lg mb-3 text-gray-900">Updated Totals</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span className="font-semibold">-{formatCurrency(totals.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax ({taxRate}%):</span>
                  <span className="font-semibold">{formatCurrency(totals.tax)}</span>
                </div>
                <div className="border-t-2 border-blue-300 pt-2 flex justify-between text-xl font-bold text-blue-600">
                  <span>Total:</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Terms & Notes</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Terms</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Terms & Conditions</label>
                <textarea
                  value={termsConditions}
                  onChange={(e) => setTermsConditions(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Visible to Client)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Internal Notes (Private)</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-yellow-50"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={() => router.push(`/quotes/${id}`)}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-semibold"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
