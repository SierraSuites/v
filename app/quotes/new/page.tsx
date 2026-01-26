'use client'

// ============================================================
// ENHANCED QUOTE CREATION WIZARD - BUSINESS WORKFLOW SYSTEM
// Step 1: Quote Type → Step 2: Basic Info → Step 3: Line Items
// Step 4: Pricing → Step 5: Terms → Step 6: Review
// ============================================================

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { QuoteType, QuoteFormData, QuoteItemFormData, Contact } from '@/types/quotes'
import ExcelImport from '@/components/quotes/ExcelImport'

export default function NewQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Wizard steps (now 6 steps with quote type selection first)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 6

  // STEP 1: Quote Type Selection
  const [quoteType, setQuoteType] = useState<QuoteType>('proposal')

  // Form data with enhanced fields
  const [formData, setFormData] = useState<QuoteFormData>({
    title: '',
    description: '',
    client_id: null,
    project_id: null,

    quote_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'USD',

    tax_rate: 0,
    discount_type: 'fixed',
    discount_value: 0,
    deposit_required: 0,

    terms_conditions: 'Payment due within 30 days of acceptance.\nAll work performed according to specifications.\n50% deposit required to begin work.',
    payment_terms: 'Net 30',
    notes: '',
    internal_notes: '',
    branding: {
      logo: null,
      primaryColor: '#2563EB',
      accentColor: '#F97316',
    },
  })

  // Line items with enhanced fields
  const [lineItems, setLineItems] = useState<QuoteItemFormData[]>([])

  // Data lists
  const [contacts, setContacts] = useState<Contact[]>([])
  const [projects, setProjects] = useState<any[]>([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showNewContactModal, setShowNewContactModal] = useState(false)
  const [showExcelImport, setShowExcelImport] = useState(false)

  // Calculations
  const [totals, setTotals] = useState({
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    deposit: 0,
  })

  // Check if editing existing quote
  const editingQuoteId = searchParams.get('duplicate')

  useEffect(() => {
    loadData()
    if (editingQuoteId) {
      loadExistingQuote(editingQuoteId)
    }
  }, [editingQuoteId])

  useEffect(() => {
    calculateTotals()
  }, [lineItems, formData.tax_rate, formData.discount_type, formData.discount_value, formData.deposit_required])

  async function loadData() {
    try {
      const [contactsRes, projectsRes] = await Promise.all([
        fetch('/api/contacts?type=client'),
        fetch('/api/projects')
      ])

      const contactsData = await contactsRes.json()
      if (contactsData.data) {
        setContacts(contactsData.data)
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json()
        if (projectsData.data) {
          setProjects(projectsData.data)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  async function loadExistingQuote(id: string) {
    try {
      const response = await fetch(`/api/quotes/${id}`)
      const data = await response.json()
      if (data.data) {
        const quote = data.data
        setFormData({
          ...formData,
          quote_type: quote.quote_type,
          title: quote.title + ' (Copy)',
          description: quote.description,
          scope_of_work: quote.scope_of_work,
          client_id: quote.client_id,
        })
        setQuoteType(quote.quote_type)
        if (quote.items) {
          setLineItems(quote.items.map((item: any, index: number) => ({
            item_number: index + 1,
            description: item.description,
            detailed_description: item.detailed_description,
            benefits: item.benefits,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            cost_price: item.cost_price,
            convert_to_task: true,
            is_taxable: item.is_taxable,
            is_optional: item.is_optional,
            is_allowance: item.is_allowance,
            category: item.category,
            notes: item.notes,
          })))
        }
      }
    } catch (error) {
      console.error('Error loading quote:', error)
    }
  }

  function calculateTotals() {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price)
    }, 0)

    const discount = formData.discount_type === 'percentage'
      ? subtotal * (formData.discount_value / 100)
      : formData.discount_value

    const taxableAmount = subtotal - discount
    const tax = taxableAmount * (formData.tax_rate / 100)
    const total = subtotal + tax - discount
    const deposit = total * (formData.deposit_required / 100)

    setTotals({
      subtotal,
      tax,
      discount,
      total,
      deposit,
    })
  }

  function addLineItem() {
    const newItem: QuoteItemFormData = {
      item_number: lineItems.length + 1,
      description: '',
      detailed_description: '',
      benefits: '',
      quantity: 1,
      unit: 'ea',
      unit_price: 0,
      cost_price: null,
      convert_to_task: true, // Default to creating tasks
      is_taxable: true,
      is_optional: false,
      is_allowance: false,
      category: null,
      notes: null,
    }
    setLineItems([...lineItems, newItem])
  }

  function updateLineItem(index: number, field: keyof QuoteItemFormData, value: any) {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  function removeLineItem(index: number) {
    const updated = lineItems.filter((_, i) => i !== index)
    // Renumber items
    updated.forEach((item, i) => {
      item.item_number = i + 1
    })
    setLineItems(updated)
  }

  function validateStep() {
    const newErrors: Record<string, string> = {}

    if (currentStep === 1) {
      // Quote type validation
      if (!quoteType) {
        newErrors.quote_type = 'Please select a quote type'
      }
    }

    if (currentStep === 2) {
      // Basic info validation
      if (!formData.title) {
        newErrors.title = 'Title is required'
      }
      if (!formData.client_id) {
        newErrors.client_id = 'Client is required'
      }
      // Change order must have project
      if (quoteType === 'change_order' && !formData.project_id) {
        newErrors.project_id = 'Change orders must be linked to a project'
      }
    }

    if (currentStep === 3) {
      // Line items validation
      if (lineItems.length === 0) {
        newErrors.lineItems = 'At least one line item is required'
      }
      lineItems.forEach((item, index) => {
        if (!item.description) {
          newErrors[`item_${index}_description`] = 'Description is required'
        }
        if (item.quantity <= 0) {
          newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0'
        }
        if (item.unit_price < 0) {
          newErrors[`item_${index}_unit_price`] = 'Price cannot be negative'
        }
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function nextStep() {
    if (validateStep()) {
      // Update formData with quote type when leaving step 1
      if (currentStep === 1) {
        setFormData({ ...formData, quote_type: quoteType })
      }
      setCurrentStep(Math.min(currentStep + 1, totalSteps))
    }
  }

  function prevStep() {
    setCurrentStep(Math.max(currentStep - 1, 1))
  }

  async function handleSubmit() {
    if (!validateStep()) {
      return
    }

    setLoading(true)

    try {
      // Create quote
      const quoteData = {
        ...formData,
        quote_type: quoteType,
        subtotal: totals.subtotal,
        tax_amount: totals.tax,
        discount_amount: totals.discount,
        total_amount: totals.total,
        deposit_amount: totals.deposit,
        status: 'draft',
      }

      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create quote')
      }

      const quoteId = data.data.id

      // Add line items
      for (const item of lineItems) {
        await fetch(`/api/quotes/${quoteId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        })
      }

      // Redirect to quote detail page
      router.push(`/quotes/${quoteId}`)
    } catch (error) {
      console.error('Error creating quote:', error)
      alert('Failed to create quote. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currency || 'USD',
    }).format(amount)
  }

  // Quote type cards for Step 1
  const quoteTypes = [
    {
      type: 'proposal' as QuoteType,
      icon: '📋',
      name: 'Proposal',
      description: 'Detailed, persuasive quote for winning new projects',
      features: ['Comprehensive scope', 'Benefits highlighted', 'Professional presentation'],
      bestFor: 'New clients, complex projects',
      color: 'blue',
    },
    {
      type: 'bid' as QuoteType,
      icon: '🎯',
      name: 'Bid',
      description: 'Competitive quote with fixed pricing',
      features: ['Competitive pricing', 'Clear deliverables', 'Firm commitment'],
      bestFor: 'RFPs, competitive situations',
      color: 'green',
    },
    {
      type: 'estimate' as QuoteType,
      icon: '🔢',
      name: 'Estimate',
      description: 'Rough calculation for preliminary planning',
      features: ['Ballpark pricing', 'Non-binding', 'Quick turnaround'],
      bestFor: 'Early-stage planning, budgeting',
      color: 'yellow',
    },
    {
      type: 'change_order' as QuoteType,
      icon: '🔄',
      name: 'Change Order',
      description: 'Additional work on existing projects',
      features: ['Links to project', 'Updates budget', 'Tracks scope changes'],
      bestFor: 'Mid-project additions',
      color: 'orange',
    },
    {
      type: 'maintenance' as QuoteType,
      icon: '🔧',
      name: 'Maintenance Agreement',
      description: 'Recurring service contracts',
      features: ['Recurring billing', 'Service schedules', 'Long-term agreements'],
      bestFor: 'Ongoing service relationships',
      color: 'purple',
    },
  ]

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/quotes')}
            className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block"
          >
            ← Back to Quotes
          </button>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">Create New Quote</h1>
          <p className="text-gray-600">
            {currentStep === 1 && 'Choose the type of quote you want to create'}
            {currentStep === 2 && 'Enter basic information about this quote'}
            {currentStep === 3 && 'Add line items and services'}
            {currentStep === 4 && 'Configure pricing and discounts'}
            {currentStep === 5 && 'Set terms and conditions'}
            {currentStep === 6 && 'Review and create your quote'}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step === currentStep
                      ? 'bg-blue-600 text-white scale-110'
                      : step < currentStep
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step < currentStep ? '✓' : step}
                </div>
                {step < totalSteps && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all ${
                      step < currentStep ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Type</span>
            <span>Info</span>
            <span>Items</span>
            <span>Pricing</span>
            <span>Terms</span>
            <span>Review</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          {/* STEP 1: Quote Type Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Quote Type</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quoteTypes.map((type) => (
                  <div
                    key={type.type}
                    onClick={() => setQuoteType(type.type)}
                    className={`cursor-pointer border-2 rounded-xl p-6 transition-all hover:shadow-xl ${
                      quoteType === type.type
                        ? `border-${type.color}-600 bg-${type.color}-50 shadow-lg`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-4xl">{type.icon}</div>
                      {quoteType === type.type && (
                        <div className={`bg-${type.color}-600 text-white px-3 py-1 rounded-full text-sm font-semibold`}>
                          Selected
                        </div>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">{type.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{type.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="text-xs font-semibold text-gray-700 uppercase">Features:</div>
                      {type.features.map((feature, index) => (
                        <div key={index} className="flex items-start text-sm text-gray-600">
                          <span className="text-green-600 mr-2">✓</span>
                          {feature}
                        </div>
                      ))}
                    </div>

                    <div className={`text-xs font-semibold text-${type.color}-600 bg-${type.color}-100 px-3 py-2 rounded-lg`}>
                      Best for: {type.bestFor}
                    </div>
                  </div>
                ))}
              </div>

              {errors.quote_type && (
                <div className="text-red-600 text-sm mt-2">{errors.quote_type}</div>
              )}
            </div>
          )}

          {/* STEP 2: Basic Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Basic Information
                <span className="ml-3 text-sm font-normal text-gray-500">
                  ({quoteTypes.find(t => t.type === quoteType)?.name})
                </span>
              </h2>

              {/* Quote Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quote Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Kitchen Renovation - 123 Main St"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.title && <div className="text-red-600 text-sm mt-1">{errors.title}</div>}
              </div>

              {/* Client Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Client *
                </label>
                <select
                  value={formData.client_id || ''}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value || null })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a client...</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.contact_name} {contact.company_name && `(${contact.company_name})`}
                    </option>
                  ))}
                </select>
                {errors.client_id && <div className="text-red-600 text-sm mt-1">{errors.client_id}</div>}
              </div>

              {/* Project Selection (for change orders) */}
              {quoteType === 'change_order' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project * (Required for Change Orders)
                  </label>
                  <select
                    value={formData.project_id || ''}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value || null })}
                    className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50"
                  >
                    <option value="">Select the project for this change order...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} - {project.status}
                      </option>
                    ))}
                  </select>
                  {errors.project_id && <div className="text-red-600 text-sm mt-1">{errors.project_id}</div>}
                  <div className="text-orange-600 text-xs mt-1">
                    This change order will add to the selected project's budget when approved
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief overview of the work..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Scope of Work (for proposals) */}
              {quoteType === 'proposal' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Scope of Work
                  </label>
                  <textarea
                    value={formData.scope_of_work || ''}
                    onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })}
                    placeholder="Detailed scope of work for this proposal..."
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quote Date
                  </label>
                  <input
                    type="date"
                    value={formData.quote_date}
                    onChange={(e) => setFormData({ ...formData, quote_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={formData.valid_until || ''}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Conversion Settings (for proposals and bids) */}
              {(quoteType === 'proposal' || quoteType === 'bid') && (
                <div className="border-2 border-green-200 bg-green-50 rounded-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                    <span className="text-2xl mr-2">🚀</span>
                    Project Conversion Settings
                  </h3>

                  <div className="space-y-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.auto_create_project}
                        onChange={(e) => setFormData({ ...formData, auto_create_project: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-semibold text-gray-700">
                        Auto-create project when approved
                      </span>
                    </label>

                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.auto_create_tasks}
                        onChange={(e) => setFormData({ ...formData, auto_create_tasks: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-semibold text-gray-700">
                        Auto-create tasks from line items
                      </span>
                    </label>
                  </div>

                  <div className="text-xs text-green-700 mt-4">
                    ℹ️ When this quote is approved, a new project will be automatically created with tasks generated from the line items below.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Line Items (continued in next message due to length) */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Line Items</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowExcelImport(true)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Import from Excel
                  </button>
                  <button
                    onClick={addLineItem}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              {errors.lineItems && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {errors.lineItems}
                </div>
              )}

              {lineItems.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-6xl mb-4">📝</div>
                  <p className="text-gray-600 mb-4">No line items yet</p>
                  <button
                    onClick={addLineItem}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Add Your First Item
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {lineItems.map((item, index) => (
                    <div key={index} className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className="bg-blue-100 text-blue-700 font-bold w-8 h-8 rounded-full flex items-center justify-center mr-3">
                            {index + 1}
                          </div>
                          <span className="text-sm text-gray-500">Item #{item.item_number}</span>
                        </div>
                        <button
                          onClick={() => removeLineItem(index)}
                          className="text-red-600 hover:text-red-700 font-semibold text-sm"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="space-y-4">
                        {/* Description */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Description *
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                            placeholder="e.g., Install new kitchen cabinets"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {errors[`item_${index}_description`] && (
                            <div className="text-red-600 text-sm mt-1">{errors[`item_${index}_description`]}</div>
                          )}
                        </div>

                        {/* Category & Unit */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Category
                            </label>
                            <input
                              type="text"
                              value={item.category || ''}
                              onChange={(e) => updateLineItem(index, 'category', e.target.value)}
                              placeholder="e.g., Cabinetry"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Unit
                            </label>
                            <select
                              value={item.unit}
                              onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="ea">Each (ea)</option>
                              <option value="hours">Hours</option>
                              <option value="sqft">Square Feet (sqft)</option>
                              <option value="lf">Linear Feet (lf)</option>
                              <option value="days">Days</option>
                              <option value="lot">Lot</option>
                            </select>
                          </div>
                        </div>

                        {/* Quantity & Unit Price */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Quantity *
                            </label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {errors[`item_${index}_quantity`] && (
                              <div className="text-red-600 text-sm mt-1">{errors[`item_${index}_quantity`]}</div>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Unit Price *
                            </label>
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {errors[`item_${index}_unit_price`] && (
                              <div className="text-red-600 text-sm mt-1">{errors[`item_${index}_unit_price`]}</div>
                            )}
                          </div>
                        </div>

                        {/* Line Total */}
                        <div className="bg-blue-50 px-4 py-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">Line Total:</span>
                            <span className="text-xl font-bold text-blue-600">
                              {formatCurrency(item.quantity * item.unit_price)}
                            </span>
                          </div>
                        </div>

                        {/* Task Conversion Checkbox */}
                        {formData.auto_create_tasks && (quoteType === 'proposal' || quoteType === 'bid' || quoteType === 'change_order') && (
                          <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.convert_to_task}
                                onChange={(e) => updateLineItem(index, 'convert_to_task', e.target.checked)}
                                className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                              />
                              <span className="ml-3 text-sm font-semibold text-gray-700">
                                ✓ Create task for this item when quote is approved
                              </span>
                            </label>
                          </div>
                        )}

                        {/* Additional checkboxes */}
                        <div className="flex gap-4 flex-wrap">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.is_taxable}
                              onChange={(e) => updateLineItem(index, 'is_taxable', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Taxable</span>
                          </label>

                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.is_optional}
                              onChange={(e) => updateLineItem(index, 'is_optional', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Optional</span>
                          </label>

                          {quoteType === 'estimate' && (
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.is_allowance}
                                onChange={(e) => updateLineItem(index, 'is_allowance', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Allowance</span>
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Pricing & Discounts */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Pricing & Discounts</h2>

              {/* Subtotal Display */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-700">Subtotal:</span>
                  <span className="text-3xl font-bold text-blue-600">{formatCurrency(totals.subtotal)}</span>
                </div>
              </div>

              {/* Tax Rate */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 8.5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-sm text-gray-500 mt-1">Tax Amount: {formatCurrency(totals.tax)}</div>
              </div>

              {/* Discount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Discount
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <select
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'fixed' | 'percentage' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      placeholder={formData.discount_type === 'percentage' ? '10' : '100.00'}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-1">Discount Amount: {formatCurrency(totals.discount)}</div>
              </div>

              {/* Deposit Required */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Deposit Required (%)
                </label>
                <input
                  type="number"
                  value={formData.deposit_required}
                  onChange={(e) => setFormData({ ...formData, deposit_required: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  step="1"
                  placeholder="e.g., 50"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-sm text-gray-500 mt-1">Deposit Amount: {formatCurrency(totals.deposit)}</div>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>

              {/* Total Summary */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border-2 border-green-300">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Tax ({formData.tax_rate}%):</span>
                    <span className="font-semibold">{formatCurrency(totals.tax)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex items-center justify-between text-green-600">
                      <span>Discount:</span>
                      <span className="font-semibold">-{formatCurrency(totals.discount)}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-gray-300 pt-3 flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">Total:</span>
                    <span className="text-3xl font-bold text-green-600">{formatCurrency(totals.total)}</span>
                  </div>
                  {totals.deposit > 0 && (
                    <div className="flex items-center justify-between text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
                      <span className="font-semibold">Deposit Required ({formData.deposit_required}%):</span>
                      <span className="text-xl font-bold">{formatCurrency(totals.deposit)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Terms & Conditions */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Terms & Conditions</h2>

              {/* Payment Terms */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Terms
                </label>
                <select
                  value={formData.payment_terms || ''}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                >
                  <option value="Net 30">Net 30</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="50% Deposit, Balance on Completion">50% Deposit, Balance on Completion</option>
                  <option value="Custom">Custom</option>
                </select>
                {formData.payment_terms === 'Custom' && (
                  <input
                    type="text"
                    placeholder="Enter custom payment terms..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  />
                )}
              </div>

              {/* Terms & Conditions */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Terms & Conditions
                </label>
                <textarea
                  value={formData.terms_conditions || ''}
                  onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                  rows={8}
                  placeholder="Enter your terms and conditions..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>

              {/* Public Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes (Visible to Client)
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  placeholder="Any additional notes for the client..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Internal Notes (Private)
                </label>
                <textarea
                  value={formData.internal_notes || ''}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  rows={3}
                  placeholder="Private notes for internal use only..."
                  className="w-full px-4 py-3 border border-yellow-300 bg-yellow-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <div className="text-xs text-yellow-700 mt-1">⚠️ These notes will NOT be visible to the client</div>
              </div>
            </div>
          )}

          {/* STEP 6: Review & Submit */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Your Quote</h2>

              {/* Quote Type Badge */}
              <div className="flex items-center gap-3">
                <div className="text-4xl">{quoteTypes.find(t => t.type === quoteType)?.icon}</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{quoteTypes.find(t => t.type === quoteType)?.name}</div>
                  <div className="text-gray-600">{formData.title}</div>
                </div>
              </div>

              {/* Client & Project Info */}
              <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
                <h3 className="font-bold text-gray-900 mb-3">Client Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold">Client:</span>{' '}
                    {contacts.find(c => c.id === formData.client_id)?.contact_name || 'Not selected'}
                  </div>
                  {quoteType === 'change_order' && formData.project_id && (
                    <div>
                      <span className="font-semibold">Project:</span>{' '}
                      {projects.find(p => p.id === formData.project_id)?.name || 'Not found'}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">Quote Date:</span> {formData.quote_date}
                  </div>
                  {formData.valid_until && (
                    <div>
                      <span className="font-semibold">Valid Until:</span> {formData.valid_until}
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items Summary */}
              <div className="bg-white rounded-xl border-2 border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="font-bold text-gray-900">Line Items ({lineItems.length})</h3>
                </div>
                <div className="p-6">
                  {lineItems.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">No line items added</div>
                  ) : (
                    <div className="space-y-3">
                      {lineItems.map((item, index) => (
                        <div key={index} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{item.description}</div>
                            <div className="text-sm text-gray-600">
                              {item.quantity} {item.unit} × {formatCurrency(item.unit_price)}
                              {item.convert_to_task && (
                                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">✓ Will create task</span>
                              )}
                            </div>
                          </div>
                          <div className="font-bold text-gray-900 ml-4">
                            {formatCurrency(item.quantity * item.unit_price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-300">
                <h3 className="font-bold text-gray-900 mb-4">Pricing Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({formData.discount_type === 'percentage' ? `${formData.discount_value}%` : 'Fixed'}):</span>
                      <span className="font-semibold">-{formatCurrency(totals.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-700">
                    <span>Tax ({formData.tax_rate}%):</span>
                    <span className="font-semibold">{formatCurrency(totals.tax)}</span>
                  </div>
                  <div className="border-t-2 border-gray-300 pt-3 flex justify-between">
                    <span className="text-2xl font-bold text-gray-900">Total:</span>
                    <span className="text-3xl font-bold text-green-600">{formatCurrency(totals.total)}</span>
                  </div>
                  {totals.deposit > 0 && (
                    <div className="bg-orange-100 border-2 border-orange-300 rounded-lg px-4 py-3 flex justify-between">
                      <span className="font-bold text-orange-700">Deposit Required ({formData.deposit_required}%):</span>
                      <span className="text-xl font-bold text-orange-700">{formatCurrency(totals.deposit)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Conversion Settings Reminder */}
              {(quoteType === 'proposal' || quoteType === 'bid') && formData.auto_create_project && (
                <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-6">
                  <h3 className="font-bold text-purple-900 mb-3 flex items-center">
                    <span className="text-2xl mr-2">🚀</span>
                    Automation Enabled
                  </h3>
                  <div className="space-y-2 text-sm text-purple-800">
                    {formData.auto_create_project && (
                      <div>✓ Will automatically create a project when approved</div>
                    )}
                    {formData.auto_create_tasks && (
                      <div>✓ Will automatically create tasks from {lineItems.filter(i => i.convert_to_task).length} line items</div>
                    )}
                  </div>
                </div>
              )}

              {quoteType === 'change_order' && formData.project_id && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-6">
                  <h3 className="font-bold text-orange-900 mb-3 flex items-center">
                    <span className="text-2xl mr-2">🔄</span>
                    Change Order Settings
                  </h3>
                  <div className="space-y-2 text-sm text-orange-800">
                    <div>✓ Will add {formatCurrency(totals.total)} to project budget when approved</div>
                    {formData.auto_create_tasks && (
                      <div>✓ Will create {lineItems.filter(i => i.convert_to_task).length} new tasks tagged as [CHANGE ORDER]</div>
                    )}
                  </div>
                </div>
              )}

              {/* Terms Preview */}
              {formData.terms_conditions && (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-3">Terms & Conditions</h3>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {formData.terms_conditions}
                  </div>
                </div>
              )}

              {/* Ready to Create */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white text-center">
                <div className="text-5xl mb-4">✨</div>
                <h3 className="text-2xl font-bold mb-2">Ready to Create!</h3>
                <p className="text-lg opacity-90">
                  Your quote is ready. Click "Create Quote" below to save it as a draft.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              onClick={prevStep}
              className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
            >
              ← Previous
            </button>
          ) : (
            <div></div>
          )}

          {currentStep < totalSteps ? (
            <button
              onClick={nextStep}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : '✓ Create Quote'}
            </button>
          )}
        </div>
      </div>

      {/* Excel Import Modal */}
      {showExcelImport && (
        <ExcelImport
          onImport={(items) => {
            setLineItems([...lineItems, ...items])
            setShowExcelImport(false)
          }}
          onClose={() => setShowExcelImport(false)}
        />
      )}
    </div>
  )
}
