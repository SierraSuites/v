import { createClient } from "@/lib/supabase/client"
import { permissionService } from '@/lib/permissions'

// ============================================================================
// RBAC PERMISSION GUARD HELPERS
// ============================================================================

/**
 * Get authenticated user and their company ID
 */
async function getAuthContext(): Promise<{
  userId: string
  companyId: string
} | null> {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.error('Authentication required')
      return null
    }

    // Get user's company from profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      console.error('User profile or company not found')
      return null
    }

    return {
      userId: user.id,
      companyId: profile.company_id
    }
  } catch (error) {
    console.error('Error getting auth context:', error)
    return null
  }
}

/**
 * Check if user has required photo permission
 */
async function checkPhotoPermission(
  permission: 'canViewAllPhotos' | 'canUploadPhotos' | 'canDeletePhotos' | 'canSharePhotos' | 'canEditPhotoMetadata',
  userId: string,
  companyId: string
): Promise<boolean> {
  try {
    const hasPermission = await permissionService.hasPermissionDB(
      userId,
      companyId,
      permission
    )

    // Log permission check for audit trail
    await permissionService.logPermissionCheck(
      `photo_${permission}`,
      'media_asset',
      companyId,
      hasPermission,
      hasPermission ? undefined : 'Insufficient permissions'
    )

    return hasPermission
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

// ============================================
// TYPES
// ============================================

export type MediaAsset = {
  id: string
  user_id: string
  project_id: string | null

  // File Information
  url: string
  thumbnail_url: string | null
  filename: string
  file_size: number
  mime_type: string
  width: number | null
  height: number | null

  // Capture Metadata
  captured_at: string
  uploaded_at: string
  capture_device: string | null
  capture_source: 'mobile' | 'drone' | '360camera' | 'security' | 'scanner' | 'api'

  // Geolocation
  gps_latitude: number | null
  gps_longitude: number | null
  gps_altitude: number | null
  gps_accuracy: number | null
  gps_heading: number | null

  // Weather
  weather_condition: string | null
  weather_temperature: number | null
  weather_humidity: number | null
  weather_wind_speed: number | null
  weather_visibility: number | null

  // Blueprint Alignment
  blueprint_coordinates: {
    x: number
    y: number
    floor: string
    room: string
    zone?: string
  } | null
  blueprint_id: string | null

  // User Annotations
  description: string | null
  tags: string[]
  annotations: any[]

  // AI Analysis
  ai_tags: string[]
  ai_analysis: {
    objects: string[]
    defects: string[]
    safety_issues: string[]
    quality_score: number
    confidence: number
    progress_percentage?: number
    materials_detected?: string[]
    equipment_detected?: string[]
    people_count?: number
    ppe_compliance?: boolean
  } | null
  ai_confidence: number | null
  ai_processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  ai_processed_at: string | null

  // Quality & Safety
  quality_score: number | null
  safety_issues: any[]
  defects_detected: any[]
  compliance_status: 'compliant' | 'non-compliant' | 'needs_review'

  // Review Status
  status: 'pending' | 'approved' | 'rejected' | 'flagged'
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null

  // Organization
  album_ids: string[]
  is_favorite: boolean
  is_archived: boolean

  // Metadata
  exif_data: any | null
  custom_metadata: any

  created_at: string
  updated_at: string
}

export type SmartAlbum = {
  id: string
  user_id: string
  project_id: string | null
  name: string
  description: string | null
  album_type: 'manual' | 'smart' | 'ai_curated'
  rules: any | null
  cover_image_url: string | null
  color: string
  icon: string | null
  is_public: boolean
  is_shared: boolean
  shared_with: string[]
  photo_count: number
  created_at: string
  updated_at: string
}

export type PhotoAnnotation = {
  id: string
  media_asset_id: string
  created_by: string
  annotation_type: 'rectangle' | 'circle' | 'arrow' | 'text' | 'polygon' | 'measurement'
  coordinates: any
  color: string
  stroke_width: number
  text_content: string | null
  measurement_value: number | null
  measurement_unit: string | null
  is_issue: boolean
  issue_type: string | null
  issue_severity: 'low' | 'medium' | 'high' | 'critical' | null
  assigned_to: string | null
  due_date: string | null
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
}

export type PhotoComment = {
  id: string
  media_asset_id: string
  user_id: string
  parent_comment_id: string | null
  comment_text: string
  mentions: string[]
  created_at: string
  updated_at: string
}

export type StorageUsage = {
  user_id: string
  total_bytes: number
  photo_count: number
  video_count: number
  document_count: number
  last_calculated_at: string
}

export type MediaAssetInsert = Omit<MediaAsset, 'id' | 'created_at' | 'updated_at' | 'ai_processed_at' | 'reviewed_at'>
export type MediaAssetUpdate = Partial<Omit<MediaAsset, 'id' | 'created_at' | 'updated_at'>>

// ============================================
// MEDIA ASSETS CRUD
// ============================================

/**
 * Get all media assets for current user
 * RBAC: Requires canViewAllPhotos permission
 */
export async function getMediaAssets(filters?: {
  project_id?: string
  status?: string
  date_from?: string
  date_to?: string
  tags?: string[]
  limit?: number
  offset?: number
}) {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canView = await checkPhotoPermission(
    'canViewAllPhotos',
    authContext.userId,
    authContext.companyId
  )

  if (!canView) {
    return { data: null, error: new Error('Permission denied: canViewAllPhotos required') }
  }

  const supabase = createClient()

  let query = supabase
    .from('media_assets')
    .select('*')
    .eq('user_id', authContext.userId)  // Company isolation
    .order('captured_at', { ascending: false })

  if (filters?.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.date_from) {
    query = query.gte('captured_at', filters.date_from)
  }

  if (filters?.date_to) {
    query = query.lte('captured_at', filters.date_to)
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching media assets:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get single media asset by ID
 * RBAC: Requires canViewAllPhotos permission + ownership check
 */
export async function getMediaAssetById(id: string) {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canView = await checkPhotoPermission(
    'canViewAllPhotos',
    authContext.userId,
    authContext.companyId
  )

  if (!canView) {
    return { data: null, error: new Error('Permission denied: canViewAllPhotos required') }
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching media asset:', error)
    return { data: null, error }
  }

  // Verify ownership (user's media asset)
  if (data && data.user_id !== authContext.userId) {
    return { data: null, error: new Error('Access denied: Media asset not found') }
  }

  return { data, error: null }
}

/**
 * Upload new media asset
 * RBAC: Requires canUploadPhotos permission
 */
export async function uploadMediaAsset(asset: MediaAssetInsert) {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canUpload = await checkPhotoPermission(
    'canUploadPhotos',
    authContext.userId,
    authContext.companyId
  )

  if (!canUpload) {
    return { data: null, error: new Error('Permission denied: canUploadPhotos required') }
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      ...asset,
      user_id: authContext.userId
    })
    .select()
    .single()

  if (error) {
    console.error('Error uploading media asset:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Update media asset
 */
/**
 * Update media asset
 * RBAC: Requires canEditPhotoMetadata permission + ownership check
 */
export async function updateMediaAsset(id: string, updates: MediaAssetUpdate) {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canEdit = await checkPhotoPermission(
    'canEditPhotoMetadata',
    authContext.userId,
    authContext.companyId
  )

  if (!canEdit) {
    return { data: null, error: new Error('Permission denied: canEditPhotoMetadata required') }
  }

  const supabase = createClient()

  // Verify ownership first
  const { data: existing } = await supabase
    .from('media_assets')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== authContext.userId) {
    return { data: null, error: new Error('Access denied: Media asset not found') }
  }

  const { data, error } = await supabase
    .from('media_assets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating media asset:', error)
    return { data: null, error }
  }

  // Log the operation
  await permissionService.logPermissionCheck(
    'update_media_asset',
    'media_asset',
    id,
    true
  )

  return { data, error: null }
}

/**
 * Delete media asset
 * RBAC: Requires canDeletePhotos permission + ownership check
 */
export async function deleteMediaAsset(id: string) {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { error: new Error('Authentication required') }
  }

  const canDelete = await checkPhotoPermission(
    'canDeletePhotos',
    authContext.userId,
    authContext.companyId
  )

  if (!canDelete) {
    return { error: new Error('Permission denied: canDeletePhotos required') }
  }

  const supabase = createClient()

  // Verify ownership first
  const { data: existing } = await supabase
    .from('media_assets')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== authContext.userId) {
    return { error: new Error('Access denied: Media asset not found') }
  }

  const { error } = await supabase
    .from('media_assets')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting media asset:', error)
    return { error }
  }

  // Log the operation
  await permissionService.logPermissionCheck(
    'delete_media_asset',
    'media_asset',
    id,
    true
  )

  return { error: null }
}

/**
 * Bulk update media assets (for batch operations)
 * RBAC: Requires canEditPhotoMetadata permission + ownership check
 */
export async function bulkUpdateMediaAssets(ids: string[], updates: MediaAssetUpdate) {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canEdit = await checkPhotoPermission(
    'canEditPhotoMetadata',
    authContext.userId,
    authContext.companyId
  )

  if (!canEdit) {
    return { data: null, error: new Error('Permission denied: canEditPhotoMetadata required') }
  }

  const supabase = createClient()

  // Verify ownership of all assets first
  const { data: existingAssets } = await supabase
    .from('media_assets')
    .select('id, user_id')
    .in('id', ids)

  if (!existingAssets || existingAssets.length !== ids.length) {
    return { data: null, error: new Error('Some media assets not found') }
  }

  // Check if user owns all assets
  const notOwned = existingAssets.filter(asset => asset.user_id !== authContext.userId)
  if (notOwned.length > 0) {
    return { data: null, error: new Error('Access denied: Cannot edit media assets you do not own') }
  }

  const { data, error } = await supabase
    .from('media_assets')
    .update(updates)
    .in('id', ids)
    .select()

  if (error) {
    console.error('Error bulk updating media assets:', error)
    return { data: null, error }
  }

  // Log the operation
  await permissionService.logPermissionCheck(
    'bulk_update_media_assets',
    'media_asset',
    authContext.companyId,
    true
  )

  return { data, error: null }
}

// ============================================
// SMART ALBUMS CRUD
// ============================================

/**
 * Get all albums for user
 * RBAC: Requires canViewAllPhotos permission
 */
export async function getSmartAlbums(project_id?: string) {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canView = await checkPhotoPermission(
    'canViewAllPhotos',
    authContext.userId,
    authContext.companyId
  )

  if (!canView) {
    return { data: null, error: new Error('Permission denied: canViewAllPhotos required') }
  }

  const supabase = createClient()

  let query = supabase
    .from('smart_albums')
    .select('*')
    .eq('user_id', authContext.userId)  // User isolation
    .order('created_at', { ascending: false })

  if (project_id) {
    query = query.eq('project_id', project_id)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching albums:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Create new album
 * RBAC: Requires canUploadPhotos permission
 */
export async function createSmartAlbum(album: Omit<SmartAlbum, 'id' | 'created_at' | 'updated_at' | 'photo_count'>) {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canCreate = await checkPhotoPermission(
    'canUploadPhotos',
    authContext.userId,
    authContext.companyId
  )

  if (!canCreate) {
    return { data: null, error: new Error('Permission denied: canUploadPhotos required') }
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('smart_albums')
    .insert({
      ...album,
      user_id: authContext.userId,
      photo_count: 0
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating album:', error)
    return { data: null, error }
  }

  // Log the operation
  await permissionService.logPermissionCheck(
    'create_smart_album',
    'smart_album',
    authContext.companyId,
    true
  )

  return { data, error: null }
}

// ============================================
// ANNOTATIONS CRUD
// ============================================

/**
 * Get annotations for a media asset
 * RBAC: Requires canViewAllPhotos permission
 */
export async function getPhotoAnnotations(media_asset_id: string) {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canView = await checkPhotoPermission(
    'canViewAllPhotos',
    authContext.userId,
    authContext.companyId
  )

  if (!canView) {
    return { data: null, error: new Error('Permission denied: canViewAllPhotos required') }
  }

  const supabase = createClient()

  // Verify user has access to the media asset first
  const { data: mediaAsset } = await supabase
    .from('media_assets')
    .select('user_id')
    .eq('id', media_asset_id)
    .single()

  if (!mediaAsset || mediaAsset.user_id !== authContext.userId) {
    return { data: null, error: new Error('Access denied: Media asset not found') }
  }

  const { data, error } = await supabase
    .from('photo_annotations')
    .select('*')
    .eq('media_asset_id', media_asset_id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching annotations:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Create annotation
 * RBAC: Requires canEditPhotoMetadata permission
 */
export async function createPhotoAnnotation(annotation: Omit<PhotoAnnotation, 'id' | 'created_at' | 'updated_at'>) {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canEdit = await checkPhotoPermission(
    'canEditPhotoMetadata',
    authContext.userId,
    authContext.companyId
  )

  if (!canEdit) {
    return { data: null, error: new Error('Permission denied: canEditPhotoMetadata required') }
  }

  const supabase = createClient()

  // Verify user has access to the media asset first
  const { data: mediaAsset } = await supabase
    .from('media_assets')
    .select('user_id')
    .eq('id', annotation.media_asset_id)
    .single()

  if (!mediaAsset || mediaAsset.user_id !== authContext.userId) {
    return { data: null, error: new Error('Access denied: Media asset not found') }
  }

  const { data, error } = await supabase
    .from('photo_annotations')
    .insert({
      ...annotation,
      created_by: authContext.userId
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating annotation:', error)
    return { data: null, error }
  }

  // Log the operation
  await permissionService.logPermissionCheck(
    'create_photo_annotation',
    'photo_annotation',
    annotation.media_asset_id,
    true
  )

  return { data, error: null }
}

// ============================================
// COMMENTS CRUD
// ============================================

/**
 * Get comments for a media asset
 * RBAC: Requires canViewAllPhotos permission
 */
export async function getPhotoComments(media_asset_id: string) {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canView = await checkPhotoPermission(
    'canViewAllPhotos',
    authContext.userId,
    authContext.companyId
  )

  if (!canView) {
    return { data: null, error: new Error('Permission denied: canViewAllPhotos required') }
  }

  const supabase = createClient()

  // Verify user has access to the media asset first
  const { data: mediaAsset } = await supabase
    .from('media_assets')
    .select('user_id')
    .eq('id', media_asset_id)
    .single()

  if (!mediaAsset || mediaAsset.user_id !== authContext.userId) {
    return { data: null, error: new Error('Access denied: Media asset not found') }
  }

  const { data, error } = await supabase
    .from('photo_comments')
    .select('*')
    .eq('media_asset_id', media_asset_id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching comments:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Create comment
 * RBAC: Requires canViewAllPhotos permission (commenting requires viewing)
 */
export async function createPhotoComment(comment: Omit<PhotoComment, 'id' | 'created_at' | 'updated_at'>) {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canView = await checkPhotoPermission(
    'canViewAllPhotos',
    authContext.userId,
    authContext.companyId
  )

  if (!canView) {
    return { data: null, error: new Error('Permission denied: canViewAllPhotos required') }
  }

  const supabase = createClient()

  // Verify user has access to the media asset first
  const { data: mediaAsset } = await supabase
    .from('media_assets')
    .select('user_id')
    .eq('id', comment.media_asset_id)
    .single()

  if (!mediaAsset || mediaAsset.user_id !== authContext.userId) {
    return { data: null, error: new Error('Access denied: Media asset not found') }
  }

  const { data, error } = await supabase
    .from('photo_comments')
    .insert({
      ...comment,
      user_id: authContext.userId
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating comment:', error)
    return { data: null, error }
  }

  // Log the operation
  await permissionService.logPermissionCheck(
    'create_photo_comment',
    'photo_comment',
    comment.media_asset_id,
    true
  )

  return { data, error: null }
}

// ============================================
// STORAGE USAGE
// ============================================

/**
 * Get user storage usage
 * RBAC: Requires canViewAllPhotos permission
 */
export async function getStorageUsage() {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canView = await checkPhotoPermission(
    'canViewAllPhotos',
    authContext.userId,
    authContext.companyId
  )

  if (!canView) {
    return { data: null, error: new Error('Permission denied: canViewAllPhotos required') }
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('storage_usage')
    .select('*')
    .eq('user_id', authContext.userId)
    .single()

  if (error && error.code !== 'PGRST116') { // Ignore "no rows" error
    console.error('Error fetching storage usage:', error)
    return { data: null, error }
  }

  // Return default if no data
  if (!data) {
    return {
      data: {
        user_id: authContext.userId,
        total_bytes: 0,
        photo_count: 0,
        video_count: 0,
        document_count: 0,
        last_calculated_at: new Date().toISOString()
      } as StorageUsage,
      error: null
    }
  }

  return { data, error: null }
}

// ============================================
// AI ANALYSIS
// ============================================

/**
 * Queue photo for AI analysis
 * RBAC: Requires canEditPhotoMetadata permission
 */
export async function queueForAIAnalysis(media_asset_id: string) {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canEdit = await checkPhotoPermission(
    'canEditPhotoMetadata',
    authContext.userId,
    authContext.companyId
  )

  if (!canEdit) {
    return { data: null, error: new Error('Permission denied: canEditPhotoMetadata required') }
  }

  const supabase = createClient()

  // Verify ownership first
  const { data: existing } = await supabase
    .from('media_assets')
    .select('user_id')
    .eq('id', media_asset_id)
    .single()

  if (!existing || existing.user_id !== authContext.userId) {
    return { data: null, error: new Error('Access denied: Media asset not found') }
  }

  const { data, error } = await supabase
    .from('media_assets')
    .update({
      ai_processing_status: 'pending'
    })
    .eq('id', media_asset_id)
    .select()
    .single()

  if (error) {
    console.error('Error queuing for AI analysis:', error)
    return { data: null, error }
  }

  // Log the operation
  await permissionService.logPermissionCheck(
    'queue_ai_analysis',
    'media_asset',
    media_asset_id,
    true
  )

  // TODO: Trigger actual AI processing (Edge Function or external API)
  // await triggerAIProcessing(media_asset_id)

  return { data, error: null }
}

/**
 * Update AI analysis results
 * RBAC: Internal system function - requires canEditPhotoMetadata permission
 * Note: This is typically called by AI processing services, but still requires auth
 */
export async function updateAIAnalysis(media_asset_id: string, analysis: MediaAsset['ai_analysis']) {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return { data: null, error: new Error('Authentication required') }
  }

  const canEdit = await checkPhotoPermission(
    'canEditPhotoMetadata',
    authContext.userId,
    authContext.companyId
  )

  if (!canEdit) {
    return { data: null, error: new Error('Permission denied: canEditPhotoMetadata required') }
  }

  const supabase = createClient()

  // Verify ownership first
  const { data: existing } = await supabase
    .from('media_assets')
    .select('user_id')
    .eq('id', media_asset_id)
    .single()

  if (!existing || existing.user_id !== authContext.userId) {
    return { data: null, error: new Error('Access denied: Media asset not found') }
  }

  const { data, error } = await supabase
    .from('media_assets')
    .update({
      ai_analysis: analysis,
      ai_processing_status: 'completed',
      ai_processed_at: new Date().toISOString()
    })
    .eq('id', media_asset_id)
    .select()
    .single()

  if (error) {
    console.error('Error updating AI analysis:', error)
    return { data: null, error }
  }

  // Log the operation
  await permissionService.logPermissionCheck(
    'update_ai_analysis',
    'media_asset',
    media_asset_id,
    true
  )

  return { data, error: null }
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to media asset changes
 */
export function subscribeToMediaAssets(callback: (payload: any) => void) {
  const supabase = createClient()

  const channel = supabase
    .channel('media-assets-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'media_assets'
      },
      callback
    )
    .subscribe()

  return channel
}

/**
 * Subscribe to comments on a media asset
 */
export function subscribeToPhotoComments(media_asset_id: string, callback: (payload: any) => void) {
  const supabase = createClient()

  const channel = supabase
    .channel(`photo-${media_asset_id}-comments`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'photo_comments',
        filter: `media_asset_id=eq.${media_asset_id}`
      },
      callback
    )
    .subscribe()

  return channel
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribeChannel(channel: any) {
  const supabase = createClient()
  await supabase.removeChannel(channel)
}

// ============================================
// ANALYTICS & REPORTING
// ============================================

/**
 * Get dashboard statistics
 * RBAC: Requires canViewAllPhotos permission
 */
export async function getDashboardStats(project_id?: string) {
  // RBAC: Check authentication and permissions
  const authContext = await getAuthContext()
  if (!authContext) {
    return {
      totalPhotos: 0,
      todayUploads: 0,
      aiInsights: 0,
      safetyIssues: 0,
      error: new Error('Authentication required')
    }
  }

  const canView = await checkPhotoPermission(
    'canViewAllPhotos',
    authContext.userId,
    authContext.companyId
  )

  if (!canView) {
    return {
      totalPhotos: 0,
      todayUploads: 0,
      aiInsights: 0,
      safetyIssues: 0,
      error: new Error('Permission denied: canViewAllPhotos required')
    }
  }

  const supabase = createClient()

  let query = supabase
    .from('media_assets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', authContext.userId)  // User isolation

  if (project_id) {
    query = query.eq('project_id', project_id)
  }

  const [
    { count: totalPhotos },
    { count: todayUploads },
    { count: aiInsights },
    { count: safetyIssues }
  ] = await Promise.all([
    query,
    query.gte('uploaded_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    query.not('ai_analysis', 'is', null),
    query.contains('ai_analysis', { safety_issues: [] }).not('ai_analysis->safety_issues', 'eq', '[]')
  ])

  return {
    totalPhotos: totalPhotos || 0,
    todayUploads: todayUploads || 0,
    aiInsights: aiInsights || 0,
    safetyIssues: safetyIssues || 0
  }
}
