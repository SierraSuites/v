'use client'

import { useEffect, useState } from 'react'
import { hasCRMAccess, getUserTier, type SubscriptionTier } from '@/lib/crm-permissions'
import CRMUpgradePrompt from './CRMUpgradePrompt'

interface CRMAccessWrapperProps {
  children: React.ReactNode
  showCompactPrompt?: boolean
}

export default function CRMAccessWrapper({ children, showCompactPrompt = false }: CRMAccessWrapperProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const userTier = await getUserTier()
      const access = hasCRMAccess(userTier)
      setHasAccess(access)
    } catch (error) {
      console.error('Error checking CRM access:', error)
      setHasAccess(false)
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

  if (!hasAccess) {
    return <CRMUpgradePrompt variant={showCompactPrompt ? 'compact' : 'full'} />
  }

  return <>{children}</>
}
