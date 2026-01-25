# 💾 Storage Integration - Quick Reference Card

## 🎯 What Was Implemented

Complete integration of the existing storage management system into FieldSnap UI with real-time tier enforcement.

---

## 📦 Components Ready to Use

### 1. StorageMeter Component
**Location**: `components/fieldsnap/StorageMeter.tsx`

**Usage**:
```typescript
import StorageMeter from '@/components/fieldsnap/StorageMeter'
import { calculateUserStorage } from '@/lib/storage'

// Get storage quota
const quota = await calculateUserStorage()

// Display compact meter
<StorageMeter quota={quota} compact={true} />

// Display full meter with details
<StorageMeter quota={quota} showDetails={true} />
```

### 2. Storage Service
**Location**: `lib/storage.ts`

**Key Functions**:
```typescript
// Get user's storage quota
const quota = await calculateUserStorage(userId?)

// Check if upload is allowed
const result = await checkUploadAllowed(fileSizeBytes, userId?)

// Check batch upload
const result = await checkBatchUploadAllowed(files[], userId?)

// Get detailed breakdown
const breakdown = await getStorageBreakdown(userId?)

// Get upgrade recommendation
const recommendation = getUpgradeRecommendation(quota)
```

### 3. StorageBreakdownModal (NEW)
**Location**: `components/fieldsnap/StorageBreakdownModal.tsx`

**Features**:
- Storage by project
- Storage by file type
- Largest files list
- Cleanup suggestions
- Upgrade prompts

---

## 🔌 Integration Points

### FieldSnap Main Page (`app/fieldsnap/page.tsx`)

**Added**:
- ✅ Storage meter in sidebar (compact mode)
- ✅ Storage meter in header (desktop, compact mode)
- ✅ Real-time storage updates
- ✅ Upload button disabled when full
- ✅ Storage refresh on upload/delete

**Code Snippets**:
```typescript
// Import
import StorageMeter from '@/components/fieldsnap/StorageMeter'
import { calculateUserStorage, type StorageQuota } from '@/lib/storage'

// State
const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null)

// Load function
const loadStorageQuota = async () => {
  const quota = await calculateUserStorage()
  setStorageQuota(quota)
}

// In useEffect
loadStorageQuota()

// In sidebar
{storageQuota && <StorageMeter quota={storageQuota} compact={true} />}

// In header
{storageQuota && <StorageMeter quota={storageQuota} compact={true} />}

// On upload button
disabled={storageQuota?.isOverLimit}

// After upload/delete
loadStorageQuota()
```

### Upload Modal (`components/fieldsnap/PhotoUploadModal.tsx`)

**Added**:
- ✅ Pre-upload storage validation
- ✅ Storage warnings (80%, 95%, 100%)
- ✅ Upload blocking when full
- ✅ Upgrade prompts
- ✅ Real-time storage display

**Code Snippet**:
```typescript
// Before upload
const uploadCheck = await checkBatchUploadAllowed(filesArray)

if (!uploadCheck.allowed) {
  setStorageError(uploadCheck.reason)
  return
}

// Show warning if near limit
if (uploadCheck.reason) {
  toast.warning(uploadCheck.reason)
}

// Proceed with upload
```

### Dashboard (`app/dashboard/page.tsx`)

**Added**:
- ✅ Storage widget with full display
- ✅ Breakdown view option
- ✅ Upgrade links
- ✅ Real-time updates

**Code Snippet**:
```typescript
{storageQuota && (
  <div className="md:col-span-2 lg:col-span-1">
    <StorageMeter quota={storageQuota} showDetails={true} />
  </div>
)}
```

---

## 📊 Storage Limits by Tier

| Tier | Storage Limit | Warning At | Critical At |
|------|--------------|------------|-------------|
| **Starter** | 5 GB | 4 GB (80%) | 4.75 GB (95%) |
| **Pro** | 50 GB | 40 GB (80%) | 47.5 GB (95%) |
| **Enterprise** | Unlimited | Never | Never |

---

## 🎨 Visual States

### Color Coding
- 🟢 **Green** (0-59%): Healthy
- 🟡 **Yellow** (60-79%): Getting Full
- 🟠 **Orange** (80-94%): Running Low
- 🔴 **Red** (95-100%): Critical/Full

### UI Elements
- **Progress Bar**: Animated with color gradient
- **Percentage**: Bold display with tier badge
- **Warning Messages**: Contextual alerts with icons
- **Upgrade Buttons**: Prominent when near/at limit
- **Breakdown Link**: Access detailed analytics

---

## ⚡ Real-time Updates

Storage quota automatically refreshes on:
- ✅ Photo upload (via real-time subscription)
- ✅ Photo deletion (via real-time subscription)
- ✅ Page load
- ✅ Manual refresh

**Implementation**:
```typescript
// In subscribeToPhotos callback
if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
  loadStorageQuota() // Refresh storage
}
```

---

## 🚫 Upload Prevention

### When Storage is Full (>100%)
1. Upload button shows "Storage Full - Upgrade Required"
2. Upload button is disabled
3. Red warning banner displays
4. Upgrade link prominently shown
5. Upload function returns early if called

### When Near Limit (80-99%)
1. Yellow/orange warning displays
2. Shows remaining storage
3. Suggests upgrade
4. Upload still allowed

---

## 🔍 Storage Breakdown

Access via:
- Storage meter "View Breakdown" button
- Dashboard storage widget
- Direct link: `/fieldsnap/storage-analytics`

**Shows**:
- Total files count
- Storage by project (sorted by size)
- Storage by file type (image, video, etc.)
- Top 10 largest files
- Top 10 oldest files
- Cleanup suggestions
- Upgrade recommendations

---

## 🧪 Quick Test Commands

### Check Current Storage
```typescript
const quota = await calculateUserStorage()
console.log(`Used: ${quota.usedStorageGB} GB of ${quota.maxStorageGB} GB`)
console.log(`Percentage: ${quota.usedPercentage}%`)
console.log(`Can upload: ${quota.canUpload}`)
```

### Test Upload Validation
```typescript
const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
const result = await checkUploadAllowed(file.size)
console.log(`Allowed: ${result.allowed}`)
console.log(`Reason: ${result.reason}`)
```

### Get Breakdown
```typescript
const breakdown = await getStorageBreakdown()
console.log(`Total files: ${breakdown.totalFiles}`)
console.log(`Projects: ${breakdown.byProject.length}`)
console.log(`Largest file: ${breakdown.largestFiles[0].filename}`)
```

---

## 📱 Mobile Behavior

- **Sidebar**: Always shows storage meter (when not collapsed)
- **Header**: Hidden on mobile (< md breakpoint)
- **Upload Modal**: Full storage warnings display
- **Breakdown Modal**: Responsive with scroll
- **Touch**: All elements touch-friendly

---

## 🎯 User Flow Example

### Scenario: User uploads 100 photos

1. **Start**: User at 60% storage (3GB/5GB)
2. **Upload**: Selects 100 photos (2.5GB)
3. **Validation**: `checkBatchUploadAllowed()` runs
4. **Warning**: Shows "You're using 110% - upload would exceed limit"
5. **Blocked**: Upload button disabled
6. **Action**: User clicks "Upgrade to Pro (50GB)"
7. **Upgrade**: User upgrades plan
8. **Success**: Now at 11% (5.5GB/50GB)
9. **Upload**: Proceeds successfully
10. **Refresh**: Storage meter updates to 5.5GB/50GB

---

## 🔧 Common Issues & Fixes

### Issue: Storage not updating
**Fix**: Ensure `loadStorageQuota()` called after upload/delete

### Issue: Wrong storage percentage
**Fix**: Check `file_size` column in database exists and has values

### Issue: Upload not blocked when full
**Fix**: Verify `disabled={storageQuota?.isOverLimit}` on button

### Issue: Tier limits not applied
**Fix**: Check `user.user_metadata.tier` is set correctly

---

## 🚀 Next Steps (Future Enhancements)

1. Storage analytics page with charts
2. Bulk delete tool for old files
3. Automatic compression for large images
4. Email notifications at 90% usage
5. Project-specific storage limits
6. Storage usage trends dashboard
7. File deduplication
8. Archived storage tier

---

## 📞 Support

**Documentation**: [STORAGE_INTEGRATION_GUIDE.md](STORAGE_INTEGRATION_GUIDE.md)

**Files Modified**:
- `app/fieldsnap/page.tsx`
- `components/fieldsnap/PhotoUploadModal.tsx`
- `app/dashboard/page.tsx`

**Files Created**:
- `components/fieldsnap/StorageBreakdownModal.tsx`

**Existing Files Used**:
- `lib/storage.ts` (already complete)
- `components/fieldsnap/StorageMeter.tsx` (already complete)

---

**Status**: ✅ Complete and Ready for Production
**Priority**: 🔴 HIGH - Critical for tier enforcement
**Implementation Time**: ~2-3 hours

