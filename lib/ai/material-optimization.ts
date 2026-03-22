/**
 * AI Material Optimization Algorithms
 * Reduce waste and optimize material ordering
 */

interface MaterialRequirement {
  material_name: string
  category: string
  required_quantity: number
  unit: string
  urgency: 'immediate' | 'soon' | 'future'
  project_phase: string
}

interface MaterialProduct {
  product_id: string
  name: string
  category: string
  unit_size: number
  unit: string
  price_per_unit: number
  min_order_quantity: number
  lead_time_days: number
  supplier: string
  waste_factor?: number // Typical waste percentage
}

interface OptimizedOrder {
  material_name: string
  recommended_quantity: number
  recommended_products: Array<{
    product: MaterialProduct
    quantity: number
    subtotal: number
  }>
  total_cost: number
  estimated_waste: number
  waste_cost: number
  optimization_savings: number
  delivery_schedule: Array<{
    date: string
    items: string[]
  }>
  optimization_notes: string[]
}

interface CutOptimization {
  material: string
  stock_length: number
  required_cuts: number[]
  optimized_layout: Array<{
    stock_piece: number
    cuts: number[]
    waste: number
  }>
  total_stock_needed: number
  total_waste: number
  waste_percentage: number
  cost_savings: number
}

/**
 * Standard waste factors by material category
 */
const WASTE_FACTORS: Record<string, number> = {
  lumber: 0.10, // 10% waste
  drywall: 0.15,
  concrete: 0.05,
  tile: 0.10,
  flooring: 0.10,
  roofing: 0.10,
  insulation: 0.05,
  paint: 0.08,
  wire: 0.15,
  pipe: 0.12,
}

/**
 * Optimize material ordering to minimize waste and cost
 */
export function optimizeMaterialOrder(
  requirements: MaterialRequirement[],
  availableProducts: MaterialProduct[]
): OptimizedOrder[] {
  return requirements.map((req) => {
    // Find matching products
    const matchingProducts = availableProducts.filter(
      (p) => p.category === req.category && p.unit === req.unit
    )

    if (matchingProducts.length === 0) {
      // No matching products found
      return {
        material_name: req.material_name,
        recommended_quantity: req.required_quantity,
        recommended_products: [],
        total_cost: 0,
        estimated_waste: 0,
        waste_cost: 0,
        optimization_savings: 0,
        delivery_schedule: [],
        optimization_notes: ['No matching products found in catalog'],
      }
    }

    // Apply waste factor
    const wasteFactor = WASTE_FACTORS[req.category.toLowerCase()] || 0.10
    const quantityWithWaste = req.required_quantity * (1 + wasteFactor)

    // Sort products by cost-effectiveness (price per unit)
    const sortedProducts = [...matchingProducts].sort((a, b) => a.price_per_unit - b.price_per_unit)

    // Calculate optimal product mix
    const recommendedProducts: Array<{
      product: MaterialProduct
      quantity: number
      subtotal: number
    }> = []

    let remainingQuantity = quantityWithWaste
    const optimizationNotes: string[] = []

    for (const product of sortedProducts) {
      if (remainingQuantity <= 0) break

      // Calculate how many units we need from this product
      const unitsNeeded = Math.ceil(remainingQuantity / product.unit_size)

      // Respect minimum order quantity
      const orderQuantity = Math.max(unitsNeeded, product.min_order_quantity)

      const actualQuantity = orderQuantity * product.unit_size

      if (actualQuantity > remainingQuantity * 1.2) {
        // This product would result in excessive overordering (>20% excess)
        // Try next product unless it's the last one
        if (sortedProducts.indexOf(product) < sortedProducts.length - 1) {
          continue
        }
      }

      recommendedProducts.push({
        product,
        quantity: orderQuantity,
        subtotal: orderQuantity * product.price_per_unit,
      })

      remainingQuantity -= actualQuantity

      if (product.lead_time_days > 7) {
        optimizationNotes.push(
          `Order ${product.name} ASAP - ${product.lead_time_days} day lead time`
        )
      }
    }

    const totalCost = recommendedProducts.reduce((sum, p) => sum + p.subtotal, 0)
    const totalOrdered = recommendedProducts.reduce(
      (sum, p) => sum + p.product.unit_size * p.quantity,
      0
    )
    const estimatedWaste = totalOrdered - req.required_quantity
    const wasteCost = (estimatedWaste / totalOrdered) * totalCost

    // Calculate savings vs. naive ordering (ordering full excess)
    const naiveQuantity = Math.ceil(quantityWithWaste / sortedProducts[0].unit_size)
    const naiveCost = naiveQuantity * sortedProducts[0].price_per_unit
    const optimizationSavings = Math.max(0, naiveCost - totalCost)

    if (optimizationSavings > totalCost * 0.10) {
      optimizationNotes.push(
        `Optimized ordering saves $${optimizationSavings.toFixed(2)} (${((optimizationSavings / naiveCost) * 100).toFixed(1)}%)`
      )
    }

    // Create delivery schedule
    const deliverySchedule: Array<{ date: string; items: string[] }> = []
    const today = new Date()

    // Group by lead time
    const leadTimeGroups = new Map<number, Array<{ product: MaterialProduct; quantity: number }>>()

    recommendedProducts.forEach((rp) => {
      const leadTime = rp.product.lead_time_days
      if (!leadTimeGroups.has(leadTime)) {
        leadTimeGroups.set(leadTime, [])
      }
      leadTimeGroups.get(leadTime)!.push(rp)
    })

    // Create delivery dates
    Array.from(leadTimeGroups.keys())
      .sort((a, b) => a - b)
      .forEach((leadTime) => {
        const deliveryDate = new Date(today)
        deliveryDate.setDate(deliveryDate.getDate() + leadTime)

        const items = leadTimeGroups.get(leadTime)!.map(
          (rp) => `${rp.quantity} units of ${rp.product.name}`
        )

        deliverySchedule.push({
          date: deliveryDate.toISOString().split('T')[0],
          items,
        })
      })

    // Add optimization notes
    if (wasteFactor > 0.12) {
      optimizationNotes.push(
        `High waste material - consider precise measurements and careful handling`
      )
    }

    if (totalOrdered > req.required_quantity * 1.25) {
      optimizationNotes.push(
        `Ordering ${((totalOrdered / req.required_quantity - 1) * 100).toFixed(0)}% excess - review for potential cost reduction`
      )
    }

    return {
      material_name: req.material_name,
      recommended_quantity: totalOrdered,
      recommended_products: recommendedProducts,
      total_cost: totalCost,
      estimated_waste: estimatedWaste,
      waste_cost: wasteCost,
      optimization_savings: optimizationSavings,
      delivery_schedule: deliverySchedule,
      optimization_notes: optimizationNotes,
    }
  })
}

/**
 * One-dimensional cutting stock problem optimizer
 * Minimize waste when cutting materials to length
 */
export function optimizeCutting(
  material: string,
  stock_length: number,
  required_cuts: number[],
  cost_per_stock_piece: number = 0
): CutOptimization {
  // Sort cuts in descending order for better packing
  const sortedCuts = [...required_cuts].sort((a, b) => b - a)

  const layout: Array<{
    stock_piece: number
    cuts: number[]
    waste: number
  }> = []

  let stockPieceNumber = 1
  let currentStock: number[] = []
  let remainingLength = stock_length

  for (const cut of sortedCuts) {
    if (cut > stock_length) {
      throw new Error(`Cut length ${cut} exceeds stock length ${stock_length}`)
    }

    if (cut <= remainingLength) {
      // Fits in current stock piece
      currentStock.push(cut)
      remainingLength -= cut
    } else {
      // Start new stock piece
      layout.push({
        stock_piece: stockPieceNumber,
        cuts: currentStock,
        waste: remainingLength,
      })

      stockPieceNumber++
      currentStock = [cut]
      remainingLength = stock_length - cut
    }
  }

  // Add last stock piece
  if (currentStock.length > 0) {
    layout.push({
      stock_piece: stockPieceNumber,
      cuts: currentStock,
      waste: remainingLength,
    })
  }

  const totalStockNeeded = layout.length
  const totalWaste = layout.reduce((sum, piece) => sum + piece.waste, 0)
  const totalMaterialUsed = required_cuts.reduce((sum, cut) => sum + cut, 0)
  const wastePercentage = (totalWaste / (totalMaterialUsed + totalWaste)) * 100

  // Calculate cost savings vs naive approach (one cut per stock piece)
  const naiveCost = required_cuts.length * cost_per_stock_piece
  const optimizedCost = totalStockNeeded * cost_per_stock_piece
  const costSavings = Math.max(0, naiveCost - optimizedCost)

  return {
    material,
    stock_length,
    required_cuts: sortedCuts,
    optimized_layout: layout,
    total_stock_needed: totalStockNeeded,
    total_waste: totalWaste,
    waste_percentage: wastePercentage,
    cost_savings: costSavings,
  }
}

/**
 * Suggest material substitutions for cost or availability
 */
export function suggestMaterialSubstitutions(
  material: string,
  category: string,
  reason: 'cost' | 'availability' | 'sustainability'
): Array<{
  substitute: string
  pros: string[]
  cons: string[]
  cost_impact: 'lower' | 'similar' | 'higher'
  performance_impact: 'better' | 'equivalent' | 'reduced'
}> {
  const substitutions: Record<
    string,
    Array<{
      substitute: string
      pros: string[]
      cons: string[]
      cost_impact: 'lower' | 'similar' | 'higher'
      performance_impact: 'better' | 'equivalent' | 'reduced'
    }>
  > = {
    '2x4_lumber': [
      {
        substitute: 'Engineered lumber (LVL)',
        pros: [
          'More consistent quality',
          'Better dimensional stability',
          'Can span longer distances',
          'Less warping',
        ],
        cons: ['Higher cost', 'Harder to cut', 'Limited availability'],
        cost_impact: 'higher',
        performance_impact: 'better',
      },
      {
        substitute: 'Steel studs',
        pros: [
          'Non-combustible',
          'Pest-resistant',
          'Perfect dimensional accuracy',
          'Lightweight',
        ],
        cons: ['Thermal bridging', 'Special fasteners needed', 'Different installation'],
        cost_impact: 'similar',
        performance_impact: 'equivalent',
      },
    ],
    asphalt_shingles: [
      {
        substitute: 'Architectural shingles',
        pros: ['Better appearance', 'Longer warranty', 'Improved wind resistance'],
        cons: ['Higher cost', 'Heavier'],
        cost_impact: 'higher',
        performance_impact: 'better',
      },
      {
        substitute: 'Metal roofing',
        pros: ['50+ year lifespan', 'Energy efficient', 'Fire resistant', 'Low maintenance'],
        cons: ['Much higher cost', 'Noise in rain', 'Different installation skills'],
        cost_impact: 'higher',
        performance_impact: 'better',
      },
    ],
    fiberglass_insulation: [
      {
        substitute: 'Cellulose insulation',
        pros: ['Lower cost', '80% recycled content', 'Better air sealing', 'Fire resistant'],
        cons: ['Can settle over time', 'Blown-in only'],
        cost_impact: 'lower',
        performance_impact: 'equivalent',
      },
      {
        substitute: 'Spray foam insulation',
        pros: ['Superior R-value', 'Air and moisture barrier', 'Structural strength'],
        cons: ['Much higher cost', 'Professional installation required'],
        cost_impact: 'higher',
        performance_impact: 'better',
      },
    ],
  }

  const key = material.toLowerCase().replace(/\s+/g, '_')
  return substitutions[key] || []
}

/**
 * Analyze bulk purchase opportunities
 */
export function analyzeBulkPurchasing(
  materials: MaterialRequirement[],
  bulkPricingTiers: Array<{
    product: string
    tier1_qty: number
    tier1_price: number
    tier2_qty: number
    tier2_price: number
    tier3_qty: number
    tier3_price: number
  }>
): Array<{
  material: string
  current_cost: number
  bulk_cost: number
  savings: number
  recommendation: string
}> {
  // Implementation would analyze whether consolidating orders
  // or increasing quantities reaches bulk discount tiers
  return []
}
