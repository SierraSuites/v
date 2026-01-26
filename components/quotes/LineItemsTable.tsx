"use client"

import React, { useState } from 'react'
import type { QuoteLineItem } from '@/lib/quotes'

interface LineItemsTableProps {
  lineItems: QuoteLineItem[]
  onChange: (items: QuoteLineItem[]) => void
  editable?: boolean
  showPricing?: boolean
  showOptional?: boolean
}

export default function LineItemsTable({
  lineItems,
  onChange,
  editable = true,
  showPricing = true,
  showOptional = true
}: LineItemsTableProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()

    if (draggedIndex === null || draggedIndex === index) return

    const newItems = [...lineItems]
    const draggedItem = newItems[draggedIndex]

    // Remove from old position
    newItems.splice(draggedIndex, 1)

    // Insert at new position
    newItems.splice(index, 0, draggedItem)

    // Update sort orders
    newItems.forEach((item, i) => {
      item.sort_order = i
    })

    onChange(newItems)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const updateItem = (id: string, updates: Partial<QuoteLineItem>) => {
    onChange(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates }
        // Recalculate total
        updated.total_price = updated.quantity * updated.unit_price
        return updated
      }
      return item
    }))
  }

  const removeItem = (id: string) => {
    onChange(lineItems.filter(item => item.id !== id))
  }

  const duplicateItem = (id: string) => {
    const item = lineItems.find(i => i.id === id)
    if (item) {
      const duplicate: QuoteLineItem = {
        ...item,
        id: crypto.randomUUID(),
        description: `${item.description} (Copy)`,
        sort_order: lineItems.length
      }
      onChange([...lineItems, duplicate])
    }
  }

  const toggleNotes = (id: string) => {
    const newExpanded = new Set(expandedNotes)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedNotes(newExpanded)
  }

  const addItem = () => {
    const newItem: QuoteLineItem = {
      id: crypto.randomUUID(),
      quote_id: '',
      description: '',
      detailed_description: null,
      item_type: 'labor',
      quantity: 1,
      unit: 'hours',
      unit_price: 0,
      total_price: 0,
      cost_price: null,
      markup_percentage: null,
      category: null,
      is_taxable: true,
      is_optional: false,
      sku: null,
      supplier: null,
      notes: null,
      sort_order: lineItems.length,
      created_at: new Date().toISOString()
    }
    onChange([...lineItems, newItem])
  }

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'labor': return '👷'
      case 'material': return '🧱'
      case 'equipment': return '🚜'
      case 'subcontractor': return '👥'
      case 'overhead': return '📊'
      case 'profit': return '💰'
      default: return '📋'
    }
  }

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'labor': return '#3B82F6'
      case 'material': return '#10B981'
      case 'equipment': return '#F59E0B'
      case 'subcontractor': return '#8B5CF6'
      case 'overhead': return '#6B7280'
      case 'profit': return '#EF4444'
      default: return '#6B7280'
    }
  }

  // Group items by category
  const groupedItems = lineItems.reduce((acc, item) => {
    const category = item.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, QuoteLineItem[]>)

  const categories = Object.keys(groupedItems)
  const showCategories = categories.length > 1 || (categories.length === 1 && categories[0] !== 'Uncategorized')

  // Calculate totals
  const subtotal = lineItems
    .filter(item => !item.is_optional)
    .reduce((sum, item) => sum + item.total_price, 0)

  const optionalTotal = lineItems
    .filter(item => item.is_optional)
    .reduce((sum, item) => sum + item.total_price, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>
            Line Items ({lineItems.length})
          </h3>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            {editable && 'Drag to reorder, click to edit'}
          </p>
        </div>
        {editable && (
          <button
            onClick={addItem}
            className="px-4 py-2 rounded-lg font-semibold transition-transform hover:scale-105"
            style={{ backgroundColor: '#FF6B6B', color: '#FFFFFF' }}
          >
            + Add Item
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: '#E5E7EB' }}>
        <table className="w-full">
          <thead style={{ backgroundColor: '#F9FAFB' }}>
            <tr>
              {editable && <th className="w-12"></th>}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>
                Type
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>
                Qty
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>
                Unit
              </th>
              {showPricing && (
                <>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>
                    Total
                  </th>
                </>
              )}
              {editable && <th className="w-32"></th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y" style={{ borderColor: '#E5E7EB' }}>
            {showCategories ? (
              // Show grouped by category
              categories.map(category => (
                <React.Fragment key={category}>
                  {/* Category header */}
                  <tr style={{ backgroundColor: '#F3F4F6' }}>
                    <td colSpan={editable ? (showPricing ? 8 : 6) : (showPricing ? 7 : 5)} className="px-4 py-2">
                      <span className="font-semibold text-sm" style={{ color: '#374151' }}>
                        {category}
                      </span>
                    </td>
                  </tr>
                  {/* Category items */}
                  {groupedItems[category].map((item, index) => (
                    <LineItemRow
                      key={item.id}
                      item={item}
                      index={lineItems.indexOf(item)}
                      editable={editable}
                      showPricing={showPricing}
                      showOptional={showOptional}
                      draggedIndex={draggedIndex}
                      expandedNotes={expandedNotes}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      onUpdate={updateItem}
                      onRemove={removeItem}
                      onDuplicate={duplicateItem}
                      onToggleNotes={toggleNotes}
                      getItemTypeIcon={getItemTypeIcon}
                      getItemTypeColor={getItemTypeColor}
                    />
                  ))}
                </React.Fragment>
              ))
            ) : (
              // Show flat list
              lineItems.map((item, index) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  editable={editable}
                  showPricing={showPricing}
                  showOptional={showOptional}
                  draggedIndex={draggedIndex}
                  expandedNotes={expandedNotes}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                  onDuplicate={duplicateItem}
                  onToggleNotes={toggleNotes}
                  getItemTypeIcon={getItemTypeIcon}
                  getItemTypeColor={getItemTypeColor}
                />
              ))
            )}
          </tbody>

          {/* Totals footer */}
          {showPricing && (
            <tfoot style={{ backgroundColor: '#F9FAFB' }}>
              <tr>
                <td colSpan={editable ? 6 : 5} className="px-4 py-3 text-right font-semibold" style={{ color: '#374151' }}>
                  Subtotal:
                </td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: '#1A1A1A' }}>
                  ${subtotal.toFixed(2)}
                </td>
                {editable && <td></td>}
              </tr>
              {showOptional && optionalTotal > 0 && (
                <tr>
                  <td colSpan={editable ? 6 : 5} className="px-4 py-3 text-right font-semibold" style={{ color: '#6B7280' }}>
                    Optional Items:
                  </td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: '#6B7280' }}>
                    ${optionalTotal.toFixed(2)}
                  </td>
                  {editable && <td></td>}
                </tr>
              )}
            </tfoot>
          )}
        </table>
      </div>

      {lineItems.length === 0 && (
        <div className="text-center py-12 border rounded-lg" style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
          <p className="text-lg font-semibold mb-2">No line items</p>
          <p className="text-sm">
            {editable ? 'Click "Add Item" to get started' : 'This quote has no line items'}
          </p>
        </div>
      )}
    </div>
  )
}

// Individual line item row component
function LineItemRow({
  item,
  index,
  editable,
  showPricing,
  showOptional,
  draggedIndex,
  expandedNotes,
  onDragStart,
  onDragOver,
  onDragEnd,
  onUpdate,
  onRemove,
  onDuplicate,
  onToggleNotes,
  getItemTypeIcon,
  getItemTypeColor
}: {
  item: QuoteLineItem
  index: number
  editable: boolean
  showPricing: boolean
  showOptional: boolean
  draggedIndex: number | null
  expandedNotes: Set<string>
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
  onUpdate: (id: string, updates: Partial<QuoteLineItem>) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onToggleNotes: (id: string) => void
  getItemTypeIcon: (type: string) => string
  getItemTypeColor: (type: string) => string
}) {
  const isDragging = draggedIndex === index
  const hasNotes = item.notes && item.notes.trim().length > 0

  return (
    <>
      <tr
        draggable={editable}
        onDragStart={() => onDragStart(index)}
        onDragOver={(e) => onDragOver(e, index)}
        onDragEnd={onDragEnd}
        className={`transition-all ${isDragging ? 'opacity-50' : ''} ${item.is_optional ? 'bg-yellow-50' : ''}`}
        style={{ cursor: editable ? 'move' : 'default' }}
      >
        {/* Drag handle */}
        {editable && (
          <td className="px-2 text-center" style={{ color: '#6B7280' }}>
            <span className="text-lg">⋮⋮</span>
          </td>
        )}

        {/* Description */}
        <td className="px-4 py-3">
          {editable ? (
            <div className="space-y-1">
              <input
                type="text"
                value={item.description}
                onChange={(e) => onUpdate(item.id, { description: e.target.value })}
                placeholder="Item description"
                className="w-full px-2 py-1 rounded border text-sm"
                style={{ borderColor: '#E5E7EB' }}
              />
              {showOptional && (
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.is_taxable}
                      onChange={(e) => onUpdate(item.id, { is_taxable: e.target.checked })}
                      className="rounded"
                    />
                    <span style={{ color: '#6B7280' }}>Tax</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.is_optional}
                      onChange={(e) => onUpdate(item.id, { is_optional: e.target.checked })}
                      className="rounded"
                    />
                    <span style={{ color: '#6B7280' }}>Optional</span>
                  </label>
                  <button
                    onClick={() => onToggleNotes(item.id)}
                    className="hover:underline"
                    style={{ color: hasNotes ? '#FF6B6B' : '#6B7280' }}
                  >
                    {hasNotes ? '📝 Edit note' : '+ Add note'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="font-medium" style={{ color: '#1A1A1A' }}>
                {item.description}
                {item.is_optional && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                    Optional
                  </span>
                )}
              </div>
              {hasNotes && (
                <div className="text-xs mt-1" style={{ color: '#6B7280' }}>
                  {item.notes}
                </div>
              )}
            </div>
          )}
        </td>

        {/* Type */}
        <td className="px-4 py-3">
          {editable ? (
            <select
              value={item.item_type}
              onChange={(e) => onUpdate(item.id, { item_type: e.target.value as any })}
              className="px-2 py-1 rounded border text-sm"
              style={{ borderColor: '#E5E7EB' }}
            >
              <option value="labor">Labor</option>
              <option value="material">Material</option>
              <option value="equipment">Equipment</option>
              <option value="subcontractor">Subcontractor</option>
              <option value="overhead">Overhead</option>
              <option value="profit">Profit</option>
            </select>
          ) : (
            <div className="flex items-center gap-2">
              <span>{getItemTypeIcon(item.item_type)}</span>
              <span className="text-sm font-semibold capitalize" style={{ color: getItemTypeColor(item.item_type) }}>
                {item.item_type}
              </span>
            </div>
          )}
        </td>

        {/* Quantity */}
        <td className="px-4 py-3 text-center">
          {editable ? (
            <input
              type="number"
              value={item.quantity}
              onChange={(e) => onUpdate(item.id, { quantity: parseFloat(e.target.value) || 0 })}
              step="0.01"
              min="0"
              className="w-20 px-2 py-1 rounded border text-sm text-center"
              style={{ borderColor: '#E5E7EB' }}
            />
          ) : (
            <span className="text-sm" style={{ color: '#374151' }}>{item.quantity}</span>
          )}
        </td>

        {/* Unit */}
        <td className="px-4 py-3 text-center">
          {editable ? (
            <input
              type="text"
              value={item.unit}
              onChange={(e) => onUpdate(item.id, { unit: e.target.value })}
              placeholder="unit"
              className="w-20 px-2 py-1 rounded border text-sm text-center"
              style={{ borderColor: '#E5E7EB' }}
            />
          ) : (
            <span className="text-sm" style={{ color: '#6B7280' }}>{item.unit}</span>
          )}
        </td>

        {/* Unit Price */}
        {showPricing && (
          <td className="px-4 py-3 text-right">
            {editable ? (
              <input
                type="number"
                value={item.unit_price}
                onChange={(e) => onUpdate(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-28 px-2 py-1 rounded border text-sm text-right"
                style={{ borderColor: '#E5E7EB' }}
              />
            ) : (
              <span className="text-sm" style={{ color: '#374151' }}>${item.unit_price.toFixed(2)}</span>
            )}
          </td>
        )}

        {/* Total Price */}
        {showPricing && (
          <td className="px-4 py-3 text-right">
            <span className="font-semibold" style={{ color: '#1A1A1A' }}>
              ${item.total_price.toFixed(2)}
            </span>
          </td>
        )}

        {/* Actions */}
        {editable && (
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onDuplicate(item.id)}
                className="text-xs px-2 py-1 rounded hover:bg-gray-100"
                style={{ color: '#6B7280' }}
                title="Duplicate"
              >
                📋
              </button>
              <button
                onClick={() => onRemove(item.id)}
                className="text-xs px-2 py-1 rounded hover:bg-red-50"
                style={{ color: '#EF4444' }}
                title="Remove"
              >
                🗑️
              </button>
            </div>
          </td>
        )}
      </tr>

      {/* Expanded notes row */}
      {editable && expandedNotes.has(item.id) && (
        <tr>
          <td colSpan={showPricing ? 8 : 6} className="px-4 py-2" style={{ backgroundColor: '#F9FAFB' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>Notes:</span>
              <input
                type="text"
                value={item.notes || ''}
                onChange={(e) => onUpdate(item.id, { notes: e.target.value || null })}
                placeholder="Add notes about this item..."
                className="flex-1 px-3 py-1 rounded border text-sm"
                style={{ borderColor: '#E5E7EB' }}
              />
              <button
                onClick={() => onToggleNotes(item.id)}
                className="text-sm px-3 py-1 rounded hover:bg-gray-100"
                style={{ color: '#6B7280' }}
              >
                Done
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
