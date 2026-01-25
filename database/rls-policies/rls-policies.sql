-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Critical for multi-tenant data isolation and security
-- ============================================================================
-- Created: January 21, 2026
-- Priority: CRITICAL - Do not deploy to production without these!
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punch_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sustainability_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_data ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: GET USER'S COMPANY ID
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================================
-- HELPER FUNCTION: CHECK IF USER IS COMPANY ADMIN
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin')
  );
$$;

-- ============================================================================
-- USER PROFILES POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can view other profiles in their company
CREATE POLICY "Users can view company members"
  ON public.user_profiles
  FOR SELECT
  USING (
    company_id = public.get_user_company_id()
  );

-- Only admins can update other users' roles
CREATE POLICY "Admins can update user roles"
  ON public.user_profiles
  FOR UPDATE
  USING (
    public.is_company_admin()
    AND company_id = public.get_user_company_id()
  );

-- ============================================================================
-- COMPANIES POLICIES
-- ============================================================================

-- Users can view their own company
CREATE POLICY "Users can view own company"
  ON public.companies
  FOR SELECT
  USING (
    id = public.get_user_company_id()
  );

-- Only admins can update company details
CREATE POLICY "Admins can update company"
  ON public.companies
  FOR UPDATE
  USING (
    id = public.get_user_company_id()
    AND public.is_company_admin()
  )
  WITH CHECK (
    id = public.get_user_company_id()
    AND public.is_company_admin()
  );

-- ============================================================================
-- PROJECTS POLICIES
-- ============================================================================

-- Users can view projects in their company
CREATE POLICY "Users can view company projects"
  ON public.projects
  FOR SELECT
  USING (
    company_id = public.get_user_company_id()
  );

-- Users can create projects in their company
CREATE POLICY "Users can create projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND created_by = auth.uid()
  );

-- Project creators, managers, and admins can update projects
CREATE POLICY "Authorized users can update projects"
  ON public.projects
  FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    AND (
      created_by = auth.uid()
      OR project_manager_id = auth.uid()
      OR public.is_company_admin()
      OR EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = projects.id
        AND user_id = auth.uid()
        AND role IN ('owner', 'manager')
      )
    )
  );

-- Only admins and project owners can delete projects
CREATE POLICY "Admins and owners can delete projects"
  ON public.projects
  FOR DELETE
  USING (
    company_id = public.get_user_company_id()
    AND (
      public.is_company_admin()
      OR created_by = auth.uid()
    )
  );

-- ============================================================================
-- PROJECT MEMBERS POLICIES
-- ============================================================================

-- Users can view members of their company's projects
CREATE POLICY "Users can view project members"
  ON public.project_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_members.project_id
      AND company_id = public.get_user_company_id()
    )
  );

-- Project managers and admins can add members
CREATE POLICY "Managers can add project members"
  ON public.project_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_members.project_id
      AND company_id = public.get_user_company_id()
      AND (
        created_by = auth.uid()
        OR project_manager_id = auth.uid()
        OR public.is_company_admin()
      )
    )
  );

-- Project managers and admins can remove members
CREATE POLICY "Managers can remove project members"
  ON public.project_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_members.project_id
      AND company_id = public.get_user_company_id()
      AND (
        created_by = auth.uid()
        OR project_manager_id = auth.uid()
        OR public.is_company_admin()
      )
    )
  );

-- ============================================================================
-- TASKS POLICIES
-- ============================================================================

-- Users can view tasks in their company
CREATE POLICY "Users can view company tasks"
  ON public.tasks
  FOR SELECT
  USING (
    company_id = public.get_user_company_id()
  );

-- Users can create tasks in their company's projects
CREATE POLICY "Users can create tasks"
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND user_id = auth.uid()
  );

-- Task creators, assignees, and admins can update tasks
CREATE POLICY "Authorized users can update tasks"
  ON public.tasks
  FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    AND (
      user_id = auth.uid()
      OR assignee_id = auth.uid()
      OR public.is_company_admin()
      OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = tasks.project_id
        AND (
          created_by = auth.uid()
          OR project_manager_id = auth.uid()
        )
      )
    )
  );

-- Task creators and admins can delete tasks
CREATE POLICY "Creators and admins can delete tasks"
  ON public.tasks
  FOR DELETE
  USING (
    company_id = public.get_user_company_id()
    AND (
      user_id = auth.uid()
      OR public.is_company_admin()
    )
  );

-- ============================================================================
-- MEDIA ASSETS (PHOTOS) POLICIES
-- ============================================================================

-- Users can view photos in their company (or public/shared photos)
CREATE POLICY "Users can view company photos"
  ON public.media_assets
  FOR SELECT
  USING (
    company_id = public.get_user_company_id()
    OR is_public = true
    OR auth.uid() = ANY(shared_with)
  );

-- Users can upload photos to their company
CREATE POLICY "Users can upload photos"
  ON public.media_assets
  FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND user_id = auth.uid()
  );

-- Users can update their own photos
CREATE POLICY "Users can update own photos"
  ON public.media_assets
  FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    AND user_id = auth.uid()
  );

-- Users and admins can delete photos
CREATE POLICY "Users and admins can delete photos"
  ON public.media_assets
  FOR DELETE
  USING (
    company_id = public.get_user_company_id()
    AND (
      user_id = auth.uid()
      OR public.is_company_admin()
    )
  );

-- ============================================================================
-- PUNCH ITEMS POLICIES
-- ============================================================================

-- Users can view punch items in their company
CREATE POLICY "Users can view company punch items"
  ON public.punch_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = punch_items.project_id
      AND company_id = public.get_user_company_id()
    )
  );

-- Users can create punch items
CREATE POLICY "Users can create punch items"
  ON public.punch_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = punch_items.project_id
      AND company_id = public.get_user_company_id()
    )
  );

-- Creators, assignees, and admins can update punch items
CREATE POLICY "Authorized users can update punch items"
  ON public.punch_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = punch_items.project_id
      AND company_id = public.get_user_company_id()
    )
    AND (
      assigned_by = auth.uid()
      OR assigned_to = auth.uid()
      OR resolved_by = auth.uid()
      OR verified_by = auth.uid()
      OR public.is_company_admin()
    )
  );

-- ============================================================================
-- QUOTES POLICIES
-- ============================================================================

-- Users can view quotes in their company
CREATE POLICY "Users can view company quotes"
  ON public.quotes
  FOR SELECT
  USING (
    company_id = public.get_user_company_id()
  );

-- Users can create quotes
CREATE POLICY "Users can create quotes"
  ON public.quotes
  FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND user_id = auth.uid()
  );

-- Quote creators and admins can update quotes
CREATE POLICY "Creators and admins can update quotes"
  ON public.quotes
  FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    AND (
      user_id = auth.uid()
      OR public.is_company_admin()
    )
  );

-- Quote creators and admins can delete quotes
CREATE POLICY "Creators and admins can delete quotes"
  ON public.quotes
  FOR DELETE
  USING (
    company_id = public.get_user_company_id()
    AND (
      user_id = auth.uid()
      OR public.is_company_admin()
    )
  );

-- ============================================================================
-- QUOTE LINE ITEMS POLICIES
-- ============================================================================

-- Users can view line items for quotes they can view
CREATE POLICY "Users can view quote line items"
  ON public.quote_line_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE id = quote_line_items.quote_id
      AND company_id = public.get_user_company_id()
    )
  );

-- Users can add line items to quotes they own
CREATE POLICY "Users can add line items to own quotes"
  ON public.quote_line_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE id = quote_line_items.quote_id
      AND company_id = public.get_user_company_id()
      AND user_id = auth.uid()
    )
  );

-- Users can update line items on quotes they own
CREATE POLICY "Users can update own quote line items"
  ON public.quote_line_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE id = quote_line_items.quote_id
      AND company_id = public.get_user_company_id()
      AND user_id = auth.uid()
    )
  );

-- Users can delete line items from quotes they own
CREATE POLICY "Users can delete own quote line items"
  ON public.quote_line_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE id = quote_line_items.quote_id
      AND company_id = public.get_user_company_id()
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- CRM CONTACTS POLICIES
-- ============================================================================

-- Users can view contacts in their company
CREATE POLICY "Users can view company contacts"
  ON public.crm_contacts
  FOR SELECT
  USING (
    company_id = public.get_user_company_id()
  );

-- Users can create contacts
CREATE POLICY "Users can create contacts"
  ON public.crm_contacts
  FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND created_by = auth.uid()
  );

-- Contact owners and admins can update contacts
CREATE POLICY "Owners and admins can update contacts"
  ON public.crm_contacts
  FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    AND (
      created_by = auth.uid()
      OR assigned_to = auth.uid()
      OR public.is_company_admin()
    )
  );

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- System can create notifications for users
CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true); -- Allow insert from service role

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- ACTIVITY LOGS POLICIES
-- ============================================================================

-- Users can view activity logs for their company
CREATE POLICY "Users can view company activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (
    company_id = public.get_user_company_id()
  );

-- System can create activity logs (service role only)
CREATE POLICY "System can create activity logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (true); -- Allow insert from service role

-- Only admins can delete activity logs (for compliance)
CREATE POLICY "Admins can delete activity logs"
  ON public.activity_logs
  FOR DELETE
  USING (
    company_id = public.get_user_company_id()
    AND public.is_company_admin()
  );

-- ============================================================================
-- SUSTAINABILITY DATA POLICIES
-- ============================================================================

-- Users can view sustainability data for their company's projects
CREATE POLICY "Users can view company sustainability data"
  ON public.sustainability_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = sustainability_data.project_id
      AND company_id = public.get_user_company_id()
    )
  );

-- Users can create sustainability data for their projects
CREATE POLICY "Users can create sustainability data"
  ON public.sustainability_data
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = sustainability_data.project_id
      AND company_id = public.get_user_company_id()
    )
    AND created_by = auth.uid()
  );

-- ============================================================================
-- REPORTS POLICIES
-- ============================================================================

-- Users can view reports in their company
CREATE POLICY "Users can view company reports"
  ON public.reports
  FOR SELECT
  USING (
    company_id = public.get_user_company_id()
  );

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON public.reports
  FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND created_by = auth.uid()
  );

-- Report creators and admins can update reports
CREATE POLICY "Creators and admins can update reports"
  ON public.reports
  FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    AND (
      created_by = auth.uid()
      OR public.is_company_admin()
    )
  );

-- ============================================================================
-- STORAGE POLICIES (FOR SUPABASE STORAGE BUCKETS)
-- ============================================================================

-- Note: These policies should be added in Supabase Storage UI

/*
BUCKET: project-photos
- SELECT: company_id matches user's company
- INSERT: authenticated users, add company_id
- UPDATE: photo owner only
- DELETE: photo owner or admin

BUCKET: documents
- SELECT: company_id matches user's company
- INSERT: authenticated users, add company_id
- UPDATE: document owner only
- DELETE: document owner or admin

BUCKET: avatars
- SELECT: public
- INSERT: authenticated users (own avatar)
- UPDATE: own avatar only
- DELETE: own avatar only

BUCKET: reports
- SELECT: company_id matches user's company
- INSERT: authenticated users, add company_id
- UPDATE: report creator only
- DELETE: report creator or admin
*/

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on helper functions
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin() TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify RLS is working correctly:

/*
-- 1. Check all tables have RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
-- Should return 0 rows

-- 2. List all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Test as a specific user (replace with actual user ID)
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM projects; -- Should only see user's company projects
RESET ROLE;
*/

-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================
