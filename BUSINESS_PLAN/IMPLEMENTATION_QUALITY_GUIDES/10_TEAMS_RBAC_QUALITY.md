# TEAMS & RBAC - IMPLEMENTATION QUALITY GUIDE

**Module**: Team Management & Role-Based Access Control (Module 10)
**Business Purpose**: Multi-user coordination, security, permissions, audit trails
**Target Quality**: 98%+ before launch
**Priority**: CRITICAL - Security & scalability foundation

---

## 1. CORE QUALITY REQUIREMENTS

### 1.1 Critical Feature: Role-Based Access Control System

**Standard**: Every database query MUST enforce RLS policies. No user shall access data outside their permission scope. Permission checks MUST complete in <50ms.

**Why It Matters**: One permission error = lawsuit. Example: Field worker sees financial data ($450K project budget) and shares with competitor. Company loses competitive advantage and faces confidentiality breach lawsuit.

**Database Schema**:
```sql
-- Roles table (system and custom roles)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Role Info
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false, -- Cannot be edited/deleted

  -- Permissions stored as JSONB for flexibility
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* Permission structure:
  {
    "projects": {
      "view_all": true,
      "view_assigned": true,
      "create": true,
      "edit": true,
      "delete": false,
      "view_budget": false,
      "edit_budget": false
    },
    "tasks": {
      "view_all": true,
      "view_assigned": true,
      "create": true,
      "edit": true,
      "delete": false,
      "assign": true
    },
    "financials": {
      "view": false,
      "create": false,
      "edit": false,
      "delete": false
    },
    "quotes": {
      "view": false,
      "create": false,
      "edit": false,
      "send": false
    },
    "users": {
      "view": false,
      "invite": false,
      "edit": false,
      "delete": false
    },
    "settings": {
      "view": false,
      "edit": false
    }
  }
  */

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  UNIQUE(company_id, name),
  CHECK (name != ''), -- Role must have a name
  CHECK (is_system_role = false OR company_id IS NULL) -- System roles have no company
);

CREATE INDEX idx_roles_company ON roles(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_roles_system ON roles(is_system_role) WHERE is_system_role = true;

-- User role assignments
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Scope limitations (optional - restrict to specific projects)
  project_ids UUID[], -- NULL = all projects, array = specific projects only

  -- Assignment tracking
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional: temporary role assignment

  -- Constraints
  UNIQUE(user_id, role_id, company_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_company ON user_roles(company_id);
CREATE INDEX idx_user_roles_expires ON user_roles(expires_at) WHERE expires_at IS NOT NULL;

-- Project team members (explicit project assignments)
CREATE TABLE project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Role on this specific project
  project_role TEXT NOT NULL, -- 'manager', 'superintendent', 'worker', 'observer'

  -- Permissions can override role defaults for this project
  custom_permissions JSONB DEFAULT NULL, -- NULL = use role permissions

  -- Metadata
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),

  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_team_members(project_id);
CREATE INDEX idx_project_members_user ON project_team_members(user_id);
CREATE INDEX idx_project_members_company ON project_team_members(company_id);

-- RLS Policies
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_members ENABLE ROW LEVEL SECURITY;

-- Users can view roles in their company
CREATE POLICY "Users can view company roles"
  ON roles FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_system_role = true -- Everyone can see system roles
  );

-- Only users with user management permission can create/edit roles
CREATE POLICY "Admins can manage roles"
  ON roles FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'users'->>'edit' = 'true'
    )
  );

-- Users can view role assignments in their company
CREATE POLICY "Users can view role assignments"
  ON user_roles FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Only admins can manage role assignments
CREATE POLICY "Admins can manage role assignments"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'users'->>'edit' = 'true'
    )
  );

-- Users can view project team members for projects they have access to
CREATE POLICY "Users can view project team members"
  ON project_team_members FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE
        id IN (SELECT project_id FROM project_team_members WHERE user_id = auth.uid())
        OR company_id IN (
          SELECT ur.company_id FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid()
          AND r.permissions->>'projects'->>'view_all' = 'true'
        )
    )
  );

-- Project managers can add/remove team members
CREATE POLICY "Project managers can manage team members"
  ON project_team_members FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT ptm.project_id FROM project_team_members ptm
      WHERE ptm.user_id = auth.uid()
      AND ptm.project_role = 'manager'
    )
    OR
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'projects'->>'edit' = 'true'
    )
  );

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_company_id UUID,
  p_permission_path TEXT -- e.g., 'projects.create', 'financials.view'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
  v_parts TEXT[];
  v_module TEXT;
  v_action TEXT;
BEGIN
  -- Parse permission path
  v_parts := string_to_array(p_permission_path, '.');
  v_module := v_parts[1];
  v_action := v_parts[2];

  -- Check if user has this permission through any of their roles
  SELECT EXISTS(
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
    AND ur.company_id = p_company_id
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    AND (r.permissions->v_module->>v_action)::boolean = true
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's effective permissions (merged from all roles)
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_permissions JSONB;
BEGIN
  -- Merge all permissions from all user's roles
  SELECT jsonb_object_agg(
    module,
    jsonb_object_agg(action, has_permission)
  )
  INTO v_permissions
  FROM (
    SELECT
      module,
      action,
      bool_or((r.permissions->module->>action)::boolean) AS has_permission
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    CROSS JOIN LATERAL jsonb_object_keys(r.permissions) AS module
    CROSS JOIN LATERAL jsonb_object_keys(r.permissions->module) AS action
    WHERE ur.user_id = p_user_id
    AND ur.company_id = p_company_id
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    GROUP BY module, action
  ) perms
  GROUP BY module;

  RETURN COALESCE(v_permissions, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default system roles
INSERT INTO roles (name, description, is_system_role, permissions) VALUES
('Owner', 'Full system access', true, '{
  "projects": {"view_all": true, "view_assigned": true, "create": true, "edit": true, "delete": true, "view_budget": true, "edit_budget": true},
  "tasks": {"view_all": true, "view_assigned": true, "create": true, "edit": true, "delete": true, "assign": true},
  "financials": {"view": true, "create": true, "edit": true, "delete": true},
  "quotes": {"view": true, "create": true, "edit": true, "send": true},
  "users": {"view": true, "invite": true, "edit": true, "delete": true},
  "settings": {"view": true, "edit": true}
}'),
('Project Manager', 'Manage assigned projects', true, '{
  "projects": {"view_all": true, "view_assigned": true, "create": true, "edit": true, "delete": false, "view_budget": true, "edit_budget": true},
  "tasks": {"view_all": true, "view_assigned": true, "create": true, "edit": true, "delete": true, "assign": true},
  "financials": {"view": true, "create": true, "edit": true, "delete": false},
  "quotes": {"view": true, "create": true, "edit": true, "send": true},
  "users": {"view": true, "invite": false, "edit": false, "delete": false},
  "settings": {"view": false, "edit": false}
}'),
('Superintendent', 'Oversee field operations', true, '{
  "projects": {"view_all": false, "view_assigned": true, "create": false, "edit": false, "delete": false, "view_budget": false, "edit_budget": false},
  "tasks": {"view_all": false, "view_assigned": true, "create": true, "edit": true, "delete": false, "assign": true},
  "financials": {"view": false, "create": false, "edit": false, "delete": false},
  "quotes": {"view": false, "create": false, "edit": false, "send": false},
  "users": {"view": true, "invite": false, "edit": false, "delete": false},
  "settings": {"view": false, "edit": false}
}'),
('Field Worker', 'Complete assigned tasks', true, '{
  "projects": {"view_all": false, "view_assigned": true, "create": false, "edit": false, "delete": false, "view_budget": false, "edit_budget": false},
  "tasks": {"view_all": false, "view_assigned": true, "create": false, "edit": true, "delete": false, "assign": false},
  "financials": {"view": false, "create": false, "edit": false, "delete": false},
  "quotes": {"view": false, "create": false, "edit": false, "send": false},
  "users": {"view": false, "invite": false, "edit": false, "delete": false},
  "settings": {"view": false, "edit": false}
}'),
('Accountant', 'Manage financials', true, '{
  "projects": {"view_all": true, "view_assigned": true, "create": false, "edit": false, "delete": false, "view_budget": true, "edit_budget": true},
  "tasks": {"view_all": false, "view_assigned": true, "create": false, "edit": false, "delete": false, "assign": false},
  "financials": {"view": true, "create": true, "edit": true, "delete": true},
  "quotes": {"view": true, "create": true, "edit": true, "send": true},
  "users": {"view": true, "invite": false, "edit": false, "delete": false},
  "settings": {"view": false, "edit": false}
}'),
('Client', 'View only access', true, '{
  "projects": {"view_all": false, "view_assigned": true, "create": false, "edit": false, "delete": false, "view_budget": false, "edit_budget": false},
  "tasks": {"view_all": false, "view_assigned": true, "create": false, "edit": false, "delete": false, "assign": false},
  "financials": {"view": false, "create": false, "edit": false, "delete": false},
  "quotes": {"view": true, "create": false, "edit": false, "send": false},
  "users": {"view": false, "invite": false, "edit": false, "delete": false},
  "settings": {"view": false, "edit": false}
}'),
('Subcontractor', 'Limited task access', true, '{
  "projects": {"view_all": false, "view_assigned": true, "create": false, "edit": false, "delete": false, "view_budget": false, "edit_budget": false},
  "tasks": {"view_all": false, "view_assigned": true, "create": false, "edit": true, "delete": false, "assign": false},
  "financials": {"view": false, "create": false, "edit": false, "delete": false},
  "quotes": {"view": false, "create": false, "edit": false, "send": false},
  "users": {"view": false, "invite": false, "edit": false, "delete": false},
  "settings": {"view": false, "edit": false}
}');
```

**API Implementation**:
```typescript
// app/api/roles/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const permissionsSchema = z.object({
  projects: z.object({
    view_all: z.boolean(),
    view_assigned: z.boolean(),
    create: z.boolean(),
    edit: z.boolean(),
    delete: z.boolean(),
    view_budget: z.boolean(),
    edit_budget: z.boolean(),
  }),
  tasks: z.object({
    view_all: z.boolean(),
    view_assigned: z.boolean(),
    create: z.boolean(),
    edit: z.boolean(),
    delete: z.boolean(),
    assign: z.boolean(),
  }),
  financials: z.object({
    view: z.boolean(),
    create: z.boolean(),
    edit: z.boolean(),
    delete: z.boolean(),
  }),
  quotes: z.object({
    view: z.boolean(),
    create: z.boolean(),
    edit: z.boolean(),
    send: z.boolean(),
  }),
  users: z.object({
    view: z.boolean(),
    invite: z.boolean(),
    edit: z.boolean(),
    delete: z.boolean(),
  }),
  settings: z.object({
    view: z.boolean(),
    edit: z.boolean(),
  }),
})

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  permissions: permissionsSchema,
})

export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    // Get all roles (system + company custom)
    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .or(`company_id.eq.${profile.company_id},is_system_role.eq.true`)
      .order('is_system_role', { ascending: false })
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ roles })

  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await req.json()

    // Validate input
    const validatedData = createRoleSchema.parse(body)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    // Check if user has permission to create roles
    const { data: hasPermission } = await supabase
      .rpc('user_has_permission', {
        p_user_id: user.id,
        p_company_id: profile.company_id,
        p_permission_path: 'users.edit'
      })

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to create roles' },
        { status: 403 }
      )
    }

    // Create role
    const { data: role, error } = await supabase
      .from('roles')
      .insert({
        company_id: profile.company_id,
        name: validatedData.name,
        description: validatedData.description,
        permissions: validatedData.permissions,
        is_system_role: false,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      // Handle duplicate role name
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A role with this name already exists' },
          { status: 400 }
        )
      }
      throw error
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      company_id: profile.company_id,
      user_id: user.id,
      action: 'role_created',
      entity_type: 'role',
      entity_id: role.id,
      metadata: {
        role_name: role.name,
      },
    })

    return NextResponse.json({ role }, { status: 201 })

  } catch (error) {
    console.error('Error creating role:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**UI Implementation**:
```typescript
// components/teams/RolePermissionsMatrix.tsx

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ShieldCheckIcon, LockIcon, SaveIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Role {
  id: string
  name: string
  description: string
  is_system_role: boolean
  permissions: {
    [module: string]: {
      [action: string]: boolean
    }
  }
}

const PERMISSION_CATEGORIES = {
  'Projects': {
    module: 'projects',
    permissions: [
      { key: 'view_all', label: 'View All' },
      { key: 'view_assigned', label: 'View Assigned' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'view_budget', label: 'View Budget' },
      { key: 'edit_budget', label: 'Edit Budget' },
    ],
  },
  'Tasks': {
    module: 'tasks',
    permissions: [
      { key: 'view_all', label: 'View All' },
      { key: 'view_assigned', label: 'View Assigned' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'assign', label: 'Assign' },
    ],
  },
  'Financials': {
    module: 'financials',
    permissions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  'Quotes': {
    module: 'quotes',
    permissions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'send', label: 'Send' },
    ],
  },
  'Users': {
    module: 'users',
    permissions: [
      { key: 'view', label: 'View' },
      { key: 'invite', label: 'Invite' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  'Settings': {
    module: 'settings',
    permissions: [
      { key: 'view', label: 'View' },
      { key: 'edit', label: 'Edit' },
    ],
  },
}

export function RolePermissionsMatrix() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [editedPermissions, setEditedPermissions] = useState<any>(null)
  const queryClient = useQueryClient()

  // Fetch roles
  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await fetch('/api/roles')
      if (!res.ok) throw new Error('Failed to fetch roles')
      return res.json()
    },
  })

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: string; permissions: any }) => {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update role')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setEditedPermissions(null)
      setSelectedRole(null)
    },
  })

  const roles = rolesData?.roles || []

  const togglePermission = (module: string, action: string) => {
    if (!selectedRole) return
    if (selectedRole.is_system_role) return // Can't edit system roles

    const currentPermissions = editedPermissions || selectedRole.permissions
    const newPermissions = {
      ...currentPermissions,
      [module]: {
        ...currentPermissions[module],
        [action]: !currentPermissions[module]?.[action],
      },
    }

    setEditedPermissions(newPermissions)
  }

  const handleSave = () => {
    if (!selectedRole || !editedPermissions) return

    updateRoleMutation.mutate({
      roleId: selectedRole.id,
      permissions: editedPermissions,
    })
  }

  const handleCancel = () => {
    setEditedPermissions(null)
    setSelectedRole(null)
  }

  const currentPermissions = editedPermissions || selectedRole?.permissions

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-gray-100 rounded" />
  }

  return (
    <div className="space-y-6">
      {/* Role Selection */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Role Permissions</h2>
        <div className="flex gap-2">
          {roles.map((role: Role) => (
            <Button
              key={role.id}
              variant={selectedRole?.id === role.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedRole(role)
                setEditedPermissions(null)
              }}
            >
              {role.name}
              {role.is_system_role && (
                <LockIcon className="ml-2 w-3 h-3" />
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Permission Matrix */}
      {selectedRole && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedRole.name}</h3>
                <p className="text-sm text-gray-600">{selectedRole.description}</p>
                {selectedRole.is_system_role && (
                  <Badge variant="secondary" className="mt-1">
                    System Role (Read Only)
                  </Badge>
                )}
              </div>
              {editedPermissions && !selectedRole.is_system_role && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateRoleMutation.isPending}
                  >
                    <SaveIcon className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </div>

          {updateRoleMutation.isError && (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>
                {updateRoleMutation.error instanceof Error
                  ? updateRoleMutation.error.message
                  : 'Failed to update role'}
              </AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Module</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead className="text-center w-24">Enabled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(PERMISSION_CATEGORIES).map(([categoryName, category]) => (
                <>
                  {category.permissions.map((permission, idx) => (
                    <TableRow key={`${category.module}-${permission.key}`}>
                      {idx === 0 && (
                        <TableCell
                          rowSpan={category.permissions.length}
                          className="font-medium bg-gray-50"
                        >
                          {categoryName}
                        </TableCell>
                      )}
                      <TableCell className="text-sm text-gray-600">
                        {permission.label}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={currentPermissions?.[category.module]?.[permission.key] || false}
                          onCheckedChange={() => togglePermission(category.module, permission.key)}
                          disabled={selectedRole.is_system_role}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!selectedRole && (
        <div className="text-center py-12 text-gray-500">
          <ShieldCheckIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>Select a role to view and edit permissions</p>
        </div>
      )}
    </div>
  )
}
```

**Testing Checklist**:
- [ ] System roles cannot be edited or deleted
- [ ] Custom roles can be created with any permission combination
- [ ] Permission checks execute in <50ms for 100+ simultaneous users
- [ ] RLS policies prevent data leakage across companies
- [ ] User with no role assignments has zero access
- [ ] Field worker cannot see financial data
- [ ] Client cannot edit anything
- [ ] Subcontractor only sees assigned tasks
- [ ] Role changes take effect immediately (no cache issues)
- [ ] Circular permission dependencies handled gracefully
- [ ] Permission matrix UI updates in real-time
- [ ] Expired role assignments are automatically disabled

**Success Metrics**:
- Permission check latency: <50ms (p95)
- Zero permission-related security incidents
- 100% of companies use at least 3 different roles
- Average 5-7 roles per company

---

### 1.2 Critical Feature: Comprehensive Audit Logging

**Standard**: EVERY data modification MUST be logged with who, what, when, why. Critical actions (budget changes >$5K, deletions, permission changes) MUST require approval or additional verification. Audit logs MUST be immutable and retained for 7+ years.

**Why It Matters**: Audit trails prevent fraud and resolve disputes. Example: Project manager claims they didn't approve $15K change order. Audit log shows their IP address, device, timestamp, and digital signature. Dispute resolved in 30 seconds.

**Database Schema**:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Who
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_name VARCHAR(255) NOT NULL, -- Denormalized for historical record
  user_email VARCHAR(255) NOT NULL,
  user_role VARCHAR(100), -- Role at time of action

  -- When
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- What
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'export'
  entity_type TEXT NOT NULL, -- 'project', 'task', 'expense', 'quote', 'user', etc.
  entity_id UUID,
  entity_name TEXT, -- Human-readable entity identifier

  -- Details
  old_values JSONB, -- State before change
  new_values JSONB, -- State after change
  changes JSONB, -- Computed diff (what actually changed)

  -- Context
  reason TEXT, -- Optional: why was this change made?
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  request_id UUID, -- For tracing related actions

  -- Classification
  is_critical BOOLEAN DEFAULT false, -- Requires special attention
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approval_reason TEXT,

  -- Compliance
  retention_period INTERVAL DEFAULT INTERVAL '7 years',
  can_be_deleted BOOLEAN DEFAULT false -- GDPR right to be forgotten exception
);

-- Indexes for fast querying
CREATE INDEX idx_audit_company_time ON audit_logs(company_id, timestamp DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, timestamp DESC);
CREATE INDEX idx_audit_critical ON audit_logs(company_id, is_critical, timestamp DESC) WHERE is_critical = true;
CREATE INDEX idx_audit_pending_approval ON audit_logs(company_id, requires_approval) WHERE requires_approval = true AND approved_by IS NULL;

-- Partition by month for performance (optional but recommended)
-- CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- RLS Policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view audit logs for their company
CREATE POLICY "Users can view company audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
    -- Only admins can see all logs, others see logs for entities they can access
    AND (
      company_id IN (
        SELECT ur.company_id FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
        AND r.permissions->>'users'->>'view' = 'true'
      )
      OR user_id = auth.uid() -- Can always see own actions
    )
  );

-- Prevent deletion or modification of audit logs
CREATE POLICY "Audit logs are immutable"
  ON audit_logs FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Audit logs cannot be deleted"
  ON audit_logs FOR DELETE
  TO authenticated
  USING (
    can_be_deleted = true -- Only if explicitly marked (GDPR compliance)
    AND company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'settings'->>'edit' = 'true'
    )
  );

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_company_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_user_info RECORD;
  v_changes JSONB;
  v_is_critical BOOLEAN;
BEGIN
  -- Get user info
  SELECT
    up.name,
    up.email,
    r.name AS role_name
  INTO v_user_info
  FROM user_profiles up
  LEFT JOIN user_roles ur ON ur.user_id = up.id AND ur.company_id = p_company_id
  LEFT JOIN roles r ON r.id = ur.role_id
  WHERE up.id = p_user_id
  LIMIT 1;

  -- Compute changes (diff between old and new)
  IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
    SELECT jsonb_object_agg(key, value)
    INTO v_changes
    FROM (
      SELECT key, value
      FROM jsonb_each(p_new_values)
      WHERE value IS DISTINCT FROM p_old_values->key
    ) changes;
  END IF;

  -- Determine if critical
  v_is_critical := (
    p_action = 'delete'
    OR p_entity_type IN ('user', 'role', 'company')
    OR (p_entity_type = 'project' AND p_action = 'delete')
    OR (p_entity_type = 'expense' AND (p_new_values->>'amount')::numeric > 5000)
  );

  -- Insert audit log
  INSERT INTO audit_logs (
    company_id,
    user_id,
    user_name,
    user_email,
    user_role,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    changes,
    reason,
    is_critical,
    ip_address,
    user_agent
  ) VALUES (
    p_company_id,
    p_user_id,
    v_user_info.name,
    v_user_info.email,
    v_user_info.role_name,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    v_changes,
    p_reason,
    v_is_critical,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically log project changes
CREATE OR REPLACE FUNCTION log_project_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM create_audit_log(
      auth.uid(),
      OLD.company_id,
      'delete',
      'project',
      OLD.id,
      row_to_json(OLD)::jsonb,
      NULL
    );
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM create_audit_log(
      auth.uid(),
      NEW.company_id,
      'update',
      'project',
      NEW.id,
      row_to_json(OLD)::jsonb,
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    PERFORM create_audit_log(
      auth.uid(),
      NEW.company_id,
      'create',
      'project',
      NEW.id,
      NULL,
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION log_project_changes();

-- Similar triggers for other critical tables (tasks, expenses, quotes, etc.)
```

**API Implementation**:
```typescript
// app/api/audit-logs/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(req.url)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    // Parse filters
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')
    const userId = searchParams.get('user_id')
    const action = searchParams.get('action')
    const criticalOnly = searchParams.get('critical') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (entityId) {
      query = query.eq('entity_id', entityId)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (action) {
      query = query.eq('action', action)
    }

    if (criticalOnly) {
      query = query.eq('is_critical', true)
    }

    const { data: logs, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      logs,
      pagination: {
        total: count,
        limit,
        offset,
      },
    })

  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Export audit logs (CSV or PDF)
export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { format, filters } = await req.json()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    // Check permission
    const { data: hasPermission } = await supabase
      .rpc('user_has_permission', {
        p_user_id: user.id,
        p_company_id: profile.company_id,
        p_permission_path: 'users.view'
      })

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to export audit logs' },
        { status: 403 }
      )
    }

    // Get all logs matching filters (no pagination for export)
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('timestamp', { ascending: false })

    // Apply filters...
    const { data: logs, error } = await query

    if (error) throw error

    // Log the export action
    await supabase.rpc('create_audit_log', {
      p_user_id: user.id,
      p_company_id: profile.company_id,
      p_action: 'export',
      p_entity_type: 'audit_logs',
      p_entity_id: null,
      p_reason: `Exported ${logs.length} audit log entries as ${format}`
    })

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(logs)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`,
        },
      })
    } else if (format === 'pdf') {
      // Generate PDF (using a library like pdfkit or puppeteer)
      const pdf = await generateAuditLogPDF(logs)
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString()}.pdf"`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })

  } catch (error) {
    console.error('Error exporting audit logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function convertToCSV(logs: any[]): string {
  const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Changes', 'IP Address']
  const rows = logs.map(log => [
    log.timestamp,
    `${log.user_name} (${log.user_email})`,
    log.action,
    log.entity_type,
    log.entity_id || '',
    JSON.stringify(log.changes || {}),
    log.ip_address || '',
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n')
}

async function generateAuditLogPDF(logs: any[]): Promise<Buffer> {
  // Implement PDF generation
  // This is a placeholder
  throw new Error('PDF generation not implemented')
}
```

**UI Implementation**:
```typescript
// components/teams/AuditLogViewer.tsx

'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileTextIcon,
  DownloadIcon,
  AlertTriangleIcon,
  EyeIcon,
  SearchIcon,
  FilterIcon,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface AuditLog {
  id: string
  timestamp: string
  user_name: string
  user_email: string
  user_role: string
  action: string
  entity_type: string
  entity_id: string
  entity_name: string
  old_values: any
  new_values: any
  changes: any
  reason: string
  ip_address: string
  is_critical: boolean
}

export function AuditLogViewer() {
  const [search, setSearch] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [page, setPage] = useState(0)
  const limit = 50

  // Fetch audit logs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', entityTypeFilter, actionFilter, criticalOnly, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      })

      if (entityTypeFilter !== 'all') {
        params.append('entity_type', entityTypeFilter)
      }

      if (actionFilter !== 'all') {
        params.append('action', actionFilter)
      }

      if (criticalOnly) {
        params.append('critical', 'true')
      }

      const res = await fetch(`/api/audit-logs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch audit logs')
      return res.json()
    },
  })

  const logs = data?.logs || []
  const totalLogs = data?.pagination?.total || 0
  const totalPages = Math.ceil(totalLogs / limit)

  // Filter logs by search term
  const filteredLogs = logs.filter((log: AuditLog) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      log.user_name.toLowerCase().includes(searchLower) ||
      log.user_email.toLowerCase().includes(searchLower) ||
      log.entity_type.toLowerCase().includes(searchLower) ||
      log.entity_name?.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower)
    )
  })

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const res = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          filters: {
            entity_type: entityTypeFilter !== 'all' ? entityTypeFilter : null,
            action: actionFilter !== 'all' ? actionFilter : null,
            critical: criticalOnly || null,
          },
        }),
      })

      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString()}.${format}`
      a.click()
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const getActionBadge = (action: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      create: 'default',
      update: 'secondary',
      delete: 'destructive',
      view: 'secondary',
      export: 'default',
    }

    return (
      <Badge variant={variants[action] || 'secondary'}>
        {action.toUpperCase()}
      </Badge>
    )
  }

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-gray-100 rounded" />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
          <p className="text-sm text-gray-600">
            Complete history of all actions in your account
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-4 gap-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
          <SelectTrigger>
            <FilterIcon className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="project">Projects</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
            <SelectItem value="expense">Expenses</SelectItem>
            <SelectItem value="quote">Quotes</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="role">Roles</SelectItem>
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger>
            <FilterIcon className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="view">View</SelectItem>
            <SelectItem value="export">Export</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={criticalOnly ? 'default' : 'outline'}
          onClick={() => setCriticalOnly(!criticalOnly)}
        >
          <AlertTriangleIcon className="w-4 h-4 mr-2" />
          Critical Only
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900">{totalLogs}</div>
          <div className="text-sm text-gray-600">Total Entries</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900">
            {logs.filter((l: AuditLog) => l.is_critical).length}
          </div>
          <div className="text-sm text-gray-600">Critical Actions</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900">
            {new Set(logs.map((l: AuditLog) => l.user_id)).size}
          </div>
          <div className="text-sm text-gray-600">Active Users</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900">
            {new Set(logs.map((l: AuditLog) => new Date(l.timestamp).toDateString())).size}
          </div>
          <div className="text-sm text-gray-600">Active Days</div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log: AuditLog) => (
                <TableRow
                  key={log.id}
                  className={cn(
                    'cursor-pointer hover:bg-gray-50',
                    log.is_critical && 'bg-red-50 hover:bg-red-100'
                  )}
                  onClick={() => setSelectedLog(log)}
                >
                  <TableCell className="font-mono text-xs">
                    <div>{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</div>
                    <div className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{log.user_name}</div>
                    <div className="text-xs text-gray-500">{log.user_role}</div>
                  </TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{log.entity_type}</div>
                    <div className="text-xs text-gray-500">{log.entity_name}</div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    {log.reason && (
                      <div className="text-sm text-gray-600 truncate">{log.reason}</div>
                    )}
                    {log.changes && Object.keys(log.changes).length > 0 && (
                      <div className="text-xs text-gray-500">
                        Changed: {Object.keys(log.changes).join(', ')}
                      </div>
                    )}
                    {log.is_critical && (
                      <Badge variant="destructive" className="mt-1">
                        <AlertTriangleIcon className="w-3 h-3 mr-1" />
                        Critical
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <EyeIcon className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {page * limit + 1} to {Math.min((page + 1) * limit, totalLogs)} of {totalLogs}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Timestamp</div>
                    <div className="text-sm text-gray-900">
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">User</div>
                    <div className="text-sm text-gray-900">
                      {selectedLog.user_name} ({selectedLog.user_email})
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Action</div>
                    <div className="text-sm text-gray-900">{selectedLog.action}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Entity</div>
                    <div className="text-sm text-gray-900">
                      {selectedLog.entity_type} ({selectedLog.entity_id})
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">IP Address</div>
                    <div className="text-sm text-gray-900 font-mono">{selectedLog.ip_address}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Role</div>
                    <div className="text-sm text-gray-900">{selectedLog.user_role}</div>
                  </div>
                </div>

                {selectedLog.reason && (
                  <div>
                    <div className="text-sm font-medium text-gray-700">Reason</div>
                    <div className="text-sm text-gray-900">{selectedLog.reason}</div>
                  </div>
                )}

                {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Changes</div>
                    <div className="bg-gray-50 rounded p-3 space-y-2">
                      {Object.entries(selectedLog.changes).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <div className="text-sm font-medium text-gray-700 min-w-32">{key}:</div>
                          <div className="flex-1">
                            <div className="text-sm text-red-600 line-through">
                              {JSON.stringify(selectedLog.old_values?.[key])}
                            </div>
                            <div className="text-sm text-green-600">
                              {JSON.stringify(value)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Full Data</div>
                  <pre className="bg-gray-900 text-gray-100 rounded p-3 overflow-x-auto text-xs">
                    {JSON.stringify(selectedLog, null, 2)}
                  </pre>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

**Testing Checklist**:
- [ ] Every create/update/delete action creates audit log
- [ ] Audit logs capture IP address and user agent
- [ ] Changes are computed as diff (only modified fields)
- [ ] Critical actions are flagged automatically
- [ ] Budget changes >$5K require approval
- [ ] Audit logs cannot be edited or deleted (except GDPR)
- [ ] Historical user data preserved even if user deleted
- [ ] Query performance <100ms for 1M+ log entries
- [ ] Export to CSV works for >10K entries
- [ ] Export to PDF includes company branding
- [ ] Audit log retention policy enforced (7 years)
- [ ] Sensitive data (passwords) never logged

**Success Metrics**:
- 100% of critical actions logged
- Audit log query time: <100ms (p95)
- Zero audit log data loss
- Average 500-1000 log entries per company per month

---

### 1.3 Critical Feature: Team Onboarding & Invitation System

**Standard**: New team members MUST be onboarded in <5 minutes. Invitation emails MUST be sent within 30 seconds. Role assignment MUST take effect immediately with zero cache delay.

**Why It Matters**: Slow onboarding = lost productivity. Example: New superintendent starts Monday 7 AM. If account isn't ready, they can't access project info, can't update tasks, can't log time. Company loses $400/day (8 hours × $50/hr).

**Database Schema**:
```sql
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Invitation details
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role_id UUID NOT NULL REFERENCES roles(id),

  -- Project assignments
  project_ids UUID[], -- Projects to assign upon acceptance

  -- Custom permissions (override role defaults)
  custom_permissions JSONB DEFAULT NULL,

  -- Invitation status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'revoked'
  token VARCHAR(255) UNIQUE NOT NULL, -- Secure random token for invitation link

  -- Onboarding settings
  show_tutorial BOOLEAN DEFAULT true,
  onboarding_buddy_id UUID REFERENCES auth.users(id), -- Assign mentor
  welcome_message TEXT,

  -- Metadata
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),

  -- Constraints
  CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  CHECK (expires_at > invited_at)
);

CREATE INDEX idx_invitations_company ON team_invitations(company_id);
CREATE INDEX idx_invitations_email ON team_invitations(email);
CREATE INDEX idx_invitations_token ON team_invitations(token);
CREATE INDEX idx_invitations_status ON team_invitations(company_id, status);

-- RLS Policies
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations in their company
CREATE POLICY "Users can view company invitations"
  ON team_invitations FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Only users with invite permission can create invitations
CREATE POLICY "Authorized users can create invitations"
  ON team_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'users'->>'invite' = 'true'
    )
  );

-- Only inviter or admin can revoke
CREATE POLICY "Authorized users can revoke invitations"
  ON team_invitations FOR UPDATE
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'users'->>'edit' = 'true'
    )
  );

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE team_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Run this function periodically via cron
-- SELECT cron.schedule('expire-invitations', '0 * * * *', $$SELECT expire_old_invitations()$$);
```

**API Implementation**:
```typescript
// app/api/team/invitations/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendInvitationEmail } from '@/lib/email'
import crypto from 'crypto'

const createInvitationSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role_id: z.string().uuid(),
  project_ids: z.array(z.string().uuid()).optional().default([]),
  custom_permissions: z.any().optional(),
  show_tutorial: z.boolean().optional().default(true),
  onboarding_buddy_id: z.string().uuid().optional(),
  welcome_message: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await req.json()

    // Validate input
    const validatedData = createInvitationSchema.parse(body)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, name, company:companies(name)')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    // Check if user has permission to invite
    const { data: hasPermission } = await supabase
      .rpc('user_has_permission', {
        p_user_id: user.id,
        p_company_id: profile.company_id,
        p_permission_path: 'users.invite'
      })

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to invite team members' },
        { status: 403 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, company_id')
      .eq('email', validatedData.email)
      .single()

    if (existingUser) {
      if (existingUser.company_id === profile.company_id) {
        return NextResponse.json(
          { error: 'This user is already a member of your company' },
          { status: 400 }
        )
      }
      // User exists but in different company - they can accept invite to join this one too
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('id, status')
      .eq('company_id', profile.company_id)
      .eq('email', validatedData.email)
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      return NextResponse.json(
        { error: 'A pending invitation already exists for this email' },
        { status: 400 }
      )
    }

    // Verify role exists
    const { data: role } = await supabase
      .from('roles')
      .select('id, name')
      .eq('id', validatedData.role_id)
      .or(`company_id.eq.${profile.company_id},is_system_role.eq.true`)
      .single()

    if (!role) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex')

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert({
        company_id: profile.company_id,
        email: validatedData.email,
        name: validatedData.name,
        role_id: validatedData.role_id,
        project_ids: validatedData.project_ids,
        custom_permissions: validatedData.custom_permissions,
        show_tutorial: validatedData.show_tutorial,
        onboarding_buddy_id: validatedData.onboarding_buddy_id,
        welcome_message: validatedData.welcome_message,
        token,
        invited_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Send invitation email
    await sendInvitationEmail({
      to: validatedData.email,
      name: validatedData.name || validatedData.email,
      inviterName: profile.name,
      companyName: profile.company.name,
      roleName: role.name,
      token,
      expiresIn: 7, // days
    })

    // Log activity
    await supabase.from('activity_logs').insert({
      company_id: profile.company_id,
      user_id: user.id,
      action: 'invitation_sent',
      entity_type: 'team_invitation',
      entity_id: invitation.id,
      metadata: {
        email: validatedData.email,
        role: role.name,
      },
    })

    return NextResponse.json({ invitation }, { status: 201 })

  } catch (error) {
    console.error('Error creating invitation:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    // Get all invitations
    const { data: invitations, error } = await supabase
      .from('team_invitations')
      .select(`
        *,
        role:roles(id, name),
        inviter:user_profiles!team_invitations_invited_by_fkey(id, name, avatar_url)
      `)
      .eq('company_id', profile.company_id)
      .order('invited_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ invitations })

  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/team/invitations/[token]/accept/route.ts
export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('token', params.token)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
    }

    // Validate invitation
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `Invitation has been ${invitation.status}` },
        { status: 400 }
      )
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    if (invitation.email !== user.email) {
      return NextResponse.json(
        { error: 'Invitation is for a different email address' },
        { status: 400 }
      )
    }

    // Update user's company
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ company_id: invitation.company_id })
      .eq('id', user.id)

    if (profileError) throw profileError

    // Assign role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role_id: invitation.role_id,
        company_id: invitation.company_id,
        project_ids: invitation.project_ids,
        assigned_by: invitation.invited_by,
      })

    if (roleError) throw roleError

    // Assign to projects
    if (invitation.project_ids && invitation.project_ids.length > 0) {
      const projectAssignments = invitation.project_ids.map(projectId => ({
        project_id: projectId,
        user_id: user.id,
        company_id: invitation.company_id,
        project_role: 'worker', // Default role
        added_by: invitation.invited_by,
      }))

      const { error: projectError } = await supabase
        .from('project_team_members')
        .insert(projectAssignments)

      if (projectError) throw projectError
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('team_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: user.id,
      })
      .eq('id', invitation.id)

    if (updateError) throw updateError

    // Log activity
    await supabase.from('activity_logs').insert({
      company_id: invitation.company_id,
      user_id: user.id,
      action: 'invitation_accepted',
      entity_type: 'team_invitation',
      entity_id: invitation.id,
      metadata: {
        email: invitation.email,
      },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**UI Implementation**:
```typescript
// components/teams/InviteTeamMemberModal.tsx

'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserPlusIcon, CheckCircleIcon } from 'lucide-react'

interface InviteTeamMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteTeamMemberModal({
  open,
  onOpenChange,
}: InviteTeamMemberModalProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [roleId, setRoleId] = useState('')
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [showTutorial, setShowTutorial] = useState(true)
  const [welcomeMessage, setWelcomeMessage] = useState('')

  const queryClient = useQueryClient()

  // Fetch roles
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await fetch('/api/roles')
      if (!res.ok) throw new Error('Failed to fetch roles')
      return res.json()
    },
  })

  // Fetch projects
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error('Failed to fetch projects')
      return res.json()
    },
  })

  // Create invitation mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/team/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to send invitation')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] })
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      onOpenChange(false)
      resetForm()
    },
  })

  const resetForm = () => {
    setEmail('')
    setName('')
    setRoleId('')
    setSelectedProjects([])
    setShowTutorial(true)
    setWelcomeMessage('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    inviteMutation.mutate({
      email,
      name: name || undefined,
      role_id: roleId,
      project_ids: selectedProjects,
      show_tutorial: showTutorial,
      welcome_message: welcomeMessage || undefined,
    })
  }

  const roles = rolesData?.roles || []
  const projects = projectsData?.projects || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your construction team
          </DialogDescription>
        </DialogHeader>

        {inviteMutation.isSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircleIcon className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Invitation sent successfully! They will receive an email with instructions.
            </AlertDescription>
          </Alert>
        )}

        {inviteMutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {inviteMutation.error instanceof Error
                ? inviteMutation.error.message
                : 'Failed to send invitation'}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.davis@example.com"
              required
            />
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Davis"
            />
          </div>

          {/* Role */}
          <div>
            <Label htmlFor="role">Role *</Label>
            <Select value={roleId} onValueChange={setRoleId} required>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role: any) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project Assignments */}
          <div>
            <Label>Assign to Projects (Optional)</Label>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {projects.map((project: any) => (
                <div key={project.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={project.id}
                    checked={selectedProjects.includes(project.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedProjects([...selectedProjects, project.id])
                      } else {
                        setSelectedProjects(selectedProjects.filter(id => id !== project.id))
                      }
                    }}
                  />
                  <label
                    htmlFor={project.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {project.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Welcome Message */}
          <div>
            <Label htmlFor="welcomeMessage">Welcome Message (Optional)</Label>
            <Textarea
              id="welcomeMessage"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Welcome to the team! Looking forward to working with you."
              rows={3}
            />
          </div>

          {/* Show Tutorial */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showTutorial"
              checked={showTutorial}
              onCheckedChange={(checked) => setShowTutorial(checked as boolean)}
            />
            <label
              htmlFor="showTutorial"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Show tutorial on first login
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={inviteMutation.isPending || !email || !roleId}
            >
              <UserPlusIcon className="w-4 h-4 mr-2" />
              {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Testing Checklist**:
- [ ] Invitation email sent within 30 seconds
- [ ] Invitation link expires after 7 days
- [ ] Cannot accept invitation for different email
- [ ] Duplicate invitations prevented
- [ ] Role assigned immediately upon acceptance
- [ ] Project assignments created upon acceptance
- [ ] Tutorial shown on first login if enabled
- [ ] Revoked invitations cannot be accepted
- [ ] Expired invitations show clear error message
- [ ] Email validation prevents typos
- [ ] Can resend invitation if not accepted
- [ ] Invitation list shows pending/accepted status

**Success Metrics**:
- Average onboarding time: <5 minutes
- Invitation acceptance rate: >80%
- Email delivery success: >99%
- Zero failed role assignments

---

## 2. USER EXPERIENCE QUALITY STANDARDS

### 2.1 Loading States
- Role list: Skeleton loaders for 3 rows minimum
- Permission matrix: Shimmer effect while loading
- Audit logs: Progressive loading with infinite scroll
- Team directory: Optimistic UI updates (instant feedback)

### 2.2 Empty States
- No team members: Prominent "Invite Team Member" CTA
- No audit logs: Helpful message explaining what will appear
- No custom roles: Suggest creating first custom role
- Pending invitations: Show count with quick resend action

### 2.3 Error States
- Permission denied: Clear explanation of required role
- Invitation failed: Specific error (email already used, etc.)
- Role assignment failed: Retry button with exponential backoff
- Audit log export failed: Download partial results option

### 2.4 Mobile Optimization
- Team directory: Card layout on mobile
- Permission matrix: Horizontal scroll with sticky headers
- Audit logs: Simplified mobile view (hide less important columns)
- Invite flow: Single-column form on mobile

### 2.5 Keyboard Navigation
- Tab through all form fields
- Arrow keys to navigate role list
- Enter to submit forms
- Escape to close modals
- Ctrl+F to search audit logs

### 2.6 Accessibility
- ARIA labels on all interactive elements
- Screen reader announcements for role changes
- High contrast mode support
- Focus indicators on all clickable items
- Alt text for user avatars

---

## 3. PERFORMANCE REQUIREMENTS

### 3.1 Response Time Targets
- Permission check: <50ms (p95)
- Role list load: <200ms (p95)
- Audit log query: <100ms for 10K entries (p95)
- Team directory: <300ms (p95)
- Invitation send: <2 seconds including email

### 3.2 Optimization Strategies
- Cache user permissions in Redis (5 min TTL)
- Materialize role permission lookups
- Index audit logs by company_id + timestamp
- Lazy load team member avatars
- Debounce audit log search (300ms)

### 3.3 Caching Strategy
- User roles: Cache in session storage
- Permission matrix: Cache for current user
- Audit logs: No caching (must be real-time)
- Role definitions: Cache globally (1 hour)
- Team directory: Stale-while-revalidate

---

## 4. SECURITY REQUIREMENTS

### 4.1 Authentication & Authorization
- Every API endpoint checks auth.uid()
- RLS policies on ALL tables
- Permission checks before data modification
- Session token rotation every 24 hours

### 4.2 Data Validation
- Zod schemas for all API inputs
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitize HTML in audit logs)
- CSRF tokens on all mutations

### 4.3 Audit Logging
- Log all permission changes
- Log all role modifications
- Log all user invitations
- Log all security events (failed logins, etc.)

### 4.4 Compliance
- GDPR: Right to be forgotten (mark audit logs deletable)
- SOC 2: Immutable audit trail
- HIPAA: Encrypt sensitive fields
- CCPA: Data export functionality

---

## 5. PRE-LAUNCH CHECKLIST

### 5.1 Role System
- [ ] All 7 system roles created with correct permissions
- [ ] Custom roles can be created/edited/deleted
- [ ] Permission matrix UI displays all modules
- [ ] Role changes take effect immediately
- [ ] Cannot delete role assigned to users

### 5.2 Audit Logging
- [ ] All CRUD operations logged automatically
- [ ] Critical actions flagged correctly
- [ ] Audit log viewer shows all relevant data
- [ ] Export to CSV works for 10K+ entries
- [ ] Cannot edit or delete audit logs (except GDPR)

### 5.3 Team Management
- [ ] Invitation emails sent successfully
- [ ] Invitation acceptance flow works
- [ ] Role assignments persist
- [ ] Project assignments created
- [ ] Team directory shows all members

### 5.4 Performance
- [ ] Permission checks <50ms (p95)
- [ ] Audit log queries <100ms for 10K entries
- [ ] Team directory loads <300ms
- [ ] No N+1 queries in team list

### 5.5 Security
- [ ] RLS policies prevent cross-company data access
- [ ] Permission checks prevent unauthorized actions
- [ ] Invitation tokens are cryptographically secure
- [ ] Passwords never logged in audit trail

---

## 6. SUCCESS METRICS

### 6.1 Adoption Metrics
- 100% of companies have at least 2 team members
- Average 5-7 roles per company (custom + system)
- 80%+ of companies use audit logs monthly
- 90%+ invitation acceptance rate

### 6.2 Performance Metrics
- Permission check latency: <50ms (p95)
- Audit log query time: <100ms (p95)
- Team directory load: <300ms (p95)
- Zero permission-related security incidents

### 6.3 Quality Metrics
- 0 data leakage incidents
- <0.1% invitation delivery failures
- <5% of invitations expire before acceptance
- 100% of critical actions logged

---

## 7. COMPETITIVE EDGE

### 7.1 vs Procore
- **Procore**: Complex RBAC setup, requires training
- **Us**: Pre-built construction roles, 5-minute onboarding
- **Win**: "Our superintendent was productive in 5 minutes, not 5 days"

### 7.2 vs Buildertrend
- **Buildertrend**: Limited audit trail, no custom roles
- **Us**: Comprehensive audit logs, unlimited custom roles
- **Win**: "Every action is logged, perfect for dispute resolution"

### 7.3 vs Monday.com
- **Monday**: Generic permissions, not construction-specific
- **Us**: Field worker, Superintendent, Subcontractor roles built-in
- **Win**: "Roles that match how construction actually works"

---

**Teams & RBAC SUMMARY**: This module is the security and scalability foundation. Without proper permissions, companies cannot grow beyond 5 people. With comprehensive audit logs, disputes are resolved in seconds instead of weeks. The 5-minute onboarding gets new team members productive immediately, not days later.
