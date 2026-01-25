import { createClient } from '@/lib/supabase/client'

// Tier-based storage limits (in GB)
export const TIER_STORAGE_LIMITS = {
  starter: 5,      // 5GB
  pro: 50,         // 50GB
  enterprise: 0    // 0 = unlimited
} as const

export type UserTier = keyof typeof TIER_STORAGE_LIMITS

export interface StorageQuota {
  tier: UserTier
  maxStorageGB: number
  usedStorageBytes: number
  usedStorageGB: number
  usedPercentage: number
  remainingGB: number
  isNearLimit: boolean    // >80%
  isAtLimit: boolean      // >95%
  isOverLimit: boolean    // >100%
  canUpload: boolean
}

export interface UploadCheckResult {
  allowed: boolean
  reason?: string
  currentUsage: number
  maxStorage: number
  wouldExceed: boolean
}

export interface StorageBreakdown {
  byProject: { projectId: string; projectName: string; sizeGB: number }[]
  byFileType: { type: string; count: number; sizeGB: number }[]
  largestFiles: { id: string; filename: string; sizeGB: number; url: string }[]
  oldestFiles: { id: string; filename: string; uploadedAt: string; sizeGB: number }[]
  totalFiles: number
}

/**
 * Get storage limit for a user tier
 */
export function getTierStorageLimit(tier: UserTier): number {
  return TIER_STORAGE_LIMITS[tier] || TIER_STORAGE_LIMITS.starter
}

/**
 * Get user's tier from metadata
 */
export async function getUserTier(): Promise<UserTier> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Get tier from user metadata
  const tier = user.user_metadata?.tier || 'starter'
  return tier as UserTier
}

/**
 * Calculate user's current storage usage
 */
export async function calculateUserStorage(userId?: string): Promise<StorageQuota> {
  const supabase = createClient()

  // Get user if not provided
  let targetUserId = userId
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }
    targetUserId = user.id
  }

  // Get user tier
  const { data: { user } } = await supabase.auth.getUser()
  const tier = (user?.user_metadata?.tier || 'starter') as UserTier

  // Calculate total storage used
  const { data: photos, error } = await supabase
    .from('media_assets')
    .select('file_size')
    .eq('user_id', targetUserId)

  if (error) {
    console.error('Error calculating storage:', error)
    throw error
  }

  const usedStorageBytes = photos?.reduce((total, photo) => total + (photo.file_size || 0), 0) || 0
  const usedStorageGB = usedStorageBytes / (1024 * 1024 * 1024)

  const maxStorageGB = getTierStorageLimit(tier)
  const isUnlimited = maxStorageGB === 0

  const usedPercentage = isUnlimited ? 0 : (usedStorageGB / maxStorageGB) * 100
  const remainingGB = isUnlimited ? Infinity : Math.max(0, maxStorageGB - usedStorageGB)

  const isNearLimit = !isUnlimited && usedPercentage >= 80
  const isAtLimit = !isUnlimited && usedPercentage >= 95
  const isOverLimit = !isUnlimited && usedPercentage >= 100

  return {
    tier,
    maxStorageGB,
    usedStorageBytes,
    usedStorageGB: parseFloat(usedStorageGB.toFixed(2)),
    usedPercentage: parseFloat(usedPercentage.toFixed(1)),
    remainingGB: isUnlimited ? Infinity : parseFloat(remainingGB.toFixed(2)),
    isNearLimit,
    isAtLimit,
    isOverLimit,
    canUpload: !isOverLimit
  }
}

/**
 * Check if user can upload a file of given size
 */
export async function checkUploadAllowed(
  fileSizeBytes: number,
  userId?: string
): Promise<UploadCheckResult> {
  const quota = await calculateUserStorage(userId)

  // Enterprise has unlimited storage
  if (quota.tier === 'enterprise' || quota.maxStorageGB === 0) {
    return {
      allowed: true,
      currentUsage: quota.usedStorageGB,
      maxStorage: quota.maxStorageGB,
      wouldExceed: false
    }
  }

  const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024)
  const newTotalGB = quota.usedStorageGB + fileSizeGB
  const wouldExceed = newTotalGB > quota.maxStorageGB

  if (wouldExceed) {
    const overageGB = (newTotalGB - quota.maxStorageGB).toFixed(2)
    return {
      allowed: false,
      reason: `Storage limit exceeded. This upload would use ${overageGB}GB more than your ${quota.maxStorageGB}GB limit. Please upgrade your plan or delete some files.`,
      currentUsage: quota.usedStorageGB,
      maxStorage: quota.maxStorageGB,
      wouldExceed: true
    }
  }

  // Allow upload but warn if near limit
  let reason: string | undefined
  if (quota.isAtLimit) {
    reason = `Warning: You're at ${quota.usedPercentage}% of your storage limit. Consider upgrading soon.`
  } else if (quota.isNearLimit) {
    reason = `You're using ${quota.usedPercentage}% of your storage. You have ${quota.remainingGB}GB remaining.`
  }

  return {
    allowed: true,
    reason,
    currentUsage: quota.usedStorageGB,
    maxStorage: quota.maxStorageGB,
    wouldExceed: false
  }
}

/**
 * Check if multiple files can be uploaded
 */
export async function checkBatchUploadAllowed(
  files: File[],
  userId?: string
): Promise<UploadCheckResult> {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  return checkUploadAllowed(totalSize, userId)
}

/**
 * Get detailed storage breakdown
 */
export async function getStorageBreakdown(userId?: string): Promise<StorageBreakdown> {
  const supabase = createClient()

  let targetUserId = userId
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }
    targetUserId = user.id
  }

  // Get all photos
  const { data: photos, error } = await supabase
    .from('media_assets')
    .select('id, filename, file_size, mime_type, project_id, project_name, uploaded_at, url')
    .eq('user_id', targetUserId)
    .order('file_size', { ascending: false })

  if (error) {
    console.error('Error fetching storage breakdown:', error)
    throw error
  }

  if (!photos) {
    return {
      byProject: [],
      byFileType: [],
      largestFiles: [],
      oldestFiles: [],
      totalFiles: 0
    }
  }

  // Group by project
  const projectMap = new Map<string, { name: string; size: number }>()
  photos.forEach(photo => {
    const projectId = photo.project_id || 'uncategorized'
    const projectName = photo.project_name || 'Uncategorized'
    const current = projectMap.get(projectId) || { name: projectName, size: 0 }
    current.size += photo.file_size || 0
    projectMap.set(projectId, current)
  })

  const byProject = Array.from(projectMap.entries()).map(([projectId, data]) => ({
    projectId,
    projectName: data.name,
    sizeGB: parseFloat((data.size / (1024 * 1024 * 1024)).toFixed(3))
  })).sort((a, b) => b.sizeGB - a.sizeGB)

  // Group by file type
  const typeMap = new Map<string, { count: number; size: number }>()
  photos.forEach(photo => {
    const type = photo.mime_type?.split('/')[0] || 'unknown'
    const current = typeMap.get(type) || { count: 0, size: 0 }
    current.count++
    current.size += photo.file_size || 0
    typeMap.set(type, current)
  })

  const byFileType = Array.from(typeMap.entries()).map(([type, data]) => ({
    type,
    count: data.count,
    sizeGB: parseFloat((data.size / (1024 * 1024 * 1024)).toFixed(3))
  })).sort((a, b) => b.sizeGB - a.sizeGB)

  // Largest files (top 10)
  const largestFiles = photos.slice(0, 10).map(photo => ({
    id: photo.id,
    filename: photo.filename,
    sizeGB: parseFloat(((photo.file_size || 0) / (1024 * 1024 * 1024)).toFixed(3)),
    url: photo.url
  }))

  // Oldest files (top 10)
  const sortedByDate = [...photos].sort((a, b) =>
    new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime()
  )
  const oldestFiles = sortedByDate.slice(0, 10).map(photo => ({
    id: photo.id,
    filename: photo.filename,
    uploadedAt: photo.uploaded_at,
    sizeGB: parseFloat(((photo.file_size || 0) / (1024 * 1024 * 1024)).toFixed(3))
  }))

  return {
    byProject,
    byFileType,
    largestFiles,
    oldestFiles,
    totalFiles: photos.length
  }
}

/**
 * Get upgrade recommendations based on current usage
 */
export function getUpgradeRecommendation(quota: StorageQuota): {
  shouldUpgrade: boolean
  urgency: 'low' | 'medium' | 'high' | 'critical'
  message: string
  nextTier?: UserTier
  nextTierLimit?: number
} {
  if (quota.tier === 'enterprise') {
    return {
      shouldUpgrade: false,
      urgency: 'low',
      message: 'You have unlimited storage.'
    }
  }

  const { usedPercentage, tier, usedStorageGB, maxStorageGB } = quota

  if (usedPercentage >= 100) {
    return {
      shouldUpgrade: true,
      urgency: 'critical',
      message: `Storage full! You've used ${usedStorageGB}GB of ${maxStorageGB}GB. Upgrade now to continue uploading.`,
      nextTier: tier === 'starter' ? 'pro' : 'enterprise',
      nextTierLimit: tier === 'starter' ? 50 : 0
    }
  }

  if (usedPercentage >= 95) {
    return {
      shouldUpgrade: true,
      urgency: 'high',
      message: `Almost full! You've used ${usedPercentage}% of your ${maxStorageGB}GB storage. Upgrade to avoid interruptions.`,
      nextTier: tier === 'starter' ? 'pro' : 'enterprise',
      nextTierLimit: tier === 'starter' ? 50 : 0
    }
  }

  if (usedPercentage >= 80) {
    return {
      shouldUpgrade: true,
      urgency: 'medium',
      message: `You're using ${usedPercentage}% of your storage. Consider upgrading to ${tier === 'starter' ? 'Pro (50GB)' : 'Enterprise (unlimited)'}.`,
      nextTier: tier === 'starter' ? 'pro' : 'enterprise',
      nextTierLimit: tier === 'starter' ? 50 : 0
    }
  }

  return {
    shouldUpgrade: false,
    urgency: 'low',
    message: `You're using ${usedStorageGB}GB of ${maxStorageGB}GB (${usedPercentage}%). You have plenty of space.`
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Format storage size to GB with proper formatting
 */
export function formatStorageGB(gb: number): string {
  if (gb === Infinity) return 'Unlimited'
  if (gb === 0) return '0 GB'
  if (gb < 0.01) return '< 0.01 GB'
  return `${gb.toFixed(2)} GB`
}
