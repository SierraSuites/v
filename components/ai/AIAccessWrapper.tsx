'use client'

import { useEffect, useState } from 'react'
import { hasAnyAIAccess, getUserTier, type SubscriptionTier } from '@/lib/ai-permissions'
import AIUpgradePrompt from './AIUpgradePrompt'

interface AIAccessWrapperProps {
  children: React.ReactNode
  showCompactPrompt?: boolean
  requiredTier?: 'pro' | 'enterprise'
}

export default function AIAccessWrapper({
  children,
  showCompactPrompt = false,
  requiredTier = 'pro'
}: AIAccessWrapperProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [currentTier, setCurrentTier] = useState<SubscriptionTier | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const userTier = await getUserTier()
      setCurrentTier(userTier)

      // Check if user meets required tier
      let access = false
      if (requiredTier === 'pro') {
        access = userTier === 'pro' || userTier === 'enterprise' || userTier === 'super_admin'
      } else if (requiredTier === 'enterprise') {
        access = userTier === 'enterprise' || userTier === 'super_admin'
      }

      setHasAccess(access)
    } catch (error) {
      console.error('Error checking AI access:', error)
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI Co-Pilot...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <AIUpgradePrompt
        variant={showCompactPrompt ? 'compact' : 'full'}
        currentTier={currentTier || 'starter'}
        targetTier={requiredTier}
      />
    )
  }

  return <>{children}</>
}
