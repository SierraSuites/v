'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getInvoice, updateInvoice } from '@/lib/supabase/financial'
import type { Invoice, InvoiceLineItem } from '@/types/financial'
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'

export default function EditInvoicePage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string

  const { loading: permissionLoading } = usePermissionGuard({ permission: 'canManageFinances', redirectTo: '/unauthorized' })

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [invoiceDate, setInvoiceDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [taxRate, setTaxRate] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)

  useEffect(() => {
    if (!permissionLoading) loadInvoice()
  }, [permissionLoading, invoiceId])

  async function loadInvoice() {
    try {
      const { data, error } = await getInvoice(invoiceId)
      if (error || !data) { router.push('/financial'); return }

      if (data.status !== 'draft') {
        toast.error('Only draft invoices can be edited')
        router.push(`/financial/invoices/${invoiceId}`)
        return
      }

      setInvoice(data)
      setInvoiceDate(data.invoice_date?.split('T')[0] || '')
      setDueDate(data.due_date?.split('T')[0] || '')
      setPaymentTerms(data.payment_terms || 'Net 30')
      setNotes(data.notes || '')
      setLineItems(data.line_items || [])
      setTaxRate(data.tax_rate || 0)
      setDiscountAmount(data.discount_amount || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function updateLineItem(index: number, field: keyof InvoiceLineItem, value: string | number) {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'quantity' || field === 'rate') {
      updated[index].amount = (updated[index].quantity || 0) * (updated[index].rate || 0)
    }
    setLineItems(updated)
  }

  function addLineItem() {
    setLineItems([...lineItems, { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 }])
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount - (discountAmount || 0)

  async function handleSave() {
    if (!invoice) return
    if (lineItems.length === 0) { toast.error('Add at least one line item'); return }

    setSaving(true)
    try {
      const { error } = await updateInvoice(invoiceId, {
        invoice_date: invoiceDate,
        due_date: dueDate,
        payment_terms: paymentTerms,
        notes: notes.trim() || undefined,
        line_items: lineItems,
        tax_rate: taxRate,
        discount_amount: discountAmount,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
      })

      if (error) throw new Error(String(error))

      toast.success('Invoice updated')
      router.push(`/financial/invoices/${invoiceId}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  if (loading || permissionLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  if (!invoice) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/financial/invoices/${invoiceId}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="w-4 h-4" /> Back to Invoice
          </Link>
          <span className="text-sm text-gray-500">Invoice #{invoice.invoice_number}</span>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-6">
          <h1 className="text-xl font-bold text-gray-900">Edit Invoice</h1>

          {/* Client info (read-only — linked to contact) */}
          {invoice.contact && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <span className="font-medium">Billed to:</span> {(invoice.contact as any).full_name || (invoice.contact as any).name}
              {(invoice.contact as any).company && ` · ${(invoice.contact as any).company}`}
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Invoice Date</label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Payment Terms</label>
              <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['Due on receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Net 90'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
              <button type="button" onClick={addLineItem}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                <PlusIcon className="w-3 h-3" /> Add Item
              </button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">Description</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium w-20">Qty</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium w-24">Rate</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium w-24">Amount</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">
                        <input value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)}
                          placeholder="Description" className="w-full text-sm focus:outline-none" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full text-sm text-right focus:outline-none" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.rate} onChange={e => updateLineItem(i, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full text-sm text-right focus:outline-none" />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-700">
                        ${(item.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        <button onClick={() => removeLineItem(i)} className="text-gray-300 hover:text-red-500">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Tax (%)</span>
                <input type="number" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-16 border rounded px-2 py-0.5 text-right text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Discount ($)</span>
                <input type="number" value={discountAmount} onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-16 border rounded px-2 py-0.5 text-right text-sm" />
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-gray-900">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Payment instructions, thank you note..."
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href={`/financial/invoices/${invoiceId}`}
              className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 text-center">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
