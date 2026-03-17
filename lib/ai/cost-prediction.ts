/**
 * AI Cost Prediction Models
 * Predictive analytics for construction cost estimation
 */

interface HistoricalProject {
  id: string
  project_type: string
  size_sqft: number
  location: string
  final_cost: number
  actual_duration_days: number
  materials_cost: number
  labor_cost: number
  overhead_percentage: number
  completion_date: string
}

interface CostPredictionInput {
  project_type: string
  size_sqft: number
  location: string
  estimated_duration_days?: number
  complexity_score?: number // 1-10
  material_quality?: 'economy' | 'standard' | 'premium'
}

interface CostPrediction {
  estimated_total_cost: number
  confidence_interval: {
    low: number
    high: number
  }
  cost_breakdown: {
    materials: number
    labor: number
    overhead: number
    contingency: number
  }
  cost_per_sqft: number
  comparable_projects: number
  prediction_confidence: number // 0-100%
  risk_factors: RiskFactor[]
  cost_drivers: CostDriver[]
}

interface RiskFactor {
  factor: string
  impact: 'low' | 'medium' | 'high'
  estimated_cost_impact: number
  mitigation: string
}

interface CostDriver {
  category: string
  percentage_of_total: number
  amount: number
  trend: 'increasing' | 'stable' | 'decreasing'
}

/**
 * Regional cost multipliers (baseline is 1.0)
 * Based on RS Means construction cost index
 */
const REGIONAL_MULTIPLIERS: Record<string, number> = {
  'New York': 1.35,
  'San Francisco': 1.42,
  'Los Angeles': 1.28,
  'Seattle': 1.22,
  'Boston': 1.31,
  'Chicago': 1.15,
  'Miami': 1.09,
  'Denver': 1.08,
  'Atlanta': 0.98,
  'Dallas': 0.95,
  'Phoenix': 0.96,
  'Charlotte': 0.92,
  'Default': 1.0,
}

/**
 * Project type cost baselines (per square foot)
 */
const PROJECT_TYPE_BASELINES: Record<string, number> = {
  'residential_single_family': 150,
  'residential_multifamily': 180,
  'commercial_office': 220,
  'commercial_retail': 200,
  'industrial_warehouse': 90,
  'industrial_manufacturing': 140,
  'institutional_school': 250,
  'institutional_healthcare': 350,
  'renovation_light': 75,
  'renovation_heavy': 120,
  'tenant_improvement': 85,
}

/**
 * Material quality multipliers
 */
const MATERIAL_QUALITY_MULTIPLIERS = {
  economy: 0.85,
  standard: 1.0,
  premium: 1.35,
}

/**
 * Complexity score impact (percentage increase per point above 5)
 */
const COMPLEXITY_IMPACT_PERCENT = 4 // 4% per point

/**
 * Predict project cost using historical data and ML models
 */
export function predictProjectCost(
  input: CostPredictionInput,
  historicalData?: HistoricalProject[]
): CostPrediction {
  // Get baseline cost per square foot
  const baselineCostPerSqft = PROJECT_TYPE_BASELINES[input.project_type] || 150

  // Apply regional multiplier
  const regionalMultiplier = REGIONAL_MULTIPLIERS[input.location] || REGIONAL_MULTIPLIERS['Default']

  // Apply material quality multiplier
  const qualityMultiplier = MATERIAL_QUALITY_MULTIPLIERS[input.material_quality || 'standard']

  // Apply complexity factor
  const complexityScore = input.complexity_score || 5
  const complexityMultiplier = complexityScore > 5 ? 1 + ((complexityScore - 5) * COMPLEXITY_IMPACT_PERCENT) / 100 : 1

  // Calculate adjusted cost per sqft
  const adjustedCostPerSqft = baselineCostPerSqft * regionalMultiplier * qualityMultiplier * complexityMultiplier

  // Total estimated cost
  const estimatedTotal = adjustedCostPerSqft * input.size_sqft

  // Cost breakdown (industry standard ratios)
  const materialsPercent = 0.45
  const laborPercent = 0.35
  const overheadPercent = 0.12
  const contingencyPercent = 0.08

  const costBreakdown = {
    materials: estimatedTotal * materialsPercent,
    labor: estimatedTotal * laborPercent,
    overhead: estimatedTotal * overheadPercent,
    contingency: estimatedTotal * contingencyPercent,
  }

  // Confidence interval (±15% typically)
  const confidenceRange = 0.15
  const confidenceInterval = {
    low: estimatedTotal * (1 - confidenceRange),
    high: estimatedTotal * (1 + confidenceRange),
  }

  // Calculate prediction confidence based on available data
  const comparableProjectsCount = historicalData?.filter(
    (p) => p.project_type === input.project_type && p.location === input.location
  ).length || 0

  const predictionConfidence = Math.min(
    60 + comparableProjectsCount * 8, // Base 60% + 8% per comparable project
    95 // Max 95% confidence
  )

  // Identify risk factors
  const riskFactors: RiskFactor[] = []

  if (complexityScore > 7) {
    riskFactors.push({
      factor: 'High Complexity',
      impact: 'high',
      estimated_cost_impact: estimatedTotal * 0.12,
      mitigation: 'Add experienced project manager, extend timeline by 15%',
    })
  }

  if (input.material_quality === 'premium') {
    riskFactors.push({
      factor: 'Premium Materials',
      impact: 'medium',
      estimated_cost_impact: estimatedTotal * 0.08,
      mitigation: 'Lock in material pricing early, source from multiple vendors',
    })
  }

  if (input.size_sqft > 50000) {
    riskFactors.push({
      factor: 'Large Project Scale',
      impact: 'medium',
      estimated_cost_impact: estimatedTotal * 0.06,
      mitigation: 'Phased construction, establish strong supply chain',
    })
  }

  // Cost drivers
  const costDrivers: CostDriver[] = [
    {
      category: 'Materials',
      percentage_of_total: materialsPercent * 100,
      amount: costBreakdown.materials,
      trend: 'increasing', // Construction materials trend up 3-5% annually
    },
    {
      category: 'Labor',
      percentage_of_total: laborPercent * 100,
      amount: costBreakdown.labor,
      trend: 'increasing', // Labor shortage drives wages up
    },
    {
      category: 'Overhead',
      percentage_of_total: overheadPercent * 100,
      amount: costBreakdown.overhead,
      trend: 'stable',
    },
    {
      category: 'Contingency',
      percentage_of_total: contingencyPercent * 100,
      amount: costBreakdown.contingency,
      trend: 'stable',
    },
  ]

  return {
    estimated_total_cost: estimatedTotal,
    confidence_interval: confidenceInterval,
    cost_breakdown: costBreakdown,
    cost_per_sqft: adjustedCostPerSqft,
    comparable_projects: comparableProjectsCount,
    prediction_confidence: predictionConfidence,
    risk_factors: riskFactors,
    cost_drivers: costDrivers,
  }
}

/**
 * Analyze cost variance between estimated and actual
 */
export function analyzeCostVariance(
  estimated_cost: number,
  actual_cost: number,
  breakdown?: {
    estimated_materials?: number
    actual_materials?: number
    estimated_labor?: number
    actual_labor?: number
  }
): {
  variance_amount: number
  variance_percent: number
  variance_category: 'under_budget' | 'on_budget' | 'over_budget'
  primary_driver?: string
  lessons_learned: string[]
} {
  const variance = actual_cost - estimated_cost
  const variancePercent = (variance / estimated_cost) * 100

  let category: 'under_budget' | 'on_budget' | 'over_budget'
  if (Math.abs(variancePercent) <= 5) {
    category = 'on_budget'
  } else if (variance < 0) {
    category = 'under_budget'
  } else {
    category = 'over_budget'
  }

  // Identify primary driver
  let primaryDriver: string | undefined
  if (breakdown) {
    const materialVariance = (breakdown.actual_materials || 0) - (breakdown.estimated_materials || 0)
    const laborVariance = (breakdown.actual_labor || 0) - (breakdown.estimated_labor || 0)

    if (Math.abs(materialVariance) > Math.abs(laborVariance)) {
      primaryDriver = 'Materials'
    } else {
      primaryDriver = 'Labor'
    }
  }

  // Generate lessons learned
  const lessonsLearned: string[] = []

  if (category === 'over_budget') {
    if (variancePercent > 15) {
      lessonsLearned.push('Estimate was significantly low - review estimation methodology')
      lessonsLearned.push('Consider adding larger contingency for similar projects')
    }
    lessonsLearned.push('Document scope changes that contributed to overrun')
    lessonsLearned.push('Review material pricing assumptions vs actual costs')
  } else if (category === 'under_budget') {
    lessonsLearned.push('Estimate was conservative - can be more competitive on similar bids')
    if (variancePercent < -10) {
      lessonsLearned.push('Significantly under budget - ensure quality standards were met')
    }
  } else {
    lessonsLearned.push('Excellent cost control - use this project as benchmark')
  }

  return {
    variance_amount: variance,
    variance_percent: variancePercent,
    variance_category: category,
    primary_driver: primaryDriver,
    lessons_learned: lessonsLearned,
  }
}

/**
 * Predict material price trends
 */
export function predictMaterialPriceTrends(
  material: string,
  current_price: number,
  months_ahead: number = 6
): {
  predicted_price: number
  trend: 'increasing' | 'decreasing' | 'stable'
  confidence: number
  factors: string[]
} {
  // Simplified price trend model
  // In production, this would use actual market data and ML models

  const materialTrends: Record<string, { annual_change_percent: number; volatility: number }> = {
    lumber: { annual_change_percent: 8, volatility: 0.25 },
    steel: { annual_change_percent: 6, volatility: 0.15 },
    concrete: { annual_change_percent: 4, volatility: 0.10 },
    copper: { annual_change_percent: 7, volatility: 0.20 },
    aluminum: { annual_change_percent: 5, volatility: 0.15 },
    drywall: { annual_change_percent: 3, volatility: 0.08 },
    insulation: { annual_change_percent: 4, volatility: 0.10 },
  }

  const trendData = materialTrends[material.toLowerCase()] || { annual_change_percent: 4, volatility: 0.12 }

  const monthlyChange = trendData.annual_change_percent / 12
  const predictedPrice = current_price * Math.pow(1 + monthlyChange / 100, months_ahead)

  let trend: 'increasing' | 'decreasing' | 'stable'
  if (trendData.annual_change_percent > 2) {
    trend = 'increasing'
  } else if (trendData.annual_change_percent < -2) {
    trend = 'decreasing'
  } else {
    trend = 'stable'
  }

  const confidence = Math.max(50, 90 - trendData.volatility * 100)

  const factors = [
    'Historical price trends',
    'Supply chain conditions',
    'Seasonal demand patterns',
    'Commodity market indicators',
  ]

  return {
    predicted_price: predictedPrice,
    trend,
    confidence,
    factors,
  }
}
