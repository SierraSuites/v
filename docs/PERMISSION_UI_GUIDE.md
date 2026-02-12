# Permission-Based UI Rendering Guide

This guide explains how to use the RBAC permission system in your UI components to create secure, role-aware interfaces.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Components](#components)
3. [Hooks](#hooks)
4. [Usage Examples](#usage-examples)
5. [Best Practices](#best-practices)

## Core Concepts

The permission UI system provides declarative components and hooks to:
- **Show/hide** content based on user permissions
- **Enable/disable** actions based on permissions
- **Redirect** users from unauthorized pages
- **Display** role badges and permission status

All components automatically handle loading states and gracefully degrade when permissions are unavailable.

## Components

### PermissionGate

Shows/hides content based on permissions.

```tsx
import PermissionGate from '@/components/auth/PermissionGate'

// Single permission
<PermissionGate permission="canCreateProjects">
  <CreateProjectButton />
</PermissionGate>

// Multiple permissions (any)
<PermissionGate permission={['canViewFinancials', 'canManageFinances']}>
  <FinancialsDashboard />
</PermissionGate>

// Multiple permissions (all required)
<PermissionGate
  permission={['canManageFinances', 'canApproveExpenses']}
  requireAll
>
  <ExpenseApprovalPanel />
</PermissionGate>

// With fallback content
<PermissionGate
  permission="canViewAllPhotos"
  fallback={<div>You need photo viewing permissions</div>}
>
  <PhotoGallery />
</PermissionGate>

// Project-specific permission
<PermissionGate permission="canEditProject" projectId={projectId}>
  <EditProjectForm />
</PermissionGate>
```

### PermissionDenied

Shows content when user LACKS permission (opposite of PermissionGate).

```tsx
import { PermissionDenied } from '@/components/auth/PermissionGate'

<PermissionDenied permission="canManageCompanySettings">
  <div className="alert">
    Contact your administrator to access company settings
  </div>
</PermissionDenied>
```

### UnauthorizedAccess

Displays a styled unauthorized access message.

```tsx
import { UnauthorizedAccess } from '@/components/auth/PermissionGate'

<UnauthorizedAccess
  message="You need accounting permissions to view financial reports"
  actionText="Request Access"
  onAction={() => router.push('/request-access')}
/>
```

### PermissionButton

Button that automatically disables when user lacks permission.

```tsx
import { PermissionButton } from '@/components/auth/PermissionButton'

<PermissionButton
  permission="canCreateProjects"
  onClick={handleCreateProject}
  deniedMessage="You need project creation permissions"
>
  Create New Project
</PermissionButton>

// Icon button variant
import { PermissionIconButton } from '@/components/auth/PermissionButton'

<PermissionIconButton
  permission="canDeletePhotos"
  onClick={handleDelete}
  deniedMessage="You cannot delete photos"
>
  <TrashIcon />
</PermissionIconButton>
```

### PermissionMenuItem

Dropdown menu item that disables or hides based on permissions.

```tsx
import { PermissionMenuItem } from '@/components/auth/PermissionMenuItem'

<DropdownMenu>
  <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
  <DropdownMenuContent>
    <PermissionMenuItem
      permission="canEditProject"
      onClick={handleEdit}
    >
      Edit Project
    </PermissionMenuItem>

    <PermissionMenuItem
      permission="canDeleteProjects"
      onClick={handleDelete}
      hideWhenDenied  // Completely hide instead of just disabling
    >
      Delete Project
    </PermissionMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### PermissionLink

Link that disables or hides based on permissions.

```tsx
import { PermissionLink } from '@/components/auth/PermissionLink'

<PermissionLink
  permission="canViewFinancials"
  href="/financial/reports"
>
  View Financial Reports
</PermissionLink>

// Hide completely when denied
<PermissionLink
  permission="canManageCompanySettings"
  href="/settings/company"
  hideWhenDenied
>
  Company Settings
</PermissionLink>
```

### PermissionBadge

Displays user's current role or permission status.

```tsx
import { PermissionBadge, PermissionStatusBadge } from '@/components/auth/PermissionBadge'

// Show current role
<PermissionBadge showIcon />

// Show project-specific role
<PermissionBadge projectId={projectId} />

// Show permission status
<PermissionStatusBadge
  permission="canManageFinances"
  grantedText="Financial Access"
  deniedText="No Access"
/>
```

## Hooks

### usePermissions

Core hook for checking permissions in components.

```tsx
import { usePermissions } from '@/hooks/usePermissions'

function MyComponent({ projectId }) {
  const {
    permissions,      // Full permission set
    role,            // User's role (admin, project_manager, etc.)
    userId,          // User's ID
    loading,         // Loading state
    hasPermission,   // Check single permission
    hasAnyPermission,    // Check if user has ANY of multiple permissions
    hasAllPermissions,   // Check if user has ALL of multiple permissions
    refresh          // Manually refresh permissions
  } = usePermissions(projectId)

  if (loading) return <Spinner />

  if (hasPermission('canCreateProjects')) {
    return <CreateProjectButton />
  }

  return null
}
```

### usePermissionGuard

Guard entire pages with permission checks.

```tsx
'use client'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'

export default function FinancialReportsPage() {
  const { loading } = usePermissionGuard({
    permission: 'canViewFinancials',
    redirectTo: '/unauthorized'
  })

  if (loading) return <PageLoader />

  return <FinancialReports />
}

// With multiple permissions (any)
usePermissionGuard({
  permission: ['canViewFinancials', 'canManageFinances'],
  requireAll: false  // Default: requires ANY permission
})

// With multiple permissions (all)
usePermissionGuard({
  permission: ['canManageFinances', 'canApproveExpenses'],
  requireAll: true  // Requires ALL permissions
})

// With custom callback instead of redirect
usePermissionGuard({
  permission: 'canManageCompanySettings',
  onDenied: () => {
    toast.error('You need admin permissions to access this page')
    router.push('/dashboard')
  }
})
```

### usePermissionCheck

Check permissions programmatically with optional callbacks.

```tsx
import { usePermissionCheck } from '@/hooks/usePermissionGuard'
import { toast } from 'sonner'

function MyComponent() {
  const { checkPermission } = usePermissionCheck()

  const handleDeleteProject = () => {
    const canDelete = checkPermission('canDeleteProjects', {
      onDenied: (message) => toast.error(message),
      deniedMessage: 'You cannot delete projects'
    })

    if (!canDelete) return

    // Proceed with deletion
    deleteProject()
  }

  return <button onClick={handleDeleteProject}>Delete</button>
}
```

### useAccessibleProjects

Get list of projects user has access to.

```tsx
import { useAccessibleProjects } from '@/hooks/usePermissions'

function ProjectSelector() {
  const { projectIds, loading, hasAccess } = useAccessibleProjects()

  if (loading) return <Spinner />

  return (
    <Select>
      {projectIds.map(id => (
        <SelectItem key={id} value={id}>
          Project {id}
        </SelectItem>
      ))}
    </Select>
  )
}
```

## Usage Examples

### Example 1: Photo Management Interface

```tsx
import PermissionGate from '@/components/auth/PermissionGate'
import { PermissionButton } from '@/components/auth/PermissionButton'
import { PermissionMenuItem } from '@/components/auth/PermissionMenuItem'

function PhotoGallery() {
  return (
    <div>
      {/* Upload button - only visible to users who can upload */}
      <PermissionGate permission="canUploadPhotos">
        <UploadButton />
      </PermissionGate>

      {/* Photo grid - visible to anyone who can view photos */}
      <PermissionGate permission="canViewAllPhotos">
        <div className="photo-grid">
          {photos.map(photo => (
            <PhotoCard key={photo.id}>
              <img src={photo.url} />

              {/* Actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger>...</DropdownMenuTrigger>
                <DropdownMenuContent>
                  <PermissionMenuItem
                    permission="canEditPhotoMetadata"
                    onClick={() => handleEdit(photo.id)}
                  >
                    Edit Metadata
                  </PermissionMenuItem>

                  <PermissionMenuItem
                    permission="canSharePhotos"
                    onClick={() => handleShare(photo.id)}
                  >
                    Share
                  </PermissionMenuItem>

                  <PermissionMenuItem
                    permission="canDeletePhotos"
                    onClick={() => handleDelete(photo.id)}
                    hideWhenDenied
                  >
                    Delete
                  </PermissionMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </PhotoCard>
          ))}
        </div>
      </PermissionGate>
    </div>
  )
}
```

### Example 2: Project Page with Role-Based Actions

```tsx
'use client'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionButton } from '@/components/auth/PermissionButton'
import PermissionGate from '@/components/auth/PermissionGate'

export default function ProjectPage({ params }: { params: { id: string } }) {
  // Guard entire page - redirect if no access
  const { loading: guardLoading } = usePermissionGuard({
    permission: 'canViewProjects',
    redirectTo: '/unauthorized'
  })

  const { role, hasPermission } = usePermissions(params.id)

  if (guardLoading) return <PageLoader />

  return (
    <div>
      <h1>Project Details</h1>

      {/* Financial section - only for those with financial permissions */}
      <PermissionGate permission="canViewFinancials">
        <section>
          <h2>Budget & Expenses</h2>
          <BudgetChart />

          <PermissionButton
            permission="canManageFinances"
            onClick={handleAddExpense}
          >
            Add Expense
          </PermissionButton>
        </section>
      </PermissionGate>

      {/* Task management */}
      <section>
        <h2>Tasks</h2>
        <TaskList />

        <PermissionGate permission="canManageTasks">
          <CreateTaskButton />
        </PermissionGate>
      </section>

      {/* Settings - admin/PM only */}
      <PermissionGate permission={['canManageCompanySettings', 'canEditProject']} requireAll={false}>
        <section>
          <h2>Project Settings</h2>
          <ProjectSettingsForm />
        </section>
      </PermissionGate>
    </div>
  )
}
```

### Example 3: Navigation Menu with Permission-Based Links

```tsx
import { PermissionLink } from '@/components/auth/PermissionLink'
import PermissionGate from '@/components/auth/PermissionGate'

function Sidebar() {
  return (
    <nav>
      <ul>
        <li>
          <Link href="/dashboard">Dashboard</Link>
        </li>

        <PermissionGate permission="canViewProjects">
          <li>
            <Link href="/projects">Projects</Link>
          </li>
        </PermissionGate>

        <PermissionGate permission="canViewFinancials">
          <li>
            <Link href="/financial">Financial</Link>
          </li>
        </PermissionGate>

        <PermissionGate permission="canViewAllPhotos">
          <li>
            <Link href="/fieldsnap">FieldSnap</Link>
          </li>
        </PermissionGate>

        {/* Hide completely if no access */}
        <PermissionLink
          permission="canManageCompanySettings"
          href="/settings"
          hideWhenDenied
        >
          <li>Settings</li>
        </PermissionLink>
      </ul>
    </nav>
  )
}
```

## Best Practices

### 1. Always Use Permission Gates for Sensitive Content

```tsx
// ❌ BAD - No permission check
<div>
  <BudgetChart />
  <button onClick={deleteProject}>Delete Project</button>
</div>

// ✅ GOOD - Permission-protected
<PermissionGate permission="canViewFinancials">
  <BudgetChart />
</PermissionGate>

<PermissionButton
  permission="canDeleteProjects"
  onClick={deleteProject}
>
  Delete Project
</PermissionButton>
```

### 2. Use Project-Specific Permissions When Applicable

```tsx
// ❌ BAD - Missing project context
<PermissionGate permission="canEditProject">
  <EditForm />
</PermissionGate>

// ✅ GOOD - Project-specific check
<PermissionGate permission="canEditProject" projectId={project.id}>
  <EditForm />
</PermissionGate>
```

### 3. Combine UI and API Security

```tsx
// UI Layer - Hide button from unauthorized users
<PermissionButton
  permission="canDeleteProjects"
  onClick={handleDelete}
>
  Delete
</PermissionButton>

// API Layer - Verify permission on server
// app/api/projects/[id]/route.ts
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await requirePermission('canDeleteProjects')
  if (!authResult.authorized) return authResult.error

  // Proceed with deletion
}
```

### 4. Handle Loading States

```tsx
// ❌ BAD - Flash of wrong content during load
function MyComponent() {
  const { hasPermission } = usePermissions()

  if (hasPermission('canManageFinances')) {
    return <AdminPanel />
  }
  return <ViewerPanel />
}

// ✅ GOOD - Handle loading explicitly
function MyComponent() {
  const { hasPermission, loading } = usePermissions()

  if (loading) return <Spinner />

  if (hasPermission('canManageFinances')) {
    return <AdminPanel />
  }
  return <ViewerPanel />
}
```

### 5. Use Appropriate Granularity

```tsx
// ❌ TOO COARSE - All-or-nothing
<PermissionGate permission="canManageCompanySettings">
  <CompanySettingsPage />  {/* Everything requires this permission */}
</PermissionGate>

// ✅ GRANULAR - Different sections have different permissions
<div>
  <PermissionGate permission="canManageCompanySettings">
    <GeneralSettings />
  </PermissionGate>

  <PermissionGate permission="canManageIntegrations">
    <IntegrationSettings />
  </PermissionGate>

  <PermissionGate permission="canChangeRoles">
    <RoleManagement />
  </PermissionGate>
</div>
```

### 6. Provide Clear Feedback

```tsx
// ❌ BAD - Silent failure
<PermissionButton permission="canCreateProjects" onClick={handleCreate}>
  Create Project
</PermissionButton>

// ✅ GOOD - Clear feedback on why action is disabled
<PermissionButton
  permission="canCreateProjects"
  onClick={handleCreate}
  deniedMessage="You need Project Manager role to create projects"
  showTooltip
>
  Create Project
</PermissionButton>

// ✅ EVEN BETTER - Show upgrade prompt for tier-restricted features
<PermissionGate
  permission="canCreateProjects"
  fallback={
    <UpgradePrompt
      message="Upgrade to Professional plan to create unlimited projects"
    />
  }
>
  <CreateProjectButton />
</PermissionGate>
```

### 7. Consistent Permission Naming

Always use the standardized permission keys from `PermissionSet`:

```tsx
// ❌ BAD - Inconsistent naming
<PermissionGate permission="edit_project">...</PermissionGate>
<PermissionGate permission="can-edit-projects">...</PermissionGate>
<PermissionGate permission="editProject">...</PermissionGate>

// ✅ GOOD - Use official permission keys
<PermissionGate permission="canEditProject">...</PermissionGate>
```

## Permission Categories

### Projects & Tasks
- `canViewProjects` - View project list and details
- `canCreateProjects` - Create new projects
- `canEditProject` - Edit project details
- `canDeleteProjects` - Delete projects
- `canViewAllTasks` - View all tasks
- `canManageTasks` - Create, edit, and assign tasks

### Financial
- `canViewFinancials` - View budgets and expenses
- `canManageFinances` - Create and edit expenses
- `canApproveExpenses` - Approve expense reports

### Photos/FieldSnap
- `canViewAllPhotos` - View photos
- `canUploadPhotos` - Upload new photos
- `canEditPhotoMetadata` - Edit photo descriptions, tags, etc.
- `canDeletePhotos` - Delete photos
- `canSharePhotos` - Share photos with teams

### Team & Users
- `canInviteMembers` - Invite new team members
- `canRemoveMembers` - Remove team members
- `canChangeRoles` - Change user roles
- `canManageTeam` - Create and manage teams

### Settings
- `canManageCompanySettings` - Edit company settings
- `canManageIntegrations` - Manage third-party integrations
- `canViewAnalytics` - View reports and analytics

## Troubleshooting

### Permission Check Not Working

1. Verify the permission key exists in `PermissionSet` type
2. Check if user has the required role
3. Ensure `usePermissions` is being called with correct `projectId` (if project-specific)
4. Check browser console for permission check logs

### Button/Link Still Visible When It Shouldn't Be

1. Ensure you're using `PermissionGate` or `hideWhenDenied` prop
2. Check if the permission logic is correct (any vs all)
3. Verify RLS policies on database match UI permissions

### Performance Issues with Many Permission Checks

1. Permission hooks use React context and cache results
2. Avoid calling `usePermissions()` in tight loops - call once at parent level
3. Consider server-side filtering instead of hiding hundreds of items client-side

## Summary

The permission UI system provides a complete toolkit for building secure, role-aware interfaces:

- **Declarative** - Use components like `<PermissionGate>` instead of imperative checks
- **Type-safe** - TypeScript ensures permission keys are valid
- **Consistent** - Same permission logic in UI and API
- **User-friendly** - Graceful degradation and clear feedback
- **Auditable** - All permission checks are logged for compliance

Always combine UI-level permission checks with API-level security for defense in depth.
