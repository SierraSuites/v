# 🔐 RBAC UI Integration - Complete Guide

## Overview
This guide shows how to integrate Role-Based Access Control (RBAC) throughout the application to show/hide UI elements and filter data based on user permissions.

## Components Created
- ✅ `hooks/usePermissions.ts` - Permission hooks for React components
- ✅ `components/auth/PermissionGate.tsx` - Conditional rendering components
- ✅ `components/users/UserRoleBadge.tsx` - Role display badges
- ✅ `app/teams/page.tsx` - Team management page with permission checks

---

## Quick Start

### Using Permissions in Components

```typescript
import { usePermissions } from '@/hooks/usePermissions'
import PermissionGate from '@/components/auth/PermissionGate'

export default function MyComponent() {
  const { hasPermission, role, loading } = usePermissions()

  // Method 1: Conditional rendering with hook
  {hasPermission('canUploadPhotos') && (
    <button>Upload Photos</button>
  )}

  // Method 2: Using PermissionGate component
  <PermissionGate permission="canUploadPhotos">
    <button>Upload Photos</button>
  </PermissionGate>

  // Method 3: Multiple permissions (any)
  <PermissionGate permission={['canEditProjects', 'canDeleteProjects']}>
    <button>Manage Project</button>
  </PermissionGate>

  // Method 4: Multiple permissions (all required)
  <PermissionGate
    permission={['canManageTeam', 'canChangeRoles']}
    requireAll={true}
  >
    <button>Advanced Team Settings</button>
  </PermissionGate>
}
```

---

## Integration Steps

### 1. FieldSnap Page (`app/fieldsnap/page.tsx`)

#### Add Imports

```typescript
import { usePermissions } from '@/hooks/usePermissions'
import PermissionGate from '@/components/auth/PermissionGate'
import SharePhotoModal from '@/components/fieldsnap/SharePhotoModal'
import TeamManager from '@/components/teams/TeamManager'
```

#### Add Permission State

```typescript
export default function FieldSnapPage() {
  const { hasPermission, role, userId } = usePermissions()
  const [showTeamManager, setShowTeamManager] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedPhotoForShare, setSelectedPhotoForShare] = useState<any>(null)

  // ... existing state
```

#### Update Upload Button

**FIND** (around line 400-450):
```typescript
<button
  onClick={() => setShowUploadModal(true)}
  className="px-6 py-3 rounded-lg font-semibold text-white"
  style={{ backgroundColor: '#FF6B6B' }}
>
  📸 Upload Photos
</button>
```

**REPLACE WITH**:
```typescript
<PermissionGate permission="canUploadPhotos">
  <button
    onClick={() => setShowUploadModal(true)}
    className="px-6 py-3 rounded-lg font-semibold text-white"
    style={{ backgroundColor: '#FF6B6B' }}
  >
    📸 Upload Photos
  </button>
</PermissionGate>
```

#### Add Team Management Button in Header

**ADD AFTER UPLOAD BUTTON**:
```typescript
<PermissionGate permission="canManageTeam">
  <button
    onClick={() => setShowTeamManager(true)}
    className="px-4 py-2 rounded-lg border font-semibold hover:bg-gray-50"
    style={{ borderColor: '#E5E7EB', color: '#374151' }}
  >
    👥 Manage Team
  </button>
</PermissionGate>
```

#### Add Share Button to Photo Cards

**IN THE PHOTO GRID** (around line 656-680):

**FIND**:
```typescript
<div
  key={photo.id}
  className="group relative rounded-xl overflow-hidden cursor-pointer"
  onClick={() => router.push(`/fieldsnap/${photo.id}`)}
>
  <img ... />
  <div className="absolute inset-0 bg-gradient-to-t ...">
    {/* existing overlay content */}
  </div>
</div>
```

**UPDATE TO**:
```typescript
<div
  key={photo.id}
  className="group relative rounded-xl overflow-hidden cursor-pointer"
>
  <img
    src={photo.thumbnail_url || photo.url}
    alt={photo.filename}
    className="w-full h-full object-cover"
    onClick={() => router.push(`/fieldsnap/${photo.id}`)}
  />
  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
    <div className="absolute bottom-0 left-0 right-0 p-3">
      <p className="text-white text-xs font-semibold truncate">{photo.filename}</p>
      {photo.project_name && (
        <p className="text-white/70 text-xs truncate">{photo.project_name}</p>
      )}
    </div>

    {/* Share Button */}
    <PermissionGate permission="canSharePhotos">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setSelectedPhotoForShare(photo)
          setShowShareModal(true)
        }}
        className="absolute top-2 right-2 p-2 rounded-lg hover:bg-white/20 transition-colors"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
      >
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>
    </PermissionGate>
  </div>
</div>
```

#### Add Modals at End

**BEFORE FINAL `</div>`**:
```typescript
      {/* Share Photo Modal */}
      {selectedPhotoForShare && (
        <SharePhotoModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false)
            setSelectedPhotoForShare(null)
          }}
          mediaAsset={selectedPhotoForShare}
        />
      )}

      {/* Team Manager Modal */}
      {showTeamManager && user?.user_metadata?.company_id && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowTeamManager(false)}
        >
          <div
            className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Team Management</h2>
              <button
                onClick={() => setShowTeamManager(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <TeamManager companyId={user.user_metadata.company_id} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### 2. Projects Page (`app/projects/page.tsx`)

#### Add Imports

```typescript
import { usePermissions, useAccessibleProjects } from '@/hooks/usePermissions'
import PermissionGate from '@/components/auth/PermissionGate'
```

#### Filter Projects by Access

```typescript
export default function ProjectsPage() {
  const { hasPermission } = usePermissions()
  const { projectIds: accessibleProjectIds, loading: accessLoading } = useAccessibleProjects()
  const [projects, setProjects] = useState<any[]>([])

  const loadProjects = async () => {
    const supabase = createClient()

    // If user can view all projects, load all
    if (hasPermission('canViewAllProjects')) {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      setProjects(data || [])
    } else {
      // Otherwise, only load accessible projects
      if (accessibleProjectIds.length > 0) {
        const { data } = await supabase
          .from('projects')
          .select('*')
          .in('id', accessibleProjectIds)
          .order('created_at', { ascending: false })

        setProjects(data || [])
      } else {
        setProjects([])
      }
    }
  }

  // Conditional Create Project Button
  <PermissionGate permission="canCreateProjects">
    <button
      onClick={() => setShowCreateModal(true)}
      className="px-6 py-3 rounded-lg font-semibold text-white"
      style={{ backgroundColor: '#FF6B6B' }}
    >
      + New Project
    </button>
  </PermissionGate>
}
```

---

### 3. TaskFlow Page (`app/taskflow/page.tsx`)

#### Add Permission Filtering

```typescript
import { usePermissions, useAccessibleProjects } from '@/hooks/usePermissions'

export default function TaskFlowPage() {
  const { hasPermission } = usePermissions()
  const { projectIds: accessibleProjectIds } = useAccessibleProjects()

  const loadTasks = async () => {
    const supabase = createClient()

    if (hasPermission('canViewAllTasks')) {
      // Load all tasks
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true })

      setTasks(data || [])
    } else {
      // Load tasks from accessible projects only
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .in('project_id', accessibleProjectIds)
        .order('due_date', { ascending: true })

      setTasks(data || [])
    }
  }

  // Conditional Create Task Button
  <PermissionGate permission="canManageTasks">
    <button onClick={createTask}>+ New Task</button>
  </PermissionGate>

  // Conditional Assign Button
  <PermissionGate permission="canAssignTasks">
    <button onClick={assignTask}>Assign Task</button>
  </PermissionGate>
}
```

---

### 4. Dashboard Navigation with Role Badges

#### Add User Role Badge to Dashboard

```typescript
import UserRoleBadge from '@/components/users/UserRoleBadge'
import { usePermissions } from '@/hooks/usePermissions'

export default function DashboardPage() {
  const { role, userId } = usePermissions()

  return (
    <div>
      {/* In header or profile section */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-semibold">{userName}</p>
          <UserRoleBadge userId={userId} role={role} size="sm" />
        </div>
      </div>
    </div>
  )
}
```

---

### 5. Shared With Me View

#### Create Shared Photos Page

**File**: `app/fieldsnap/shared/page.tsx`

```typescript
"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SharedPhotosPage() {
  const router = useRouter()
  const [sharedPhotos, setSharedPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSharedPhotos()
  }, [])

  const loadSharedPhotos = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Get photos shared with this user directly
      const { data: directShares } = await supabase
        .from('shared_media_assets')
        .select(`
          *,
          media_asset:media_assets(*),
          shared_by_user:profiles!shared_by(full_name, avatar_url)
        `)
        .eq('shared_with_user_id', user.id)
        .eq('is_active', true)
        .order('shared_at', { ascending: false })

      // Get photos shared with user's teams
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .is('removed_at', null)

      const teamIds = teamMemberships?.map(m => m.team_id) || []

      let teamShares: any[] = []
      if (teamIds.length > 0) {
        const { data } = await supabase
          .from('shared_media_assets')
          .select(`
            *,
            media_asset:media_assets(*),
            shared_by_user:profiles!shared_by(full_name, avatar_url),
            team:company_teams(name, color)
          `)
          .in('shared_with_team_id', teamIds)
          .eq('is_active', true)
          .order('shared_at', { ascending: false })

        teamShares = data || []
      }

      // Combine and deduplicate
      const allShares = [...(directShares || []), ...teamShares]
      const uniqueShares = Array.from(
        new Map(allShares.map(item => [item.media_asset_id, item])).values()
      )

      setSharedPhotos(uniqueShares)
    } catch (error) {
      console.error('Error loading shared photos:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-t-transparent rounded-full mx-auto" style={{ borderColor: '#FF6B6B' }} />
          <p className="mt-4 text-sm" style={{ color: '#4A4A4A' }}>Loading shared photos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <header className="bg-white border-b" style={{ borderColor: '#E0E0E0' }}>
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Shared With Me</h1>
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                {sharedPhotos.length} photo{sharedPhotos.length !== 1 ? 's' : ''} shared with you
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6">
        {sharedPhotos.length === 0 ? (
          <div className="text-center py-20 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
            <span className="text-6xl mb-4 block">📤</span>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>No Shared Photos</h3>
            <p className="text-sm mb-6" style={{ color: '#4A4A4A' }}>
              Photos shared with you will appear here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sharedPhotos.map(share => (
              <div
                key={share.id}
                className="group relative rounded-xl overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', aspectRatio: '1/1' }}
                onClick={() => router.push(`/fieldsnap/${share.media_asset_id}`)}
              >
                <img
                  src={share.media_asset.thumbnail_url || share.media_asset.url}
                  alt={share.media_asset.filename}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs font-semibold truncate">
                      {share.media_asset.filename}
                    </p>
                    <p className="text-white/70 text-xs truncate">
                      Shared by {share.shared_by_user?.full_name || 'Unknown'}
                    </p>
                  </div>
                </div>
                {/* Share badge */}
                <div className="absolute top-2 right-2">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: '#3B82F6', color: '#FFFFFF' }}
                  >
                    📤 Shared
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

#### Add "Shared With Me" Link to FieldSnap Sidebar

```typescript
{/* In FieldSnap sidebar stats section */}
<Link
  href="/fieldsnap/shared"
  className="p-4 rounded-xl hover:shadow-md transition-shadow"
  style={{ backgroundColor: '#E5F4FF', border: '1px solid #BFDBFE' }}
>
  <div className="flex items-center justify-between mb-2">
    <span className="text-xs font-semibold" style={{ color: '#4A4A4A' }}>Shared with Me</span>
    <span className="text-2xl">📤</span>
  </div>
  <p className="text-2xl font-bold" style={{ color: '#3B82F6' }}>
    {sharedCount}
  </p>
  <p className="text-xs mt-1" style={{ color: '#1E40AF' }}>View shared photos</p>
</Link>
```

---

## Permission Reference

### Common Permissions

```typescript
// Projects
'canViewAllProjects'   - See all projects vs. only assigned
'canCreateProjects'    - Create new projects
'canEditProjects'      - Edit project details
'canDeleteProjects'    - Delete projects

// Photos
'canViewAllPhotos'     - See all photos vs. only shared/own
'canUploadPhotos'      - Upload new photos
'canDeletePhotos'      - Delete photos
'canSharePhotos'       - Share photos with teams/users
'canEditPhotoMetadata' - Edit photo tags, description

// Team
'canManageTeam'        - Create/edit/delete teams
'canInviteMembers'     - Invite new members
'canRemoveMembers'     - Remove team members
'canChangeRoles'       - Change user roles

// Tasks
'canManageTasks'       - Create/edit/delete tasks
'canAssignTasks'       - Assign tasks to users
'canViewAllTasks'      - See all tasks vs. only assigned

// Punch List
'canManagePunchList'   - Create/edit punch items
'canResolvePunchItems' - Mark items as resolved
'canViewPunchList'     - View punch list

// Analytics
'canViewAnalytics'     - Access analytics dashboards
'canExportData'        - Export data to CSV/PDF
'canViewReports'       - View generated reports

// AI
'canManageAI'          - Configure AI settings
'canRunAIAnalysis'     - Trigger AI analysis
'canViewAIInsights'    - See AI results
```

### Role Hierarchy

```
Admin > Superintendent > Project Manager > Field Engineer > Viewer
  👑         🔧                📋               🏗️           👁️
```

**Admin** (Full Access):
- All permissions enabled
- Can manage teams and roles
- Can view/edit all data

**Superintendent** (High Access):
- Most permissions enabled
- Cannot manage AI settings
- Cannot delete projects
- Can manage teams

**Project Manager** (Medium Access):
- Can create and manage own projects
- Can upload and share photos
- Can manage tasks and punch lists
- Cannot manage teams or AI

**Field Engineer** (Limited Access):
- Can upload photos
- Can create punch items
- Can view assigned tasks
- Cannot manage projects or teams

**Viewer** (Read-Only):
- Can only view shared content
- No creation or editing permissions
- No team management

---

## Testing Checklist

### FieldSnap Page
- [ ] Upload button only shows for users with `canUploadPhotos`
- [ ] Share button only shows for users with `canSharePhotos`
- [ ] Team management button only shows for users with `canManageTeam`
- [ ] Share modal works correctly
- [ ] Team manager modal works correctly

### Projects Page
- [ ] Create button only shows for users with `canCreateProjects`
- [ ] Users only see projects they have access to
- [ ] Admin sees all projects
- [ ] Non-admin sees only assigned projects

### TaskFlow Page
- [ ] Create task button only shows for users with `canManageTasks`
- [ ] Assign button only shows for users with `canAssignTasks`
- [ ] Users only see tasks from accessible projects
- [ ] Field engineers only see assigned tasks

### Teams Page
- [ ] Unauthorized users see access denied message
- [ ] Team management works for admins
- [ ] Permission list displays correctly
- [ ] Back button works

### Shared With Me
- [ ] Shows photos shared directly with user
- [ ] Shows photos shared with user's teams
- [ ] No duplicates in list
- [ ] Click navigates to photo detail
- [ ] Empty state shows when no shares

### Role Badges
- [ ] Correct icon and color for each role
- [ ] Loading state shows while fetching
- [ ] Works with provided role prop
- [ ] Works with async userId lookup

---

## Common Patterns

### Pattern 1: Simple Button Hide/Show

```typescript
<PermissionGate permission="canUploadPhotos">
  <button>Upload</button>
</PermissionGate>
```

### Pattern 2: Multiple Permissions (OR logic)

```typescript
<PermissionGate permission={['canEditProjects', 'canDeleteProjects']}>
  <button>Manage Project</button>
</PermissionGate>
```

### Pattern 3: Multiple Permissions (AND logic)

```typescript
<PermissionGate
  permission={['canManageTeam', 'canChangeRoles']}
  requireAll={true}
>
  <button>Advanced Settings</button>
</PermissionGate>
```

### Pattern 4: Fallback Content

```typescript
<PermissionGate
  permission="canViewAnalytics"
  fallback={<p>Upgrade to view analytics</p>}
>
  <AnalyticsDashboard />
</PermissionGate>
```

### Pattern 5: Show When Permission Denied

```typescript
import { PermissionDenied } from '@/components/auth/PermissionGate'

<PermissionDenied permission="canUploadPhotos">
  <div className="banner">
    Upgrade to Pro to upload photos
  </div>
</PermissionDenied>
```

### Pattern 6: Page-Level Protection

```typescript
export default function ProtectedPage() {
  const { hasPermission, loading } = usePermissions()

  if (loading) return <Loading />

  if (!hasPermission('canManageTeam')) {
    return <UnauthorizedAccess />
  }

  return <ProtectedContent />
}
```

### Pattern 7: Data Filtering

```typescript
const { projectIds } = useAccessibleProjects()

const filteredData = allData.filter(item =>
  projectIds.includes(item.project_id)
)
```

---

## Files Modified

### To Integrate
- `app/fieldsnap/page.tsx` - Add permission checks and share/team buttons
- `app/projects/page.tsx` - Filter projects by access
- `app/taskflow/page.tsx` - Filter tasks by access
- `app/dashboard/page.tsx` - Add role badge to user profile

### Files Created
- `hooks/usePermissions.ts` - Permission hooks
- `components/auth/PermissionGate.tsx` - Gate components
- `components/users/UserRoleBadge.tsx` - Role badges
- `app/teams/page.tsx` - Team management page
- `app/fieldsnap/shared/page.tsx` - Shared photos view

### Existing Files Used
- `lib/permissions.ts` - Permission service (already complete)
- `components/teams/TeamManager.tsx` - Team UI (already complete)
- `components/fieldsnap/SharePhotoModal.tsx` - Share modal (already complete)

---

## Status
✅ Core components complete and ready for integration

## Priority
🔴 HIGH - Essential for enterprise team collaboration

## Next Steps
1. Follow integration steps for each page
2. Test all permission checks
3. Verify role badges display
4. Test shared photos functionality
5. Deploy! 🚀
