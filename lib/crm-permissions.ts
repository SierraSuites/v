// CRM-specific permissions and tier checking

export type SubscriptionTier = 'starter' | 'pro' | 'enterprise' | 'super_admin'

export interface UserTier {
  tier: SubscriptionTier
  features: string[]
}

// Feature definitions by tier
export const TIER_FEATURES = {
  starter: [
    'basic_dashboard',
    'projects_5',
    'quotes_basic',
    'tasks_basic',
  ],
  pro: [
    'basic_dashboard',
    'projects_unlimited',
    'quotes_advanced',
    'tasks_unlimited',
    'fieldsnap_basic',
    'reports_basic',
    'crm_full', // ← CRM is Pro feature
    'crm_contacts_unlimited',
    'crm_leads_pipeline',
    'crm_activities',
    'crm_email_templates',
    'integrations_basic', // QuickBooks, Excel import/export
    'email_integration', // Gmail/Outlook
  ],
  enterprise: [
    'basic_dashboard',
    'projects_unlimited',
    'quotes_advanced',
    'tasks_unlimited',
    'fieldsnap_unlimited',
    'reports_advanced',
    'crm_full',
    'crm_contacts_unlimited',
    'crm_leads_pipeline',
    'crm_activities',
    'crm_email_templates',
    'crm_email_automation', // Automated email campaigns
    'crm_advanced_reports',
    'integrations_advanced', // All integrations
    'email_integration',
    'calendar_integration', // Google Calendar, Outlook Calendar
    'custom_workflows',
    'api_access',
    'priority_support',
    'white_label',
  ],
  super_admin: [
    // Super admin has all features
    'all_features',
  ]
}

// Tier pricing for display
export const TIER_PRICING = {
  starter: { price: 49, label: 'Starter', period: 'month' },
  pro: { price: 88, label: 'Pro', period: 'month' },
  enterprise: { price: 149, label: 'Enterprise', period: 'month' },
}

// Check if user has access to a specific feature
export function hasFeatureAccess(userTier: SubscriptionTier, feature: string): boolean {
  if (userTier === 'super_admin') return true

  const tierFeatures = TIER_FEATURES[userTier] || []
  return tierFeatures.includes(feature)
}

// Check if user has CRM access
export function hasCRMAccess(userTier: SubscriptionTier): boolean {
  return hasFeatureAccess(userTier, 'crm_full')
}

// Get required tier for a feature
export function getRequiredTier(feature: string): SubscriptionTier | null {
  for (const [tier, features] of Object.entries(TIER_FEATURES)) {
    if (features.includes(feature)) {
      return tier as SubscriptionTier
    }
  }
  return null
}

// Get upgrade message for a feature
export function getUpgradeMessage(feature: string): string {
  const requiredTier = getRequiredTier(feature)

  if (!requiredTier || requiredTier === 'starter') {
    return 'This feature is not available on your current plan.'
  }

  const tierInfo = TIER_PRICING[requiredTier as keyof typeof TIER_PRICING]
  if (!tierInfo) {
    return 'This feature requires a higher-tier subscription.'
  }

  return `Upgrade to ${tierInfo.label} ($${tierInfo.price}/${tierInfo.period}) to unlock this feature.`
}

// Get CRM-specific upgrade message
export function getCRMUpgradeMessage(): {
  title: string
  description: string
  requiredTier: string
  price: number
  features: string[]
} {
  return {
    title: 'CRM Suite',
    description: 'Unlock powerful customer relationship management tools',
    requiredTier: 'Pro',
    price: 88,
    features: [
      'Unlimited contacts and leads',
      'Visual sales pipeline with Kanban board',
      'Activity tracking and calendar',
      'Email templates and campaigns',
      'QuickBooks integration',
      'Excel/CSV import and export',
      'Gmail and Outlook integration',
      'Advanced reporting and analytics',
    ]
  }
}

// Mock function to get user tier (in production, this would come from Supabase)
export async function getUserTier(): Promise<SubscriptionTier> {
  // TODO: Replace with actual Supabase query to users.subscription_tier
  // For now, return 'pro' for testing
  // In production:
  // const { data: { user } } = await supabase.auth.getUser()
  // const { data } = await supabase.from('users').select('subscription_tier').eq('id', user.id).single()
  // return data.subscription_tier

  return 'pro' // Change to 'starter' to test upgrade prompts
}
