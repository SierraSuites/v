"use client"

import { useState } from 'react'
import Link from 'next/link'
import { StorageQuota, formatStorageGB, TIER_STORAGE_LIMITS } from '@/lib/storage'

interface UpgradeStoragePromptProps {
  quota: StorageQuota
  onClose?: () => void
  variant?: 'modal' | 'banner' | 'inline'
}

export default function UpgradeStoragePrompt({
  quota,
  onClose,
  variant = 'banner'
}: UpgradeStoragePromptProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || quota.tier === 'enterprise' || !quota.isNearLimit) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    onClose?.()
  }

  const nextTier = quota.tier === 'starter' ? 'pro' : 'enterprise'
  const nextTierLimit = TIER_STORAGE_LIMITS[nextTier]
  const nextTierName = nextTier.charAt(0).toUpperCase() + nextTier.slice(1)

  const getUrgencyStyle = () => {
    if (quota.isOverLimit) {
      return {
        bg: '#FEE2E2',
        border: '#DC2626',
        text: '#991B1B',
        icon: '🚨'
      }
    }
    if (quota.isAtLimit) {
      return {
        bg: '#FEF3C7',
        border: '#F59E0B',
        text: '#92400E',
        icon: '⚠️'
      }
    }
    return {
      bg: '#FEF3C7',
      border: '#FBBF24',
      text: '#92400E',
      icon: '💡'
    }
  }

  const style = getUrgencyStyle()

  // Modal variant
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b" style={{ borderColor: '#E0E0E0' }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{style.icon}</span>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
                    {quota.isOverLimit ? 'Storage Full!' : quota.isAtLimit ? 'Storage Almost Full' : 'Upgrade Your Storage'}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                    You're using {formatStorageGB(quota.usedStorageGB)} of {formatStorageGB(quota.maxStorageGB)}
                  </p>
                </div>
              </div>
              {!quota.isOverLimit && (
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Current vs Next Tier Comparison */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Current Tier */}
              <div className="p-4 rounded-lg border" style={{ borderColor: '#E5E7EB', backgroundColor: '#F8F9FA' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>CURRENT PLAN</p>
                <p className="text-lg font-bold mb-1" style={{ color: '#1A1A1A' }}>
                  {quota.tier.charAt(0).toUpperCase() + quota.tier.slice(1)}
                </p>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {formatStorageGB(quota.maxStorageGB)} storage
                </p>
                <div className="mt-3 pt-3 border-t" style={{ borderColor: '#E0E0E0' }}>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: '#6B7280' }}>Used</span>
                    <span className="font-bold" style={{ color: style.text }}>
                      {quota.usedPercentage}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: '#E5E7EB' }}>
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.min(quota.usedPercentage, 100)}%`,
                        backgroundColor: style.border
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Next Tier */}
              <div className="p-4 rounded-lg border-2 relative overflow-hidden" style={{ borderColor: '#FF6B6B', backgroundColor: '#FFF5F5' }}>
                <div className="absolute top-0 right-0 px-2 py-1 text-xs font-bold text-white" style={{ backgroundColor: '#FF6B6B' }}>
                  RECOMMENDED
                </div>
                <p className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>UPGRADE TO</p>
                <p className="text-lg font-bold mb-1" style={{ color: '#FF6B6B' }}>
                  {nextTierName}
                </p>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {nextTierLimit === 0 ? 'Unlimited' : formatStorageGB(nextTierLimit)} storage
                </p>
                <div className="mt-3 pt-3 border-t" style={{ borderColor: '#FFE5E5' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#6B7280' }}>Would be at</span>
                    <span className="text-xs font-bold" style={{ color: '#6BCB77' }}>
                      {nextTierLimit === 0 ? '0%' : `${Math.round((quota.usedStorageGB / nextTierLimit) * 100)}%`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: '#E5E7EB' }}>
                    <div
                      className="h-full"
                      style={{
                        width: nextTierLimit === 0 ? '5%' : `${Math.min((quota.usedStorageGB / nextTierLimit) * 100, 100)}%`,
                        backgroundColor: '#6BCB77'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="mb-6">
              <p className="font-semibold mb-3" style={{ color: '#1A1A1A' }}>
                Why upgrade to {nextTierName}?
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-green-500 flex-shrink-0">✓</span>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    {nextTierLimit === 0 ? 'Unlimited storage' : `${nextTierLimit}x more storage (${formatStorageGB(nextTierLimit)})`}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 flex-shrink-0">✓</span>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    Upload unlimited high-resolution photos
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 flex-shrink-0">✓</span>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    Priority support and faster uploads
                  </p>
                </div>
                {nextTier === 'enterprise' && (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      <p className="text-sm" style={{ color: '#6B7280' }}>
                        Advanced AI analysis and custom integrations
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      <p className="text-sm" style={{ color: '#6B7280' }}>
                        Dedicated account manager
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Warning Message */}
            {quota.isOverLimit && (
              <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: '#FEE2E2' }}>
                <p className="text-sm font-semibold" style={{ color: '#DC2626' }}>
                  ⚠️ You cannot upload new photos until you upgrade or free up space.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50" style={{ borderColor: '#E0E0E0' }}>
            <div className="flex gap-3">
              {!quota.isOverLimit && (
                <button
                  onClick={handleDismiss}
                  className="flex-1 px-4 py-3 rounded-lg font-semibold border transition-colors hover:bg-white"
                  style={{ borderColor: '#E5E7EB', color: '#374151' }}
                >
                  Maybe Later
                </button>
              )}
              <Link
                href="/pricing"
                className="flex-1 px-4 py-3 rounded-lg text-white font-semibold text-center transition-transform hover:scale-105"
                style={{ backgroundColor: '#FF6B6B' }}
              >
                Upgrade Now →
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <div
        className="border-l-4 p-4 rounded-lg shadow-md"
        style={{
          backgroundColor: style.bg,
          borderColor: style.border
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{style.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm mb-1" style={{ color: style.text }}>
              {quota.isOverLimit ? 'Storage Full - Uploads Blocked' : quota.isAtLimit ? 'Storage Almost Full' : 'Running Low on Storage'}
            </p>
            <p className="text-sm mb-3" style={{ color: style.text }}>
              You're using {formatStorageGB(quota.usedStorageGB)} of {formatStorageGB(quota.maxStorageGB)} ({quota.usedPercentage}%).
              {quota.isOverLimit ? ' Upgrade now to continue uploading.' : ` Upgrade to ${nextTierName} for ${nextTierLimit === 0 ? 'unlimited' : formatStorageGB(nextTierLimit)} storage.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/pricing"
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-transform hover:scale-105 inline-block"
                style={{ backgroundColor: style.border }}
              >
                Upgrade to {nextTierName}
              </Link>
              {!quota.isOverLimit && (
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:bg-white"
                  style={{ borderColor: style.border, color: style.text }}
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
          {!quota.isOverLimit && (
            <button
              onClick={handleDismiss}
              className="text-xl leading-none hover:opacity-70 flex-shrink-0"
              style={{ color: style.text }}
            >
              ×
            </button>
          )}
        </div>
      </div>
    )
  }

  // Inline variant
  return (
    <div className="p-4 rounded-lg border" style={{ borderColor: style.border, backgroundColor: style.bg }}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xl">{style.icon}</span>
        <div>
          <p className="font-semibold text-sm" style={{ color: style.text }}>
            {quota.usedPercentage}% of storage used
          </p>
          <p className="text-xs" style={{ color: style.text }}>
            {formatStorageGB(quota.remainingGB)} remaining
          </p>
        </div>
      </div>
      <Link
        href="/pricing"
        className="block w-full px-4 py-2 rounded-lg text-white text-sm font-semibold text-center transition-transform hover:scale-105"
        style={{ backgroundColor: style.border }}
      >
        Upgrade for More Space
      </Link>
    </div>
  )
}
