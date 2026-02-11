'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  createInvoice,
  generateNextInvoiceNumber,
  sendInvoice
} from '@/lib/supabase/financial'
import type { Invoice, InvoiceLineItem } from '@/types/financial'
import {
  PlusIcon,
  TrashIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import toast, { Toaster } from 'react-hot-toast'

export default function NewInvoicePage() {
  const router = useRouter()

  // RBAC: Require canManageFinances permission
  const { loading: permissionLoading } = usePermissionGuard({
    permission: 'canManageFinances',
    redirectTo: '/unauthorized'
  })

  const [profile, setProfile] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Invoice Form Data
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [selectedContact, setSelectedContact] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [dueDate, setDueDate] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [notes, setNotes] = useState('')

  // Line Items
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    }
  ])

  // Tax and Discount
  const [taxRate, setTaxRate] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Auto-calculate due date based on payment terms
    if (invoiceDate && paymentTerms) {
      const date = new Date(invoiceDate)
      if (paymentTerms === 'Net 30') {
        date.setDate(date.getDate() + 30)
      } else if (paymentTerms === 'Net 15') {
        date.setDate(date.getDate() + 15)
      } else if (paymentTerms === 'Net 60') {
        date.setDate(date.getDate() + 60)
      } else if (paymentTerms === 'Due on receipt') {
        // Same as invoice date
      }
      setDueDate(date.toISOString().split('T')[0])
    }
  }, [invoiceDate, paymentTerms])

  async function loadData() {
    try {
      const supabase = createClient()

      const {
        data: { user }
      } = await supabase.auth.getUser()

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

      // Generate invoice number
      const nextNumber = await generateNextInvoiceNumber(profileData.company_id)
      setInvoiceNumber(nextNumber)

      // Load contacts
      const { data: contactsData } = await supabase
        .from('crm_contacts')
        .select('id, company_name, first_name, last_name, email')
        .eq('company_id', profileData.company_id)
        .order('company_name')

      if (contactsData) {
        setContacts(contactsData)
      }

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, status, budget')
        .eq('company_id', profileData.company_id)
        .in('status', ['planning', 'active'])
        .order('name')

      if (projectsData) {
        setProjects(projectsData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function addLineItem() {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0
      }
    ])
  }

  function removeLineItem(id: string) {
    setLineItems(lineItems.filter((item) => item.id !== id))
  }

  function updateLineItem(id: string, field: keyof InvoiceLineItem, value: any) {
    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value }
          // Recalculate amount
          if (field === 'quantity' || field === 'rate') {
            updated.amount = updated.quantity * updated.rate
          }
          return updated
        }
        return item
      })
    )
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
  const discountedSubtotal = subtotal - discountAmount
  const taxAmount = discountedSubtotal * (taxRate / 100)
  const total = discountedSubtotal + taxAmount

  async function handleSaveDraft() {
    if (!profile?.company_id) return

    // Validation
    if (!selectedContact) {
      toast.error('Please select a client')
      return
    }

    if (lineItems.length === 0 || lineItems.every((item) => !item.description)) {
      toast.error('Please add at least one line item')
      return
    }

    if (!invoiceNumber.trim()) {
      toast.error('Invoice number is required')
      return
    }

    if (total <= 0) {
      toast.error('Invoice total must be greater than $0')
      return
    }

    setSaving(true)

    try {
      const invoiceData: Partial<Invoice> = {
        company_id: profile.company_id,
        contact_id: selectedContact,
        project_id: selectedProject || undefined,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate,
        line_items: lineItems.filter(item => item.description.trim()), // Filter empty items
        subtotal,
        tax_rate: taxRate / 100, // Store as decimal (e.g., 0.07 for 7%)
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: total,
        amount_paid: 0,
        status: 'draft',
        payment_terms: paymentTerms,
        notes: notes || undefined,
        created_by: profile.id
      }

      const { data, error } = await createInvoice(invoiceData)

      if (error) {
        toast.error(`Error creating invoice: ${error}`)
        return
      }

      toast.success('Invoice saved as draft')
      router.push(`/financial`)
    } catch (error: any) {
      console.error('Error saving invoice:', error)
      toast.error(error?.message || 'Error saving invoice')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAndSend() {
    if (!profile?.company_id) return

    // Validation
    if (!selectedContact) {
      toast.error('Please select a client')
      return
    }

    const contact = contacts.find((c) => c.id === selectedContact)
    if (!contact?.email) {
      toast.error('Client must have an email address to send invoice')
      return
    }

    if (lineItems.length === 0 || lineItems.every((item) => !item.description)) {
      toast.error('Please add at least one line item')
      return
    }

    if (!invoiceNumber.trim()) {
      toast.error('Invoice number is required')
      return
    }

    if (total <= 0) {
      toast.error('Invoice total must be greater than $0')
      return
    }

    setSaving(true)
    const loadingToast = toast.loading('Creating and sending invoice...')

    try {
      const invoiceData: Partial<Invoice> = {
        company_id: profile.company_id,
        contact_id: selectedContact,
        project_id: selectedProject || undefined,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate,
        line_items: lineItems.filter(item => item.description.trim()), // Filter empty items
        subtotal,
        tax_rate: taxRate / 100, // Store as decimal (e.g., 0.07 for 7%)
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: total,
        amount_paid: 0,
        status: 'sent',
        payment_terms: paymentTerms,
        notes: notes || undefined,
        created_by: profile.id,
        sent_at: new Date().toISOString(),
        email_sent_count: 1,
        last_email_sent_at: new Date().toISOString()
      }

      const { data, error } = await createInvoice(invoiceData)

      if (error) {
        toast.error(`Error creating invoice: ${error}`, { id: loadingToast })
        return
      }

      // Send invoice via email
      if (data) {
        try {
          const clientName = contact.company_name || `${contact.first_name} ${contact.last_name}`
          await sendInvoice(data.id, {
            to: contact.email,
            subject: `Invoice ${invoiceNumber} from ${profile.company_name || 'The Sierra Suites'}`,
            message: `Dear ${clientName},\n\nPlease find attached invoice ${invoiceNumber} for ${total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.\n\nDue date: ${new Date(dueDate).toLocaleDateString()}\n\nPayment terms: ${paymentTerms}\n\nThank you for your business!`
          })
          toast.success('Invoice created and sent successfully!', { id: loadingToast })
        } catch (emailError) {
          console.error('Error sending email:', emailError)
          toast.success('Invoice created but email failed to send. You can resend from the invoice page.', { id: loadingToast })
        }
      }

      router.push(`/financial`)
    } catch (error: any) {
      console.error('Error saving and sending invoice:', error)
      toast.error(error?.message || 'Error saving and sending invoice', { id: loadingToast })
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading || permissionLoading) {
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
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
              <p className="mt-1 text-gray-600">
                Invoice #{invoiceNumber}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <DocumentTextIcon className="w-5 h-5 inline mr-2" />
                Save Draft
              </button>
              <button
                onClick={handleSaveAndSend}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
                {saving ? 'Sending...' : 'Save & Send'}
              </button>
            </div>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client & Project */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Client & Project Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client *
                </label>
                <select
                  value={selectedContact}
                  onChange={(e) => setSelectedContact(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a client</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.company_name ||
                        `${contact.first_name} ${contact.last_name}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project (Optional)
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Invoice Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Due on receipt">Due on receipt</option>
                <option value="Net 15">Net 15 days</option>
                <option value="Net 30">Net 30 days</option>
                <option value="Net 60">Net 60 days</option>
                <option value="Net 90">Net 90 days</option>
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
              <button
                onClick={addLineItem}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <PlusIcon className="w-5 h-5" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-4 items-start p-4 border border-gray-200 rounded-lg"
                >
                  <div className="col-span-12 md:col-span-5">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(item.id, 'description', e.target.value)
                      }
                      placeholder="Enter description"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Rate
                    </label>
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) =>
                        updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                  <div className="col-span-1 flex items-end">
                    {lineItems.length > 1 && (
                      <button
                        onClick={() => removeLineItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes for the client (payment instructions, thank you message, etc.)"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Discount:</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900">$</span>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                    max={subtotal}
                    step="0.01"
                    className="w-20 px-2 py-1 text-right border border-gray-300 rounded"
                  />
                </div>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal after discount:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(discountedSubtotal)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Tax:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-16 px-2 py-1 text-right border border-gray-300 rounded"
                  />
                  <span className="text-gray-900">%</span>
                </div>
              </div>

              {taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax Amount:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(taxAmount)}
                  </span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  Payment Terms
                </h3>
                <p className="text-sm text-blue-700">{paymentTerms}</p>
                {dueDate && (
                  <p className="text-sm text-blue-700 mt-1">
                    Due: {new Date(dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}
