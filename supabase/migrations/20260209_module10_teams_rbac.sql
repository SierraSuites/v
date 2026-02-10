-- ============================================
-- MODULE 10: TEAMS & RBAC - DATABASE SCHEMA
-- ============================================
-- Created: February 9, 2026
-- Purpose: Complete role-based access control system
-- Quality Target: 98%+ production-ready
--
-- Features:
-- - 7 built-in construction-specific roles
-- - Custom role creation
-- - Granular permissions (30+ permission points)
-- - Row-level security
-- - Comprehensive audit logging
-- - Multi-company isolation
-- - Project-level role overrides
-- ============================================

BEGIN;

-- ============================================
-- TABLE: custom_roles
-- Stores both system roles and company-custom roles
-- ============================================

CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Role Identity
  role_name VARCHAR(100) NOT NULL,
  role_slug VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) NOT NULL DEFAULT '#6B7280', -- Hex color for UI
  icon VARCHAR(10) DEFAULT '👤', -- Emoji icon

  -- Permissions (JSONB for flexibility)
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* Permission structure (30 permissions total):
  {
    "canViewAllProjects": boolean,
    "canEditProjects": boolean,
    "canDeleteProjects": boolean,
    "canCreateProjects": boolean,
    "canManageTeam": boolean,
    "canInviteMembers": boolean,
    "canRemoveMembers": boolean,
    "canChangeRoles": boolean,
    "canViewAllPhotos": boolean,
    "canUploadPhotos": boolean,
    "canDeletePhotos": boolean,
    "canSharePhotos": boolean,
    "canEditPhotoMetadata": boolean,
    "canViewAnalytics": boolean,
    "canExportData": boolean,
    "canViewReports": boolean,
    "canManageAI": boolean,
    "canRunAIAnalysis": boolean,
    "canViewAIInsights": boolean,
    "canManageTasks": boolean,
    "canAssignTasks": boolean,
    "canViewAllTasks": boolean,
    "canManagePunchList": boolean,
    "canResolvePunchItems": boolean,
    "canViewPunchList": boolean,
    "canManageFinances": boolean,
    "canApproveExpenses": boolean,
    "canViewFinancials": boolean,
    "canUploadDocuments": boolean,
    "canDeleteDocuments": boolean,
    "canShareDocuments": boolean,
    "canManageCompanySettings": boolean,
    "canManageIntegrations": boolean
  }
  */

  -- System Role Flag
  is_active BOOLEAN DEFAULT true,
  is_system_role BOOLEAN DEFAULT false, -- Cannot be edited/deleted if true

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  UNIQUE(company_id, role_slug),
  CHECK (role_name != ''),
  CHECK (LENGTH(color) = 7 AND color ~ '^#[0-9A-Fa-f]{6}$'), -- Valid hex color
  CHECK (is_system_role = false OR company_id IS NULL) -- System roles have no company
);

-- Indexes for performance
CREATE INDEX idx_custom_roles_company ON custom_roles(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_custom_roles_slug ON custom_roles(company_id, role_slug);
CREATE INDEX idx_custom_roles_active ON custom_roles(company_id, is_active) WHERE is_active = true;

-- ============================================
-- TABLE: user_role_assignments
-- Assigns roles to users (many-to-many)
-- ============================================

CREATE TABLE IF NOT EXISTS user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Optional Scope Limitation
  project_ids UUID[], -- NULL = all projects, array = specific projects only

  -- Temporary Assignments
  expires_at TIMESTAMPTZ, -- NULL = permanent, otherwise auto-expires

  -- Assignment Tracking
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assignment_reason TEXT,

  -- Constraints
  UNIQUE(user_id, role_id, company_id),
  CHECK (project_ids IS NULL OR array_length(project_ids, 1) > 0) -- If set, must have at least 1 project
);

-- Indexes
CREATE INDEX idx_user_role_assignments_user ON user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_role ON user_role_assignments(role_id);
CREATE INDEX idx_user_role_assignments_company ON user_role_assignments(company_id);
CREATE INDEX idx_user_role_assignments_expires ON user_role_assignments(expires_at)
  WHERE expires_at IS NOT NULL AND expires_at > NOW();

-- ============================================
-- TABLE: project_team_members
-- Project-specific role assignments with overrides
-- ============================================

CREATE TABLE IF NOT EXISTS project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Project-Specific Role
  project_role TEXT, -- 'manager', 'superintendent', 'worker', 'observer'

  -- Optional Permission Overrides (overrides global role for this project)
  custom_permissions JSONB DEFAULT NULL, -- NULL = use role permissions

  -- Metadata
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),

  UNIQUE(project_id, user_id)
);

-- Indexes
CREATE INDEX idx_project_team_members_project ON project_team_members(project_id);
CREATE INDEX idx_project_team_members_user ON project_team_members(user_id);
CREATE INDEX idx_project_team_members_company ON project_team_members(company_id);

-- ============================================
-- TABLE: audit_logs
-- Immutable audit trail for compliance
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Who (Denormalized for historical record)
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_name VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_role VARCHAR(100), -- Role at time of action

  -- When
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- What
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'export', 'approve'
  entity_type TEXT NOT NULL, -- 'project', 'task', 'expense', 'quote', 'user', 'role', etc.
  entity_id UUID,
  entity_name TEXT, -- Human-readable identifier

  -- Details
  old_values JSONB, -- State before change
  new_values JSONB, -- State after change
  changes JSONB, -- Computed diff (what actually changed)

  -- Context
  reason TEXT, -- Why was this change made?
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  request_id UUID, -- For tracing related actions

  -- Classification
  is_critical BOOLEAN DEFAULT false, -- Budget changes, deletions, permission changes
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approval_reason TEXT,

  -- Compliance
  retention_period INTERVAL DEFAULT INTERVAL '7 years',
  can_be_deleted BOOLEAN DEFAULT false, -- GDPR right to be forgotten exception

  -- Constraints
  CHECK (action IN ('create', 'update', 'delete', 'view', 'export', 'approve', 'reject')),
  CHECK (entity_type != ''),
  CHECK (requires_approval = false OR (approved_by IS NOT NULL AND approved_at IS NOT NULL) OR approved_by IS NULL)
);

-- Indexes for fast querying
CREATE INDEX idx_audit_logs_company_time ON audit_logs(company_id, timestamp DESC);
CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, timestamp DESC);
CREATE INDEX idx_audit_logs_critical ON audit_logs(company_id, is_critical, timestamp DESC)
  WHERE is_critical = true;
CREATE INDEX idx_audit_logs_pending_approval ON audit_logs(company_id, requires_approval, timestamp DESC)
  WHERE requires_approval = true AND approved_by IS NULL;

-- ============================================
-- TABLE: team_invitations
-- Track pending team member invitations
-- ============================================

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Invitee Info
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),

  -- Role Assignment
  role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  project_ids UUID[], -- Assign to specific projects

  -- Invitation Details
  invitation_token VARCHAR(255) NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'cancelled'
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id), -- User ID after signup

  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_buddy UUID REFERENCES auth.users(id),

  UNIQUE(company_id, email, status) -- One pending invitation per email per company
  -- Note: status filter prevents duplicate constraint from blocking re-invites after acceptance
);

-- Indexes
CREATE INDEX idx_team_invitations_company ON team_invitations(company_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(invitation_token);
CREATE INDEX idx_team_invitations_status ON team_invitations(company_id, status)
  WHERE status = 'pending';
CREATE INDEX idx_team_invitations_expires ON team_invitations(expires_at)
  WHERE status = 'pending' AND expires_at > NOW();

-- ============================================
-- FUNCTIONS: Permission Checking
-- ============================================

-- Function: Check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_company_id UUID,
  p_permission_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  -- Check if user has this permission through any of their active, non-expired roles
  SELECT EXISTS(
    SELECT 1
    FROM user_role_assignments ura
    JOIN custom_roles cr ON cr.id = ura.role_id
    WHERE ura.user_id = p_user_id
    AND ura.company_id = p_company_id
    AND cr.is_active = true
    AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    AND (cr.permissions->>p_permission_name)::boolean = true
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$;

-- Function: Get user's highest role (for display purposes)
CREATE OR REPLACE FUNCTION get_user_highest_role(
  p_user_id UUID,
  p_company_id UUID DEFAULT NULL
)
RETURNS VARCHAR(100)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role_name VARCHAR(100);
  v_company_id UUID;
BEGIN
  -- If company_id not provided, get user's company
  IF p_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
    FROM user_profiles
    WHERE id = p_user_id
    LIMIT 1;
  ELSE
    v_company_id := p_company_id;
  END IF;

  -- Get highest priority role (using simple hierarchy)
  SELECT cr.role_name INTO v_role_name
  FROM user_role_assignments ura
  JOIN custom_roles cr ON cr.id = ura.role_id
  WHERE ura.user_id = p_user_id
  AND ura.company_id = v_company_id
  AND cr.is_active = true
  AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
  ORDER BY
    CASE cr.role_slug
      WHEN 'admin' THEN 1
      WHEN 'project_manager' THEN 2
      WHEN 'superintendent' THEN 3
      WHEN 'accountant' THEN 4
      WHEN 'field_engineer' THEN 5
      WHEN 'subcontractor' THEN 6
      WHEN 'viewer' THEN 7
      ELSE 8
    END
  LIMIT 1;

  RETURN COALESCE(v_role_name, 'viewer');
END;
$$;

-- Function: Get user's effective permissions (merged from all roles)
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_permissions JSONB := '{}'::jsonb;
  v_role RECORD;
BEGIN
  -- Merge permissions from all user's active roles (OR logic)
  FOR v_role IN
    SELECT cr.permissions
    FROM user_role_assignments ura
    JOIN custom_roles cr ON cr.id = ura.role_id
    WHERE ura.user_id = p_user_id
    AND ura.company_id = p_company_id
    AND cr.is_active = true
    AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
  LOOP
    -- Merge each permission using OR logic
    SELECT jsonb_object_agg(
      key,
      COALESCE((v_permissions->>key)::boolean, false) OR COALESCE((v_role.permissions->>key)::boolean, false)
    )
    INTO v_permissions
    FROM jsonb_object_keys(v_role.permissions) AS key;
  END LOOP;

  RETURN v_permissions;
END;
$$;

-- Function: Create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_company_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_name TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
  v_user_info RECORD;
  v_changes JSONB;
  v_is_critical BOOLEAN := false;
BEGIN
  -- Get user info
  SELECT
    up.name,
    up.email,
    get_user_highest_role(up.id, p_company_id) AS role_name
  INTO v_user_info
  FROM user_profiles up
  WHERE up.id = p_user_id;

  -- Compute diff (changes only)
  IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
    SELECT jsonb_object_agg(key, value)
    INTO v_changes
    FROM jsonb_each(p_new_values)
    WHERE value != COALESCE(p_old_values->key, 'null'::jsonb);
  END IF;

  -- Determine if action is critical
  v_is_critical := (
    p_action = 'delete'
    OR p_entity_type IN ('role', 'user', 'company_settings')
    OR (p_entity_type = 'project' AND p_action = 'update' AND p_changes ? 'estimated_budget')
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
    entity_name,
    old_values,
    new_values,
    changes,
    reason,
    ip_address,
    user_agent,
    is_critical
  )
  VALUES (
    p_company_id,
    p_user_id,
    COALESCE(v_user_info.name, 'Unknown'),
    COALESCE(v_user_info.email, 'unknown@example.com'),
    v_user_info.role_name,
    p_action,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_old_values,
    p_new_values,
    v_changes,
    p_reason,
    p_ip_address,
    p_user_agent,
    v_is_critical
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Function: Get role member count
CREATE OR REPLACE FUNCTION get_role_member_count(
  p_role_id UUID
)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM user_role_assignments
  WHERE role_id = p_role_id
  AND (expires_at IS NULL OR expires_at > NOW());
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_custom_roles_updated_at
  BEFORE UPDATE ON custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-expire team invitations
CREATE OR REPLACE FUNCTION auto_expire_invitations()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update expired pending invitations
  UPDATE team_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();

  RETURN NULL;
END;
$$;

-- Run every hour to clean up expired invitations
-- Note: This trigger fires on INSERT to team_invitations as a convenient hook
-- In production, use pg_cron or external scheduler
CREATE TRIGGER trigger_auto_expire_invitations
  AFTER INSERT ON team_invitations
  FOR EACH STATEMENT
  EXECUTE FUNCTION auto_expire_invitations();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view roles in their company
CREATE POLICY "Users can view company roles"
  ON custom_roles FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_system_role = true -- Everyone can see system roles
    OR company_id IS NULL -- System roles have no company
  );

-- Policy: Only admins can create/edit/delete custom roles
CREATE POLICY "Admins can manage custom roles"
  ON custom_roles FOR ALL
  TO authenticated
  USING (
    user_has_permission(auth.uid(), company_id, 'canManageTeam') = true
  );

-- Policy: Users can view role assignments in their company
CREATE POLICY "Users can view role assignments"
  ON user_role_assignments FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Only admins can manage role assignments
CREATE POLICY "Admins can manage role assignments"
  ON user_role_assignments FOR ALL
  TO authenticated
  USING (
    user_has_permission(auth.uid(), company_id, 'canChangeRoles') = true
  );

-- Policy: Users can view project team members for accessible projects
CREATE POLICY "Users can view project team members"
  ON project_team_members FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE
        company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
        AND (
          user_has_permission(auth.uid(), company_id, 'canViewAllProjects') = true
          OR id IN (SELECT project_id FROM project_team_members WHERE user_id = auth.uid())
        )
    )
  );

-- Policy: Project managers can add/remove team members
CREATE POLICY "Project managers can manage team members"
  ON project_team_members FOR ALL
  TO authenticated
  USING (
    user_has_permission(auth.uid(), company_id, 'canManageTeam') = true
    OR project_id IN (
      SELECT project_id FROM project_team_members
      WHERE user_id = auth.uid()
      AND project_role = 'manager'
    )
  );

-- Policy: Users can view audit logs for their company (admins see all, others see own)
CREATE POLICY "Users can view company audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
    AND (
      user_has_permission(auth.uid(), company_id, 'canViewReports') = true
      OR user_id = auth.uid() -- Can always see own actions
    )
  );

-- Policy: Audit logs are immutable (cannot be updated)
CREATE POLICY "Audit logs are immutable"
  ON audit_logs FOR UPDATE
  TO authenticated
  USING (false);

-- Policy: Audit logs cannot be deleted (except GDPR compliance)
CREATE POLICY "Audit logs cannot be deleted"
  ON audit_logs FOR DELETE
  TO authenticated
  USING (
    can_be_deleted = true
    AND user_has_permission(auth.uid(), company_id, 'canManageCompanySettings') = true
  );

-- Policy: Users can view invitations for their company
CREATE POLICY "Users can view team invitations"
  ON team_invitations FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Only admins can manage invitations
CREATE POLICY "Admins can manage invitations"
  ON team_invitations FOR ALL
  TO authenticated
  USING (
    user_has_permission(auth.uid(), company_id, 'canInviteMembers') = true
  );

-- ============================================
-- SEED DATA: System Roles
-- ============================================

-- Insert 7 construction-specific system roles
INSERT INTO custom_roles (role_name, role_slug, description, color, icon, is_system_role, permissions) VALUES

-- 1. Admin (Owner)
('Admin', 'admin', 'Full system access - company owner', '#7C3AED', '👑', true, '{
  "canViewAllProjects": true,
  "canEditProjects": true,
  "canDeleteProjects": true,
  "canCreateProjects": true,
  "canManageTeam": true,
  "canInviteMembers": true,
  "canRemoveMembers": true,
  "canChangeRoles": true,
  "canViewAllPhotos": true,
  "canUploadPhotos": true,
  "canDeletePhotos": true,
  "canSharePhotos": true,
  "canEditPhotoMetadata": true,
  "canViewAnalytics": true,
  "canExportData": true,
  "canViewReports": true,
  "canManageAI": true,
  "canRunAIAnalysis": true,
  "canViewAIInsights": true,
  "canManageTasks": true,
  "canAssignTasks": true,
  "canViewAllTasks": true,
  "canManagePunchList": true,
  "canResolvePunchItems": true,
  "canViewPunchList": true,
  "canManageFinances": true,
  "canApproveExpenses": true,
  "canViewFinancials": true,
  "canUploadDocuments": true,
  "canDeleteDocuments": true,
  "canShareDocuments": true,
  "canManageCompanySettings": true,
  "canManageIntegrations": true
}'::jsonb),

-- 2. Superintendent
('Superintendent', 'superintendent', 'Oversee field operations and crews', '#1E40AF', '🔧', true, '{
  "canViewAllProjects": false,
  "canEditProjects": false,
  "canDeleteProjects": false,
  "canCreateProjects": false,
  "canManageTeam": false,
  "canInviteMembers": false,
  "canRemoveMembers": false,
  "canChangeRoles": false,
  "canViewAllPhotos": true,
  "canUploadPhotos": true,
  "canDeletePhotos": false,
  "canSharePhotos": true,
  "canEditPhotoMetadata": true,
  "canViewAnalytics": false,
  "canExportData": false,
  "canViewReports": false,
  "canManageAI": false,
  "canRunAIAnalysis": false,
  "canViewAIInsights": false,
  "canManageTasks": true,
  "canAssignTasks": true,
  "canViewAllTasks": true,
  "canManagePunchList": true,
  "canResolvePunchItems": true,
  "canViewPunchList": true,
  "canManageFinances": false,
  "canApproveExpenses": false,
  "canViewFinancials": false,
  "canUploadDocuments": true,
  "canDeleteDocuments": false,
  "canShareDocuments": false,
  "canManageCompanySettings": false,
  "canManageIntegrations": false
}'::jsonb),

-- 3. Project Manager
('Project Manager', 'project_manager', 'Manage projects and budgets', '#047857', '📋', true, '{
  "canViewAllProjects": true,
  "canEditProjects": true,
  "canDeleteProjects": false,
  "canCreateProjects": true,
  "canManageTeam": false,
  "canInviteMembers": false,
  "canRemoveMembers": false,
  "canChangeRoles": false,
  "canViewAllPhotos": true,
  "canUploadPhotos": true,
  "canDeletePhotos": true,
  "canSharePhotos": true,
  "canEditPhotoMetadata": true,
  "canViewAnalytics": true,
  "canExportData": true,
  "canViewReports": true,
  "canManageAI": true,
  "canRunAIAnalysis": true,
  "canViewAIInsights": true,
  "canManageTasks": true,
  "canAssignTasks": true,
  "canViewAllTasks": true,
  "canManagePunchList": true,
  "canResolvePunchItems": true,
  "canViewPunchList": true,
  "canManageFinances": true,
  "canApproveExpenses": true,
  "canViewFinancials": true,
  "canUploadDocuments": true,
  "canDeleteDocuments": true,
  "canShareDocuments": true,
  "canManageCompanySettings": false,
  "canManageIntegrations": false
}'::jsonb),

-- 4. Field Engineer
('Field Engineer', 'field_engineer', 'Technical field work and coordination', '#C2410C', '🏗️', true, '{
  "canViewAllProjects": false,
  "canEditProjects": false,
  "canDeleteProjects": false,
  "canCreateProjects": false,
  "canManageTeam": false,
  "canInviteMembers": false,
  "canRemoveMembers": false,
  "canChangeRoles": false,
  "canViewAllPhotos": false,
  "canUploadPhotos": true,
  "canDeletePhotos": false,
  "canSharePhotos": false,
  "canEditPhotoMetadata": false,
  "canViewAnalytics": false,
  "canExportData": false,
  "canViewReports": false,
  "canManageAI": false,
  "canRunAIAnalysis": false,
  "canViewAIInsights": false,
  "canManageTasks": false,
  "canAssignTasks": false,
  "canViewAllTasks": false,
  "canManagePunchList": true,
  "canResolvePunchItems": false,
  "canViewPunchList": true,
  "canManageFinances": false,
  "canApproveExpenses": false,
  "canViewFinancials": false,
  "canUploadDocuments": true,
  "canDeleteDocuments": false,
  "canShareDocuments": false,
  "canManageCompanySettings": false,
  "canManageIntegrations": false
}'::jsonb),

-- 5. Viewer (Client)
('Viewer', 'viewer', 'View-only access for clients', '#4B5563', '👁️', true, '{
  "canViewAllProjects": false,
  "canEditProjects": false,
  "canDeleteProjects": false,
  "canCreateProjects": false,
  "canManageTeam": false,
  "canInviteMembers": false,
  "canRemoveMembers": false,
  "canChangeRoles": false,
  "canViewAllPhotos": false,
  "canUploadPhotos": false,
  "canDeletePhotos": false,
  "canSharePhotos": false,
  "canEditPhotoMetadata": false,
  "canViewAnalytics": false,
  "canExportData": false,
  "canViewReports": false,
  "canManageAI": false,
  "canRunAIAnalysis": false,
  "canViewAIInsights": false,
  "canManageTasks": false,
  "canAssignTasks": false,
  "canViewAllTasks": false,
  "canManagePunchList": false,
  "canResolvePunchItems": false,
  "canViewPunchList": false,
  "canManageFinances": false,
  "canApproveExpenses": false,
  "canViewFinancials": false,
  "canUploadDocuments": false,
  "canDeleteDocuments": false,
  "canShareDocuments": false,
  "canManageCompanySettings": false,
  "canManageIntegrations": false
}'::jsonb),

-- 6. Accountant
('Accountant', 'accountant', 'Financial management and reporting', '#B45309', '💰', true, '{
  "canViewAllProjects": true,
  "canEditProjects": false,
  "canDeleteProjects": false,
  "canCreateProjects": false,
  "canManageTeam": false,
  "canInviteMembers": false,
  "canRemoveMembers": false,
  "canChangeRoles": false,
  "canViewAllPhotos": false,
  "canUploadPhotos": false,
  "canDeletePhotos": false,
  "canSharePhotos": false,
  "canEditPhotoMetadata": false,
  "canViewAnalytics": true,
  "canExportData": true,
  "canViewReports": true,
  "canManageAI": false,
  "canRunAIAnalysis": false,
  "canViewAIInsights": false,
  "canManageTasks": false,
  "canAssignTasks": false,
  "canViewAllTasks": false,
  "canManagePunchList": false,
  "canResolvePunchItems": false,
  "canViewPunchList": false,
  "canManageFinances": true,
  "canApproveExpenses": true,
  "canViewFinancials": true,
  "canUploadDocuments": true,
  "canDeleteDocuments": false,
  "canShareDocuments": true,
  "canManageCompanySettings": false,
  "canManageIntegrations": false
}'::jsonb),

-- 7. Subcontractor
('Subcontractor', 'subcontractor', 'External contractor - limited access', '#4338CA', '🔨', true, '{
  "canViewAllProjects": false,
  "canEditProjects": false,
  "canDeleteProjects": false,
  "canCreateProjects": false,
  "canManageTeam": false,
  "canInviteMembers": false,
  "canRemoveMembers": false,
  "canChangeRoles": false,
  "canViewAllPhotos": false,
  "canUploadPhotos": true,
  "canDeletePhotos": false,
  "canSharePhotos": false,
  "canEditPhotoMetadata": false,
  "canViewAnalytics": false,
  "canExportData": false,
  "canViewReports": false,
  "canManageAI": false,
  "canRunAIAnalysis": false,
  "canViewAIInsights": false,
  "canManageTasks": false,
  "canAssignTasks": false,
  "canViewAllTasks": false,
  "canManagePunchList": true,
  "canResolvePunchItems": false,
  "canViewPunchList": true,
  "canManageFinances": false,
  "canApproveExpenses": false,
  "canViewFinancials": false,
  "canUploadDocuments": true,
  "canDeleteDocuments": false,
  "canShareDocuments": false,
  "canManageCompanySettings": false,
  "canManageIntegrations": false
}'::jsonb)

ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE custom_roles IS 'Stores both system roles and company-custom roles with granular permissions';
COMMENT ON TABLE user_role_assignments IS 'Assigns roles to users with optional project scope and expiration';
COMMENT ON TABLE project_team_members IS 'Project-specific role assignments with permission overrides';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for compliance and security';
COMMENT ON TABLE team_invitations IS 'Pending team member invitations with onboarding tracking';

COMMENT ON FUNCTION user_has_permission IS 'Check if user has a specific permission through their roles';
COMMENT ON FUNCTION get_user_highest_role IS 'Get user''s highest priority role for display';
COMMENT ON FUNCTION get_user_permissions IS 'Get user''s effective permissions merged from all roles';
COMMENT ON FUNCTION create_audit_log IS 'Create audit log entry with automatic criticality detection';
COMMENT ON FUNCTION get_role_member_count IS 'Count active members assigned to a role';

COMMIT;

-- ============================================
-- END OF MODULE 10 MIGRATION
-- ============================================
-- Next steps:
-- 1. Run this migration: psql -f 20260209_module10_teams_rbac.sql
-- 2. Test permission functions
-- 3. Implement API routes
-- 4. Build frontend components
-- ============================================
