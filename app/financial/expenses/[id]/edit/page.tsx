'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateExpense } from '@/lib/supabase/financial'
import type { ExpenseCategory, PaymentMethod, PaymentStatus } from '@/types/financial'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'

const categories: { value: ExpenseCategory; label: string }[] = [
  { value: 'materials', label: 'Materials' },
  { value: 'labor', label: 'Labor' },
  { value: 'subcontractors', label: 'Subcontractors' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'equipment_rental', label: 'Equipment Rental' },
  { value: 'permits', label: 'Permits' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'professional_fees', label: 'Professional Fees' },
  { value: 'travel', label: 'Travel' },
  { value: 'office', label: 'Office' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
]

export default function EditExpensePage() {
  const router = useRouter()
  const params = useParams()
  const expenseId = params.id as string
  const supabase = createClient()

  const { loading: permissionLoading } = usePermissionGuard({ permission: 'canManageFinances', redirectTo: '/unauthorized' })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState<any[]>([])

  // Form fields
  const [date, setDate] = useState('')
  const [vendor, setVendor] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('materials')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('check')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending')
  const [selectedProject, setSelectedProject] = useState('')
  const [billableToClient, setBillableToClient] = useState(false)
  const [markupPercentage, setMarkupPercentage] = useState('')

  useEffect(() => {
    if (!permissionLoading) loadExpense()
  }, [permissionLoading, expenseId])

  async function loadExpense() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [expenseRes, projectsRes] = await Promise.all([
        supabase.from('expenses').select('*').eq('id', expenseId).single(),
        supabase.from('projects').select('id, name').eq('user_id', user.id).order('name')
      ])

      if (expenseRes.error || !expenseRes.data) {
        toast.error('Expense not found')
        router.push('/financial')
        return
      }

      const e = expenseRes.data
      setDate(e.date?.split('T')[0] || '')
      setVendor(e.vendor || '')
      setDescription(e.description || '')
      setAmount(e.amount?.toString() || '')
      setCategory(e.category || 'materials')
      setPaymentMethod(e.payment_method || 'check')
      setPaymentStatus(e.payment_status || 'pending')
      setSelectedProject(e.project_id || '')
      setBillableToClient(e.billable_to_client || false)
      setMarkupPercentage(e.markup_percentage?.toString() || '')
      setProjects(projectsRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!vendor.trim() || !amount || !description.trim()) {
      toast.error('Vendor, description, and amount are required')
      return
    }

    setSaving(true)
    try {
        const updates: Partial<import('@/types/financial').Expense> = {
        date,
        vendor: vendor.trim(),
        description: description.trim(),
        amount: parseFloat(amount),
        category,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        project_id: selectedProject || undefined,
        billable_to_client: billableToClient,
        markup_percentage: billableToClient && markupPercentage ? parseFloat(markupPercentage) : undefined,
      }

      const { error } = await updateExpense(expenseId, updates)
      if (error) throw new Error(error)

      toast.success('Expense updated')
      router.push('/financial')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save expense')
    } finally {
      setSaving(false)
    }
  }

  if (loading || permissionLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/financial" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeftIcon className="w-4 h-4" /> Back to Financial
        </Link>

        <div className="bg-white rounded-xl border p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-6">Edit Expense</h1>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount ($)</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Vendor *</label>
              <input value={vendor} onChange={e => setVendor(e.target.value)} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Description *</label>
              <input value={description} onChange={e => setDescription(e.target.value)} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Project</label>
                <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Payment Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['check', 'ach', 'wire', 'credit_card', 'debit_card', 'cash', 'other'].map(m => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Payment Status</label>
                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={billableToClient} onChange={e => setBillableToClient(e.target.checked)}
                  className="rounded" />
                <span className="text-gray-700">Billable to client</span>
              </label>
              {billableToClient && (
                <div className="mt-2">
                  <label className="text-xs text-gray-500 mb-1 block">Markup (%)</label>
                  <input type="number" value={markupPercentage} onChange={e => setMarkupPercentage(e.target.value)}
                    placeholder="e.g. 15" className="w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link href="/financial" className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 text-center">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
