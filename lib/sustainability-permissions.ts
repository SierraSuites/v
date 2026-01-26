// Sustainability Hub permissions and tier checking

export type SubscriptionTier = 'starter' | 'pro' | 'enterprise' | 'super_admin'

// Sustainability features by tier
export const SUSTAINABILITY_FEATURES: Record<SubscriptionTier, string[]> = {
  starter: [],
  pro: [
    'sustainability_dashboard',
    'carbon_tracking_basic', // Scope 1 & 2 only
    'waste_management',
    'water_monitoring',
    'materials_database_view',
    'leed_assistant_basic',
    'basic_reports',
    'roi_calculator',
  ],
  enterprise: [
    'sustainability_dashboard',
    'carbon_tracking_advanced', // All 3 scopes
    'scope_3_calculations',
    'waste_management',
    'waste_analytics_advanced',
    'water_monitoring',
    'water_conservation_ai',
    'materials_database_full',
    'materials_epd_integration',
    'certification_multi', // Multiple certifications simultaneously
    'leed_assistant_advanced',
    'well_building_standard',
    'breeam_assessment',
    'living_building_challenge',
    'esg_reporting',
    'gri_compliance',
    'sasb_reporting',
    'tcfd_alignment',
    'api_integrations',
    'custom_reporting',
    'ai_optimization',
    'team_training_portal',
    'green_building_incentives',
  ],
  super_admin: ['all_features']
}

// Check if user has access to a specific sustainability feature
export function hasSustainabilityFeature(userTier: SubscriptionTier, feature: string): boolean {
  if (userTier === 'super_admin') return true

  const tierFeatures = SUSTAINABILITY_FEATURES[userTier] || []
  return tierFeatures.includes(feature)
}

// Check if user has ANY sustainability access
export function hasSustainabilityAccess(userTier: SubscriptionTier): boolean {
  return userTier === 'pro' || userTier === 'enterprise' || userTier === 'super_admin'
}

// Get sustainability upgrade message with ROI focus
export function getSustainabilityUpgradeMessage(): {
  title: string
  description: string
  requiredTier: string
  price: number
  features: string[]
  roi: {
    taxCredits: string
    energySavings: string
    propertyValue: string
    bidWinRate: string
  }
} {
  return {
    title: 'Sustainability Hub',
    description: 'Win more bids, save money, and build greener with construction-focused sustainability tools',
    requiredTier: 'Pro',
    price: 88,
    features: [
      'Carbon footprint tracking (Scope 1 & 2)',
      'Material waste management with cost analysis',
      'Water usage monitoring',
      'LEED certification assistant',
      'Sustainable materials database',
      'ROI calculator for green building',
      'Tax credit identifier (average $42K per project)',
      'Professional ESG reports for RFPs',
    ],
    roi: {
      taxCredits: '$10,000 - $100,000 per project',
      energySavings: '$120,000+ over 10 years',
      propertyValue: '4-7% premium on property value',
      bidWinRate: '23% higher win rate on green projects'
    }
  }
}

// Get Enterprise upgrade message (from Pro)
export function getEnterpriseUpgradeMessage(): {
  title: string
  description: string
  price: number
  additionalFeatures: string[]
} {
  return {
    title: 'Enterprise Sustainability',
    description: 'Advanced carbon accounting and AI optimization for corporate ESG compliance',
    price: 149,
    additionalFeatures: [
      'Scope 3 carbon calculations (supply chain)',
      'Multiple certifications (LEED + WELL + BREEAM)',
      'ESG reporting (GRI, SASB, TCFD aligned)',
      'AI-powered sustainability optimization',
      'API integrations with EPA, USGBC, and more',
      'Custom white-label reports',
      'Team training portal',
      'Priority sustainability consulting',
    ]
  }
}

// ROI Calculator - Shows financial benefits
export interface SustainabilityROI {
  projectValue: number
  certificationLevel: 'Certified' | 'Silver' | 'Gold' | 'Platinum'
  taxCredits: { min: number; max: number }
  energySavings10yr: { min: number; max: number }
  propertyValueIncrease: { min: number; max: number } // percentage
  certificationCost: { min: number; max: number }
  netBenefit10yr: { min: number; max: number }
  roiMultiplier: number
}

export function calculateSustainabilityROI(
  projectValue: number,
  certificationLevel: 'Certified' | 'Silver' | 'Gold' | 'Platinum'
): SustainabilityROI {
  // Tax credit ranges based on certification level
  const taxCreditRanges = {
    'Certified': { min: 10000, max: 25000 },
    'Silver': { min: 25000, max: 50000 },
    'Gold': { min: 45000, max: 75000 },
    'Platinum': { min: 65000, max: 100000 }
  }

  // Energy savings multipliers
  const energySavingsMultipliers = {
    'Certified': { min: 0.08, max: 0.12 },
    'Silver': { min: 0.10, max: 0.15 },
    'Gold': { min: 0.12, max: 0.18 },
    'Platinum': { min: 0.15, max: 0.22 }
  }

  // Property value increase
  const propertyValueIncreases = {
    'Certified': { min: 2, max: 4 },
    'Silver': { min: 3, max: 5 },
    'Gold': { min: 4, max: 7 },
    'Platinum': { min: 6, max: 10 }
  }

  // Certification costs
  const certificationCosts = {
    'Certified': { min: 8000, max: 15000 },
    'Silver': { min: 12000, max: 20000 },
    'Gold': { min: 15000, max: 25000 },
    'Platinum': { min: 20000, max: 35000 }
  }

  const taxCredits = taxCreditRanges[certificationLevel]
  const energyMultiplier = energySavingsMultipliers[certificationLevel]
  const energySavings10yr = {
    min: projectValue * energyMultiplier.min,
    max: projectValue * energyMultiplier.max
  }
  const propertyValueIncrease = propertyValueIncreases[certificationLevel]
  const certificationCost = certificationCosts[certificationLevel]

  const totalBenefitMin = taxCredits.min + energySavings10yr.min
  const totalBenefitMax = taxCredits.max + energySavings10yr.max
  const netBenefit10yr = {
    min: totalBenefitMin - certificationCost.max,
    max: totalBenefitMax - certificationCost.min
  }

  const roiMultiplier = (netBenefit10yr.min + netBenefit10yr.max) / 2 / ((certificationCost.min + certificationCost.max) / 2)

  return {
    projectValue,
    certificationLevel,
    taxCredits,
    energySavings10yr,
    propertyValueIncrease,
    certificationCost,
    netBenefit10yr,
    roiMultiplier: Math.round(roiMultiplier * 10) / 10
  }
}

// Mock function to get user tier (replace with real Supabase query in production)
export async function getUserTier(): Promise<SubscriptionTier> {
  // TODO: Replace with actual Supabase query
  // const { data: { user } } = await supabase.auth.getUser()
  // const { data } = await supabase.from('users').select('subscription_tier').eq('id', user.id).single()
  // return data.subscription_tier

  return 'pro' // Change to 'starter' to test upgrade prompts
}

// Certification point thresholds
export const LEED_THRESHOLDS = {
  'Certified': 40,
  'Silver': 50,
  'Gold': 60,
  'Platinum': 80
}

export const WELL_THRESHOLDS = {
  'Silver': 50,
  'Gold': 60,
  'Platinum': 80
}

// Common material carbon factors (kg CO2e per unit)
export const CARBON_FACTORS = {
  concrete: { standard: 150, low_carbon: 95, recycled: 75 }, // per cubic yard
  steel: { virgin: 1900, recycled: 500 }, // per ton
  lumber: { conventional: 100, fsc_certified: 85 }, // per 1000 board feet
  insulation: { fiberglass: 25, cellulose: 12, spray_foam: 180 }, // per 1000 sqft R-20
  drywall: { standard: 250, recycled_content: 180 }, // per 1000 sqft
  roofing: { asphalt_shingle: 40, metal: 65, cool_roof: 35 }, // per square
}

// Waste diversion benchmarks by project type
export const WASTE_DIVERSION_BENCHMARKS = {
  'new_construction': { industry_avg: 45, best_practice: 75 },
  'renovation': { industry_avg: 60, best_practice: 85 },
  'demolition': { industry_avg: 70, best_practice: 95 },
  'commercial': { industry_avg: 50, best_practice: 80 },
  'residential': { industry_avg: 40, best_practice: 70 }
}

// Helper to format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// Helper to format large numbers
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M'
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K'
  }
  return value.toFixed(0)
}
