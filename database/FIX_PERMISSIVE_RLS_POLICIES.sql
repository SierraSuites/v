-- ============================================================================
-- FIX: Overly Permissive RLS Policies
-- ============================================================================
-- ISSUE: Some tables have policies that allow ANY authenticated user to insert
-- RISK: HIGH - Users can create fake notifications/logs for other users
-- TABLES AFFECTED:
--   - notifications (allows ANY insert)
--   - activity_logs (allows ANY insert)
-- CREATED: 2026-01-23
-- ============================================================================

-- ============================================================================
-- FIX 1: NOTIFICATIONS TABLE
-- ============================================================================

-- Drop the dangerous policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

-- Create SECURE policies for notifications

-- SELECT: Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (
      -- Also allow if user is company admin (for monitoring)
      SELECT user_id FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
      AND company_id = (
        SELECT company_id FROM public.user_profiles WHERE id = notifications.user_id
      )
    )
  );

-- INSERT: Only allow system/service role OR specific application logic
-- Regular users CANNOT directly insert notifications
CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    -- Option 1: Service role (backend operations)
    auth.jwt() ->> 'role' = 'service_role'
    -- Option 2: Authenticated user creating notification for themselves
    -- (but ONLY for their own user_id)
    OR (
      auth.uid() IS NOT NULL
      AND user_id = auth.uid()
      -- AND notification is related to user's company
      AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND company_id = (
          SELECT company_id FROM public.user_profiles WHERE id = notifications.user_id
        )
      )
    )
  );

-- UPDATE: Users can only update their own notifications (mark as read, etc.)
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    -- Prevent changing user_id
    user_id = auth.uid()
  );

-- DELETE: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  USING (
    user_id = auth.uid()
    -- OR user is system admin
    OR public.is_company_admin()
  );

-- ============================================================================
-- FIX 2: ACTIVITY_LOGS TABLE
-- ============================================================================

-- Drop the dangerous policy
DROP POLICY IF EXISTS "System can create activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can view company activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can delete activity logs" ON public.activity_logs;

-- Create SECURE policies for activity_logs

-- SELECT: Users can view activity logs for their company
CREATE POLICY "Users can view company activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (
    company_id = public.get_user_company_id()
    OR user_id = auth.uid() -- Users can always see their own activity
  );

-- INSERT: Strictly controlled - only service role or the user themselves
CREATE POLICY "Controlled activity log creation"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (
    -- Option 1: Service role (trusted backend operations)
    auth.jwt() ->> 'role' = 'service_role'
    -- Option 2: User logging their OWN activity in their OWN company
    OR (
      auth.uid() IS NOT NULL
      AND user_id = auth.uid()
      AND company_id = public.get_user_company_id()
    )
  );

-- UPDATE: Generally, activity logs should be immutable
-- Only allow service role to update (for corrections)
CREATE POLICY "Service role can update activity logs"
  ON public.activity_logs
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- DELETE: Only admins can delete activity logs (audit trail protection)
CREATE POLICY "Admins can delete activity logs"
  ON public.activity_logs
  FOR DELETE
  USING (
    public.is_company_admin()
    AND company_id = public.get_user_company_id()
  );

-- ============================================================================
-- ADDITIONAL SECURITY: Prevent user_id spoofing via triggers
-- ============================================================================

-- Create trigger to enforce user_id on INSERT for notifications
CREATE OR REPLACE FUNCTION public.enforce_notification_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If not service role, force user_id to match authenticated user
  IF auth.jwt() ->> 'role' != 'service_role' THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_notification_user_id_trigger ON public.notifications;
CREATE TRIGGER enforce_notification_user_id_trigger
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_notification_user_id();

-- Create trigger to enforce user_id and company_id on INSERT for activity_logs
CREATE OR REPLACE FUNCTION public.enforce_activity_log_integrity()
RETURNS TRIGGER AS $$
BEGIN
  -- If not service role, enforce strict controls
  IF auth.jwt() ->> 'role' != 'service_role' THEN
    -- Force user_id to authenticated user
    NEW.user_id := auth.uid();

    -- Force company_id to user's company
    NEW.company_id := public.get_user_company_id();
  END IF;

  -- Always set created_at if not provided
  IF NEW.created_at IS NULL THEN
    NEW.created_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_activity_log_integrity_trigger ON public.activity_logs;
CREATE TRIGGER enforce_activity_log_integrity_trigger
  BEFORE INSERT ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_activity_log_integrity();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify notifications policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'notifications';

  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ SUCCESS: % RLS policies created for notifications', policy_count;
  ELSE
    RAISE WARNING '⚠️  WARNING: Expected at least 4 policies for notifications, found %', policy_count;
  END IF;
END $$;

-- Verify activity_logs policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'activity_logs';

  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ SUCCESS: % RLS policies created for activity_logs', policy_count;
  ELSE
    RAISE WARNING '⚠️  WARNING: Expected at least 4 policies for activity_logs, found %', policy_count;
  END IF;
END $$;

-- Verify triggers were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'enforce_notification_user_id_trigger'
  ) THEN
    RAISE NOTICE '✅ SUCCESS: Notification user_id enforcement trigger created';
  ELSE
    RAISE WARNING '❌ FAILED: Notification trigger not created';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'enforce_activity_log_integrity_trigger'
  ) THEN
    RAISE NOTICE '✅ SUCCESS: Activity log integrity enforcement trigger created';
  ELSE
    RAISE WARNING '❌ FAILED: Activity log trigger not created';
  END IF;
END $$;

-- Show all policies for review
SELECT
  tablename as "Table",
  policyname as "Policy Name",
  cmd as "Command"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('notifications', 'activity_logs')
ORDER BY tablename, policyname;

-- ============================================================================
-- TESTING (Development Only)
-- ============================================================================

-- Test 1: Try to create notification for another user (should fail)
-- Run this as a regular user, NOT service_role
/*
INSERT INTO public.notifications (user_id, title, message, type)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- Fake user ID
  'Test Notification',
  'This should fail or be auto-corrected',
  'info'
);
-- Expected: Either fails OR user_id gets auto-corrected to auth.uid()
*/

-- Test 2: Verify user can create notification for themselves
/*
INSERT INTO public.notifications (user_id, title, message, type)
VALUES (
  auth.uid(), -- Own user ID
  'Test Notification',
  'This should succeed',
  'info'
);
-- Expected: SUCCESS
*/

-- ============================================================================
-- NOTES
-- ============================================================================

/*
SECURITY IMPROVEMENTS:
1. Notifications:
   - Users can only create notifications for themselves
   - Service role can create notifications for any user (trusted backend)
   - Trigger enforces user_id matches auth.uid() for non-service-role requests
   - Users can only view/update/delete their own notifications

2. Activity Logs:
   - Immutable by design (UPDATE restricted to service role only)
   - Users can only create logs for themselves in their company
   - Trigger enforces user_id and company_id integrity
   - Admins can delete logs (for GDPR compliance)
   - All users can view their company's activity logs

BREAKING CHANGES:
- Applications relying on direct notification insertion for other users
  must now use service role credentials
- Activity logs can no longer be updated by regular users
- Any code bypassing triggers will fail RLS checks

MIGRATION PATH:
1. Update application code to use service role for system notifications
2. Create API endpoints that use service role for cross-user notifications
3. Add webhook handlers that use service role credentials

COMPLIANCE:
- SOC2: Audit trail protection via immutable activity logs
- GDPR: Users can delete their notifications
- Multi-tenancy: Company-based isolation
*/
