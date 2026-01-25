-- ============================================================================
-- FIX: Add Missing RLS Policies for photo_annotations Table
-- ============================================================================
-- ISSUE: photo_annotations table exists in schema but has NO RLS policies
-- RISK: HIGH - Anyone can view/modify annotations without access control
-- CREATED: 2026-01-23
-- ============================================================================

-- Enable RLS on photo_annotations if not already enabled
ALTER TABLE public.photo_annotations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (clean slate)
DROP POLICY IF EXISTS "Users can view company photo annotations" ON public.photo_annotations;
DROP POLICY IF EXISTS "Users can create photo annotations" ON public.photo_annotations;
DROP POLICY IF EXISTS "Users can update own annotations" ON public.photo_annotations;
DROP POLICY IF EXISTS "Users and admins can delete annotations" ON public.photo_annotations;

-- ============================================================================
-- PHOTO ANNOTATIONS RLS POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SELECT Policy: Users can view annotations on photos in their company
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view company photo annotations"
  ON public.photo_annotations
  FOR SELECT
  USING (
    -- Allow access if the associated media asset belongs to user's company
    EXISTS (
      SELECT 1 FROM public.media_assets
      WHERE id = photo_annotations.media_asset_id
      AND company_id = public.get_user_company_id()
    )
  );

-- ----------------------------------------------------------------------------
-- INSERT Policy: Users can create annotations on their company's photos
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can create photo annotations"
  ON public.photo_annotations
  FOR INSERT
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    -- Can only annotate photos that belong to their company
    AND EXISTS (
      SELECT 1 FROM public.media_assets
      WHERE id = photo_annotations.media_asset_id
      AND company_id = public.get_user_company_id()
    )
    -- Ensure user_id matches authenticated user (prevents impersonation)
    AND user_id = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- UPDATE Policy: Users can update their own annotations
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can update own annotations"
  ON public.photo_annotations
  FOR UPDATE
  USING (
    -- User owns the annotation
    user_id = auth.uid()
    -- And the associated photo belongs to their company (extra security)
    AND EXISTS (
      SELECT 1 FROM public.media_assets
      WHERE id = photo_annotations.media_asset_id
      AND company_id = public.get_user_company_id()
    )
  )
  WITH CHECK (
    -- Prevent changing user_id during update
    user_id = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- DELETE Policy: Users can delete their own annotations, admins can delete any
-- ----------------------------------------------------------------------------
CREATE POLICY "Users and admins can delete annotations"
  ON public.photo_annotations
  FOR DELETE
  USING (
    -- User owns the annotation OR user is company admin
    (user_id = auth.uid() OR public.is_company_admin())
    -- And the associated photo belongs to their company
    AND EXISTS (
      SELECT 1 FROM public.media_assets
      WHERE id = photo_annotations.media_asset_id
      AND company_id = public.get_user_company_id()
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify policies were created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'photo_annotations';

  IF policy_count = 4 THEN
    RAISE NOTICE '✅ SUCCESS: All 4 RLS policies created for photo_annotations';
  ELSE
    RAISE WARNING '⚠️  WARNING: Expected 4 policies, found %', policy_count;
  END IF;
END $$;

-- Show all policies for verification
SELECT
  policyname as "Policy Name",
  cmd as "Command",
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as "Using",
  CASE
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as "With Check"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'photo_annotations'
ORDER BY policyname;

-- ============================================================================
-- TESTING (Optional - Run only in development)
-- ============================================================================

-- Test 1: Verify RLS is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'photo_annotations'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ TEST 1 PASSED: RLS is enabled on photo_annotations';
  ELSE
    RAISE WARNING '❌ TEST 1 FAILED: RLS is NOT enabled on photo_annotations';
  END IF;
END $$;

-- Test 2: Verify all required helper functions exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_company_id') THEN
    RAISE NOTICE '✅ TEST 2a PASSED: get_user_company_id() function exists';
  ELSE
    RAISE WARNING '❌ TEST 2a FAILED: get_user_company_id() function missing';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_company_admin') THEN
    RAISE NOTICE '✅ TEST 2b PASSED: is_company_admin() function exists';
  ELSE
    RAISE WARNING '❌ TEST 2b FAILED: is_company_admin() function missing';
  END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================

/*
SECURITY MODEL:
- Users can only view annotations on photos from their company
- Users can only create annotations on their company's photos
- Users can only modify their own annotations
- Admins can delete any annotation in their company
- Annotations are tied to media_assets, which already have company_id filtering

DEPENDENCIES:
- Requires public.get_user_company_id() function (from master-schema.sql)
- Requires public.is_company_admin() function (from master-schema.sql)
- Requires media_assets table with proper RLS policies

RELATED TABLES:
- media_assets (parent table - has company_id)
- users (auth.users)
- user_profiles (has company_id and role)

COMPLIANCE:
- GDPR: Data isolation by company
- SOC2: Audit trail via user_id
- Multi-tenancy: Company-based access control
*/
