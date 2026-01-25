# 🔄 Resolution Workflow - Integration Guide

## Overview
Complete workflow system for tracking punch items from identification to closure with proof photo documentation and before/after comparison.

## Components Created
- ✅ `components/fieldsnap/ResolutionWorkflow.tsx` - Step-by-step workflow component
- ✅ `components/fieldsnap/BeforeAfterComparison.tsx` - Photo comparison component

---

## Features

### ResolutionWorkflow Component
- **Visual workflow stepper** with 5 stages
- **Status-specific actions** for each stage
- **Proof photo upload** with automatic storage integration
- **Resolution notes** capture
- **Progress tracking** with completed/current/upcoming states
- **Color-coded** status indicators
- **Smart button logic** based on current state

### BeforeAfterComparison Component
- **Side-by-side view** - Compare photos next to each other
- **Slider view** - Interactive drag comparison
- **Fullscreen mode** - Detailed inspection
- **Auto-loads photos** from database
- **Status summary** when resolved
- **Awaiting state** when no proof photo yet

---

## Workflow Stages

```
1. 🔴 Open           → Issue identified, waiting to start
2. 🟡 In Progress    → Work is being done
3. 🟢 Resolved       → Fix completed, proof photo uploaded
4. ✅ Verified       → Fix confirmed and approved
5. 🔒 Closed         → Archived and complete
```

---

## Integration Points

### 1. Photo Detail Page Enhancement

**File**: `app/fieldsnap/[photoId]/page.tsx`

Already has PunchListPanel. Now add workflow tabs:

#### Add Imports

```typescript
import ResolutionWorkflow from '@/components/fieldsnap/ResolutionWorkflow'
import BeforeAfterComparison from '@/components/fieldsnap/BeforeAfterComparison'
```

#### Update PunchListPanel Section

**REPLACE:**
```typescript
<div className="lg:col-span-1">
  <PunchListPanel
    punchItems={punchItems}
    photoId={photo.id}
    projectId={photo.project_id}
    onPunchItemUpdate={handlePunchItemUpdate}
  />
</div>
```

**WITH:**
```typescript
<div className="lg:col-span-1 space-y-6">
  {/* Punch List Items */}
  <PunchListPanel
    punchItems={punchItems}
    photoId={photo.id}
    projectId={photo.project_id}
    onPunchItemUpdate={handlePunchItemUpdate}
  />

  {/* Show workflow for active punch items */}
  {punchItems.length > 0 && punchItems[0].status !== 'closed' && (
    <ResolutionWorkflow
      punchItem={punchItems[0]}
      onStatusChange={handlePunchItemUpdate}
    />
  )}

  {/* Show before/after comparison */}
  {punchItems.length > 0 && (
    <BeforeAfterComparison punchItem={punchItems[0]} />
  )}
</div>
```

---

### 2. Project Punch List Page Enhancement

**File**: `app/projects/[id]/punch-list/page.tsx`

Add workflow modal for detailed item management.

#### Add State

```typescript
const [selectedItemForWorkflow, setSelectedItemForWorkflow] = useState<any>(null)
const [showWorkflowModal, setShowWorkflowModal] = useState(false)
```

#### Add Modal Component

```typescript
{/* Resolution Workflow Modal */}
{selectedItemForWorkflow && (
  <div
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onClick={() => setShowWorkflowModal(false)}
  >
    <div
      className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">{selectedItemForWorkflow.title}</h2>
        <button
          onClick={() => setShowWorkflowModal(false)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Workflow Component */}
        <ResolutionWorkflow
          punchItem={selectedItemForWorkflow}
          onStatusChange={() => {
            loadPunchItems()
            setShowWorkflowModal(false)
          }}
        />

        {/* Before/After Comparison */}
        <BeforeAfterComparison punchItem={selectedItemForWorkflow} />
      </div>
    </div>
  </div>
)}
```

#### Update Item Click Handler

**FIND THE PUNCH ITEM CARD** and add onClick:

```typescript
<div
  className="punch-item-card"
  onClick={() => {
    setSelectedItemForWorkflow(item)
    setShowWorkflowModal(true)
  }}
>
  {/* existing item content */}
</div>
```

---

### 3. Dashboard Widget Enhancement

**File**: `components/dashboard/PunchListWidget.tsx`

Already navigates to photo detail page which now has workflow - no changes needed!

**Optional**: Add workflow preview in widget:

```typescript
{criticalItems.slice(0, maxItems).map(item => (
  <div key={item.id} className="space-y-2">
    {/* Existing item display */}

    {/* Mini workflow progress */}
    <div className="flex items-center gap-1">
      {['open', 'in_progress', 'resolved', 'verified', 'closed'].map((status, idx) => (
        <div
          key={status}
          className={`flex-1 h-1 rounded-full ${
            idx <= workflowIndex(item.status) ? 'bg-green-500' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  </div>
))}
```

---

## Usage Examples

### Basic Workflow Integration

```typescript
import ResolutionWorkflow from '@/components/fieldsnap/ResolutionWorkflow'

<ResolutionWorkflow
  punchItem={{
    id: 'item-123',
    title: 'Crack in foundation wall',
    status: 'in_progress',
    severity: 'critical',
    photo_id: 'photo-456',
    proof_photo_id: null
  }}
  onStatusChange={() => {
    // Refresh data
    loadPunchItems()
  }}
/>
```

### Before/After Comparison

```typescript
import BeforeAfterComparison from '@/components/fieldsnap/BeforeAfterComparison'

<BeforeAfterComparison
  punchItem={{
    id: 'item-123',
    title: 'Crack in foundation wall',
    photo_id: 'photo-456',      // Before photo
    proof_photo_id: 'photo-789', // After photo (or null)
    status: 'resolved',
    severity: 'critical'
  }}
/>
```

---

## Workflow Actions by Status

### Open (🔴)
**User sees**: "Start Working on This" button

**Action**: Changes status to `in_progress`

**Use case**: Team member begins work on the issue

---

### In Progress (🟡)
**User sees**:
1. "Upload Proof Photo & Mark Resolved" (file upload)
2. "Mark Resolved (No Photo)" (fallback)

**Action**:
- Option 1: Upload photo → Creates media asset → Sets `proof_photo_id` → Changes status to `resolved`
- Option 2: No photo → Changes status to `resolved`

**Use case**: Work completed, documenting the fix

---

### Resolved (🟢)
**User sees**:
1. "Verify & Approve Fix" button
2. "Reject - Needs More Work" button

**Actions**:
- Approve → Changes status to `verified`
- Reject → Changes status back to `in_progress`

**Use case**: Project manager reviews completed work

---

### Verified (✅)
**User sees**: "Close & Archive" button

**Action**: Changes status to `closed`

**Use case**: Final archival of resolved issue

---

### Closed (🔒)
**User sees**: No actions (workflow complete)

**Display**: Shows completion status

---

## Photo Upload Flow

### 1. User Clicks Upload Button
```
User is on "In Progress" step
Clicks "Upload Proof Photo & Mark Resolved"
File picker opens
```

### 2. File Upload to Supabase Storage
```javascript
const filePath = `${userId}/${punchItemId}_proof_${timestamp}.${ext}`

await supabase.storage
  .from('fieldsnap-photos')
  .upload(filePath, file)
```

### 3. Create Media Asset Record
```javascript
const { data: mediaAsset } = await supabase
  .from('media_assets')
  .insert({
    user_id,
    url: publicUrl,
    filename,
    file_size,
    mime_type
  })
```

### 4. Update Punch Item
```javascript
await punchListService.updateItem(punchItemId, {
  proof_photo_id: mediaAsset.id,
  status: 'resolved'
})
```

### 5. Trigger Callbacks
```javascript
onStatusChange() // Refreshes parent components
```

---

## Before/After View Modes

### Side-by-Side Mode
```
┌─────────────┬─────────────┐
│   BEFORE    │    AFTER    │
│  🔴 Photo   │  🟢 Photo   │
│             │             │
│   Border    │   Border    │
│   Red       │   Green     │
└─────────────┴─────────────┘
```

**Best for**: Overall comparison, showing context

---

### Slider Mode
```
┌─────────────────────────────┐
│  BEFORE  │    SLIDER   AFTER│
│  🔴      │      |      🟢   │
│          │      |           │
│          ◀──────▶           │
│     Drag to Compare         │
└─────────────────────────────┘
```

**Best for**: Detailed alignment, precise comparison

---

### Fullscreen Mode
```
Full screen overlay with side-by-side
ESC or X to close
Maximum detail for inspection
```

**Best for**: Presenting to clients, detailed review

---

## UI States

### Loading State
```typescript
<div className="animate-pulse">
  <div className="h-64 bg-gray-200 rounded" />
</div>
```

### No Proof Photo Yet
```typescript
<div className="bg-yellow-50 border border-yellow-200">
  ⏳ Awaiting Proof Photo
  Upload when work is complete
</div>
```

### With Proof Photo
```typescript
<div className="bg-green-50 border border-green-200">
  ✅ Work Completed Successfully
  Proof photo uploaded on [date]
</div>
```

---

## Database Requirements

### Media Assets Table
```sql
ALTER TABLE media_assets
ADD COLUMN IF NOT EXISTS is_proof_photo BOOLEAN DEFAULT FALSE;
```

### Punch List Items Table
```sql
-- Already has these columns:
- proof_photo_id (uuid, nullable)
- resolution_notes (text, nullable)
- status (text)
```

---

## Styling Details

### Workflow Step Colors
- **Open**: #DC2626 (Red)
- **In Progress**: #F59E0B (Orange)
- **Resolved**: #10B981 (Green)
- **Verified**: #6BCB77 (Light Green)
- **Closed**: #6B7280 (Gray)

### Progress Line
- Completed: Status color
- Upcoming: #E0E0E0 (Light gray)
- Current: Status color + ring

### Before/After Labels
- Before: Red badge (#DC2626)
- After: Green badge (#10B981)

---

## Responsive Behavior

### Desktop (≥768px)
- Side-by-side: 2 columns
- Workflow: Full width steps
- Slider: Full width with handles

### Mobile (<768px)
- Side-by-side: Stacked vertically
- Workflow: Vertical timeline
- Slider: Touch-enabled drag

---

## Accessibility

### Keyboard Navigation
- Tab through workflow buttons
- Enter to activate
- Esc to close modals

### Screen Readers
- Status labels announced
- Progress described
- Image alt text provided

### Color Contrast
- All text meets WCAG AA
- Status colors distinct
- High contrast mode support

---

## Performance Optimization

### Image Loading
- Use thumbnail_url for previews
- Lazy load fullscreen images
- Cache media assets locally

### State Management
- Debounce slider updates
- Batch status changes
- Optimistic UI updates

### Real-time Updates
- Subscribe only to relevant items
- Unsubscribe on unmount
- Throttle refresh rate

---

## Testing Checklist

#### Workflow Component
- [ ] All 5 workflow steps display correctly
- [ ] Current step is highlighted
- [ ] Completed steps show checkmarks
- [ ] Upcoming steps are grayed out
- [ ] Status-specific buttons appear
- [ ] File upload works
- [ ] Proof photo saved to storage
- [ ] Media asset created
- [ ] Punch item updated with proof_photo_id
- [ ] Status transitions work (open→in_progress→resolved→verified→closed)
- [ ] Reject button returns to in_progress
- [ ] Notes field appears when clicked
- [ ] Notes saved with status update
- [ ] Loading states show during upload
- [ ] Error handling for failed uploads
- [ ] onStatusChange callback fires

#### Before/After Component
- [ ] Before photo loads from photo_id
- [ ] After photo loads from proof_photo_id
- [ ] Side-by-side view works
- [ ] Slider view works
- [ ] Slider dragging is smooth
- [ ] Fullscreen modal opens
- [ ] Fullscreen shows both photos
- [ ] Close button works
- [ ] Click outside closes fullscreen
- [ ] "Awaiting proof photo" state shows
- [ ] "Work completed" state shows
- [ ] View mode buttons work
- [ ] Responsive on mobile
- [ ] Touch drag works on slider
- [ ] Photos scale properly
- [ ] Dates display correctly

#### Integration
- [ ] Works in photo detail page
- [ ] Works in project punch list modal
- [ ] Dashboard widget navigates correctly
- [ ] Real-time updates refresh workflow
- [ ] Multiple punch items handled
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Mobile experience is good

---

## Common Issues & Fixes

### Issue: Proof photo upload fails
**Fix**: Check Supabase storage bucket exists and RLS policies allow insert

### Issue: Before/After comparison doesn't show
**Fix**: Verify photo_id and proof_photo_id exist in media_assets table

### Issue: Workflow buttons don't work
**Fix**: Ensure punchListService.updateItem() has correct permissions

### Issue: Slider doesn't drag smoothly
**Fix**: Check for conflicting mouse event handlers

### Issue: Photos don't load
**Fix**: Verify media_assets.url is publicly accessible

---

## Future Enhancements

1. **AI-powered comparison** - Highlight differences automatically
2. **Annotation tools** - Draw on before/after photos
3. **Multi-photo proof** - Support multiple proof photos
4. **Video support** - Before/after videos
5. **Export to PDF** - Generate comparison reports
6. **Timeline view** - Show all status changes
7. **Notification system** - Alert assigned users
8. **Mobile app** - Native camera integration
9. **Offline mode** - Upload photos when back online
10. **Batch operations** - Update multiple items at once

---

## Files Created

1. **`components/fieldsnap/ResolutionWorkflow.tsx`** (305 lines)
   - Visual workflow stepper
   - Status-specific actions
   - Proof photo upload
   - Notes capture

2. **`components/fieldsnap/BeforeAfterComparison.tsx`** (328 lines)
   - Side-by-side view
   - Interactive slider view
   - Fullscreen mode
   - Auto photo loading

---

## Dependencies

- `lib/punchlist.ts` - Punch list service
- `lib/supabase/client.ts` - Supabase client
- `components/fieldsnap/PunchListPanel.tsx` - Punch list display
- Supabase Storage - Photo storage
- `media_assets` table - Photo metadata

---

## Status
✅ Complete and Ready for Integration

## Priority
🔴 HIGH - Completes end-to-end punch list workflow

---

## Quick Start

1. Copy both components to `components/fieldsnap/`
2. Update `app/fieldsnap/[photoId]/page.tsx` with imports and components
3. Test photo upload workflow
4. Verify before/after comparison
5. Deploy! 🚀
