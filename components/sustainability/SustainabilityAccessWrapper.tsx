'use client'

import { useEffect, useState } from 'react'
import { hasSustainabilityAccess, getUserTier, type SubscriptionTier } from '@/lib/sustainability-permissions'
import SustainabilityUpgradePrompt from './SustainabilityUpgradePrompt'

interface SustainabilityAccessWrapperProps {
  children: React.ReactNode
  showCompactPrompt?: boolean
}

export default function SustainabilityAccessWrapper({ children, showCompactPrompt = false }: SustainabilityAccessWrapperProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const userTier = await getUserTier()
      const access = hasSustainabilityAccess(userTier)
      setHasAccess(access)
    } catch (error) {
      console.error('Error checking sustainability access:', error)
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return <SustainabilityUpgradePrompt variant={showCompactPrompt ? 'compact' : 'full'} />
  }

  return <>{children}</>
}
