"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  quoteService,
  type Quote,
  type QuoteLineItem,
  type CreateQuoteInput,
  getStatusColor
} from '@/lib/quotes'
import { useRouter } from 'next/navigation'

interface QuoteBuilderProps {
  quoteId?: string // For editing existing quote
  templateId?: string // For creating from template
  projectId?: string
  clientId?: string
  onSave?: (quote: Quote) => void
  onCancel?: () => void
}

export default function QuoteBuilder({
  quoteId,
  templateId,
  projectId,
  clientId,
  onSave,
  onCancel
}: QuoteBuilderProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Quote data
  const [title, setTitle] = useState('')
  const [selectedClientId, setSelectedClientId] = useState(clientId || '')
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '')
  const [description, setDescription] = useState('')
  const [taxRate, setTaxRate] = useState(8.25)
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount')
  const [discountValue, setDiscountValue] = useState(0)
  const [validUntil, setValidUntil] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [termsConditions, setTermsConditions] = useState('')

  // Line items
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([])

  // Available clients and projects
  const [clients, setClients] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])

  // Current quote (for editing)
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null)

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [quoteId, templateId])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Load clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('company_name')
      setClients(clientsData || [])

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, status')
        .in('status', ['planning', 'active'])
        .order('name')
      setProjects(projectsData || [])

      // If editing existing quote
      if (quoteId) {
        const quote = await quoteService.getById(quoteId)
        if (quote) {
          setCurrentQuote(quote)
          setTitle(quote.title)
          setSelectedClientId(quote.client_id || '')
          setSelectedProjectId(quote.project_id || '')
          setDescription(quote.description || '')
          setTaxRate(quote.tax_rate)
          setDiscountValue(quote.discount_amount || 0)
          setValidUntil(quote.valid_until ? quote.valid_until.split('T')[0] : '')
          setNotes(quote.notes || '')
          setTermsConditions(quote.terms_conditions || '')
          setLineItems(quote.line_items || [])
        }
      }
      // If creating from template
      else if (templateId) {
        const { data: template } = await supabase
          .from('quote_templates')
          .select('*')
          .eq('id', templateId)
          .single()

        if (template) {
          setTitle(template.name)
          setDescription(template.description || '')

          // Extract line items from template
          const templateLineItems: QuoteLineItem[] = []
          if (template.template_data?.sections) {
            template.template_data.sections.forEach((section: any) => {
              section.line_items?.forEach((item: any) => {
                templateLineItems.push({
                  id: crypto.randomUUID(),
                  quote_id: '',
                  description: item.description,
                  item_type: item.item_type,
                  quantity: item.quantity,
                  unit: item.unit,
                  unit_price: item.unit_price,
                  total_price: item.quantity * item.unit_price,
                  category: item.category,
                  is_taxable: item.is_taxable ?? true,
                  is_optional: item.is_optional ?? false,
                  notes: item.notes || null,
                  sort_order: templateLineItems.length,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
              })
            })
          }
          setLineItems(templateLineItems)
        }
      }
      // New blank quote
      else {
        // Set default terms
        setTermsConditions(
          'Payment Terms: 50% deposit required to commence work, 50% due upon completion.\n\n' +
          'This quote is valid for 30 days from the date issued.\n\n' +
          'All work will be completed in a professional manner according to standard construction practices.\n\n' +
          'Any changes to the scope of work may result in additional charges.'
        )

        // Set default valid until (30 days from now)
        const validDate = new Date()
        validDate.setDate(validDate.getDate() + 30)
        setValidUntil(validDate.toISOString().split('T')[0])

        // Add one default line item
        addLineItem()
      }
    } catch (err) {
      console.error('Error loading quote data:', err)
      alert('Failed to load quote data')
    } finally {
      setLoading(false)
    }
  }

  const addLineItem = () => {
    const newItem: QuoteLineItem = {
      id: crypto.randomUUID(),
      quote_id: quoteId || '',
      description: '',
      item_type: 'labor',
      quantity: 1,
      unit: 'hours',
      unit_price: 0,
      total_price: 0,
      category: null,
      is_taxable: true,
      is_optional: false,
      notes: null,
      sort_order: lineItems.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setLineItems([...lineItems, newItem])
  }

  const updateLineItem = (id: string, updates: Partial<QuoteLineItem>) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates }
        // Recalculate total
        updated.total_price = updated.quantity * updated.unit_price
        return updated
      }
      return item
    }))
  }

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  const duplicateLineItem = (id: string) => {
    const item = lineItems.find(i => i.id === id)
    if (item) {
      const duplicate = {
        ...item,
        id: crypto.randomUUID(),
        description: `${item.description} (Copy)`,
        sort_order: lineItems.length
      }
      setLineItems([...lineItems, duplicate])
    }
  }

  const moveLineItem = (id: string, direction: 'up' | 'down') => {
    const index = lineItems.findIndex(item => item.id === id)
    if (index === -1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= lineItems.length) return

    const newItems = [...lineItems]
    const temp = newItems[index]
    newItems[index] = newItems[newIndex]
    newItems[newIndex] = temp

    // Update sort orders
    newItems.forEach((item, i) => {
      item.sort_order = i
    })

    setLineItems(newItems)
  }

  // Calculate pricing
  const calculatePricing = () => {
    const discountAmount = discountType === 'amount'
      ? discountValue
      : (lineItems.reduce((sum, item) => sum + item.total_price, 0) * discountValue / 100)

    return quoteService.calculateTotals(lineItems, taxRate, discountAmount)
  }

  const pricing = calculatePricing()

  const handleSave = async (status: 'draft' | 'sent' = 'draft') => {
    try {
      // Validation
      if (!title.trim()) {
        alert('Please enter a quote title')
        return
      }

      if (lineItems.length === 0) {
        alert('Please add at least one line item')
        return
      }

      if (lineItems.some(item => !item.description.trim())) {
        alert('All line items must have a description')
        return
      }

      setSaving(true)

      const discountAmount = discountType === 'amount'
        ? discountValue
        : (pricing.subtotal * discountValue / 100)

      const quoteData: CreateQuoteInput = {
        title,
        description: description || null,
        client_id: selectedClientId || null,
        project_id: selectedProjectId || null,
        status,
        tax_rate: taxRate,
        discount_amount: discountAmount,
        valid_until: validUntil || null,
        notes: notes || null,
        terms_conditions: termsConditions || null,
        line_items: lineItems.map(item => ({
          description: item.description,
          item_type: item.item_type,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          category: item.category,
          is_taxable: item.is_taxable,
          is_optional: item.is_optional,
          notes: item.notes,
          sort_order: item.sort_order
        }))
      }

      let savedQuote: Quote | null = null

      if (quoteId) {
        // Update existing quote
        savedQuote = await quoteService.update(quoteId, quoteData)
      } else {
        // Create new quote
        savedQuote = await quoteService.create(quoteData)
      }

      if (savedQuote) {
        onSave?.(savedQuote)
        alert(quoteId ? 'Quote updated successfully!' : 'Quote created successfully!')
        if (!quoteId) {
          router.push(`/quotes/${savedQuote.id}`)
        }
      }
    } catch (err) {
      console.error('Error saving quote:', err)
      alert('Failed to save quote')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#FF6B6B' }} />
          <p className="mt-4 text-sm" style={{ color: '#6B7280' }}>Loading quote builder...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
              {quoteId ? '✏️ Edit Quote' : '📝 New Quote'}
            </h2>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              {quoteId ? 'Update your quote details' : 'Create a professional construction quote'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel || (() => router.back())}
              className="px-4 py-2 rounded-lg border font-semibold transition-colors hover:bg-gray-50"
              style={{ borderColor: '#E5E7EB', color: '#374151' }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave('draft')}
              className="px-4 py-2 rounded-lg font-semibold transition-transform hover:scale-105 disabled:opacity-50"
              style={{ backgroundColor: '#6B7280', color: '#FFFFFF' }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={() => handleSave('sent')}
              className="px-4 py-2 rounded-lg font-semibold transition-transform hover:scale-105 disabled:opacity-50"
              style={{ backgroundColor: '#FF6B6B', color: '#FFFFFF' }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save & Send'}
            </button>
          </div>
        </div>

        {/* Quote Details Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
              Quote Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Kitchen Remodel - 123 Main St"
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
              Client
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: '#E5E7EB' }}
            >
              <option value="">Select a client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.company_name || `${client.first_name} ${client.last_name}`}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
              Project (Optional)
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: '#E5E7EB' }}
            >
              <option value="">No project linked</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the work to be performed..."
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 resize-none"
              style={{ borderColor: '#E5E7EB' }}
              rows={3}
            />
          </div>

          {/* Tax Rate */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
              Tax Rate (%)
            </label>
            <input
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0"
              max="100"
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          {/* Valid Until */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
              Valid Until
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          {/* Discount */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
              Discount (Optional)
            </label>
            <div className="flex gap-3">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percentage')}
                className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E5E7EB' }}
              >
                <option value="amount">Amount ($)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
                placeholder={discountType === 'amount' ? '0.00' : '0'}
                className="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E5E7EB' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
            📋 Line Items
          </h3>
          <button
            onClick={addLineItem}
            className="px-4 py-2 rounded-lg font-semibold transition-transform hover:scale-105"
            style={{ backgroundColor: '#FF6B6B', color: '#FFFFFF' }}
          >
            + Add Line Item
          </button>
        </div>

        {lineItems.length === 0 ? (
          <div className="text-center py-12" style={{ color: '#6B7280' }}>
            <p className="text-lg font-semibold mb-2">No line items yet</p>
            <p className="text-sm">Click "Add Line Item" to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div
                key={item.id}
                className="border rounded-lg p-4"
                style={{ borderColor: '#E5E7EB', backgroundColor: item.is_optional ? '#FFF9E6' : '#FFFFFF' }}
              >
                <div className="grid grid-cols-12 gap-4">
                  {/* Move buttons */}
                  <div className="col-span-1 flex flex-col gap-1">
                    <button
                      onClick={() => moveLineItem(item.id, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                      style={{ color: '#6B7280' }}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveLineItem(item.id, 'down')}
                      disabled={index === lineItems.length - 1}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                      style={{ color: '#6B7280' }}
                    >
                      ▼
                    </button>
                  </div>

                  {/* Description */}
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                      placeholder="Item description"
                      className="w-full px-3 py-2 rounded border text-sm"
                      style={{ borderColor: '#E5E7EB' }}
                    />
                  </div>

                  {/* Type */}
                  <div className="col-span-2">
                    <select
                      value={item.item_type}
                      onChange={(e) => updateLineItem(item.id, { item_type: e.target.value as any })}
                      className="w-full px-3 py-2 rounded border text-sm"
                      style={{ borderColor: '#E5E7EB' }}
                    >
                      <option value="labor">Labor</option>
                      <option value="material">Material</option>
                      <option value="equipment">Equipment</option>
                      <option value="subcontractor">Subcontractor</option>
                      <option value="overhead">Overhead</option>
                      <option value="profit">Profit</option>
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-1">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 rounded border text-sm"
                      style={{ borderColor: '#E5E7EB' }}
                    />
                  </div>

                  {/* Unit */}
                  <div className="col-span-1">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateLineItem(item.id, { unit: e.target.value })}
                      placeholder="unit"
                      className="w-full px-3 py-2 rounded border text-sm"
                      style={{ borderColor: '#E5E7EB' }}
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded border text-sm"
                      style={{ borderColor: '#E5E7EB' }}
                    />
                  </div>

                  {/* Total */}
                  <div className="col-span-1 flex items-center justify-end font-semibold text-sm" style={{ color: '#1A1A1A' }}>
                    ${item.total_price.toFixed(2)}
                  </div>
                </div>

                {/* Additional options */}
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.is_taxable}
                      onChange={(e) => updateLineItem(item.id, { is_taxable: e.target.checked })}
                      className="rounded"
                    />
                    <span style={{ color: '#6B7280' }}>Taxable</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.is_optional}
                      onChange={(e) => updateLineItem(item.id, { is_optional: e.target.checked })}
                      className="rounded"
                    />
                    <span style={{ color: '#6B7280' }}>Optional</span>
                  </label>
                  <button
                    onClick={() => duplicateLineItem(item.id)}
                    className="text-blue-600 hover:underline"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => removeLineItem(item.id)}
                    className="text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>

                {/* Notes */}
                <div className="mt-3">
                  <input
                    type="text"
                    value={item.notes || ''}
                    onChange={(e) => updateLineItem(item.id, { notes: e.target.value || null })}
                    placeholder="Add notes (optional)..."
                    className="w-full px-3 py-2 rounded border text-sm"
                    style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing Summary */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-xl font-bold mb-4" style={{ color: '#1A1A1A' }}>
          💰 Pricing Summary
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between text-lg">
            <span style={{ color: '#6B7280' }}>Subtotal:</span>
            <span className="font-semibold" style={{ color: '#1A1A1A' }}>
              ${pricing.subtotal.toFixed(2)}
            </span>
          </div>

          {discountValue > 0 && (
            <div className="flex justify-between text-lg" style={{ color: '#10B981' }}>
              <span>Discount ({discountType === 'percentage' ? `${discountValue}%` : 'Amount'}):</span>
              <span className="font-semibold">
                -${(discountType === 'amount' ? discountValue : (pricing.subtotal * discountValue / 100)).toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-lg">
            <span style={{ color: '#6B7280' }}>Tax ({taxRate}%):</span>
            <span className="font-semibold" style={{ color: '#1A1A1A' }}>
              ${pricing.tax_amount.toFixed(2)}
            </span>
          </div>

          <div className="border-t pt-3 mt-3" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex justify-between text-2xl font-bold">
              <span style={{ color: '#1A1A1A' }}>Total:</span>
              <span style={{ color: '#FF6B6B' }}>
                ${pricing.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-xl font-bold mb-4" style={{ color: '#1A1A1A' }}>
          📄 Notes & Terms
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
              Internal Notes (Not shown to client)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes about this quote..."
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 resize-none"
              style={{ borderColor: '#E5E7EB' }}
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
              Terms & Conditions (Shown to client)
            </label>
            <textarea
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              placeholder="Enter terms and conditions..."
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 resize-none"
              style={{ borderColor: '#E5E7EB' }}
              rows={6}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
