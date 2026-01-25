-- ============================================
-- ROLE-BASED ACCESS CONTROL (RBAC) DATABASE SCHEMA
-- ============================================
-- Purpose: Enable team collaboration with role-based permissions
-- Features: Company teams, project assignments, photo sharing, role management
-- ============================================

-- ============================================
-- 1. COMPANY TEAMS
-- ============================================

CREATE TABLE IF NOT EXISTS company_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  team_type TEXT CHECK (team_type IN ('construction', 'management', 'quality', 'safety', 'custom')) DEFAULT 'custom',
  color TEXT DEFAULT '#6A9BFD', -- For UI visual distinction
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for company teams
CREATE INDEX idx_company_teams_company ON company_teams(company_id);
CREATE INDEX idx_company_teams_active ON company_teams(is_active) WHERE is_active = true;
CREATE INDEX idx_company_teams_created_by ON company_teams(created_by);

-- ============================================
-- 2. TEAM MEMBERS WITH ROLES
-- ============================================

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES company_teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'superintendent', 'project_manager', 'field_engineer', 'viewer')) NOT NULL,
  is_lead BOOLEAN DEFAULT false, -- Team lead designation
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  removed_at TIMESTAMPTZ, -- Soft delete for audit trail
  UNIQUE(team_id, user_id)
);

-- Indexes for team members
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);
CREATE INDEX idx_team_members_active ON team_members(removed_at) WHERE removed_at IS NULL;

-- ============================================
-- 3. PROJECT TEAM ASSIGNMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS project_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID REFERENCES company_teams(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  removed_at TIMESTAMPTZ, -- Soft delete
  UNIQUE(project_id, team_id)
);

-- Indexes for project teams
CREATE INDEX idx_project_teams_project ON project_teams(project_id);
CREATE INDEX idx_project_teams_team ON project_teams(team_id);
CREATE INDEX idx_project_teams_active ON project_teams(removed_at) WHERE removed_at IS NULL;

-- ============================================
-- 4. SHARED MEDIA ASSETS
-- ============================================

CREATE TABLE IF NOT EXISTS shared_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE CASCADE,
  shared_with_team_id UUID REFERENCES company_teams(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES auth.users(id) NOT NULL,
  permission_level TEXT CHECK (permission_level IN ('view', 'comment', 'edit')) DEFAULT 'view',
  expires_at TIMESTAMPTZ,
  share_message TEXT,
  is_active BOOLEAN DEFAULT true,
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  CONSTRAINT check_share_target CHECK (
    (shared_with_team_id IS NOT NULL AND shared_with_user_id IS NULL) OR
    (shared_with_team_id IS NULL AND shared_with_user_id IS NOT NULL)
  ),
  UNIQUE(media_asset_id, shared_with_team_id),
  UNIQUE(media_asset_id, shared_with_user_id)
);

-- Indexes for shared media
CREATE INDEX idx_shared_media_asset ON shared_media_assets(media_asset_id);
CREATE INDEX idx_shared_media_team ON shared_media_assets(shared_with_team_id);
CREATE INDEX idx_shared_media_user ON shared_media_assets(shared_with_user_id);
CREATE INDEX idx_shared_media_shared_by ON shared_media_assets(shared_by);
CREATE INDEX idx_shared_media_active ON shared_media_assets(is_active) WHERE is_active = true;
CREATE INDEX idx_shared_media_expires ON shared_media_assets(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- 5. PERMISSION AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'share_photo', 'change_role', 'add_member', etc.
  resource_type TEXT NOT NULL, -- 'media_asset', 'team', 'project'
  resource_id UUID NOT NULL,
  permission_granted TEXT,
  permission_denied TEXT,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX idx_permission_audit_user ON permission_audit_log(user_id);
CREATE INDEX idx_permission_audit_resource ON permission_audit_log(resource_type, resource_id);
CREATE INDEX idx_permission_audit_created ON permission_audit_log(created_at DESC);

-- ============================================
-- 6. TEAM INVITATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES company_teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'superintendent', 'project_manager', 'field_engineer', 'viewer')) NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for invitations
CREATE INDEX idx_team_invitations_team ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(invitation_token);
CREATE INDEX idx_team_invitations_pending ON team_invitations(accepted_at) WHERE accepted_at IS NULL;

-- ============================================
-- 7. USER PREFERENCES FOR TEAMS
-- ============================================

CREATE TABLE IF NOT EXISTS team_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES company_teams(id) ON DELETE CASCADE,
  notification_enabled BOOLEAN DEFAULT true,
  email_digest TEXT CHECK (email_digest IN ('realtime', 'daily', 'weekly', 'never')) DEFAULT 'daily',
  favorite BOOLEAN DEFAULT false,
  last_viewed_at TIMESTAMPTZ,
  UNIQUE(user_id, team_id)
);

-- Indexes for preferences
CREATE INDEX idx_team_prefs_user ON team_user_preferences(user_id);
CREATE INDEX idx_team_prefs_team ON team_user_preferences(team_id);
CREATE INDEX idx_team_prefs_favorites ON team_user_preferences(favorite) WHERE favorite = true;

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Get user's highest role across all teams
CREATE OR REPLACE FUNCTION get_user_highest_role(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  highest_role TEXT;
BEGIN
  SELECT role INTO highest_role
  FROM team_members
  WHERE user_id = user_uuid
    AND removed_at IS NULL
  ORDER BY
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'superintendent' THEN 2
      WHEN 'project_manager' THEN 3
      WHEN 'field_engineer' THEN 4
      WHEN 'viewer' THEN 5
    END
  LIMIT 1;

  RETURN COALESCE(highest_role, 'viewer');
END;
$$ LANGUAGE plpgsql;

-- Get user's role for a specific project
CREATE OR REPLACE FUNCTION get_user_project_role(user_uuid UUID, project_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT tm.role INTO user_role
  FROM team_members tm
  JOIN project_teams pt ON tm.team_id = pt.team_id
  WHERE tm.user_id = user_uuid
    AND pt.project_id = project_uuid
    AND tm.removed_at IS NULL
    AND pt.removed_at IS NULL
  ORDER BY
    CASE tm.role
      WHEN 'admin' THEN 1
      WHEN 'superintendent' THEN 2
      WHEN 'project_manager' THEN 3
      WHEN 'field_engineer' THEN 4
      WHEN 'viewer' THEN 5
    END
  LIMIT 1;

  RETURN COALESCE(user_role, 'viewer');
END;
$$ LANGUAGE plpgsql;

-- Check if user can view media asset
CREATE OR REPLACE FUNCTION can_user_view_media_asset(user_uuid UUID, asset_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  can_view BOOLEAN := false;
  asset_project_id UUID;
BEGIN
  -- Get asset's project
  SELECT project_id INTO asset_project_id
  FROM media_assets
  WHERE id = asset_uuid;

  -- Owner can always view
  IF EXISTS (
    SELECT 1 FROM media_assets
    WHERE id = asset_uuid AND user_id = user_uuid
  ) THEN
    RETURN true;
  END IF;

  -- Check project team membership
  IF EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN project_teams pt ON tm.team_id = pt.team_id
    WHERE tm.user_id = user_uuid
      AND pt.project_id = asset_project_id
      AND tm.removed_at IS NULL
      AND pt.removed_at IS NULL
  ) THEN
    RETURN true;
  END IF;

  -- Check direct share
  IF EXISTS (
    SELECT 1
    FROM shared_media_assets
    WHERE media_asset_id = asset_uuid
      AND shared_with_user_id = user_uuid
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  ) THEN
    RETURN true;
  END IF;

  -- Check team share
  IF EXISTS (
    SELECT 1
    FROM shared_media_assets sma
    JOIN team_members tm ON sma.shared_with_team_id = tm.team_id
    WHERE sma.media_asset_id = asset_uuid
      AND tm.user_id = user_uuid
      AND sma.is_active = true
      AND tm.removed_at IS NULL
      AND (sma.expires_at IS NULL OR sma.expires_at > NOW())
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Get team statistics
CREATE OR REPLACE FUNCTION get_team_stats(team_uuid UUID)
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_members', (
      SELECT COUNT(*)
      FROM team_members
      WHERE team_id = team_uuid
        AND removed_at IS NULL
    ),
    'admins', (
      SELECT COUNT(*)
      FROM team_members
      WHERE team_id = team_uuid
        AND role = 'admin'
        AND removed_at IS NULL
    ),
    'superintendents', (
      SELECT COUNT(*)
      FROM team_members
      WHERE team_id = team_uuid
        AND role = 'superintendent'
        AND removed_at IS NULL
    ),
    'project_managers', (
      SELECT COUNT(*)
      FROM team_members
      WHERE team_id = team_uuid
        AND role = 'project_manager'
        AND removed_at IS NULL
    ),
    'field_engineers', (
      SELECT COUNT(*)
      FROM team_members
      WHERE team_id = team_uuid
        AND role = 'field_engineer'
        AND removed_at IS NULL
    ),
    'viewers', (
      SELECT COUNT(*)
      FROM team_members
      WHERE team_id = team_uuid
        AND role = 'viewer'
        AND removed_at IS NULL
    ),
    'assigned_projects', (
      SELECT COUNT(*)
      FROM project_teams
      WHERE team_id = team_uuid
        AND removed_at IS NULL
    )
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. ROW-LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE company_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_user_preferences ENABLE ROW LEVEL SECURITY;

-- Company Teams Policies
CREATE POLICY "users_view_their_company_teams" ON company_teams
FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "admins_manage_company_teams" ON company_teams
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = auth.uid()
      AND role = 'admin'
      AND removed_at IS NULL
  )
);

-- Team Members Policies
CREATE POLICY "users_view_their_team_members" ON team_members
FOR SELECT USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
      AND removed_at IS NULL
  )
);

CREATE POLICY "admins_manage_team_members" ON team_members
FOR ALL USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'superintendent')
      AND removed_at IS NULL
  )
);

-- Project Teams Policies
CREATE POLICY "users_view_project_teams" ON project_teams
FOR SELECT USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
      AND removed_at IS NULL
  )
);

CREATE POLICY "admins_manage_project_teams" ON project_teams
FOR ALL USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'superintendent', 'project_manager')
      AND removed_at IS NULL
  )
);

-- Shared Media Assets Policies
CREATE POLICY "users_view_shared_media" ON shared_media_assets
FOR SELECT USING (
  shared_by = auth.uid() OR
  shared_with_user_id = auth.uid() OR
  shared_with_team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
      AND removed_at IS NULL
  )
);

CREATE POLICY "users_share_their_media" ON shared_media_assets
FOR INSERT WITH CHECK (
  shared_by = auth.uid() AND
  media_asset_id IN (
    SELECT id FROM media_assets WHERE user_id = auth.uid()
  )
);

CREATE POLICY "users_manage_their_shares" ON shared_media_assets
FOR UPDATE USING (shared_by = auth.uid());

CREATE POLICY "users_delete_their_shares" ON shared_media_assets
FOR DELETE USING (shared_by = auth.uid());

-- Permission Audit Log Policies
CREATE POLICY "users_view_their_audit_log" ON permission_audit_log
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "system_insert_audit_log" ON permission_audit_log
FOR INSERT WITH CHECK (true); -- Allow system to insert

-- Team Invitations Policies
CREATE POLICY "users_view_team_invitations" ON team_invitations
FOR SELECT USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'superintendent')
      AND removed_at IS NULL
  )
);

CREATE POLICY "admins_manage_invitations" ON team_invitations
FOR ALL USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'superintendent')
      AND removed_at IS NULL
  )
);

-- Team User Preferences Policies
CREATE POLICY "users_manage_their_team_prefs" ON team_user_preferences
FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 10. TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_teams_updated_at
  BEFORE UPDATE ON company_teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Track share access
CREATE OR REPLACE FUNCTION track_share_access()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_accessed_at != OLD.last_accessed_at THEN
    NEW.access_count = OLD.access_count + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_shared_media_access
  BEFORE UPDATE ON shared_media_assets
  FOR EACH ROW EXECUTE FUNCTION track_share_access();

-- ============================================
-- 11. INITIAL DATA SETUP
-- ============================================

-- Create default team for existing users (run carefully in production)
-- This is commented out - run manually after reviewing your data structure
/*
INSERT INTO company_teams (company_id, name, description, team_type, created_by)
SELECT DISTINCT
  company_id,
  'Default Team',
  'Automatically created default team',
  'custom',
  (SELECT id FROM auth.users LIMIT 1)
FROM user_profiles
WHERE company_id IS NOT NULL
ON CONFLICT DO NOTHING;
*/

-- ============================================
-- 12. MAINTENANCE FUNCTIONS
-- ============================================

-- Clean up expired shares
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS INTEGER AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE shared_media_assets
  SET is_active = false
  WHERE expires_at < NOW()
    AND is_active = true;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;

-- Remove inactive team members (soft delete older than 90 days)
CREATE OR REPLACE FUNCTION archive_old_team_members()
RETURNS INTEGER AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  DELETE FROM team_members
  WHERE removed_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SCHEMA COMPLETE
-- ============================================

-- To verify installation, run:
-- SELECT * FROM get_team_stats((SELECT id FROM company_teams LIMIT 1));
-- SELECT * FROM get_user_highest_role(auth.uid());
