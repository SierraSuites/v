"use client"

import { useState, useEffect } from 'react'
import type { QuoteLineItem, QuotePricing } from '@/lib/quotes'
import { quoteService } from '@/lib/quotes'

interface PricingCalculatorProps {
  lineItems: QuoteLineItem[]
  taxRate: number
  discountAmount?: number
  discountPercentage?: number
  showBreakdown?: boolean
  showMargins?: boolean
  onPricingChange?: (pricing: QuotePricing) => void
}

export default function PricingCalculator({
  lineItems,
  taxRate,
  discountAmount = 0,
  discountPercentage = 0,
  showBreakdown = true,
  showMargins = false,
  onPricingChange
}: PricingCalculatorProps) {
  const [pricing, setPricing] = useState<QuotePricing>({ subtotal: 0, tax_amount: 0, total: 0 })

  // Calculate pricing whenever inputs change
  useEffect(() => {
    const discount = discountPercentage > 0
      ? (lineItems.reduce((sum, item) => sum + item.total_price, 0) * discountPercentage / 100)
      : discountAmount

    const calculatedPricing = quoteService.calculateTotals(lineItems, taxRate, discount)
    setPricing(calculatedPricing)
    onPricingChange?.(calculatedPricing)
  }, [lineItems, taxRate, discountAmount, discountPercentage])

  // Calculate breakdown by item type
  const breakdown = lineItems.reduce((acc, item) => {
    if (!acc[item.item_type]) {
      acc[item.item_type] = 0
    }
    acc[item.item_type] += item.total_price
    return acc
  }, {} as Record<string, number>)

  // Calculate optional vs required
  const requiredTotal = lineItems
    .filter(item => !item.is_optional)
    .reduce((sum, item) => sum + item.total_price, 0)

  const optionalTotal = lineItems
    .filter(item => item.is_optional)
    .reduce((sum, item) => sum + item.total_price, 0)

  // Calculate taxable vs non-taxable
  const taxableTotal = lineItems
    .filter(item => item.is_taxable && !item.is_optional)
    .reduce((sum, item) => sum + item.total_price, 0)

  const nonTaxableTotal = lineItems
    .filter(item => !item.is_taxable && !item.is_optional)
    .reduce((sum, item) => sum + item.total_price, 0)

  // Calculate margin (if showing margins)
  const costTotal = lineItems
    .filter(item => ['labor', 'material', 'equipment', 'subcontractor'].includes(item.item_type))
    .reduce((sum, item) => sum + item.total_price, 0)

  const overheadTotal = lineItems
    .filter(item => item.item_type === 'overhead')
    .reduce((sum, item) => sum + item.total_price, 0)

  const profitTotal = lineItems
    .filter(item => item.item_type === 'profit')
    .reduce((sum, item) => sum + item.total_price, 0)

  const totalCost = costTotal + overheadTotal
  const marginPercentage = totalCost > 0 ? (profitTotal / totalCost) * 100 : 0
  const markupPercentage = totalCost > 0 ? (profitTotal / (totalCost + profitTotal)) * 100 : 0

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: '#E0E0E0', backgroundColor: '#F9FAFB' }}>
        <h3 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
          💰 Pricing Summary
        </h3>
      </div>

      {/* Main Pricing */}
      <div className="p-6 space-y-4">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium" style={{ color: '#6B7280' }}>
            Subtotal:
          </span>
          <span className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
            {formatCurrency(pricing.subtotal)}
          </span>
        </div>

        {/* Discount */}
        {(discountAmount > 0 || discountPercentage > 0) && (
          <div className="flex justify-between items-center" style={{ color: '#10B981' }}>
            <span className="text-lg font-medium">
              Discount {discountPercentage > 0 && `(${formatPercentage(discountPercentage)})`}:
            </span>
            <span className="text-xl font-bold">
              -{formatCurrency(discountPercentage > 0
                ? (requiredTotal * discountPercentage / 100)
                : discountAmount)}
            </span>
          </div>
        )}

        {/* Tax */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium" style={{ color: '#6B7280' }}>
            Tax ({formatPercentage(taxRate)}):
          </span>
          <span className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
            {formatCurrency(pricing.tax_amount)}
          </span>
        </div>

        {/* Total */}
        <div className="border-t pt-4 mt-4" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
              Total:
            </span>
            <span className="text-3xl font-bold" style={{ color: '#FF6B6B' }}>
              {formatCurrency(pricing.total)}
            </span>
          </div>
        </div>

        {/* Optional Items */}
        {optionalTotal > 0 && (
          <div className="bg-yellow-50 rounded-lg p-4 mt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm" style={{ color: '#92400E' }}>
                  Optional Items (Not Included in Total)
                </p>
                <p className="text-xs mt-1" style={{ color: '#78350F' }}>
                  These items can be added if approved by the client
                </p>
              </div>
              <span className="text-lg font-bold" style={{ color: '#92400E' }}>
                {formatCurrency(optionalTotal)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Breakdown */}
      {showBreakdown && Object.keys(breakdown).length > 0 && (
        <>
          <div className="border-t" style={{ borderColor: '#E0E0E0' }}>
            <div className="p-6">
              <h4 className="text-lg font-bold mb-4" style={{ color: '#1A1A1A' }}>
                📊 Cost Breakdown
              </h4>

              <div className="space-y-3">
                {Object.entries(breakdown).map(([type, amount]) => {
                  const percentage = pricing.subtotal > 0 ? (amount / pricing.subtotal) * 100 : 0

                  return (
                    <div key={type}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span>{getItemTypeIcon(type)}</span>
                          <span className="font-medium capitalize" style={{ color: getItemTypeColor(type) }}>
                            {type}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold" style={{ color: '#1A1A1A' }}>
                            {formatCurrency(amount)}
                          </span>
                          <span className="text-xs ml-2" style={{ color: '#6B7280' }}>
                            ({formatPercentage(percentage)})
                          </span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: getItemTypeColor(type)
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tax Breakdown */}
          <div className="border-t" style={{ borderColor: '#E0E0E0' }}>
            <div className="p-6">
              <h4 className="text-lg font-bold mb-4" style={{ color: '#1A1A1A' }}>
                🧾 Tax Breakdown
              </h4>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6B7280' }}>
                    Taxable Items:
                  </span>
                  <span className="font-semibold" style={{ color: '#1A1A1A' }}>
                    {formatCurrency(taxableTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6B7280' }}>
                    Non-Taxable Items:
                  </span>
                  <span className="font-semibold" style={{ color: '#1A1A1A' }}>
                    {formatCurrency(nonTaxableTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: '#E5E7EB' }}>
                  <span className="text-sm font-semibold" style={{ color: '#374151' }}>
                    Tax Amount ({formatPercentage(taxRate)} on {formatCurrency(taxableTotal)}):
                  </span>
                  <span className="font-bold" style={{ color: '#1A1A1A' }}>
                    {formatCurrency(pricing.tax_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Margin Analysis */}
      {showMargins && (costTotal > 0 || profitTotal > 0) && (
        <div className="border-t" style={{ borderColor: '#E0E0E0' }}>
          <div className="p-6">
            <h4 className="text-lg font-bold mb-4" style={{ color: '#1A1A1A' }}>
              📈 Margin Analysis
            </h4>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#6B7280' }}>
                  Direct Costs (Labor + Materials + Equipment + Subs):
                </span>
                <span className="font-semibold" style={{ color: '#1A1A1A' }}>
                  {formatCurrency(costTotal)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#6B7280' }}>
                  Overhead:
                </span>
                <span className="font-semibold" style={{ color: '#1A1A1A' }}>
                  {formatCurrency(overheadTotal)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: '#E5E7EB' }}>
                <span className="text-sm font-semibold" style={{ color: '#374151' }}>
                  Total Cost:
                </span>
                <span className="font-bold" style={{ color: '#1A1A1A' }}>
                  {formatCurrency(totalCost)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#6B7280' }}>
                  Profit:
                </span>
                <span className="font-bold" style={{ color: '#10B981' }}>
                  {formatCurrency(profitTotal)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs font-semibold mb-1" style={{ color: '#065F46' }}>
                    Profit Margin
                  </p>
                  <p className="text-2xl font-bold" style={{ color: '#10B981' }}>
                    {formatPercentage(marginPercentage)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#059669' }}>
                    Profit / Total Cost
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold mb-1" style={{ color: '#1E40AF' }}>
                    Markup
                  </p>
                  <p className="text-2xl font-bold" style={{ color: '#3B82F6' }}>
                    {formatPercentage(markupPercentage)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#2563EB' }}>
                    Profit / Selling Price
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="border-t" style={{ borderColor: '#E0E0E0', backgroundColor: '#F9FAFB' }}>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                Line Items
              </p>
              <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
                {lineItems.length}
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                Required
              </p>
              <p className="text-2xl font-bold" style={{ color: '#3B82F6' }}>
                {lineItems.filter(i => !i.is_optional).length}
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                Optional
              </p>
              <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>
                {lineItems.filter(i => i.is_optional).length}
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                Avg per Item
              </p>
              <p className="text-2xl font-bold" style={{ color: '#10B981' }}>
                {formatCurrency(lineItems.length > 0 ? pricing.subtotal / lineItems.length : 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
