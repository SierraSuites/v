'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createExpense } from '@/lib/supabase/financial'
import type { Expense, ExpenseCategory, PaymentMethod, PaymentStatus } from '@/types/financial'
import {
  ArrowLeftIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import toast, { Toaster } from 'react-hot-toast'

export default function NewExpensePage() {
  const router = useRouter()

  // RBAC: Require canManageFinances permission
  const { loading: permissionLoading } = usePermissionGuard({
    permission: 'canManageFinances',
    redirectTo: '/unauthorized'
  })

  const [profile, setProfile] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])

  // Form fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [vendor, setVendor] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('materials')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('check')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [billableToClient, setBillableToClient] = useState(false)
  const [markupPercentage, setMarkupPercentage] = useState('')

  // Receipt upload
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [ocrProcessing, setOcrProcessing] = useState(false)
  const [ocrData, setOcrData] = useState<any>(null)

  const [saving, setSaving] = useState(false)

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

      // Load projects for allocation
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('company_id', profileData.company_id)
        .in('status', ['active', 'planning'])
        .order('name')

      setProjects(projectsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error loading form data')
    }
  }

  function handleReceiptFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image or PDF file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setReceiptFile(file)

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setReceiptPreview('')
    }
  }

  function clearReceipt() {
    setReceiptFile(null)
    setReceiptPreview('')
    setOcrData(null)
  }

  async function handleOCRScan() {
    if (!receiptFile) {
      toast.error('Please upload a receipt first')
      return
    }

    setOcrProcessing(true)
    const loadingToast = toast.loading('Scanning receipt with AI...')

    try {
      // Create form data
      const formData = new FormData()
      formData.append('receipt', receiptFile)

      // Call OCR API endpoint
      const response = await fetch('/api/expenses/ocr', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('OCR processing failed')
      }

      const result = await response.json()
      setOcrData(result)

      // Auto-fill form fields from OCR data
      if (result.vendor) setVendor(result.vendor)
      if (result.amount) setAmount(result.amount.toString())
      if (result.date) {
        const ocrDate = new Date(result.date)
        if (!isNaN(ocrDate.getTime())) {
          setDate(ocrDate.toISOString().split('T')[0])
        }
      }
      if (result.category) setCategory(result.category as ExpenseCategory)

      toast.success('Receipt scanned successfully', { id: loadingToast })
    } catch (error: any) {
      console.error('OCR error:', error)
      toast.error(error?.message || 'Failed to scan receipt', { id: loadingToast })
    } finally {
      setOcrProcessing(false)
    }
  }

  async function uploadReceipt(): Promise<string | null> {
    if (!receiptFile || !profile) return null

    setUploading(true)

    try {
      const supabase = createClient()

      // Generate unique filename
      const fileExt = receiptFile.name.split('.').pop()
      const fileName = `${profile.company_id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error: any) {
      console.error('Upload error:', error)
      throw error
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validation
    if (!vendor.trim()) {
      toast.error('Please enter a vendor name')
      return
    }

    if (!description.trim()) {
      toast.error('Please enter a description')
      return
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (billableToClient && !selectedProject) {
      toast.error('Please select a project for billable expenses')
      return
    }

    setSaving(true)
    const loadingToast = toast.loading('Creating expense...')

    try {
      // Upload receipt if provided
      let receiptUrl = null
      if (receiptFile) {
        receiptUrl = await uploadReceipt()
      }

      // Prepare expense data
      const expenseData: Partial<Expense> = {
        company_id: profile.company_id,
        project_id: selectedProject || undefined,
        date,
        vendor: vendor.trim(),
        description: description.trim(),
        amount: parsedAmount,
        category,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        receipt_url: receiptUrl || undefined,
        receipt_ocr_data: ocrData || undefined,
        billable_to_client: billableToClient,
        markup_percentage: markupPercentage ? parseFloat(markupPercentage) : undefined,
        invoiced: false
      }

      const { data, error } = await createExpense(expenseData)

      if (error) {
        throw new Error(error)
      }

      toast.success('Expense created successfully', { id: loadingToast })
      router.push('/financial/expenses')
    } catch (error: any) {
      console.error('Error creating expense:', error)
      toast.error(error?.message || 'Error creating expense', { id: loadingToast })
    } finally {
      setSaving(false)
    }
  }

  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <button
          onClick={() => router.push('/financial/expenses')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Expenses
        </button>
        <h1 className="text-3xl font-bold text-gray-900">New Expense</h1>
        <p className="text-gray-600 mt-1">Record a business expense</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Receipt Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt Upload
            </label>

            {!receiptFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <div className="text-center">
                  <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label
                      htmlFor="receipt-upload"
                      className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Upload a receipt
                    </label>
                    <input
                      id="receipt-upload"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleReceiptFileChange}
                      className="hidden"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    PNG, JPG, PDF up to 10MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {receiptPreview ? (
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="w-20 h-20 object-cover rounded"
                      />
                    ) : (
                      <DocumentTextIcon className="w-20 h-20 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{receiptFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearReceipt}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* OCR Scan Button */}
                <button
                  type="button"
                  onClick={handleOCRScan}
                  disabled={ocrProcessing}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SparklesIcon className="w-5 h-5" />
                  {ocrProcessing ? 'Scanning...' : 'Scan with AI (OCR)'}
                </button>

                {ocrData && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ Receipt scanned - fields auto-filled
                    </p>
                    {ocrData.confidence && (
                      <p className="text-xs text-green-600 mt-1">
                        Confidence: {(ocrData.confidence * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expense Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g., Home Depot"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="materials">Materials</option>
                <option value="labor">Labor</option>
                <option value="subcontractors">Subcontractors</option>
                <option value="equipment">Equipment</option>
                <option value="equipment_rental">Equipment Rental</option>
                <option value="permits">Permits</option>
                <option value="utilities">Utilities</option>
                <option value="insurance">Insurance</option>
                <option value="professional_fees">Professional Fees</option>
                <option value="travel">Travel</option>
                <option value="office">Office</option>
                <option value="marketing">Marketing</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
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

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="scheduled">Scheduled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this expense for?"
              required
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Project Allocation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allocate to Project (Optional)
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No project allocation</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Billable Checkbox */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                checked={billableToClient}
                onChange={(e) => setBillableToClient(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="ml-3">
              <label className="font-medium text-gray-700">
                Billable to client
              </label>
              <p className="text-sm text-gray-500">
                Mark if this expense should be billed to the client
              </p>
            </div>
          </div>

          {/* Markup Percentage (conditional) */}
          {billableToClient && (
            <div className="ml-7">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Markup Percentage (Optional)
              </label>
              <div className="relative w-48">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={markupPercentage}
                  onChange={(e) => setMarkupPercentage(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  %
                </span>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.push('/financial/expenses')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Expense'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
