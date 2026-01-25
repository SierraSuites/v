import { createClient } from './client'

// Types matching the database schema
export type Photo = {
  id: string
  user_id: string
  project_id: string | null
  url: string
  thumbnail_url: string | null
  filename: string
  file_size: number
  mime_type: string
  width: number | null
  height: number | null
  device_info: any | null
  capture_source: string | null
  gps_latitude: number | null
  gps_longitude: number | null
  gps_altitude: number | null
  gps_heading: number | null
  captured_at: string
  uploaded_at: string
  description: string | null
  tags: string[]
  ai_tags: string[]
  ai_analysis: {
    objects?: string[]
    defects?: string[]
    safety_issues?: string[]
    quality_score?: number
    confidence?: number
  } | null
  weather_data: {
    condition?: string
    temperature?: number
    humidity?: number
    wind_speed?: number
  } | null
  blueprint_coordinates: {
    x?: number
    y?: number
    floor?: string
    room?: string
  } | null
  annotations_count: number
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  uploader_name: string | null
  project_name: string | null
  created_at: string
  updated_at: string
}

export type PhotoInsert = Omit<Photo, 'id' | 'created_at' | 'updated_at' | 'annotations_count'>

export type PhotoUpdate = Partial<Omit<Photo, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// Pagination types
export interface PaginationOptions {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[] | null
  error: Error | null
  pagination: {
    currentPage: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

// Query Functions

/**
 * Get all photos for the current user with pagination
 */
export async function getPhotos(options: PaginationOptions = {}): Promise<PaginatedResult<Photo>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: new Error('Not authenticated'),
      pagination: {
        currentPage: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    }
  }

  const page = options.page || 1
  const pageSize = options.pageSize || 20
  const sortBy = options.sortBy || 'captured_at'
  const sortOrder = options.sortOrder || 'desc'

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('media_assets')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to)

  const totalItems = count || 0
  const totalPages = Math.ceil(totalItems / pageSize)

  return {
    data,
    error: error ? new Error(error.message) : null,
    pagination: {
      currentPage: page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }
}

/**
 * Get photos by project with pagination
 */
export async function getPhotosByProject(
  projectId: string,
  options: PaginationOptions = {}
): Promise<PaginatedResult<Photo>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: new Error('Not authenticated'),
      pagination: {
        currentPage: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    }
  }

  const page = options.page || 1
  const pageSize = options.pageSize || 20
  const sortBy = options.sortBy || 'captured_at'
  const sortOrder = options.sortOrder || 'desc'

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('media_assets')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to)

  const totalItems = count || 0
  const totalPages = Math.ceil(totalItems / pageSize)

  return {
    data,
    error: error ? new Error(error.message) : null,
    pagination: {
      currentPage: page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }
}

/**
 * Get photos by date range
 */
export async function getPhotosByDateRange(startDate: string, endDate: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  return await supabase
    .from('media_assets')
    .select('*')
    .eq('user_id', user.id)
    .gte('captured_at', startDate)
    .lte('captured_at', endDate)
    .order('captured_at', { ascending: false })
}

/**
 * Get photos with specific tags
 */
export async function getPhotosByTag(tag: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  return await supabase
    .from('media_assets')
    .select('*')
    .eq('user_id', user.id)
    .contains('tags', [tag])
    .order('captured_at', { ascending: false })
}

/**
 * Get photos with AI-detected issues
 */
export async function getPhotosWithDefects() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('user_id', user.id)
    .not('ai_analysis->defects', 'is', null)
    .order('captured_at', { ascending: false })

  if (error) return { data: null, error }

  // Filter photos that actually have defects
  const photosWithDefects = data?.filter(
    photo => photo.ai_analysis?.defects && photo.ai_analysis.defects.length > 0
  )

  return { data: photosWithDefects, error: null }
}

/**
 * Get photos with safety issues
 */
export async function getPhotosWithSafetyIssues() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('user_id', user.id)
    .not('ai_analysis->safety_issues', 'is', null)
    .order('captured_at', { ascending: false })

  if (error) return { data: null, error }

  // Filter photos that actually have safety issues
  const photosWithIssues = data?.filter(
    photo => photo.ai_analysis?.safety_issues && photo.ai_analysis.safety_issues.length > 0
  )

  return { data: photosWithIssues, error: null }
}

/**
 * Get photos by status
 */
export async function getPhotosByStatus(status: 'pending' | 'approved' | 'rejected') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  return await supabase
    .from('media_assets')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', status)
    .order('captured_at', { ascending: false })
}

/**
 * Get a single photo by ID
 */
export async function getPhotoById(photoId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  return await supabase
    .from('media_assets')
    .select('*')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .single()
}

/**
 * Search photos by query (filename, description, tags)
 */
export async function searchPhotos(query: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('user_id', user.id)
    .or(`filename.ilike.%${query}%,description.ilike.%${query}%`)
    .order('captured_at', { ascending: false })

  return { data, error }
}

// Mutation Functions

/**
 * Create a new photo record
 */
export async function createPhoto(photo: Partial<PhotoInsert>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  return await supabase
    .from('media_assets')
    .insert({
      ...photo,
      user_id: user.id,
      uploader_name: user.user_metadata?.full_name || user.email || 'Unknown'
    })
    .select()
    .single()
}

/**
 * Update a photo
 */
export async function updatePhoto(photoId: string, updates: PhotoUpdate) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  return await supabase
    .from('media_assets')
    .update(updates)
    .eq('id', photoId)
    .eq('user_id', user.id)
    .select()
    .single()
}

/**
 * Delete a photo
 */
export async function deletePhoto(photoId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  return await supabase
    .from('media_assets')
    .delete()
    .eq('id', photoId)
    .eq('user_id', user.id)
}

/**
 * Bulk delete photos
 */
export async function deletePhotos(photoIds: string[]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  return await supabase
    .from('media_assets')
    .delete()
    .in('id', photoIds)
    .eq('user_id', user.id)
}

/**
 * Update photo status (approve/reject)
 */
export async function updatePhotoStatus(
  photoId: string,
  status: 'approved' | 'rejected'
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  return await supabase
    .from('media_assets')
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', photoId)
    .eq('user_id', user.id)
    .select()
    .single()
}

/**
 * Add tags to a photo
 */
export async function addPhotoTags(photoId: string, newTags: string[]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  // Get current tags
  const { data: photo } = await getPhotoById(photoId)
  if (!photo) {
    return { data: null, error: new Error('Photo not found') }
  }

  const currentTags = photo.tags || []
  const uniqueTags = Array.from(new Set([...currentTags, ...newTags]))

  return await supabase
    .from('media_assets')
    .update({ tags: uniqueTags })
    .eq('id', photoId)
    .eq('user_id', user.id)
    .select()
    .single()
}

/**
 * Remove tags from a photo
 */
export async function removePhotoTags(photoId: string, tagsToRemove: string[]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  // Get current tags
  const { data: photo } = await getPhotoById(photoId)
  if (!photo) {
    return { data: null, error: new Error('Photo not found') }
  }

  const currentTags = photo.tags || []
  const updatedTags = currentTags.filter(tag => !tagsToRemove.includes(tag))

  return await supabase
    .from('media_assets')
    .update({ tags: updatedTags })
    .eq('id', photoId)
    .eq('user_id', user.id)
    .select()
    .single()
}

// Real-time Functions

/**
 * Subscribe to photo changes
 */
export function subscribeToPhotos(
  callback: (payload: any) => void
) {
  const supabase = createClient()

  const channel = supabase
    .channel('media_assets_changes')
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

  return () => {
    channel.unsubscribe()
  }
}

// Storage Functions

/**
 * Upload a photo file to Supabase Storage
 */
export async function uploadPhotoFile(
  file: File,
  path?: string
): Promise<{ data: { path: string; fullPath: string } | null; error: Error | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  // Generate unique filename
  const timestamp = Date.now()
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filename = `${timestamp}_${sanitizedFilename}`
  const filePath = path ? `${path}/${filename}` : `${user.id}/${filename}`

  const { data, error } = await supabase.storage
    .from('photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    return { data: null, error }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('photos')
    .getPublicUrl(filePath)

  return {
    data: {
      path: filePath,
      fullPath: urlData.publicUrl
    },
    error: null
  }
}

/**
 * Delete a photo file from Supabase Storage
 */
export async function deletePhotoFile(path: string) {
  const supabase = createClient()

  return await supabase.storage
    .from('photos')
    .remove([path])
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('media_assets')
    .select('file_size')
    .eq('user_id', user.id)

  if (error) return { data: null, error }

  const totalSize = data?.reduce((acc, photo) => acc + (photo.file_size || 0), 0) || 0
  const photoCount = data?.length || 0

  return {
    data: {
      totalSize,
      photoCount,
      averageSize: photoCount > 0 ? totalSize / photoCount : 0
    },
    error: null
  }
}

// Utility Functions

/**
 * Extract EXIF metadata from image file
 */
export async function extractImageMetadata(file: File): Promise<{
  width?: number
  height?: number
  capturedAt?: string
  gpsLatitude?: number
  gpsLongitude?: number
  device?: string
}> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const metadata = {
        width: img.width,
        height: img.height,
        capturedAt: new Date().toISOString() // Default to now
      }
      URL.revokeObjectURL(url)
      resolve(metadata)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({})
    }

    img.src = url
  })
}

/**
 * Generate thumbnail from image file
 */
export async function generateThumbnail(
  file: File,
  maxWidth: number = 400,
  maxHeight: number = 400
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        URL.revokeObjectURL(url)
        resolve(null)
        return
      }

      // Calculate new dimensions
      let width = img.width
      let height = img.height

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          resolve(blob)
        },
        'image/jpeg',
        0.8
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }

    img.src = url
  })
}
