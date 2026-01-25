# 💾 Storage Management UI Integration - Implementation Guide

## ✅ COMPLETE IMPLEMENTATION INSTRUCTIONS

This guide provides step-by-step instructions to integrate the existing storage management system into FieldSnap UI components.

---

## 📁 File: `app/fieldsnap/page.tsx`

### 1. Update Imports (Line 1-11)

**ADD these imports after line 11:**

```typescript
import StorageMeter from '@/components/fieldsnap/StorageMeter'
import { calculateUserStorage, type StorageQuota } from '@/lib/storage'
```

### 2. Add Storage State (After line 72)

**ADD this state variable after** `const [photos, setPhotos] = useState<Photo[]>([])`

```typescript
const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null)
```

### 3. Add Storage Loading Function (After line 153)

**ADD this function after** `loadPhotos()`:

```typescript
const loadStorageQuota = async () => {
  try {
    const quota = await calculateUserStorage()
    setStorageQuota(quota)
  } catch (err) {
    console.error('Error loading storage quota:', err)
  }
}
```

### 4. Update useEffect to Load Storage (Line 106-128)

**MODIFY the existing** `useEffect` hook that calls `loadPhotos()` and `loadStats()`:

```typescript
useEffect(() => {
  if (user) {
    loadPhotos()
    loadStats()
    loadStorageQuota() // ADD THIS LINE

    // Subscribe to real-time updates
    const unsubscribe = subscribeToPhotos((payload) => {
      if (payload.eventType === 'INSERT') {
        setPhotos(prev => [payload.new as PhotoType, ...prev])
        loadStats() // Refresh stats
        loadStorageQuota() // ADD THIS LINE - Refresh storage after upload
      } else if (payload.eventType === 'UPDATE') {
        setPhotos(prev => prev.map(p => p.id === payload.new.id ? payload.new as PhotoType : p))
      } else if (payload.eventType === 'DELETE') {
        setPhotos(prev => prev.filter(p => p.id !== payload.old.id))
        loadStats() // Refresh stats
        loadStorageQuota() // ADD THIS LINE - Refresh storage after deletion
      }
    })

    return () => {
      unsubscribe()
    }
  }
}, [user])
```

### 5. Replace Sidebar Storage Indicator (Lines 385-406)

**REPLACE the entire storage indicator section** with:

```typescript
{/* Storage Indicator - Using Integrated StorageMeter */}
{!sidebarCollapsed && storageQuota && (
  <div className="p-4">
    <StorageMeter quota={storageQuota} compact={true} />
  </div>
)}
```

### 6. Add Storage to Header (After line 446)

**ADD this after the search input div**, before the upload buttons:

```typescript
<div className="flex items-center gap-3">
  {/* Storage Meter in Header (Desktop) */}
  {storageQuota && (
    <div className="hidden md:block">
      <StorageMeter quota={storageQuota} compact={true} />
    </div>
  )}

  <button
    onClick={() => setShowUploadModal(true)}
    className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors text-white hover:opacity-90"
    style={{ backgroundColor: '#FF6B6B' }}
    disabled={storageQuota?.isOverLimit}  // ADD THIS LINE
  >
    {/* ... rest of button code ... */}
  </button>

  <button
    onClick={() => setShowUploadModal(true)}
    className="sm:hidden p-2 rounded-lg font-semibold text-white hover:opacity-90"
    style={{ backgroundColor: '#FF6B6B' }}
    disabled={storageQuota?.isOverLimit}  // ADD THIS LINE
  >
    {/* ... rest of button code ... */}
  </button>
</div>
```

### 7. Update Upload Modal Call (Line 726-733)

**UPDATE the PhotoUploadModal call** to refresh storage:

```typescript
<PhotoUploadModal
  isOpen={showUploadModal}
  onClose={() => setShowUploadModal(false)}
  onUploadComplete={() => {
    loadPhotos()
    loadStats()
    loadStorageQuota() // ADD THIS LINE
  }}
/>
```

---

## 📁 File: `components/fieldsnap/PhotoUploadModal.tsx`

### 1. Add Imports

```typescript
import { checkBatchUploadAllowed, type StorageQuota, calculateUserStorage } from '@/lib/storage'
```

### 2. Add Storage State

```typescript
const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null)
const [storageError, setStorageError] = useState<string | null>(null)
```

### 3. Load Storage on Mount

```typescript
useEffect(() => {
  if (isOpen) {
    loadStorage()
  }
}, [isOpen])

const loadStorage = async () => {
  try {
    const quota = await calculateUserStorage()
    setStorageQuota(quota)
  } catch (err) {
    console.error('Error loading storage:', err)
  }
}
```

### 4. Add Pre-Upload Validation

**BEFORE the existing upload logic**, add:

```typescript
const handleUpload = async (files: FileList) => {
  setStorageError(null)

  // Check storage before upload
  const filesArray = Array.from(files)
  const uploadCheck = await checkBatchUploadAllowed(filesArray)

  if (!uploadCheck.allowed) {
    setStorageError(uploadCheck.reason || 'Storage limit exceeded')
    toast.error(uploadCheck.reason || 'Cannot upload: storage limit exceeded')
    return
  }

  // Show warning if near limit
  if (uploadCheck.reason) {
    toast.warning(uploadCheck.reason)
  }

  // Proceed with existing upload logic...
  // (your existing upload code here)
}
```

### 5. Display Storage Warning in Modal

**ADD this UI component** before the file upload area:

```typescript
{storageQuota && storageQuota.isNearLimit && (
  <div className="mb-4 p-4 rounded-lg" style={{
    backgroundColor: storageQuota.isOverLimit ? '#FEE2E2' : '#FEF3C7',
    borderLeft: `4px solid ${storageQuota.isOverLimit ? '#DC2626' : '#F59E0B'}`
  }}>
    <div className="flex items-start gap-3">
      <span className="text-xl">{storageQuota.isOverLimit ? '🚨' : '⚠️'}</span>
      <div>
        <p className="font-bold text-sm mb-1" style={{
          color: storageQuota.isOverLimit ? '#991B1B' : '#92400E'
        }}>
          {storageQuota.isOverLimit ? 'Storage Full!' : 'Running Low on Storage'}
        </p>
        <p className="text-sm" style={{
          color: storageQuota.isOverLimit ? '#DC2626' : '#B45309'
        }}>
          {storageQuota.isOverLimit
            ? 'You cannot upload new photos. Please upgrade your plan or delete some files.'
            : `You have ${formatStorageGB(storageQuota.remainingGB)} remaining. Consider upgrading.`
          }
        </p>
        {storageQuota.tier !== 'enterprise' && (
          <Link
            href="/pricing"
            className="text-sm font-semibold underline mt-2 inline-block"
            style={{ color: '#FF6B6B' }}
          >
            Upgrade Now →
          </Link>
        )}
      </div>
    </div>
  </div>
)}

{storageError && (
  <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
    <p className="text-sm font-semibold" style={{ color: '#DC2626' }}>{storageError}</p>
  </div>
)}
```

### 6. Disable Upload Button When Full

**UPDATE the upload button** to disable when storage is full:

```typescript
<button
  onClick={handleUpload}
  disabled={uploading || (storageQuota?.isOverLimit ?? false)}
  className="px-6 py-3 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
  style={{ backgroundColor: '#FF6B6B' }}
>
  {uploading ? 'Uploading...' :
   storageQuota?.isOverLimit ? 'Storage Full - Upgrade Required' :
   'Upload Photos'}
</button>
```

---

## 📁 File: `app/dashboard/page.tsx`

### 1. Add Imports

```typescript
import StorageMeter from '@/components/fieldsnap/StorageMeter'
import { calculateUserStorage, type StorageQuota } from '@/lib/storage'
```

### 2. Add Storage State

```typescript
const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null)
```

### 3. Load Storage

```typescript
useEffect(() => {
  if (user) {
    loadDashboardData()
    loadStorage()
  }
}, [user])

const loadStorage = async () => {
  try {
    const quota = await calculateUserStorage()
    setStorageQuota(quota)
  } catch (err) {
    console.error('Error loading storage:', err)
  }
}
```

### 4. Add Storage Widget to Dashboard

**ADD this widget** in the dashboard grid:

```typescript
{/* Storage Widget */}
{storageQuota && (
  <div className="md:col-span-2 lg:col-span-1">
    <StorageMeter quota={storageQuota} showDetails={true} />
  </div>
)}
```

---

## 📁 NEW FILE: `components/fieldsnap/StorageBreakdownModal.tsx`

Create this new component for detailed storage analysis:

```typescript
"use client"

import { useState, useEffect } from 'react'
import { getStorageBreakdown, formatStorageGB, type StorageBreakdown } from '@/lib/storage'
import Link from 'next/link'

interface StorageBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function StorageBreakdownModal({ isOpen, onClose }: StorageBreakdownModalProps) {
  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadBreakdown()
    }
  }, [isOpen])

  const loadBreakdown = async () => {
    try {
      setLoading(true)
      const data = await getStorageBreakdown()
      setBreakdown(data)
    } catch (err) {
      console.error('Error loading storage breakdown:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: '#E0E0E0' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: '#FFE5E5' }}>
                💾
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Storage Breakdown</h2>
                <p className="text-sm" style={{ color: '#6B7280' }}>Detailed analysis of your storage usage</p>
              </div>
            </div>
            <button onClick={onClose} className="text-2xl hover:opacity-70" style={{ color: '#6B7280' }}>×</button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#FF6B6B' }} />
            <p className="mt-4 text-sm" style={{ color: '#6B7280' }}>Analyzing storage...</p>
          </div>
        ) : breakdown && (
          <div className="p-6 space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Total Files</p>
                <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{breakdown.totalFiles}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Projects</p>
                <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{breakdown.byProject.length}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                <p className="text-xs mb-1" style={{ color: '#6B7280' }}>File Types</p>
                <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{breakdown.byFileType.length}</p>
              </div>
            </div>

            {/* Storage by Project */}
            <div>
              <h3 className="text-lg font-bold mb-3" style={{ color: '#1A1A1A' }}>Storage by Project</h3>
              <div className="space-y-2">
                {breakdown.byProject.map(project => (
                  <div key={project.projectId} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                    <span className="font-semibold" style={{ color: '#374151' }}>{project.projectName}</span>
                    <span className="font-bold" style={{ color: '#FF6B6B' }}>{formatStorageGB(project.sizeGB)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Storage by File Type */}
            <div>
              <h3 className="text-lg font-bold mb-3" style={{ color: '#1A1A1A' }}>Storage by File Type</h3>
              <div className="space-y-2">
                {breakdown.byFileType.map(type => (
                  <div key={type.type} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold capitalize" style={{ color: '#374151' }}>{type.type}</span>
                      <span className="text-sm" style={{ color: '#6B7280' }}>({type.count} files)</span>
                    </div>
                    <span className="font-bold" style={{ color: '#FF6B6B' }}>{formatStorageGB(type.sizeGB)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Largest Files */}
            <div>
              <h3 className="text-lg font-bold mb-3" style={{ color: '#1A1A1A' }}>Largest Files</h3>
              <div className="space-y-2">
                {breakdown.largestFiles.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50" style={{ backgroundColor: '#F8F9FA' }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" style={{ color: '#374151' }}>{file.filename}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold" style={{ color: '#FF6B6B' }}>{formatStorageGB(file.sizeGB)}</span>
                      <Link href={file.url} className="text-sm text-blue-600 hover:underline">View</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cleanup Suggestions */}
            {breakdown.oldestFiles.length > 0 && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#FFF9E6', borderLeft: '4px solid #F59E0B' }}>
                <h4 className="font-bold mb-2" style={{ color: '#92400E' }}>💡 Cleanup Suggestions</h4>
                <p className="text-sm mb-2" style={{ color: '#B45309' }}>
                  You have {breakdown.oldestFiles.length} old files that haven't been accessed recently.
                </p>
                <button className="text-sm font-semibold underline" style={{ color: '#F59E0B' }}>
                  Review old files →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50" style={{ borderColor: '#E0E0E0' }}>
          <div className="flex justify-between items-center">
            <Link href="/pricing" className="text-sm font-semibold hover:underline" style={{ color: '#FF6B6B' }}>
              Need more storage? Upgrade now →
            </Link>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-lg font-semibold border transition-colors hover:bg-white"
              style={{ borderColor: '#E5E7EB', color: '#374151' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 🧪 Testing Checklist

After implementing all changes, test the following:

### ✅ FieldSnap Main Page
- [ ] Storage meter displays in sidebar
- [ ] Storage meter displays in header (desktop only)
- [ ] Storage meter shows correct percentage
- [ ] Storage meter updates color based on usage (green → yellow → orange → red)
- [ ] Upload button disables when storage is full
- [ ] Storage refreshes after upload
- [ ] Storage refreshes after photo deletion

### ✅ Upload Modal
- [ ] Storage warning displays when near limit (>80%)
- [ ] Critical warning displays when at limit (>95%)
- [ ] Upload blocked when over limit (>100%)
- [ ] Warning message shows remaining storage
- [ ] Upgrade link appears in warnings
- [ ] Upload button disabled when storage full
- [ ] Storage check runs before upload
- [ ] Batch upload validation works

### ✅ Dashboard
- [ ] Storage widget displays
- [ ] Shows detailed breakdown option
- [ ] Links to storage analytics work
- [ ] Updates in real-time

### ✅ Storage Breakdown Modal
- [ ] Opens when clicking "View Breakdown"
- [ ] Shows storage by project
- [ ] Shows storage by file type
- [ ] Shows largest files
- [ ] Shows cleanup suggestions
- [ ] Links work correctly

### ✅ Real-time Updates
- [ ] Storage updates after photo upload
- [ ] Storage updates after photo deletion
- [ ] No need to refresh page
- [ ] Percentage and numbers accurate

### ✅ Mobile Responsiveness
- [ ] Storage meter responsive on mobile
- [ ] Hidden on mobile header if space constrained
- [ ] Always visible in sidebar
- [ ] Modal works on mobile
- [ ] Warnings display correctly

---

## 🚀 Deployment Steps

1. **Backup existing files** (already done)
2. **Update imports** in all files
3. **Add state variables** for storage quota
4. **Implement loading functions**
5. **Update UI components** to show storage meter
6. **Add validation** to upload flows
7. **Create breakdown modal** component
8. **Test thoroughly** using checklist above
9. **Deploy to production**

---

## 📊 Expected Behavior

### Storage Tiers
- **Starter**: 5GB limit, warnings at 4GB (80%), blocked at 5GB
- **Pro**: 50GB limit, warnings at 40GB (80%), blocked at 50GB
- **Enterprise**: Unlimited storage, no warnings

### Color Coding
- **Green** (< 60%): Healthy storage
- **Yellow** (60-79%): Getting full
- **Orange** (80-94%): Running low
- **Red** (≥ 95%): Critical/Full

### User Experience
1. User uploads photos normally when under 80%
2. At 80%, sees yellow warning with remaining space
3. At 95%, sees orange critical warning
4. At 100%, upload button disabled, must upgrade
5. Can view detailed breakdown anytime
6. Storage updates immediately after actions

---

## 🔧 Troubleshooting

### Storage not updating
- Check `calculateUserStorage()` is being called
- Verify real-time subscription includes `loadStorageQuota()`
- Check console for errors

### Upload not blocked when full
- Verify `disabled={storageQuota?.isOverLimit}` on button
- Check `checkBatchUploadAllowed()` is called before upload
- Ensure validation happens before file processing

### Incorrect storage calculation
- Verify `file_size` column exists in `media_assets`
- Check user tier is correct in user_metadata
- Ensure RLS policies allow reading file sizes

---

## ✨ Enhancements (Future)

- [ ] Storage analytics page with charts
- [ ] Bulk delete old files tool
- [ ] Automatic cleanup suggestions
- [ ] Storage usage trends over time
- [ ] Project-specific storage limits
- [ ] Email notifications at 90% usage
- [ ] Compression suggestions for large files

---

**Implementation Status**: Ready for deployment
**Priority**: HIGH - Essential for tier enforcement
**Estimated Time**: 2-3 hours for full implementation

