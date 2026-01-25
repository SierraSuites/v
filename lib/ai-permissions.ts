/**
 * AI CO-PILOT PERMISSION SYSTEM
 * Tier-based access control for AI features
 */

export type SubscriptionTier = 'starter' | 'pro' | 'enterprise' | 'super_admin'

export interface AIFeatureAccess {
  hasAccess: boolean
  requiredTier: SubscriptionTier
  upgradeMessage?: string
}

// AI Features by tier
export const AI_FEATURES = {
  starter: [
    'basic_chat_assistant',
    'simple_cost_calculator',
    'safety_tips_library',
    'basic_recommendations'
  ],
  pro: [
    'ai_chat_assistant',
    'project_health_monitor',
    'basic_predictions',
    'smart_estimator_basic',
    'blueprint_viewer',
    'safety_checklist',
    'material_price_alerts',
    'site_photo_tagging'
  ],
  enterprise: [
    // All Pro features plus:
    'ai_command_center',
    'crystal_ball_predictions',
    'advanced_analytics',
    'smart_estimator_advanced',
    'blueprint_analyzer_ai',
    'clash_detection',
    'material_takeoff',
    'safety_sentinel',
    'accident_prediction',
    'site_intelligence',
    'photo_video_analysis',
    'material_optimizer',
    'bulk_ordering_optimization',
    'contract_guardian',
    'legal_risk_analysis',
    'predictive_maintenance',
    'custom_ai_training',
    'api_access',
    'priority_ai_support',
    'white_label_reports'
  ],
  super_admin: ['*'] // All features
}

// Check if user has access to specific AI feature
export function hasAIFeatureAccess(
  userTier: SubscriptionTier,
  feature: string
): AIFeatureAccess {
  // Super admin has access to everything
  if (userTier === 'super_admin') {
    return { hasAccess: true, requiredTier: 'super_admin' }
  }

  // Check if feature is in user's tier
  const tierFeatures = AI_FEATURES[userTier] || []
  if (tierFeatures.includes(feature) || tierFeatures.includes('*')) {
    return { hasAccess: true, requiredTier: userTier }
  }

  // Check which tier is required
  if (AI_FEATURES.enterprise.includes(feature)) {
    return {
      hasAccess: false,
      requiredTier: 'enterprise',
      upgradeMessage: 'Upgrade to Enterprise to unlock advanced AI features'
    }
  }

  if (AI_FEATURES.pro.includes(feature)) {
    return {
      hasAccess: false,
      requiredTier: 'pro',
      upgradeMessage: 'Upgrade to Pro to unlock AI-powered insights'
    }
  }

  return {
    hasAccess: false,
    requiredTier: 'starter',
    upgradeMessage: 'Feature not available'
  }
}

// Check if user has access to AI Command Center
export function hasAICommandCenterAccess(userTier: SubscriptionTier): boolean {
  return userTier === 'enterprise' || userTier === 'super_admin'
}

// Check if user has access to any AI features
export function hasAnyAIAccess(userTier: SubscriptionTier): boolean {
  return userTier === 'pro' || userTier === 'enterprise' || userTier === 'super_admin'
}

// Get AI upgrade message based on current tier
export function getAIUpgradeMessage(currentTier: SubscriptionTier) {
  const messages = {
    starter: {
      title: 'Unlock AI Construction Co-Pilot',
      description: 'Get AI-powered predictions, estimates, and insights',
      requiredTier: 'Pro',
      price: 88,
      features: [
        'AI-powered project predictions',
        'Smart estimator (2-minute quotes)',
        'Blueprint analysis',
        'Safety recommendations',
        'Material cost optimization',
        'Site photo intelligence'
      ],
      savings: 'Save $18,000+ per project with AI insights'
    },
    pro: {
      title: 'Unlock Advanced AI Features',
      description: 'Get the full AI Co-Pilot experience with predictive analytics',
      requiredTier: 'Enterprise',
      price: 149,
      features: [
        'Crystal Ball - Predict delays 3 weeks early',
        'Advanced blueprint clash detection',
        'Safety Sentinel - Accident prediction',
        'Material optimizer with bulk ordering',
        'Contract Guardian - Legal risk analysis',
        'Site Intelligence with video analysis',
        'Custom AI training on your data',
        'API access for integrations'
      ],
      savings: 'AI prevented $47,000 in errors on average Enterprise project'
    },
    enterprise: {
      title: 'You have full AI access!',
      description: 'Enjoying the most advanced construction AI in the industry',
      requiredTier: 'Enterprise',
      price: 149,
      features: [],
      savings: ''
    },
    super_admin: {
      title: 'Super Admin Access',
      description: 'Full system access for demonstration',
      requiredTier: 'Super Admin',
      price: 0,
      features: [],
      savings: ''
    }
  }

  return messages[currentTier]
}

// Calculate AI ROI based on project data
export interface AIROICalculation {
  annualRevenue: number
  avgProjectSize: number
  currentMargin: number

  // AI improvements
  estimatingErrorReduction: number // percentage
  materialWasteReduction: number // percentage
  scheduleDelayReduction: number // percentage
  bidWinRateIncrease: number // percentage

  // Results
  marginImprovement: number
  additionalRevenue: number
  annualAIValue: number
  tierCost: number
  roi: number
  paybackDays: number
}

export function calculateAIROI(
  annualRevenue: number,
  avgProjectSize: number,
  currentMargin: number,
  tier: 'pro' | 'enterprise'
): AIROICalculation {
  // AI impact factors (based on industry studies and our data)
  const proImpacts = {
    estimatingErrorReduction: 45, // Pro tier reduces errors by 45%
    materialWasteReduction: 15,
    scheduleDelayReduction: 20,
    bidWinRateIncrease: 12
  }

  const enterpriseImpacts = {
    estimatingErrorReduction: 65, // Enterprise tier reduces errors by 65%
    materialWasteReduction: 22,
    scheduleDelayReduction: 31,
    bidWinRateIncrease: 18
  }

  const impacts = tier === 'enterprise' ? enterpriseImpacts : proImpacts

  // Calculate improvements
  const estimatingImprovement = (avgProjectSize * 0.05) * (impacts.estimatingErrorReduction / 100) // 5% typical error
  const wasteImprovement = (avgProjectSize * 0.08) * (impacts.materialWasteReduction / 100) // 8% typical waste
  const scheduleImprovement = (avgProjectSize * 0.12) * (impacts.scheduleDelayReduction / 100) // 12% typical delay cost

  const marginImprovement = ((estimatingImprovement + wasteImprovement + scheduleImprovement) / avgProjectSize) * 100

  // Additional revenue from higher win rate
  const projectsPerYear = annualRevenue / avgProjectSize
  const additionalWins = projectsPerYear * (impacts.bidWinRateIncrease / 100)
  const additionalRevenue = additionalWins * avgProjectSize

  // Total annual value
  const marginValue = (annualRevenue + additionalRevenue) * (marginImprovement / 100)
  const annualAIValue = marginValue + (additionalRevenue * (currentMargin / 100))

  // Cost and ROI
  const tierCost = tier === 'enterprise' ? 149 * 12 : 88 * 12
  const roi = ((annualAIValue - tierCost) / tierCost) * 100
  const paybackDays = Math.ceil((tierCost / annualAIValue) * 365)

  return {
    annualRevenue,
    avgProjectSize,
    currentMargin,
    estimatingErrorReduction: impacts.estimatingErrorReduction,
    materialWasteReduction: impacts.materialWasteReduction,
    scheduleDelayReduction: impacts.scheduleDelayReduction,
    bidWinRateIncrease: impacts.bidWinRateIncrease,
    marginImprovement,
    additionalRevenue,
    annualAIValue,
    tierCost,
    roi,
    paybackDays
  }
}

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

// Format number with commas
export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

// Mock function to get user's subscription tier
// In production, this would fetch from Supabase/Stripe
export async function getUserTier(): Promise<SubscriptionTier> {
  // TODO: Replace with actual tier lookup from database
  // For now, return 'enterprise' for demo purposes
  return 'enterprise'

  // Production implementation would be:
  // const { data: { user } } = await supabase.auth.getUser()
  // const { data: subscription } = await supabase
  //   .from('subscriptions')
  //   .select('tier')
  //   .eq('user_id', user.id)
  //   .single()
  // return subscription?.tier || 'starter'
}

// AI Feature descriptions for marketing
export const AI_FEATURE_DESCRIPTIONS = {
  crystal_ball_predictions: {
    name: 'Crystal Ball Predictions',
    icon: '🔮',
    description: 'Predict delays and cost overruns 3 weeks before they happen',
    benefit: 'Prevent $47,000 average in project issues',
    tier: 'enterprise'
  },
  smart_estimator_advanced: {
    name: 'Smart Estimator',
    icon: '⚡',
    description: 'Generate perfect project estimates in 2 minutes',
    benefit: 'Win 18% more bids with AI-optimized proposals',
    tier: 'pro'
  },
  blueprint_analyzer_ai: {
    name: 'Blueprint Intelligence',
    icon: '📐',
    description: 'AI analyzes drawings and finds conflicts before construction',
    benefit: 'Catch $8,500 average in rework issues',
    tier: 'enterprise'
  },
  safety_sentinel: {
    name: 'Safety Sentinel',
    icon: '🛡️',
    description: 'Predict and prevent accidents with AI safety analysis',
    benefit: 'Reduce safety incidents by 42%',
    tier: 'enterprise'
  },
  material_optimizer: {
    name: 'Material Optimizer',
    icon: '💎',
    description: 'AI finds material cost savings and optimal ordering',
    benefit: 'Save 15-30% on material costs',
    tier: 'pro'
  },
  site_intelligence: {
    name: 'Site Intelligence',
    icon: '📸',
    description: 'AI analyzes site photos and videos for quality, safety, progress',
    benefit: 'Catch issues before they become expensive',
    tier: 'enterprise'
  },
  contract_guardian: {
    name: 'Contract Guardian',
    icon: '⚖️',
    description: 'AI reviews contracts and flags legal risks',
    benefit: 'Avoid unfavorable contract terms',
    tier: 'enterprise'
  },
  ai_command_center: {
    name: 'AI Command Center',
    icon: '🎯',
    description: 'Mission control for all your AI-powered insights',
    benefit: 'See everything at a glance',
    tier: 'enterprise'
  }
}

// Testimonials for AI features
export const AI_TESTIMONIALS = [
  {
    quote: "The AI Co-Pilot caught a $47,000 error in our estimate before we bid. It paid for 10 years of Enterprise tier in one project.",
    author: "Michael Chen",
    company: "Summit Builders",
    project: "$2.4M Commercial Project",
    savings: "$47,000"
  },
  {
    quote: "We used to spend 8 hours on each estimate. Now the AI does it in 2 minutes, and we win more bids because we can respond faster.",
    author: "Sarah Martinez",
    company: "Precision Construction",
    project: "Residential Portfolio",
    savings: "18% higher win rate"
  },
  {
    quote: "The Safety Sentinel predicted a fall risk that we hadn't noticed. Prevented what could have been a catastrophic accident.",
    author: "James Wilson",
    company: "Ironclad Contractors",
    project: "High-Rise Construction",
    savings: "1 serious accident prevented"
  },
  {
    quote: "Blueprint Analyzer found conflicts between structural and HVAC that would have cost $18,000 to fix during construction. Found it before we broke ground.",
    author: "Linda Rodriguez",
    company: "Premier Development",
    project: "Mixed-Use Building",
    savings: "$18,000"
  }
]

// AI "Magic Moment" demo scenarios
export const AI_DEMO_PREDICTIONS = [
  {
    id: '1',
    type: 'schedule_delay',
    severity: 'critical',
    title: 'Foundation Delay Predicted',
    confidence: 94,
    description: 'Weather patterns and crew availability suggest 12-day delay likely',
    impact: {
      delay_days: 12,
      cost_impact: 48200
    },
    prevention_cost: 10400,
    savings: 37800,
    roi: 363
  },
  {
    id: '2',
    type: 'cost_overrun',
    severity: 'high',
    title: 'Material Price Increase Expected',
    confidence: 87,
    description: 'Lumber prices rising 14% in next 60 days based on market trends',
    impact: {
      cost_impact: 24600
    },
    prevention_cost: 0,
    savings: 24600,
    roi: Infinity
  },
  {
    id: '3',
    type: 'safety_risk',
    severity: 'high',
    title: 'Fall Risk This Week',
    confidence: 78,
    description: 'Roof work + high winds + new crew = elevated fall risk',
    impact: {
      average_accident_cost: 142000
    },
    prevention_cost: 1200,
    savings: 140800,
    roi: 11733
  }
]
