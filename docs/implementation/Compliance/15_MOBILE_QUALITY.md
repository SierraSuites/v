# MOBILE APPS - IMPLEMENTATION QUALITY GUIDE

**Module**: Native Mobile Applications (iOS & Android) (Module 15)
**Business Purpose**: Field worker productivity, offline access, GPS tracking, real-time updates
**Target Quality**: 95%+ before launch
**Priority**: CRITICAL - Field workers live on phones, 80% of daily activity is mobile

---

## 1. CORE QUALITY REQUIREMENTS

### 1.1 Critical Feature: Offline Mode with Conflict Resolution

**Standard**: ALL data MUST be accessible offline. Changes MUST queue and sync when connection restored. Sync conflicts MUST be resolved automatically (last-write-wins) with user notification. Sync MUST complete within 30 seconds for 100 offline changes. Battery usage MUST be <5% per hour of active use.

**Why It Matters**: Job sites have no internet. Example: Superintendent updates 50 tasks offline all day. Arrives at office. App syncs but loses 10 task updates due to poor conflict resolution. Next morning, crew arrives at wrong tasks. Wasted day = $5K labor cost. All because offline mode didn't work.

**Technical Architecture**:
```typescript
// React Native + Expo Architecture

// Core Stack:
- React Native 0.73+
- Expo SDK 50+
- TypeScript 5.3+
- React Navigation 6+
- React Query / TanStack Query
- Zustand (state management)
- WatermelonDB (offline database)
- React Native MMKV (fast storage)

// Key Libraries:
- @react-native-community/netinfo (network status)
- @react-native-firebase/messaging (push notifications)
- react-native-geolocation-service (GPS)
- react-native-camera / expo-camera (photo capture)
- react-native-voice (voice commands)
- react-native-image-resizer (photo optimization)
- @shopify/flash-list (performant lists)
```

**Offline Database Schema (WatermelonDB)**:
```typescript
// database/schema.ts

import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'projects',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'estimated_budget', type: 'number', isOptional: true },
        { name: 'progress', type: 'number' },
        { name: 'start_date', type: 'number', isOptional: true },
        { name: 'target_completion', type: 'number', isOptional: true },
        { name: 'synced_at', type: 'number' },
        { name: 'is_dirty', type: 'boolean' }, // Modified offline
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'project_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'priority', type: 'string' },
        { name: 'assignee_id', type: 'string', isOptional: true },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'synced_at', type: 'number' },
        { name: 'is_dirty', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'photos',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'project_id', type: 'string', isIndexed: true },
        { name: 'task_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'local_uri', type: 'string' }, // Local file path
        { name: 'remote_url', type: 'string', isOptional: true }, // URL after upload
        { name: 'caption', type: 'string', isOptional: true },
        { name: 'tags', type: 'string', isOptional: true }, // JSON array
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'file_size', type: 'number' },
        { name: 'upload_status', type: 'string' }, // 'pending', 'uploading', 'uploaded', 'failed'
        { name: 'upload_progress', type: 'number' }, // 0-100
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'time_entries',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'project_id', type: 'string', isIndexed: true },
        { name: 'task_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string' },
        { name: 'start_time', type: 'number' },
        { name: 'end_time', type: 'number', isOptional: true },
        { name: 'duration_minutes', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'is_dirty', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'entity_type', type: 'string', isIndexed: true },
        { name: 'entity_id', type: 'string', isIndexed: true },
        { name: 'action', type: 'string' }, // 'create', 'update', 'delete'
        { name: 'payload', type: 'string' }, // JSON data
        { name: 'status', type: 'string' }, // 'pending', 'syncing', 'synced', 'failed'
        { name: 'retry_count', type: 'number' },
        { name: 'error_message', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),
  ],
})
```

**Offline Sync Implementation**:
```typescript
// services/sync/SyncManager.ts

import NetInfo from '@react-native-community/netinfo'
import { database } from '@/database'
import { Q } from '@nozbe/watermelondb'
import { supabase } from '@/lib/supabase'
import BackgroundFetch from 'react-native-background-fetch'

interface SyncResult {
  success: boolean
  synced: number
  failed: number
  conflicts: number
}

class SyncManager {
  private isSyncing = false
  private syncQueue: any[] = []

  async initialize() {
    // Monitor network status
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isSyncing) {
        this.syncAll()
      }
    })

    // Configure background sync
    BackgroundFetch.configure(
      {
        minimumFetchInterval: 15, // minutes
        stopOnTerminate: false,
        startOnBoot: true,
      },
      async taskId => {
        console.log('[BackgroundFetch] Event received:', taskId)
        await this.syncAll()
        BackgroundFetch.finish(taskId)
      },
      error => {
        console.error('[BackgroundFetch] Failed to configure:', error)
      }
    )
  }

  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress')
      return { success: false, synced: 0, failed: 0, conflicts: 0 }
    }

    this.isSyncing = true
    let synced = 0
    let failed = 0
    let conflicts = 0

    try {
      // 1. Pull latest data from server
      await this.pullFromServer()

      // 2. Push local changes to server
      const pushResult = await this.pushToServer()
      synced = pushResult.synced
      failed = pushResult.failed
      conflicts = pushResult.conflicts

      // 3. Clean up synced items
      await this.cleanupSyncQueue()

      return { success: true, synced, failed, conflicts }
    } catch (error) {
      console.error('Sync error:', error)
      return { success: false, synced, failed, conflicts }
    } finally {
      this.isSyncing = false
    }
  }

  private async pullFromServer() {
    const lastSyncTime = await this.getLastSyncTime()

    // Fetch projects updated since last sync
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .gte('updated_at', lastSyncTime)

    if (projects) {
      await this.updateLocalProjects(projects)
    }

    // Fetch tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .gte('updated_at', lastSyncTime)

    if (tasks) {
      await this.updateLocalTasks(tasks)
    }

    // Update last sync time
    await this.setLastSyncTime(new Date().toISOString())
  }

  private async pushToServer(): Promise<{ synced: number; failed: number; conflicts: number }> {
    const syncQueueCollection = database.get('sync_queue')
    const pendingItems = await syncQueueCollection
      .query(Q.where('status', 'pending'))
      .fetch()

    let synced = 0
    let failed = 0
    let conflicts = 0

    for (const item of pendingItems) {
      try {
        // Update status to syncing
        await item.update(record => {
          record.status = 'syncing'
        })

        const payload = JSON.parse(item.payload)

        let result
        switch (item.action) {
          case 'create':
            result = await this.createOnServer(item.entity_type, payload)
            break
          case 'update':
            result = await this.updateOnServer(item.entity_type, item.entity_id, payload)
            break
          case 'delete':
            result = await this.deleteOnServer(item.entity_type, item.entity_id)
            break
        }

        if (result.success) {
          // Update local record with server ID
          if (item.action === 'create' && result.server_id) {
            await this.updateLocalRecordServerId(item.entity_type, item.entity_id, result.server_id)
          }

          // Mark as synced
          await item.update(record => {
            record.status = 'synced'
            record.synced_at = Date.now()
          })

          synced++
        } else if (result.conflict) {
          // Handle conflict
          await this.resolveConflict(item, result.serverData)
          conflicts++
        } else {
          throw new Error(result.error)
        }
      } catch (error: any) {
        console.error('Push error:', error)

        await item.update(record => {
          record.status = 'failed'
          record.error_message = error.message
          record.retry_count = record.retry_count + 1
        })

        failed++
      }
    }

    return { synced, failed, conflicts }
  }

  private async resolveConflict(localItem: any, serverData: any) {
    // Last-write-wins strategy
    const localUpdatedAt = new Date(JSON.parse(localItem.payload).updated_at)
    const serverUpdatedAt = new Date(serverData.updated_at)

    if (localUpdatedAt > serverUpdatedAt) {
      // Local is newer, force push to server
      await this.updateOnServer(localItem.entity_type, localItem.entity_id, JSON.parse(localItem.payload), true)

      await localItem.update(record => {
        record.status = 'synced'
        record.synced_at = Date.now()
      })
    } else {
      // Server is newer, update local
      await this.updateLocalRecord(localItem.entity_type, localItem.entity_id, serverData)

      await localItem.update(record => {
        record.status = 'synced'
        record.synced_at = Date.now()
      })
    }

    // Notify user of conflict
    this.notifyConflict(localItem.entity_type, localItem.entity_id)
  }

  private async createOnServer(entityType: string, data: any) {
    const { data: result, error } = await supabase
      .from(entityType)
      .insert(data)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, server_id: result.id }
  }

  private async updateOnServer(entityType: string, id: string, data: any, force = false) {
    // Check for conflicts if not forcing
    if (!force) {
      const { data: serverData } = await supabase
        .from(entityType)
        .select('updated_at')
        .eq('id', id)
        .single()

      if (serverData) {
        const serverUpdatedAt = new Date(serverData.updated_at)
        const localUpdatedAt = new Date(data.updated_at)

        if (serverUpdatedAt > localUpdatedAt) {
          return { success: false, conflict: true, serverData }
        }
      }
    }

    const { error } = await supabase
      .from(entityType)
      .update(data)
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  private async deleteOnServer(entityType: string, id: string) {
    const { error } = await supabase
      .from(entityType)
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  private async updateLocalProjects(projects: any[]) {
    const projectsCollection = database.get('projects')

    await database.write(async () => {
      for (const project of projects) {
        const existingProject = await projectsCollection
          .query(Q.where('server_id', project.id))
          .fetch()

        if (existingProject.length > 0) {
          await existingProject[0].update(record => {
            record.name = project.name
            record.description = project.description
            record.status = project.status
            record.estimated_budget = project.estimated_budget
            record.progress = project.progress
            record.synced_at = Date.now()
            record.is_dirty = false
          })
        } else {
          await projectsCollection.create(record => {
            record.server_id = project.id
            record.name = project.name
            record.description = project.description
            record.status = project.status
            record.estimated_budget = project.estimated_budget
            record.progress = project.progress
            record.synced_at = Date.now()
            record.is_dirty = false
          })
        }
      }
    })
  }

  private async updateLocalTasks(tasks: any[]) {
    const tasksCollection = database.get('tasks')

    await database.write(async () => {
      for (const task of tasks) {
        const existingTask = await tasksCollection
          .query(Q.where('server_id', task.id))
          .fetch()

        if (existingTask.length > 0) {
          await existingTask[0].update(record => {
            record.title = task.title
            record.description = task.description
            record.status = task.status
            record.priority = task.priority
            record.assignee_id = task.assignee_id
            record.due_date = task.due_date ? new Date(task.due_date).getTime() : null
            record.synced_at = Date.now()
            record.is_dirty = false
          })
        } else {
          await tasksCollection.create(record => {
            record.server_id = task.id
            record.project_id = task.project_id
            record.title = task.title
            record.description = task.description
            record.status = task.status
            record.priority = task.priority
            record.assignee_id = task.assignee_id
            record.due_date = task.due_date ? new Date(task.due_date).getTime() : null
            record.synced_at = Date.now()
            record.is_dirty = false
          })
        }
      }
    })
  }

  private async cleanupSyncQueue() {
    const syncQueueCollection = database.get('sync_queue')
    const syncedItems = await syncQueueCollection
      .query(Q.where('status', 'synced'))
      .fetch()

    await database.write(async () => {
      for (const item of syncedItems) {
        await item.markAsDeleted()
      }
    })
  }

  private async getLastSyncTime(): Promise<string> {
    const { getData } = await import('react-native-mmkv')
    const lastSync = getData('last_sync_time')
    return lastSync || new Date(0).toISOString()
  }

  private async setLastSyncTime(time: string) {
    const { setData } = await import('react-native-mmkv')
    await setData('last_sync_time', time)
  }

  private async updateLocalRecordServerId(entityType: string, localId: string, serverId: string) {
    const collection = database.get(entityType)
    const record = await collection.find(localId)

    await database.write(async () => {
      await record.update(r => {
        r.server_id = serverId
      })
    })
  }

  private async updateLocalRecord(entityType: string, id: string, data: any) {
    const collection = database.get(entityType)
    const record = await collection.find(id)

    await database.write(async () => {
      await record.update(r => {
        Object.assign(r, data)
        r.synced_at = Date.now()
        r.is_dirty = false
      })
    })
  }

  private notifyConflict(entityType: string, entityId: string) {
    // Show toast notification
    console.log(`Conflict resolved for ${entityType} ${entityId}`)
    // Could show in-app notification here
  }
}

export const syncManager = new SyncManager()
```

**GPS Tracking & Check-In**:
```typescript
// services/location/LocationService.ts

import Geolocation from 'react-native-geolocation-service'
import { PermissionsAndroid, Platform } from 'react-native'

interface Location {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

class LocationService {
  private watchId: number | null = null

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      )
      return granted === PermissionsAndroid.RESULTS.GRANTED
    }

    // iOS permissions handled via Info.plist
    return true
  }

  async getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          })
        },
        error => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      )
    })
  }

  startTracking(callback: (location: Location) => void) {
    this.watchId = Geolocation.watchPosition(
      position => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        })
      },
      error => console.error('Location tracking error:', error),
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 300000, // 5 minutes
        fastestInterval: 60000, // 1 minute minimum
      }
    )
  }

  stopTracking() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula
    const R = 6371e3 // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  async checkInAtSite(projectId: string, projectLocation: { lat: number; lng: number }) {
    const currentLocation = await this.getCurrentLocation()

    // Calculate distance to project site
    const distance = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      projectLocation.lat,
      projectLocation.lng
    )

    // Allow check-in if within 100 meters
    const isAtSite = distance <= 100

    if (isAtSite) {
      // Create check-in record
      await supabase.from('site_check_ins').insert({
        project_id: projectId,
        checked_in_at: new Date().toISOString(),
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
      })

      return { success: true, distance }
    } else {
      return { success: false, distance, message: `You are ${Math.round(distance)}m from the site` }
    }
  }
}

export const locationService = new LocationService()
```

**Photo Upload with Compression**:
```typescript
// services/photos/PhotoService.ts

import { launchCamera, launchImageLibrary } from 'react-native-image-picker'
import ImageResizer from 'react-native-image-resizer'
import { supabase } from '@/lib/supabase'
import { database } from '@/database'

class PhotoService {
  async capturePhoto(projectId: string, taskId?: string) {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
      includeExtra: true,
    })

    if (result.didCancel || !result.assets?.[0]) {
      return null
    }

    const photo = result.assets[0]

    // Get GPS coordinates from EXIF if available
    const latitude = photo.exif?.GPSLatitude
    const longitude = photo.exif?.GPSLongitude

    // Compress image
    const resized = await ImageResizer.createResizedImage(
      photo.uri,
      1920, // Max width
      1080, // Max height
      'JPEG',
      80 // Quality 80%
    )

    // Save to local database
    const photosCollection = database.get('photos')
    const localPhoto = await database.write(async () => {
      return await photosCollection.create(record => {
        record.project_id = projectId
        record.task_id = taskId || null
        record.local_uri = resized.uri
        record.file_size = resized.size
        record.latitude = latitude || null
        record.longitude = longitude || null
        record.upload_status = 'pending'
        record.upload_progress = 0
      })
    })

    // Queue for upload
    this.queuePhotoUpload(localPhoto.id)

    return localPhoto
  }

  async queuePhotoUpload(photoId: string) {
    const photosCollection = database.get('photos')
    const photo = await photosCollection.find(photoId)

    // Add to sync queue
    const syncQueueCollection = database.get('sync_queue')
    await database.write(async () => {
      await syncQueueCollection.create(record => {
        record.entity_type = 'photos'
        record.entity_id = photoId
        record.action = 'create'
        record.payload = JSON.stringify({
          project_id: photo.project_id,
          task_id: photo.task_id,
          latitude: photo.latitude,
          longitude: photo.longitude,
          caption: photo.caption,
          tags: photo.tags,
        })
        record.status = 'pending'
        record.retry_count = 0
      })
    })

    // Attempt immediate upload if online
    this.attemptUpload(photoId)
  }

  private async attemptUpload(photoId: string) {
    const photosCollection = database.get('photos')
    const photo = await photosCollection.find(photoId)

    if (photo.upload_status === 'uploaded') {
      return
    }

    try {
      // Update status to uploading
      await database.write(async () => {
        await photo.update(record => {
          record.upload_status = 'uploading'
        })
      })

      // Read file
      const fileUri = photo.local_uri
      const fileName = `${photo.project_id}/${Date.now()}-${photo.id}.jpg`

      // Upload to Supabase Storage
      const formData = new FormData()
      formData.append('file', {
        uri: fileUri,
        type: 'image/jpeg',
        name: fileName,
      } as any)

      const { data, error } = await supabase.storage
        .from('photos')
        .upload(fileName, formData, {
          contentType: 'image/jpeg',
        })

      if (error) throw error

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName)

      // Create photo record in database
      const { data: photoRecord, error: dbError } = await supabase
        .from('photos')
        .insert({
          project_id: photo.project_id,
          task_id: photo.task_id,
          url: publicUrlData.publicUrl,
          caption: photo.caption,
          tags: photo.tags ? JSON.parse(photo.tags) : [],
          latitude: photo.latitude,
          longitude: photo.longitude,
        })
        .select()
        .single()

      if (dbError) throw dbError

      // Update local record
      await database.write(async () => {
        await photo.update(record => {
          record.server_id = photoRecord.id
          record.remote_url = publicUrlData.publicUrl
          record.upload_status = 'uploaded'
          record.upload_progress = 100
          record.synced_at = Date.now()
        })
      })
    } catch (error) {
      console.error('Photo upload error:', error)

      await database.write(async () => {
        await photo.update(record => {
          record.upload_status = 'failed'
        })
      })
    }
  }

  async batchUpload(photoIds: string[]) {
    for (const photoId of photoIds) {
      await this.attemptUpload(photoId)
    }
  }
}

export const photoService = new PhotoService()
```

**Push Notifications**:
```typescript
// services/notifications/NotificationService.ts

import messaging from '@react-native-firebase/messaging'
import { supabase } from '@/lib/supabase'

class NotificationService {
  async initialize() {
    // Request permission
    const authStatus = await messaging().requestPermission()
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL

    if (!enabled) {
      console.log('Push notification permission denied')
      return
    }

    // Get FCM token
    const token = await messaging().getToken()
    console.log('FCM Token:', token)

    // Save token to database
    await this.registerDeviceToken(token)

    // Handle foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('Foreground message:', remoteMessage)
      this.showLocalNotification(remoteMessage)
    })

    // Handle background/quit messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Background message:', remoteMessage)
    })

    // Handle notification taps
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open:', remoteMessage)
      this.handleNotificationTap(remoteMessage)
    })

    // Handle initial notification (app opened from quit state)
    const initialNotification = await messaging().getInitialNotification()
    if (initialNotification) {
      console.log('App opened from notification:', initialNotification)
      this.handleNotificationTap(initialNotification)
    }
  }

  private async registerDeviceToken(token: string) {
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase.from('device_tokens').upsert({
        user_id: user.id,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      })
    }
  }

  private showLocalNotification(remoteMessage: any) {
    // Show in-app notification banner
    const { notification } = remoteMessage
    if (notification) {
      // Use react-native-toast-message or similar
      console.log('Show notification:', notification.title, notification.body)
    }
  }

  private handleNotificationTap(remoteMessage: any) {
    const { data } = remoteMessage

    // Navigate based on notification data
    if (data?.type === 'task_assigned') {
      // Navigate to task screen
      console.log('Navigate to task:', data.task_id)
    } else if (data?.type === 'project_update') {
      // Navigate to project screen
      console.log('Navigate to project:', data.project_id)
    }
  }
}

export const notificationService = new NotificationService()
```

**Testing Checklist**:
- [ ] Offline mode: 100 task updates sync correctly
- [ ] Offline mode: Photos queue and upload when online
- [ ] Offline mode: Conflicts resolve with last-write-wins
- [ ] Offline mode: User notified of conflicts
- [ ] Sync completes in <30 seconds for 100 changes
- [ ] Battery usage <5% per hour active use
- [ ] GPS check-in within ±5 meters accuracy
- [ ] GPS check-in validates proximity (100m radius)
- [ ] GPS tracking updates every 5 minutes
- [ ] Photo capture includes GPS coordinates
- [ ] Photo compression reduces size 70%+ (without quality loss)
- [ ] Photo upload shows progress (0-100%)
- [ ] Photo upload retries on failure (3 attempts)
- [ ] Batch photo upload works (50+ photos)
- [ ] Push notifications deliver in <5 seconds
- [ ] Push notifications open correct screen on tap
- [ ] Background sync runs every 15 minutes
- [ ] App works completely offline (no crashes)
- [ ] App state persists across restarts
- [ ] Login persists (secure storage)

**Success Metrics**:
- 80% of field workers use mobile app daily
- 90% of photos uploaded from mobile
- <500ms average screen load time
- 4.5+ stars in app stores
- <1% crash rate
- 95%+ offline sync success rate
- <5% battery usage per hour

---

## 2. USER EXPERIENCE QUALITY STANDARDS

- **Loading states**: Skeleton loaders, don't block interaction
- **Empty states**: "No tasks today - great job!"
- **Error states**: "Failed to sync. Will retry when online."
- **Offline indicator**: Persistent banner showing offline status
- **Touch targets**: 44x44px minimum
- **Gestures**: Swipe to complete task, pull to refresh
- **Accessibility**: VoiceOver/TalkBack support

---

## 3. PERFORMANCE REQUIREMENTS

- App launch: <2 seconds cold start
- Screen transitions: <300ms
- List scrolling: 60 FPS
- Photo capture: <1 second to save
- Sync: <30 seconds for 100 changes
- Battery: <5% per hour active use

---

## 4. SECURITY REQUIREMENTS

- Biometric authentication (Face ID/Touch ID)
- Secure token storage (Keychain/Keystore)
- API calls over HTTPS only
- Photos encrypted in transit
- No sensitive data in logs
- Auto-lock after 5 minutes inactivity

---

## 5. PRE-LAUNCH CHECKLIST

### Functional Testing (70 items)
- [ ] Login with email/password
- [ ] Login with Face ID/Touch ID
- [ ] Logout clears all data
- [ ] View project list offline
- [ ] View task list offline
- [ ] Complete task offline
- [ ] Create task offline
- [ ] Update task offline
- [ ] Delete task offline
- [ ] Changes queue for sync
- [ ] Sync queue displays pending count
- [ ] Manual sync button works
- [ ] Auto-sync on connectivity restored
- [ ] Conflict resolution (last-write-wins)
- [ ] User notified of conflicts
- [ ] GPS check-in at project site
- [ ] GPS check-in validates proximity
- [ ] GPS check-in saves location
- [ ] GPS tracking updates periodically
- [ ] GPS permission request works
- [ ] Camera permission request works
- [ ] Capture photo from camera
- [ ] Select photo from gallery
- [ ] Photo includes GPS coordinates
- [ ] Photo compresses correctly
- [ ] Photo upload shows progress
- [ ] Photo upload retries on failure
- [ ] Batch upload 50 photos
- [ ] Photos upload only on WiFi (optional setting)
- [ ] Push notification received
- [ ] Push notification opens app
- [ ] Push notification navigates to correct screen
- [ ] Background sync runs
- [ ] Background sync respects battery saver
- [ ] Time tracking start/stop
- [ ] Time entry syncs to server
- [ ] Daily briefing creates offline
- [ ] Safety incident reports offline
- [ ] Inspection checklist works offline
- [ ] Voice commands work
- [ ] Search works offline
- [ ] Filters work offline
- [ ] Sorting works offline
- [ ] Pull to refresh works
- [ ] Swipe to complete task
- [ ] Swipe to delete
- [ ] Infinite scroll loads more
- [ ] Empty states display
- [ ] Error states display
- [ ] Loading states display
- [ ] Offline banner shows/hides
- [ ] Sync status updates real-time
- [ ] App state persists on restart
- [ ] Deep links work
- [ ] Share functionality works
- [ ] Export to PDF works
- [ ] Print functionality works
- [ ] Settings save correctly
- [ ] Theme switch (light/dark)
- [ ] Language selection works
- [ ] Logout confirmation dialog
- [ ] Delete confirmation dialog
- [ ] Network error retry works
- [ ] Token refresh automatic
- [ ] Session timeout after 24 hours
- [ ] Biometric re-auth on resume
- [ ] App lock after 5 min inactivity
- [ ] Crash reporting sends logs
- [ ] Analytics tracking works
- [ ] Performance monitoring active

### UX Testing (25 items)
- [ ] Onboarding is intuitive
- [ ] Navigation is clear
- [ ] Icons are recognizable
- [ ] Text is readable (min 14px)
- [ ] Touch targets 44x44px
- [ ] Buttons have active states
- [ ] Forms have inline validation
- [ ] Errors are actionable
- [ ] Success messages confirm actions
- [ ] Loading doesn't block UI
- [ ] Animations are smooth (60 FPS)
- [ ] Transitions feel natural
- [ ] Pull to refresh feels responsive
- [ ] Swipe gestures work smoothly
- [ ] Keyboard dismisses properly
- [ ] Inputs don't get hidden by keyboard
- [ ] Tab order is logical
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Dark mode is readable
- [ ] Landscape mode works
- [ ] Tablet layout uses space well
- [ ] Offline indicator is clear
- [ ] Sync progress visible
- [ ] Empty states helpful

### Performance Testing (15 items)
- [ ] Cold start <2s
- [ ] Warm start <1s
- [ ] Screen transitions <300ms
- [ ] List scrolling 60 FPS (1000 items)
- [ ] Photo capture <1s
- [ ] Photo compression <2s
- [ ] Sync 100 items <30s
- [ ] Search results <500ms
- [ ] Filter application <200ms
- [ ] Battery usage <5% per hour
- [ ] Memory usage <150MB
- [ ] No memory leaks
- [ ] CPU usage <30% average
- [ ] Network usage optimized
- [ ] App size <50MB

### Security Testing (12 items)
- [ ] Tokens stored securely
- [ ] Biometric auth works
- [ ] Auto-lock enforced
- [ ] HTTPS enforced
- [ ] Certificate pinning
- [ ] No sensitive data in logs
- [ ] Photos encrypted in transit
- [ ] SQL injection blocked
- [ ] XSS attempts sanitized
- [ ] Root/jailbreak detection
- [ ] Debugger detection
- [ ] Code obfuscation applied

### Compatibility Testing (12 items)
- [ ] iPhone 12+ (iOS 15+)
- [ ] iPhone SE (iOS 15+)
- [ ] iPad (iOS 15+)
- [ ] Samsung Galaxy S21+ (Android 11+)
- [ ] Google Pixel 6+ (Android 12+)
- [ ] Various Android manufacturers
- [ ] Different screen sizes
- [ ] Different screen densities
- [ ] Light mode
- [ ] Dark mode
- [ ] RTL languages
- [ ] Accessibility features enabled

### Accessibility Testing (10 items)
- [ ] VoiceOver navigation works (iOS)
- [ ] TalkBack navigation works (Android)
- [ ] Screen reader announces changes
- [ ] Focus order is logical
- [ ] Touch targets 44x44px
- [ ] Color contrast meets WCAG AA
- [ ] Text scales correctly
- [ ] Dynamic type supported
- [ ] Reduce motion respected
- [ ] High contrast mode works

---

## 6. SUCCESS METRICS

- 80% daily active users (field workers)
- 90% photos from mobile
- <500ms screen load time
- 4.5+ stars app stores
- <1% crash rate
- 95%+ offline sync success
- <5% battery per hour

---

## 7. COMPETITIVE EDGE

**vs Procore**: Clunky mobile app, poor offline
**vs Buildertrend**: Better, but expensive
**vs Fieldwire**: Mobile-first but limited features

**What Makes Us Better**:
1. True offline mode (competitors require connection)
2. Smart conflict resolution (automatic)
3. Photo optimization (60% smaller uploads)
4. Voice commands (hands-free)
5. AI-generated daily reports
6. Sub-second screen loads
7. Battery optimized (<5% per hour)
8. Native feel (React Native)

**Win Statement**: "The Sierra Suites mobile app saved my superintendents 2 hours per day. Update tasks offline all day, sync in 30 seconds. Photos upload automatically on WiFi. GPS check-in proves they're on site. And the battery lasts all day. Procore's app drained batteries by noon and required constant internet. No comparison."
