'use client'

import { useEffect, useState } from 'react'
import { hasFullCRMAccess, type SubscriptionTier } from '@/lib/crm-permissions'
import { UnauthorizedAccess } from '@/components/auth/PermissionGate'
import CRMUpgradePrompt from './CRMUpgradePrompt'

interface CRMAccessWrapperProps {
  children: React.ReactNode
  showCompactPrompt?: boolean
}

/**
 * CRM Access Wrapper - Combines tier-based and RBAC permission checks
 * Two-layer security:
 * 1. Subscription tier must include CRM feature
 * 2. User role must have sufficient permissions
 */
export default function CRMAccessWrapper({ children, showCompactPrompt = false }: CRMAccessWrapperProps) {
  const [accessStatus, setAccessStatus] = useState<{
    hasTierAccess: boolean
    hasPermission: boolean
    hasFullAccess: boolean
    tier: SubscriptionTier
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const status = await hasFullCRMAccess()
      setAccessStatus(status)
    } catch (error) {
      console.error('Error checking CRM access:', error)
      setAccessStatus({
        hasTierAccess: false,
        hasPermission: false,
        hasFullAccess: false,
        tier: 'starter'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    )
  }

  if (!accessStatus) {
    return (
      <UnauthorizedAccess
        message="Unable to verify CRM access. Please try again."
      />
    )
  }

  // Case 1: Tier doesn't include CRM - show upgrade prompt
  if (!accessStatus.hasTierAccess) {
    return <CRMUpgradePrompt variant={showCompactPrompt ? 'compact' : 'full'} />
  }

  // Case 2: Has tier but insufficient permissions - show permission denied
  if (!accessStatus.hasPermission) {
    return (
      <UnauthorizedAccess
        message="Your subscription includes CRM, but your user role does not have permission to access it. Contact your administrator to request CRM access."
      />
    )
  }

  // Case 3: Full access granted
  return <>{children}</>
}
