# 🔐 Role-Based Access Control (RBAC) Implementation Guide

## Overview

Complete enterprise-grade role-based access control system with team collaboration, photo sharing, and granular permissions for FieldSnap construction management platform.

## ✅ What Was Implemented

### 1. Database Schema ✓
**File:** `RBAC_DATABASE_SCHEMA.sql`

**7 New Tables:**
- **company_teams** - Company team structure (construction, management, quality, safety)
- **team_members** - Team membership with roles
- **project_teams** - Project-to-team assignments
- **shared_media_assets** - Photo sharing with permission levels
- **permission_audit_log** - Full audit trail of permission checks
- **team_invitations** - Email-based team invitations
- **team_user_preferences** - User notification and display preferences

**Key Features:**
- 40+ performance indexes
- Row-Level Security (RLS) policies on all tables
- Helper functions (get_user_highest_role, get_user_project_role, can_user_view_media_asset)
- Statistics functions (get_team_stats)
- Automated triggers for timestamps and access tracking
- Maintenance functions for cleanup

### 2. Permission Service ✓
**File:** `lib/permissions.ts`

**5 User Roles:**
1. **Admin** (👑) - Full system access
2. **Superintendent** (🏗️) - Project and team management
3. **Project Manager** (📋) - Assigned project management
4. **Field Engineer** (🔧) - Photo upload and basic access
5. **Viewer** (👁️) - View-only access

**19 Granular Permissions:**
- **Projects:** View all, edit, delete, create
- **Teams:** Manage, invite, remove members, change roles
- **Photos:** View all, upload, delete, share, edit metadata
- **Analytics:** View, export data, reports
- **AI:** Manage, run analysis, view insights
- **Tasks:** Manage, assign, view all
- **Punch List:** Manage, resolve, view

**Service Methods:**
- `getUserHighestRole()` - Get user's top role
- `getUserProjectRole()` - Get role for specific project
- `hasPermission()` - Check single permission
- `hasPermissions()` - Check multiple permissions
- `getUserAccessibleProjects()` - Get accessible projects
- `canViewMediaAsset()` - Check photo access
- `canDeleteMediaAsset()` - Check delete permission
- `getUserTeams()` - Get user's teams
- `getTeamMembers()` - Get team roster
- `logPermissionCheck()` - Audit logging

### 3. API Middleware ✓
**File:** `lib/api-permissions.ts`

**Middleware Functions:**
- `requirePermission()` - Single permission check
- `requirePermissions()` - Multiple permission check
- `requireResourceOwnership()` - Ownership verification
- `requireMediaAssetAccess()` - Photo access check
- `requireMediaAssetDeletePermission()` - Delete permission
- `requireTeamMembership()` - Team membership verification
- `requireProjectAccess()` - Project access check
- `getAuthenticatedUser()` - User authentication

### 4. UI Components ✓

#### TeamManager Component
**File:** `components/teams/TeamManager.tsx`

**Features:**
- Grid view of all user's teams
- Create team modal with color picker
- Team type selection (construction/management/quality/safety)
- Team selection for member management
- Real-time member and project counts
- Active/inactive status indicators

#### TeamMemberList Component
**File:** `components/teams/TeamMemberList.tsx`

**Features:**
- Member roster with avatars
- Role display with color coding
- Inline role changes (dropdown)
- Team lead designation (⭐)
- Member removal with soft delete
- Invite member modal
- Email-based invitations with expiration
- Role hierarchy enforcement (can't manage higher roles)

#### SharePhotoModal Component
**File:** `components/fieldsnap/SharePhotoModal.tsx`

**Features:**
- Share with teams or individuals
- Permission level selection (view/comment/edit)
- Expiration date options (1/7/30/90 days or never)
- Optional share message
- Current shares management
- Revoke share functionality
- Access count tracking
- Visual permission indicators

## 🎯 Permission Matrix

### Admin (👑)
```
Projects:     ✓ View All  ✓ Edit  ✓ Delete  ✓ Create
Teams:        ✓ Manage  ✓ Invite  ✓ Remove  ✓ Change Roles
Photos:       ✓ View All  ✓ Upload  ✓ Delete  ✓ Share  ✓ Edit
Analytics:    ✓ View  ✓ Export  ✓ Reports
AI:           ✓ Manage  ✓ Run  ✓ View
Tasks:        ✓ Manage  ✓ Assign  ✓ View All
Punch List:   ✓ Manage  ✓ Resolve  ✓ View
```

### Superintendent (🏗️)
```
Projects:     ✓ View All  ✓ Edit  ✗ Delete  ✓ Create
Teams:        ✓ Manage  ✓ Invite  ✓ Remove  ✗ Change Roles*
Photos:       ✓ View All  ✓ Upload  ✓ Delete  ✓ Share  ✓ Edit
Analytics:    ✓ View  ✓ Export  ✓ Reports
AI:           ✓ Manage  ✓ Run  ✓ View
Tasks:        ✓ Manage  ✓ Assign  ✓ View All
Punch List:   ✓ Manage  ✓ Resolve  ✓ View
```
*Can't change admin roles

### Project Manager (📋)
```
Projects:     ✗ View All**  ✓ Edit  ✗ Delete  ✗ Create
Teams:        ✗ Manage  ✗ Invite  ✗ Remove  ✗ Change Roles
Photos:       ✗ View All**  ✓ Upload  ✗ Delete***  ✓ Share  ✓ Edit
Analytics:    ✓ View  ✓ Export  ✓ Reports
AI:           ✗ Manage  ✓ Run  ✓ View
Tasks:        ✓ Manage  ✓ Assign  ✗ View All**
Punch List:   ✓ Manage  ✓ Resolve  ✓ View
```
**Only assigned projects
***Only own photos

### Field Engineer (🔧)
```
Projects:     ✗ View All**  ✗ Edit  ✗ Delete  ✗ Create
Teams:        ✗ Manage  ✗ Invite  ✗ Remove  ✗ Change Roles
Photos:       ✗ View All**  ✓ Upload  ✗ Delete***  ✗ Share  ✗ Edit
Analytics:    ✗ View  ✗ Export  ✗ Reports
AI:           ✗ Manage  ✗ Run  ✓ View
Tasks:        ✗ Manage  ✗ Assign  ✗ View All****
Punch List:   ✗ Manage  ✗ Resolve  ✓ View
```
**Only project photos
***Only own photos
****Only assigned tasks

### Viewer (👁️)
```
Projects:     ✗ View All*  ✗ Edit  ✗ Delete  ✗ Create
Teams:        ✗ Manage  ✗ Invite  ✗ Remove  ✗ Change Roles
Photos:       ✗ View All*  ✗ Upload  ✗ Delete  ✗ Share  ✗ Edit
Analytics:    ✗ View  ✗ Export  ✗ Reports
AI:           ✗ Manage  ✗ Run  ✗ View
Tasks:        ✗ Manage  ✗ Assign  ✗ View All
Punch List:   ✗ Manage  ✗ Resolve  ✓ View
```
*Only shared content

## 🚀 Deployment Guide

### Step 1: Database Setup

```bash
# Run the RBAC schema
psql -h your-db-host -U your-user -d your-db < RBAC_DATABASE_SCHEMA.sql

# Or via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Paste contents of RBAC_DATABASE_SCHEMA.sql
# 3. Run
```

### Step 2: Verify Tables

```sql
-- Check all tables created
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE '%team%' OR tablename LIKE '%shar%' OR tablename LIKE '%permission%';

-- Should return:
-- company_teams
-- team_members
-- project_teams
-- shared_media_assets
-- permission_audit_log
-- team_invitations
-- team_user_preferences
```

### Step 3: Create Initial Teams (Optional)

```sql
-- Create a default team for your company
INSERT INTO company_teams (company_id, name, description, team_type, created_by)
VALUES (
  'your-company-id',
  'Main Team',
  'Primary company team',
  'custom',
  'your-admin-user-id'
);

-- Add yourself as admin
INSERT INTO team_members (team_id, user_id, role, is_lead, added_by)
VALUES (
  'team-id-from-above',
  'your-user-id',
  'admin',
  true,
  'your-user-id'
);
```

### Step 4: Test Permissions

```typescript
// In your Next.js app
import { permissionService } from '@/lib/permissions'

// Check user's role
const role = await permissionService.getUserHighestRole()
console.log('User role:', role)

// Check specific permission
const canUpload = await permissionService.hasPermission('canUploadPhotos')
console.log('Can upload:', canUpload)

// Get accessible projects
const projects = await permissionService.getUserAccessibleProjects()
console.log('Accessible projects:', projects.length)
```

## 💻 Usage Examples

### In API Routes

```typescript
// app/api/fieldsnap/upload/route.ts
import { requirePermission } from '@/lib/api-permissions'

export async function POST(request: Request) {
  // Check upload permission
  const { authorized, userId, error } = await requirePermission('canUploadPhotos')

  if (!authorized) {
    return error // Returns 401/403 response
  }

  // Continue with upload logic
  // userId is available for use
}
```

### In Server Components

```typescript
// app/fieldsnap/page.tsx
import { permissionService } from '@/lib/permissions'

export default async function FieldSnapPage() {
  const permissions = await permissionService.hasPermissions([
    'canUploadPhotos',
    'canSharePhotos',
    'canViewAnalytics'
  ])

  return (
    <div>
      {permissions.canUploadPhotos && <UploadButton />}
      {permissions.canSharePhotos && <ShareButton />}
      {permissions.canViewAnalytics && <AnalyticsLink />}
    </div>
  )
}
```

### In Client Components

```typescript
'use client'

import { useState, useEffect } from 'react'
import { permissionService } from '@/lib/permissions'

export default function PhotoCard({ photoId }: { photoId: string }) {
  const [canDelete, setCanDelete] = useState(false)

  useEffect(() => {
    const checkPermission = async () => {
      const canDel = await permissionService.canDeleteMediaAsset(photoId)
      setCanDelete(canDel)
    }
    checkPermission()
  }, [photoId])

  return (
    <div>
      <Photo id={photoId} />
      {canDelete && <DeleteButton />}
    </div>
  )
}
```

### Team Management

```typescript
// app/teams/page.tsx
import TeamManager from '@/components/teams/TeamManager'

export default function TeamsPage() {
  return (
    <div className="p-8">
      <TeamManager
        companyId="company-uuid"
        onTeamSelect={(team) => console.log('Selected:', team)}
      />
    </div>
  )
}
```

### Photo Sharing

```typescript
'use client'

import { useState } from 'react'
import SharePhotoModal from '@/components/fieldsnap/SharePhotoModal'

export default function PhotoDetail({ photo }: { photo: any }) {
  const [showShareModal, setShowShareModal] = useState(false)

  return (
    <div>
      <button onClick={() => setShowShareModal(true)}>
        🔗 Share
      </button>

      {showShareModal && (
        <SharePhotoModal
          photoId={photo.id}
          photoTitle={photo.filename}
          onClose={() => setShowShareModal(false)}
          onShared={() => {
            console.log('Photo shared!')
            // Refresh data
          }}
        />
      )}
    </div>
  )
}
```

## 🔧 API Integration Examples

### Protected Upload Endpoint

```typescript
// app/api/fieldsnap/upload/route.ts
import { requirePermission, requireProjectAccess } from '@/lib/api-permissions'

export async function POST(request: Request) {
  // 1. Check authentication and upload permission
  const { authorized, userId, error } = await requirePermission('canUploadPhotos')
  if (!authorized) return error

  // 2. Parse request
  const formData = await request.formData()
  const projectId = formData.get('projectId') as string

  // 3. Check project access if uploading to project
  if (projectId) {
    const projectCheck = await requireProjectAccess(projectId)
    if (!projectCheck.authorized) return projectCheck.error
  }

  // 4. Process upload
  // ... upload logic
}
```

### Protected Delete Endpoint

```typescript
// app/api/fieldsnap/[photoId]/route.ts
import { requireMediaAssetDeletePermission } from '@/lib/api-permissions'

export async function DELETE(
  request: Request,
  { params }: { params: { photoId: string } }
) {
  // Check delete permission for this specific photo
  const { authorized, error } = await requireMediaAssetDeletePermission(params.photoId)
  if (!authorized) return error

  // Process deletion
  // ... delete logic
}
```

### Team Management Endpoint

```typescript
// app/api/teams/[teamId]/members/route.ts
import { requireTeamMembership, requirePermission } from '@/lib/api-permissions'

export async function POST(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  // 1. Check team membership
  const memberCheck = await requireTeamMembership(params.teamId)
  if (!memberCheck.authorized) return memberCheck.error

  // 2. Check manage team permission
  const permCheck = await requirePermission('canManageTeam')
  if (!permCheck.authorized) return permCheck.error

  // 3. Process member addition
  // ... logic
}
```

## 📊 Database Queries

### Get Team Statistics

```sql
SELECT * FROM get_team_stats('team-uuid');

-- Returns:
-- {
--   "total_members": 12,
--   "admins": 2,
--   "superintendents": 3,
--   "project_managers": 4,
--   "field_engineers": 2,
--   "viewers": 1,
--   "assigned_projects": 8
-- }
```

### Check User Access

```sql
-- Get user's highest role
SELECT get_user_highest_role('user-uuid');

-- Get user's role for specific project
SELECT get_user_project_role('user-uuid', 'project-uuid');

-- Check if user can view media asset
SELECT can_user_view_media_asset('user-uuid', 'asset-uuid');
```

### Cleanup Tasks

```sql
-- Clean up expired shares
SELECT cleanup_expired_shares();
-- Returns number of shares deactivated

-- Archive old team members (removed >90 days ago)
SELECT archive_old_team_members();
-- Returns number of members permanently deleted
```

## 🎨 UI Customization

### Role Colors

```typescript
import { getRoleColor, getRoleIcon, getRoleDisplayName } from '@/lib/permissions'

const role = 'project_manager'

// Get color: #6366F1 (Indigo)
const color = getRoleColor(role)

// Get icon: 📋
const icon = getRoleIcon(role)

// Get name: "Project Manager"
const name = getRoleDisplayName(role)
```

### Permission Level Colors

```typescript
import { getPermissionLevelColor, getPermissionLevelIcon } from '@/lib/permissions'

const level = 'edit'

// Get color: #F59E0B (Orange)
const color = getPermissionLevelColor(level)

// Get icon: ✏️
const icon = getPermissionLevelIcon(level)
```

## 🔍 Troubleshooting

### Issue: Users can't see any projects

**Check:**
1. Is user a member of a team?
   ```sql
   SELECT * FROM team_members WHERE user_id = 'user-uuid' AND removed_at IS NULL;
   ```
2. Are teams assigned to projects?
   ```sql
   SELECT * FROM project_teams WHERE team_id IN (
     SELECT team_id FROM team_members WHERE user_id = 'user-uuid'
   );
   ```

**Fix:**
```sql
-- Add user to a team
INSERT INTO team_members (team_id, user_id, role, added_by)
VALUES ('team-id', 'user-id', 'field_engineer', 'admin-id');

-- Assign team to project
INSERT INTO project_teams (project_id, team_id, assigned_by)
VALUES ('project-id', 'team-id', 'admin-id');
```

### Issue: Permission checks failing

**Check:**
1. RLS policies enabled?
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename IN ('company_teams', 'team_members', 'project_teams');
   ```
2. Helper functions exist?
   ```sql
   SELECT proname FROM pg_proc WHERE proname LIKE '%user%role%';
   ```

### Issue: Shares not working

**Check:**
1. Share is active and not expired?
   ```sql
   SELECT * FROM shared_media_assets
   WHERE media_asset_id = 'asset-id'
   AND is_active = true
   AND (expires_at IS NULL OR expires_at > NOW());
   ```
2. User has team membership?
   ```sql
   SELECT sma.*, tm.user_id
   FROM shared_media_assets sma
   JOIN team_members tm ON sma.shared_with_team_id = tm.team_id
   WHERE tm.user_id = 'user-id' AND tm.removed_at IS NULL;
   ```

## 📈 Performance Optimization

### Indexes
All critical queries are indexed:
- Team lookups: `idx_team_members_team`, `idx_team_members_user`
- Project access: `idx_project_teams_project`, `idx_project_teams_team`
- Photo access: `idx_shared_media_asset`, `idx_shared_media_team`
- Role checks: `idx_team_members_role`

### Caching Recommendations

```typescript
// Cache user role for session
import { cache } from 'react'

export const getCachedUserRole = cache(async () => {
  return await permissionService.getUserHighestRole()
})

// Cache accessible projects
export const getCachedAccessibleProjects = cache(async (userId: string) => {
  return await permissionService.getUserAccessibleProjects(userId)
})
```

## 🔐 Security Best Practices

1. **Always use RLS policies** - Database-level security is enforced
2. **Double-check in API** - Use middleware for all protected routes
3. **Log permission checks** - Audit trail for compliance
4. **Validate ownership** - Don't trust client-side checks alone
5. **Expire shares** - Set reasonable expiration dates
6. **Review audit logs** - Monitor for suspicious activity

## 🎯 Next Steps

### Recommended Enhancements
1. **Email notifications** for team invitations
2. **Bulk user import** from CSV
3. **Custom roles** beyond the 5 default roles
4. **Permission templates** for quick team setup
5. **Activity feed** showing recent permission changes
6. **Mobile app integration** for permissions
7. **SSO integration** for enterprise teams
8. **Advanced analytics** on permission usage

## 📚 Additional Resources

- **Supabase RLS Docs:** https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL Row Security:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Next.js Middleware:** https://nextjs.org/docs/app/building-your-application/routing/middleware

## 🆘 Support

For issues or questions:
1. Check troubleshooting section above
2. Review database logs for RLS policy violations
3. Check permission audit log for denied requests
4. Ensure database functions are installed correctly

---

**Status:** ✅ PRODUCTION READY

**Version:** 1.0.0

**Last Updated:** 2025

**Implementation Time:** ~4 hours

**Components Created:** 7 files (1 SQL, 3 services, 3 UI components)
