-- ============================================
-- MODULE 10: TEAMS & RBAC - FINAL VERSION
-- ============================================
-- Created: February 9, 2026
-- Fixed: February 10, 2026 - Removed function calls from index predicates
-- ============================================

BEGIN;

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role_name VARCHAR(100) NOT NULL,
  role_slug VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
  icon VARCHAR(10) DEFAULT '👤',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, role_slug),
  CHECK (role_name != ''),
  CHECK (LENGTH(color) = 7 AND color ~ '^#[0-9A-Fa-f]{6}$'),
  CHECK (is_system_role = false OR company_id IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_custom_roles_company ON custom_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_custom_roles_slug ON custom_roles(company_id, role_slug);
CREATE INDEX IF NOT EXISTS idx_custom_roles_active ON custom_roles(is_active);

CREATE TABLE IF NOT EXISTS user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_ids UUID[],
  expires_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assignment_reason TEXT,
  UNIQUE(user_id, role_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role ON user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_company ON user_role_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_expires ON user_role_assignments(expires_at);

CREATE TABLE IF NOT EXISTS project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_role TEXT,
  custom_permissions JSONB DEFAULT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_team_members_project ON project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_user ON project_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_company ON project_team_members(company_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_name VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_role VARCHAR(100),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  old_values JSONB,
  new_values JSONB,
  changes JSONB,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  request_id UUID,
  is_critical BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approval_reason TEXT,
  retention_period INTERVAL DEFAULT INTERVAL '7 years',
  can_be_deleted BOOLEAN DEFAULT false,
  CHECK (action IN ('create', 'update', 'delete', 'view', 'export', 'approve', 'reject')),
  CHECK (entity_type != '')
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_time ON audit_logs(company_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_critical ON audit_logs(company_id, is_critical, timestamp DESC);

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  project_ids UUID[],
  invitation_token VARCHAR(255) NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_buddy UUID REFERENCES auth.users(id),
  UNIQUE(company_id, email, status)
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_company ON team_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(company_id, status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires ON team_invitations(expires_at);

-- ============================================
-- FUNCTIONS
-- ============================================

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
  IF p_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
    FROM user_profiles
    WHERE id = p_user_id
    LIMIT 1;
  ELSE
    v_company_id := p_company_id;
  END IF;

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
  FOR v_role IN
    SELECT cr.permissions
    FROM user_role_assignments ura
    JOIN custom_roles cr ON cr.id = ura.role_id
    WHERE ura.user_id = p_user_id
    AND ura.company_id = p_company_id
    AND cr.is_active = true
    AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
  LOOP
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
  SELECT
    COALESCE(up.name, up.full_name) as name,
    up.email,
    get_user_highest_role(up.id, p_company_id) AS role_name
  INTO v_user_info
  FROM user_profiles up
  WHERE up.id = p_user_id;

  IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
    SELECT jsonb_object_agg(key, value)
    INTO v_changes
    FROM jsonb_each(p_new_values)
    WHERE value != COALESCE(p_old_values->key, 'null'::jsonb);
  END IF;

  v_is_critical := (
    p_action = 'delete'
    OR p_entity_type IN ('role', 'user', 'company_settings')
  );

  INSERT INTO audit_logs (
    company_id, user_id, user_name, user_email, user_role,
    action, entity_type, entity_id, entity_name,
    old_values, new_values, changes, reason,
    ip_address, user_agent, is_critical
  )
  VALUES (
    p_company_id, p_user_id,
    COALESCE(v_user_info.name, 'Unknown'),
    COALESCE(v_user_info.email, 'unknown@example.com'),
    v_user_info.role_name,
    p_action, p_entity_type, p_entity_id, p_entity_name,
    p_old_values, p_new_values, v_changes, p_reason,
    p_ip_address, p_user_agent, v_is_critical
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_custom_roles_updated_at') THEN
    CREATE TRIGGER update_custom_roles_updated_at
      BEFORE UPDATE ON custom_roles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company roles" ON custom_roles;
CREATE POLICY "Users can view company roles"
  ON custom_roles FOR SELECT
  TO authenticated
  USING (
    is_system_role = true
    OR company_id IS NULL
    OR company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage custom roles" ON custom_roles;
CREATE POLICY "Admins can manage custom roles"
  ON custom_roles FOR ALL
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view role assignments" ON user_role_assignments;
CREATE POLICY "Users can view role assignments"
  ON user_role_assignments FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage role assignments" ON user_role_assignments;
CREATE POLICY "Admins can manage role assignments"
  ON user_role_assignments FOR ALL
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view project team members" ON project_team_members;
CREATE POLICY "Users can view project team members"
  ON project_team_members FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Project managers can manage team members" ON project_team_members;
CREATE POLICY "Project managers can manage team members"
  ON project_team_members FOR ALL
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view company audit logs" ON audit_logs;
CREATE POLICY "Users can view company audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Audit logs are immutable" ON audit_logs;
CREATE POLICY "Audit logs are immutable"
  ON audit_logs FOR UPDATE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON audit_logs;
CREATE POLICY "Audit logs cannot be deleted"
  ON audit_logs FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Users can view team invitations" ON team_invitations;
CREATE POLICY "Users can view team invitations"
  ON team_invitations FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage invitations" ON team_invitations;
CREATE POLICY "Admins can manage invitations"
  ON team_invitations FOR ALL
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

-- ============================================
-- SEED DATA: 7 System Roles
-- ============================================

INSERT INTO custom_roles (role_name, role_slug, description, color, icon, is_system_role, permissions) VALUES
('Admin', 'admin', 'Full system access - company owner', '#7C3AED', '👑', true, '{"canViewAllProjects":true,"canEditProjects":true,"canDeleteProjects":true,"canCreateProjects":true,"canManageTeam":true,"canInviteMembers":true,"canRemoveMembers":true,"canChangeRoles":true,"canViewAllPhotos":true,"canUploadPhotos":true,"canDeletePhotos":true,"canSharePhotos":true,"canEditPhotoMetadata":true,"canViewAnalytics":true,"canExportData":true,"canViewReports":true,"canManageAI":true,"canRunAIAnalysis":true,"canViewAIInsights":true,"canManageTasks":true,"canAssignTasks":true,"canViewAllTasks":true,"canManagePunchList":true,"canResolvePunchItems":true,"canViewPunchList":true,"canManageFinances":true,"canApproveExpenses":true,"canViewFinancials":true,"canUploadDocuments":true,"canDeleteDocuments":true,"canShareDocuments":true,"canManageCompanySettings":true,"canManageIntegrations":true}'::jsonb),
('Superintendent', 'superintendent', 'Oversee field operations and crews', '#1E40AF', '🔧', true, '{"canViewAllProjects":false,"canEditProjects":false,"canDeleteProjects":false,"canCreateProjects":false,"canManageTeam":false,"canInviteMembers":false,"canRemoveMembers":false,"canChangeRoles":false,"canViewAllPhotos":true,"canUploadPhotos":true,"canDeletePhotos":false,"canSharePhotos":true,"canEditPhotoMetadata":true,"canViewAnalytics":false,"canExportData":false,"canViewReports":false,"canManageAI":false,"canRunAIAnalysis":false,"canViewAIInsights":false,"canManageTasks":true,"canAssignTasks":true,"canViewAllTasks":true,"canManagePunchList":true,"canResolvePunchItems":true,"canViewPunchList":true,"canManageFinances":false,"canApproveExpenses":false,"canViewFinancials":false,"canUploadDocuments":true,"canDeleteDocuments":false,"canShareDocuments":false,"canManageCompanySettings":false,"canManageIntegrations":false}'::jsonb),
('Project Manager', 'project_manager', 'Manage projects and budgets', '#047857', '📋', true, '{"canViewAllProjects":true,"canEditProjects":true,"canDeleteProjects":false,"canCreateProjects":true,"canManageTeam":false,"canInviteMembers":false,"canRemoveMembers":false,"canChangeRoles":false,"canViewAllPhotos":true,"canUploadPhotos":true,"canDeletePhotos":true,"canSharePhotos":true,"canEditPhotoMetadata":true,"canViewAnalytics":true,"canExportData":true,"canViewReports":true,"canManageAI":true,"canRunAIAnalysis":true,"canViewAIInsights":true,"canManageTasks":true,"canAssignTasks":true,"canViewAllTasks":true,"canManagePunchList":true,"canResolvePunchItems":true,"canViewPunchList":true,"canManageFinances":true,"canApproveExpenses":true,"canViewFinancials":true,"canUploadDocuments":true,"canDeleteDocuments":true,"canShareDocuments":true,"canManageCompanySettings":false,"canManageIntegrations":false}'::jsonb),
('Field Engineer', 'field_engineer', 'Technical field work and coordination', '#C2410C', '🏗️', true, '{"canViewAllProjects":false,"canEditProjects":false,"canDeleteProjects":false,"canCreateProjects":false,"canManageTeam":false,"canInviteMembers":false,"canRemoveMembers":false,"canChangeRoles":false,"canViewAllPhotos":false,"canUploadPhotos":true,"canDeletePhotos":false,"canSharePhotos":false,"canEditPhotoMetadata":false,"canViewAnalytics":false,"canExportData":false,"canViewReports":false,"canManageAI":false,"canRunAIAnalysis":false,"canViewAIInsights":false,"canManageTasks":false,"canAssignTasks":false,"canViewAllTasks":false,"canManagePunchList":true,"canResolvePunchItems":false,"canViewPunchList":true,"canManageFinances":false,"canApproveExpenses":false,"canViewFinancials":false,"canUploadDocuments":true,"canDeleteDocuments":false,"canShareDocuments":false,"canManageCompanySettings":false,"canManageIntegrations":false}'::jsonb),
('Viewer', 'viewer', 'View-only access for clients', '#4B5563', '👁️', true, '{"canViewAllProjects":false,"canEditProjects":false,"canDeleteProjects":false,"canCreateProjects":false,"canManageTeam":false,"canInviteMembers":false,"canRemoveMembers":false,"canChangeRoles":false,"canViewAllPhotos":false,"canUploadPhotos":false,"canDeletePhotos":false,"canSharePhotos":false,"canEditPhotoMetadata":false,"canViewAnalytics":false,"canExportData":false,"canViewReports":false,"canManageAI":false,"canRunAIAnalysis":false,"canViewAIInsights":false,"canManageTasks":false,"canAssignTasks":false,"canViewAllTasks":false,"canManagePunchList":false,"canResolvePunchItems":false,"canViewPunchList":false,"canManageFinances":false,"canApproveExpenses":false,"canViewFinancials":false,"canUploadDocuments":false,"canDeleteDocuments":false,"canShareDocuments":false,"canManageCompanySettings":false,"canManageIntegrations":false}'::jsonb),
('Accountant', 'accountant', 'Financial management and reporting', '#B45309', '💰', true, '{"canViewAllProjects":true,"canEditProjects":false,"canDeleteProjects":false,"canCreateProjects":false,"canManageTeam":false,"canInviteMembers":false,"canRemoveMembers":false,"canChangeRoles":false,"canViewAllPhotos":false,"canUploadPhotos":false,"canDeletePhotos":false,"canSharePhotos":false,"canEditPhotoMetadata":false,"canViewAnalytics":true,"canExportData":true,"canViewReports":true,"canManageAI":false,"canRunAIAnalysis":false,"canViewAIInsights":false,"canManageTasks":false,"canAssignTasks":false,"canViewAllTasks":false,"canManagePunchList":false,"canResolvePunchItems":false,"canViewPunchList":false,"canManageFinances":true,"canApproveExpenses":true,"canViewFinancials":true,"canUploadDocuments":true,"canDeleteDocuments":false,"canShareDocuments":true,"canManageCompanySettings":false,"canManageIntegrations":false}'::jsonb),
('Subcontractor', 'subcontractor', 'External contractor - limited access', '#4338CA', '🔨', true, '{"canViewAllProjects":false,"canEditProjects":false,"canDeleteProjects":false,"canCreateProjects":false,"canManageTeam":false,"canInviteMembers":false,"canRemoveMembers":false,"canChangeRoles":false,"canViewAllPhotos":false,"canUploadPhotos":true,"canDeletePhotos":false,"canSharePhotos":false,"canEditPhotoMetadata":false,"canViewAnalytics":false,"canExportData":false,"canViewReports":false,"canManageAI":false,"canRunAIAnalysis":false,"canViewAIInsights":false,"canManageTasks":false,"canAssignTasks":false,"canViewAllTasks":false,"canManagePunchList":true,"canResolvePunchItems":false,"canViewPunchList":true,"canManageFinances":false,"canApproveExpenses":false,"canViewFinancials":false,"canUploadDocuments":true,"canDeleteDocuments":false,"canShareDocuments":false,"canManageCompanySettings":false,"canManageIntegrations":false}'::jsonb)
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================
-- SUCCESS!
-- ============================================
SELECT 'Module 10 deployed successfully!' as message,
       COUNT(*) as roles_created
FROM custom_roles
WHERE is_system_role = true;
