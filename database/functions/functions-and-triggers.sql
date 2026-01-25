-- ============================================================================
-- DATABASE FUNCTIONS AND TRIGGERS
-- Automation, calculations, and business logic at the database level
-- ============================================================================
-- Created: January 21, 2026
-- Priority: HIGH - Adds automation and data integrity
-- ============================================================================

-- ============================================================================
-- 1. TIMESTAMP MANAGEMENT
-- ============================================================================

-- Function: Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.project_phases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.photo_albums
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.punch_lists
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.punch_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.quote_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sustainability_data
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 2. PROJECT CALCULATIONS
-- ============================================================================

-- Function: Calculate total project expenses
CREATE OR REPLACE FUNCTION public.calculate_project_expenses(project_uuid UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.project_expenses
  WHERE project_id = project_uuid;
$$ LANGUAGE SQL STABLE;

-- Function: Calculate project budget variance
CREATE OR REPLACE FUNCTION public.calculate_budget_variance(project_uuid UUID)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'estimated_budget', p.estimated_budget,
    'actual_cost', p.actual_cost,
    'variance', p.estimated_budget - p.actual_cost,
    'variance_percent',
      CASE
        WHEN p.estimated_budget > 0 THEN
          ((p.estimated_budget - p.actual_cost) / p.estimated_budget * 100)
        ELSE 0
      END,
    'is_over_budget', p.actual_cost > p.estimated_budget
  )
  FROM public.projects p
  WHERE p.id = project_uuid;
$$ LANGUAGE SQL STABLE;

-- Function: Calculate project completion percentage
CREATE OR REPLACE FUNCTION public.calculate_project_completion(project_uuid UUID)
RETURNS INTEGER AS $$
  WITH task_stats AS (
    SELECT
      COUNT(*) as total_tasks,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks
    FROM public.tasks
    WHERE project_id = project_uuid
  )
  SELECT
    CASE
      WHEN total_tasks = 0 THEN 0
      ELSE (completed_tasks * 100 / total_tasks)::INTEGER
    END
  FROM task_stats;
$$ LANGUAGE SQL STABLE;

-- Trigger: Auto-update project progress when tasks change
CREATE OR REPLACE FUNCTION public.update_project_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.projects
  SET progress_percentage = public.calculate_project_completion(NEW.project_id)
  WHERE id = NEW.project_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_progress_on_task_change
  AFTER INSERT OR UPDATE OF status ON public.tasks
  FOR EACH ROW
  WHEN (NEW.project_id IS NOT NULL)
  EXECUTE FUNCTION public.update_project_progress();

-- ============================================================================
-- 3. STORAGE MANAGEMENT
-- ============================================================================

-- Function: Calculate storage usage for a company
CREATE OR REPLACE FUNCTION public.calculate_storage_usage(company_uuid UUID)
RETURNS BIGINT AS $$
  SELECT COALESCE(SUM(file_size), 0)
  FROM public.media_assets
  WHERE company_id = company_uuid;
$$ LANGUAGE SQL STABLE;

-- Function: Get storage usage by file type
CREATE OR REPLACE FUNCTION public.storage_breakdown(company_uuid UUID)
RETURNS TABLE (
  file_type TEXT,
  file_count BIGINT,
  total_size BIGINT
) AS $$
  SELECT
    COALESCE(file_type, 'unknown') as file_type,
    COUNT(*) as file_count,
    SUM(file_size) as total_size
  FROM public.media_assets
  WHERE company_id = company_uuid
  GROUP BY file_type
  ORDER BY total_size DESC;
$$ LANGUAGE SQL STABLE;

-- Function: Check if company can upload more files
CREATE OR REPLACE FUNCTION public.can_upload_file(
  company_uuid UUID,
  file_size_bytes BIGINT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage BIGINT;
  storage_limit BIGINT;
  tier TEXT;
BEGIN
  -- Get company's subscription tier
  SELECT subscription_tier INTO tier
  FROM public.companies
  WHERE id = company_uuid;

  -- Set storage limit based on tier
  storage_limit := CASE tier
    WHEN 'starter' THEN 5368709120      -- 5 GB
    WHEN 'professional' THEN 53687091200 -- 50 GB
    WHEN 'enterprise' THEN 536870912000  -- 500 GB
    ELSE 5368709120                      -- Default 5 GB
  END;

  -- Get current usage
  current_usage := public.calculate_storage_usage(company_uuid);

  -- Check if new file would exceed limit
  RETURN (current_usage + file_size_bytes) <= storage_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. USER & PERMISSION MANAGEMENT
-- ============================================================================

-- Function: Get user's effective permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  user_role TEXT;
  permissions JSONB;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE id = user_uuid;

  -- Build permissions based on role
  permissions := CASE user_role
    WHEN 'owner' THEN jsonb_build_object(
      'can_manage_company', true,
      'can_manage_users', true,
      'can_manage_projects', true,
      'can_manage_billing', true,
      'can_delete_any', true,
      'can_view_all', true
    )
    WHEN 'admin' THEN jsonb_build_object(
      'can_manage_company', false,
      'can_manage_users', true,
      'can_manage_projects', true,
      'can_manage_billing', false,
      'can_delete_any', true,
      'can_view_all', true
    )
    WHEN 'project_manager' THEN jsonb_build_object(
      'can_manage_company', false,
      'can_manage_users', false,
      'can_manage_projects', true,
      'can_manage_billing', false,
      'can_delete_any', false,
      'can_view_all', true
    )
    WHEN 'member' THEN jsonb_build_object(
      'can_manage_company', false,
      'can_manage_users', false,
      'can_manage_projects', false,
      'can_manage_billing', false,
      'can_delete_any', false,
      'can_view_all', true
    )
    WHEN 'viewer' THEN jsonb_build_object(
      'can_manage_company', false,
      'can_manage_users', false,
      'can_manage_projects', false,
      'can_manage_billing', false,
      'can_delete_any', false,
      'can_view_all', false
    )
    ELSE '{}'::jsonb
  END;

  RETURN permissions;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Check if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(
  user_uuid UUID,
  permission_name TEXT
)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (public.get_user_permissions(user_uuid) ->> permission_name)::BOOLEAN,
    false
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================================
-- 5. ACTIVITY LOGGING
-- ============================================================================

-- Function: Create activity log entry
CREATE OR REPLACE FUNCTION public.log_activity(
  p_company_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    company_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at
  ) VALUES (
    p_company_id,
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata,
    NOW()
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Log project creation
CREATE OR REPLACE FUNCTION public.log_project_creation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_activity(
    NEW.company_id,
    NEW.created_by,
    'project.created',
    'project',
    NEW.id,
    jsonb_build_object(
      'project_name', NEW.name,
      'project_type', NEW.type,
      'estimated_budget', NEW.estimated_budget
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_project_creation
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.log_project_creation();

-- Trigger: Log project status changes
CREATE OR REPLACE FUNCTION public.log_project_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_activity(
      NEW.company_id,
      auth.uid(),
      'project.status_changed',
      'project',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'project_name', NEW.name
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_project_status_change
  AFTER UPDATE ON public.projects
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.log_project_status_change();

-- ============================================================================
-- 6. NOTIFICATION AUTOMATION
-- ============================================================================

-- Function: Create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    metadata,
    read,
    created_at
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_link,
    p_metadata,
    false,
    NOW()
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Notify when task is assigned
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    PERFORM public.create_notification(
      NEW.assignee_id,
      'task_assigned',
      'New Task Assigned',
      format('You have been assigned to: %s', NEW.title),
      format('/taskflow?task=%s', NEW.id),
      jsonb_build_object(
        'task_id', NEW.id,
        'task_title', NEW.title,
        'project_id', NEW.project_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_task_assignment
  AFTER INSERT OR UPDATE OF assignee_id ON public.tasks
  FOR EACH ROW
  WHEN (NEW.assignee_id IS NOT NULL)
  EXECUTE FUNCTION public.notify_task_assignment();

-- Trigger: Notify when task is completed
CREATE OR REPLACE FUNCTION public.notify_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Notify project manager
    PERFORM public.create_notification(
      (SELECT project_manager_id FROM public.projects WHERE id = NEW.project_id),
      'task_completed',
      'Task Completed',
      format('%s completed: %s',
        (SELECT full_name FROM public.user_profiles WHERE id = NEW.assignee_id),
        NEW.title
      ),
      format('/taskflow?task=%s', NEW.id),
      jsonb_build_object(
        'task_id', NEW.id,
        'task_title', NEW.title,
        'completed_by', NEW.assignee_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_task_completion
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION public.notify_task_completion();

-- ============================================================================
-- 7. DATA VALIDATION & INTEGRITY
-- ============================================================================

-- Function: Validate project dates
CREATE OR REPLACE FUNCTION public.validate_project_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'Project end date cannot be before start date';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_project_dates
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_project_dates();

-- Function: Prevent negative budgets
CREATE OR REPLACE FUNCTION public.validate_positive_budget()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estimated_budget < 0 THEN
    RAISE EXCEPTION 'Budget cannot be negative';
  END IF;
  IF NEW.actual_cost < 0 THEN
    RAISE EXCEPTION 'Actual cost cannot be negative';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_positive_budget
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_positive_budget();

-- ============================================================================
-- 8. STATISTICS & ANALYTICS FUNCTIONS
-- ============================================================================

-- Function: Get company dashboard stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(company_uuid UUID)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'total_projects', COUNT(DISTINCT p.id),
    'active_projects', COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active'),
    'completed_projects', COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'completed'),
    'total_tasks', COUNT(DISTINCT t.id),
    'completed_tasks', COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed'),
    'overdue_tasks', COUNT(DISTINCT t.id) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status != 'completed'),
    'total_photos', COUNT(DISTINCT m.id),
    'total_quotes', COUNT(DISTINCT q.id),
    'accepted_quotes', COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'accepted'),
    'total_budget', COALESCE(SUM(DISTINCT p.estimated_budget), 0),
    'total_spent', COALESCE(SUM(DISTINCT p.actual_cost), 0)
  )
  FROM public.projects p
  LEFT JOIN public.tasks t ON t.project_id = p.id
  LEFT JOIN public.media_assets m ON m.company_id = company_uuid
  LEFT JOIN public.quotes q ON q.company_id = company_uuid
  WHERE p.company_id = company_uuid;
$$ LANGUAGE SQL STABLE;

-- Function: Get project health score (0-100)
CREATE OR REPLACE FUNCTION public.calculate_project_health(project_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  health_score INTEGER := 100;
  budget_variance DECIMAL;
  schedule_variance INTEGER;
  overdue_tasks INTEGER;
BEGIN
  -- Check budget variance (deduct up to 30 points)
  SELECT (actual_cost - estimated_budget) / NULLIF(estimated_budget, 0) * 100
  INTO budget_variance
  FROM public.projects
  WHERE id = project_uuid;

  IF budget_variance > 0 THEN
    health_score := health_score - LEAST(30, budget_variance::INTEGER);
  END IF;

  -- Check schedule (deduct up to 40 points)
  SELECT EXTRACT(DAY FROM CURRENT_DATE - end_date)::INTEGER
  INTO schedule_variance
  FROM public.projects
  WHERE id = project_uuid AND status = 'active' AND end_date < CURRENT_DATE;

  IF schedule_variance > 0 THEN
    health_score := health_score - LEAST(40, schedule_variance);
  END IF;

  -- Check overdue tasks (deduct up to 30 points)
  SELECT COUNT(*)::INTEGER
  INTO overdue_tasks
  FROM public.tasks
  WHERE project_id = project_uuid
  AND due_date < CURRENT_DATE
  AND status != 'completed';

  IF overdue_tasks > 0 THEN
    health_score := health_score - LEAST(30, overdue_tasks * 5);
  END IF;

  RETURN GREATEST(0, health_score);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 9. CLEANUP & MAINTENANCE
-- ============================================================================

-- Function: Clean up old notifications (> 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND read = true;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Archive completed projects (> 1 year)
CREATE OR REPLACE FUNCTION public.archive_old_projects()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  UPDATE public.projects
  SET archived_at = NOW()
  WHERE status = 'completed'
  AND updated_at < NOW() - INTERVAL '1 year'
  AND archived_at IS NULL;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.calculate_project_expenses(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_budget_variance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_project_completion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_storage_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_breakdown(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_upload_file(UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_project_health(UUID) TO authenticated;

-- Service role only functions
GRANT EXECUTE ON FUNCTION public.log_activity TO service_role;
GRANT EXECUTE ON FUNCTION public.create_notification TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications TO service_role;
GRANT EXECUTE ON FUNCTION public.archive_old_projects TO service_role;

-- ============================================================================
-- END OF FUNCTIONS AND TRIGGERS
-- ============================================================================
