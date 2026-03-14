-- ============================================================
-- FIX: project_documents RLS permission denied (code 42501)
-- Run this in Supabase SQL editor
-- ============================================================

-- Drop any conflicting existing policies
DROP POLICY IF EXISTS "Users can view project documents" ON public.project_documents;
DROP POLICY IF EXISTS "Project members can upload documents" ON public.project_documents;
DROP POLICY IF EXISTS "Project owners can manage documents" ON public.project_documents;

-- Ensure RLS is enabled
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: project owner or member can view documents
CREATE POLICY "Users can view project documents"
  ON public.project_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_documents.project_id
      AND (
        projects.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

-- INSERT: project owner or member can upload
CREATE POLICY "Project members can upload documents"
  ON public.project_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_documents.project_id
      AND (
        projects.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

-- UPDATE/DELETE: project owner only
CREATE POLICY "Project owners can manage documents"
  ON public.project_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_documents.project_id
      AND projects.user_id = auth.uid()
    )
  );
