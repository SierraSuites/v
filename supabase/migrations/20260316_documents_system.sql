-- ============================================================================
-- Document Management System Migration
-- ============================================================================

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Document metadata
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'contract',
    'plan',
    'permit',
    'rfi',
    'submittal',
    'invoice',
    'photo',
    'report',
    'correspondence',
    'specification',
    'drawing',
    'warranty',
    'certificate',
    'other'
  )),
  subcategory TEXT,
  tags TEXT[],

  -- File information
  file_path TEXT NOT NULL, -- Supabase storage path
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL, -- bytes
  file_type TEXT NOT NULL, -- MIME type
  file_extension TEXT,

  -- Version control
  version_number INTEGER DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT true,
  parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Status and visibility
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'client', 'public')),

  -- Access control
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  shared_with UUID[], -- Array of user IDs

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Indexes
  CONSTRAINT documents_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Indexes for performance
CREATE INDEX idx_documents_company ON documents(company_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_latest_version ON documents(is_latest_version) WHERE is_latest_version = true;
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_metadata ON documents USING GIN(metadata);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- Full-text search index
CREATE INDEX idx_documents_search ON documents USING GIN(
  to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- ============================================================================
-- DOCUMENT PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE document_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Permission target
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  role TEXT,

  -- Permission level
  permission_level TEXT NOT NULL CHECK (permission_level IN ('view', 'download', 'edit', 'delete', 'share')),

  -- Audit
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT document_permissions_target CHECK (
    (user_id IS NOT NULL AND team_id IS NULL AND role IS NULL) OR
    (user_id IS NULL AND team_id IS NOT NULL AND role IS NULL) OR
    (user_id IS NULL AND team_id IS NULL AND role IS NOT NULL)
  )
);

CREATE INDEX idx_document_permissions_document ON document_permissions(document_id);
CREATE INDEX idx_document_permissions_user ON document_permissions(user_id);
CREATE INDEX idx_document_permissions_team ON document_permissions(team_id);

-- ============================================================================
-- DOCUMENT TEMPLATES TABLE
-- ============================================================================
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Template metadata
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,

  -- Template file
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,

  -- Template configuration
  placeholders JSONB DEFAULT '[]'::jsonb, -- List of placeholder fields
  is_system_template BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_document_templates_company ON document_templates(company_id);
CREATE INDEX idx_document_templates_category ON document_templates(category);
CREATE INDEX idx_document_templates_active ON document_templates(is_active) WHERE is_active = true;

-- ============================================================================
-- DOCUMENT ACTIVITY LOG TABLE
-- ============================================================================
CREATE TABLE document_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Activity details
  action TEXT NOT NULL CHECK (action IN (
    'created',
    'uploaded',
    'viewed',
    'downloaded',
    'edited',
    'deleted',
    'restored',
    'shared',
    'unshared',
    'versioned',
    'archived',
    'moved'
  )),

  -- Actor
  performed_by UUID NOT NULL REFERENCES auth.users(id),

  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamp
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_document_activity_document ON document_activity_log(document_id);
CREATE INDEX idx_document_activity_user ON document_activity_log(performed_by);
CREATE INDEX idx_document_activity_action ON document_activity_log(action);
CREATE INDEX idx_document_activity_time ON document_activity_log(performed_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_activity_log ENABLE ROW LEVEL SECURITY;

-- Documents Policies
CREATE POLICY "Users can view documents in their company or shared with them"
  ON documents FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
    OR uploaded_by = auth.uid()
    OR auth.uid() = ANY(shared_with)
    OR EXISTS (
      SELECT 1 FROM document_permissions
      WHERE document_id = documents.id
        AND user_id = auth.uid()
        AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

CREATE POLICY "Users can create documents in their company"
  ON documents FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Users can update their own documents or with edit permission"
  ON documents FOR UPDATE
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM document_permissions
      WHERE document_id = documents.id
        AND user_id = auth.uid()
        AND permission_level IN ('edit', 'delete')
        AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

CREATE POLICY "Users can delete their own documents or with delete permission"
  ON documents FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM document_permissions
      WHERE document_id = documents.id
        AND user_id = auth.uid()
        AND permission_level = 'delete'
        AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- Document Permissions Policies
CREATE POLICY "Users can view permissions for documents they can access"
  ON document_permissions FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Document owners can manage permissions"
  ON document_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE id = document_permissions.document_id
        AND uploaded_by = auth.uid()
    )
  );

-- Document Templates Policies
CREATE POLICY "Users can view templates in their company"
  ON document_templates FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
    OR is_system_template = true
  );

CREATE POLICY "Admins can manage templates"
  ON document_templates FOR ALL
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Document Activity Log Policies
CREATE POLICY "Users can view activity for documents they can access"
  ON document_activity_log FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "System can insert activity logs"
  ON document_activity_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create a new document version
CREATE OR REPLACE FUNCTION create_document_version(
  p_document_id UUID,
  p_file_path TEXT,
  p_file_name TEXT,
  p_file_size BIGINT,
  p_file_type TEXT,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_new_document_id UUID;
  v_new_version_number INTEGER;
  v_original_document RECORD;
BEGIN
  -- Get original document details
  SELECT * INTO v_original_document FROM documents WHERE id = p_document_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  -- Calculate new version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_new_version_number
  FROM documents
  WHERE parent_document_id = p_document_id OR id = p_document_id;

  -- Mark all previous versions as not latest
  UPDATE documents
  SET is_latest_version = false
  WHERE id = p_document_id OR parent_document_id = p_document_id;

  -- Create new version
  INSERT INTO documents (
    company_id,
    project_id,
    name,
    description,
    category,
    subcategory,
    tags,
    file_path,
    file_name,
    file_size,
    file_type,
    file_extension,
    version_number,
    is_latest_version,
    parent_document_id,
    status,
    visibility,
    uploaded_by,
    shared_with,
    metadata
  ) VALUES (
    v_original_document.company_id,
    v_original_document.project_id,
    v_original_document.name,
    v_original_document.description,
    v_original_document.category,
    v_original_document.subcategory,
    v_original_document.tags,
    p_file_path,
    p_file_name,
    p_file_size,
    p_file_type,
    v_original_document.file_extension,
    v_new_version_number,
    true,
    p_document_id,
    v_original_document.status,
    v_original_document.visibility,
    p_user_id,
    v_original_document.shared_with,
    v_original_document.metadata
  ) RETURNING id INTO v_new_document_id;

  RETURN v_new_document_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log document activity
CREATE OR REPLACE FUNCTION log_document_activity(
  p_document_id UUID,
  p_action TEXT,
  p_performed_by UUID,
  p_metadata JSONB DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Get company_id from document
  SELECT company_id INTO v_company_id FROM documents WHERE id = p_document_id;

  IF FOUND THEN
    INSERT INTO document_activity_log (
      document_id,
      company_id,
      action,
      performed_by,
      metadata
    ) VALUES (
      p_document_id,
      v_company_id,
      p_action,
      p_performed_by,
      p_metadata
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on documents
CREATE OR REPLACE FUNCTION update_document_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_update_timestamp
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_timestamp();

-- Trigger to log document creation
CREATE OR REPLACE FUNCTION log_document_creation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_document_activity(NEW.id, 'created', NEW.uploaded_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_log_creation
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_creation();
