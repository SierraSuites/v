// CRM-specific permissions and tier checking
// Integrates subscription tier features with RBAC permissions

import { permissionService } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'

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

/**
 * Get user's subscription tier from database
 * Integrates with RBAC system for complete access control
 */
export async function getUserTier(): Promise<SubscriptionTier> {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Authentication error in getUserTier:', authError)
      return 'starter' // Default to most restrictive tier
    }

    // Get subscription tier from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_tier, company_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return 'starter'
    }

    // If user has company, check company subscription tier instead
    if (profile?.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('subscription_tier')
        .eq('id', profile.company_id)
        .single()

      if (company?.subscription_tier) {
        return company.subscription_tier as SubscriptionTier
      }
    }

    // Fallback to user's individual tier
    return (profile?.subscription_tier as SubscriptionTier) || 'starter'
  } catch (error) {
    console.error('Unexpected error in getUserTier:', error)
    return 'starter'
  }
}

/**
 * Check if user has both tier access AND RBAC permission
 * This enforces a two-layer security model:
 * 1. Subscription tier must include the feature
 * 2. User's role must have the required permission
 */
export async function hasFullCRMAccess(): Promise<{
  hasTierAccess: boolean
  hasPermission: boolean
  hasFullAccess: boolean
  tier: SubscriptionTier
}> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return {
        hasTierAccess: false,
        hasPermission: false,
        hasFullAccess: false,
        tier: 'starter'
      }
    }

    // Check tier access
    const tier = await getUserTier()
    const hasTierAccess = hasCRMAccess(tier)

    // Check RBAC permission (CRM should require at least one of these permissions)
    const hasPermission = await permissionService.hasPermissionDB(
      user.id,
      '', // Company ID will be looked up by permissionService
      'canManageCompanySettings' // Using this as a proxy for CRM access - admins/managers can use CRM
    )

    return {
      hasTierAccess,
      hasPermission,
      hasFullAccess: hasTierAccess && hasPermission,
      tier
    }
  } catch (error) {
    console.error('Error checking full CRM access:', error)
    return {
      hasTierAccess: false,
      hasPermission: false,
      hasFullAccess: false,
      tier: 'starter'
    }
  }
}

/**
 * Check if user can access specific CRM features
 * Combines tier and permission checks
 */
export async function canAccessCRMFeature(feature: string): Promise<boolean> {
  try {
    const tier = await getUserTier()
    const hasTier = hasFeatureAccess(tier, feature)

    if (!hasTier) return false

    // For CRM features, also check RBAC permissions
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    // Admin/PM/Accountant roles should have CRM access
    const hasPermission = await permissionService.hasPermissionDB(
      user.id,
      '',
      'canManageCompanySettings'
    )

    return hasPermission
  } catch (error) {
    console.error('Error checking CRM feature access:', error)
    return false
  }
}
