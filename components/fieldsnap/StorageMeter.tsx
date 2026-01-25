"use client"

import { useState } from 'react'
import Link from 'next/link'
import { StorageQuota, formatStorageGB } from '@/lib/storage'

interface StorageMeterProps {
  quota: StorageQuota
  showDetails?: boolean
  compact?: boolean
  onUpgradeClick?: () => void
}

export default function StorageMeter({
  quota,
  showDetails = false,
  compact = false,
  onUpgradeClick
}: StorageMeterProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  const getStorageColor = () => {
    if (quota.tier === 'enterprise') return '#6BCB77'
    if (quota.usedPercentage >= 95) return '#DC2626'
    if (quota.usedPercentage >= 80) return '#F59E0B'
    if (quota.usedPercentage >= 60) return '#FBBF24'
    return '#6BCB77'
  }

  const getStorageStatus = () => {
    if (quota.tier === 'enterprise') return 'Unlimited Storage'
    if (quota.isOverLimit) return 'Storage Full!'
    if (quota.isAtLimit) return 'Almost Full'
    if (quota.isNearLimit) return 'Running Low'
    return 'Healthy'
  }

  const storageColor = getStorageColor()
  const storageStatus = getStorageStatus()

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setShowBreakdown(!showBreakdown)}
      >
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>
              Storage
            </span>
            <span className="text-xs font-bold" style={{ color: storageColor }}>
              {quota.tier === 'enterprise' ? 'Unlimited' : `${quota.usedPercentage}%`}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E7EB' }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${Math.min(quota.usedPercentage, 100)}%`,
                backgroundColor: storageColor
              }}
            />
          </div>
          {quota.tier !== 'enterprise' && (
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
              {formatStorageGB(quota.usedStorageGB)} / {formatStorageGB(quota.maxStorageGB)}
            </p>
          )}
        </div>
        {quota.isNearLimit && (
          <span className="text-xl">⚠️</span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border p-6" style={{ borderColor: '#E0E0E0' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${storageColor}20` }}
          >
            {quota.tier === 'enterprise' ? '♾️' : '💾'}
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: '#1A1A1A' }}>
              Storage Usage
            </h3>
            <p className="text-sm" style={{ color: storageColor }}>
              {storageStatus}
            </p>
          </div>
        </div>

        {/* Tier Badge */}
        <div
          className="px-3 py-1 rounded-full text-xs font-bold uppercase"
          style={{
            backgroundColor: quota.tier === 'enterprise' ? '#FFE5E5' : quota.tier === 'pro' ? '#E5F4FF' : '#F3F4F6',
            color: quota.tier === 'enterprise' ? '#FF6B6B' : quota.tier === 'pro' ? '#6A9BFD' : '#6B7280'
          }}
        >
          {quota.tier}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>
            {quota.tier === 'enterprise' ? 'Unlimited Storage' : `${formatStorageGB(quota.usedStorageGB)} used`}
          </span>
          {quota.tier !== 'enterprise' && (
            <span className="text-sm font-bold" style={{ color: storageColor }}>
              {quota.usedPercentage}%
            </span>
          )}
        </div>

        {quota.tier !== 'enterprise' && (
          <>
            <div
              className="h-4 rounded-full overflow-hidden relative"
              style={{ backgroundColor: '#E5E7EB' }}
            >
              <div
                className="h-full transition-all duration-500 relative"
                style={{
                  width: `${Math.min(quota.usedPercentage, 100)}%`,
                  backgroundColor: storageColor
                }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer" />
              </div>

              {/* Warning markers */}
              {quota.usedPercentage < 80 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 opacity-50"
                  style={{ left: '80%' }}
                />
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                0 GB
              </span>
              <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                {formatStorageGB(quota.maxStorageGB)} limit
              </span>
            </div>
          </>
        )}
      </div>

      {/* Storage Details */}
      {showDetails && quota.tier !== 'enterprise' && (
        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg mb-4" style={{ backgroundColor: '#F8F9FA' }}>
          <div>
            <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Used</p>
            <p className="text-lg font-bold" style={{ color: '#1A1A1A' }}>
              {formatStorageGB(quota.usedStorageGB)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Remaining</p>
            <p className="text-lg font-bold" style={{ color: storageColor }}>
              {formatStorageGB(quota.remainingGB)}
            </p>
          </div>
        </div>
      )}

      {/* Warning Messages */}
      {quota.isOverLimit && (
        <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626' }}>
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">🚨</span>
            <div className="flex-1">
              <p className="font-bold text-sm mb-1" style={{ color: '#991B1B' }}>
                Storage Limit Exceeded
              </p>
              <p className="text-sm" style={{ color: '#DC2626' }}>
                You cannot upload new photos until you upgrade your plan or delete some files.
              </p>
            </div>
          </div>
        </div>
      )}

      {quota.isAtLimit && !quota.isOverLimit && (
        <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#FEF3C7', borderLeft: '4px solid #F59E0B' }}>
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-sm mb-1" style={{ color: '#92400E' }}>
                Storage Almost Full
              </p>
              <p className="text-sm" style={{ color: '#B45309' }}>
                You're at {quota.usedPercentage}% capacity. Upgrade soon to avoid upload interruptions.
              </p>
            </div>
          </div>
        </div>
      )}

      {quota.isNearLimit && !quota.isAtLimit && (
        <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#FEF3C7', borderLeft: '4px solid #FBBF24' }}>
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">💡</span>
            <div className="flex-1">
              <p className="font-bold text-sm mb-1" style={{ color: '#92400E' }}>
                Running Low on Storage
              </p>
              <p className="text-sm" style={{ color: '#B45309' }}>
                You have {formatStorageGB(quota.remainingGB)} remaining. Consider upgrading for more space.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {(quota.isNearLimit || quota.isAtLimit || quota.isOverLimit) && quota.tier !== 'enterprise' && (
          <button
            onClick={onUpgradeClick || (() => window.location.href = '/pricing')}
            className="flex-1 px-4 py-3 rounded-lg text-white font-semibold transition-transform hover:scale-105"
            style={{ backgroundColor: '#FF6B6B' }}
          >
            {quota.tier === 'starter' ? '⬆️ Upgrade to Pro (50GB)' : '⬆️ Upgrade to Enterprise (Unlimited)'}
          </button>
        )}

        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="px-4 py-3 rounded-lg font-semibold border transition-colors hover:bg-gray-50"
          style={{ borderColor: '#E5E7EB', color: '#374151' }}
        >
          📊 {showBreakdown ? 'Hide' : 'View'} Breakdown
        </button>
      </div>

      {/* Breakdown Modal/Dropdown */}
      {showBreakdown && (
        <div className="mt-4 p-4 rounded-lg border" style={{ borderColor: '#E5E7EB', backgroundColor: '#F8F9FA' }}>
          <h4 className="font-bold mb-3" style={{ color: '#1A1A1A' }}>Storage Breakdown</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#E0E0E0' }}>
              <span className="text-sm" style={{ color: '#6B7280' }}>Photos & Videos</span>
              <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
                {formatStorageGB(quota.usedStorageGB)}
              </span>
            </div>
            <div className="pt-2">
              <Link
                href="/fieldsnap/storage-analytics"
                className="text-sm font-semibold hover:underline"
                style={{ color: '#FF6B6B' }}
              >
                View detailed analytics →
              </Link>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  )
}
