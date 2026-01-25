-- ============================================================
-- QUOTEHUB ENHANCED SCHEMA - BUSINESS WORKFLOW SYSTEM
-- Quotes that flow into Projects naturally
-- ============================================================

-- ============================================================
-- 1. ENHANCED QUOTES TABLE WITH TYPES & PROJECT LINKING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- SMART NUMBERING: Q-2024-PROP-001
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  quote_type VARCHAR(20) DEFAULT 'proposal' CHECK (quote_type IN ('proposal', 'bid', 'estimate', 'change_order', 'maintenance')),
  year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  sequence_number INTEGER,

  -- CLIENT & PROJECT LINKS
  client_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL, -- NULL for new projects, set for change orders
  original_quote_id UUID REFERENCES public.quotes(id), -- For revisions

  -- QUOTE DETAILS
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scope_of_work TEXT,

  -- STATUS WORKFLOW
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'sent', 'viewed', 'commented', 'revised', 'approved', 'rejected', 'on_hold', 'expired', 'won', 'lost', 'cancelled')),
  sub_status VARCHAR(50), -- client_review, pending_signature, etc.

  -- CONVERSION TRACKING (Critical!)
  converted_to_project_id UUID REFERENCES public.projects(id),
  converted_at TIMESTAMPTZ,
  conversion_type VARCHAR(20) CHECK (conversion_type IN ('new_project', 'change_order', 'maintenance_schedule', NULL)),
  auto_create_project BOOLEAN DEFAULT true, -- Auto-convert when approved
  auto_create_tasks BOOLEAN DEFAULT true, -- Auto-create tasks from line items

  -- FINANCIALS
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_type VARCHAR(20) DEFAULT 'fixed',
  discount_value DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  deposit_required DECIMAL(5,2) DEFAULT 0,
  deposit_amount DECIMAL(12,2) DEFAULT 0,
  deposit_received BOOLEAN DEFAULT false,
  currency VARCHAR(3) DEFAULT 'USD',

  -- PROFIT TRACKING
  total_cost DECIMAL(12,2) DEFAULT 0, -- Sum of line item costs
  profit_margin DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN subtotal > 0
      THEN ((subtotal - total_cost) / subtotal * 100)
      ELSE 0
    END
  ) STORED,

  -- DATES
  quote_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  sent_at TIMESTAMPTZ,
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  client_approved_at TIMESTAMPTZ,
  client_rejected_at TIMESTAMPTZ,

  -- TRACKING
  view_count INTEGER DEFAULT 0,
  revision_count INTEGER DEFAULT 0,
  email_sent_count INTEGER DEFAULT 0,

  -- APPROVAL & REJECTION
  approved_by VARCHAR(255),
  rejection_reason TEXT,

  -- CONTENT
  notes TEXT,
  internal_notes TEXT,
  terms_conditions TEXT,
  payment_terms TEXT,
  branding JSONB DEFAULT '{"logo": null, "primaryColor": "#2563EB", "accentColor": "#F97316"}'::jsonb,

  -- METADATA
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON public.quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_type ON public.quotes(quote_type);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON public.quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_project_id ON public.quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_quotes_converted_project ON public.quotes(converted_to_project_id);

-- ============================================================
-- 2. ENHANCED QUOTE LINE ITEMS WITH TASK CONVERSION
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  item_number INTEGER NOT NULL,

  -- TASK CONVERSION (Critical!)
  convert_to_task BOOLEAN DEFAULT true, -- Create task when quote approved
  created_task_id UUID REFERENCES public.tasks(id), -- Track which task was created

  -- ITEM DETAILS
  category VARCHAR(100),
  description TEXT NOT NULL,
  detailed_description TEXT, -- For proposals
  benefits TEXT, -- For proposals: "Energy efficient, 10-year warranty"

  -- QUANTITY & PRICING
  quantity DECIMAL(10,2) DEFAULT 1 CHECK (quantity > 0),
  unit VARCHAR(50) DEFAULT 'ea',
  unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),

  -- COST & MARGIN TRACKING
  cost_price DECIMAL(12,2), -- What it costs you
  markup_percentage DECIMAL(5,2), -- Your markup
  margin DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN unit_price > 0 AND cost_price > 0
      THEN ((unit_price - cost_price) / unit_price * 100)
      ELSE 0
    END
  ) STORED,

  -- TAX
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  is_taxable BOOLEAN DEFAULT true,

  -- CALCULATED TOTALS
  line_total DECIMAL(12,2) DEFAULT 0,

  -- FLAGS
  is_optional BOOLEAN DEFAULT false,
  is_allowance BOOLEAN DEFAULT false, -- For estimates

  -- ORDERING
  sort_order INTEGER DEFAULT 0,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_sort_order ON public.quote_items(quote_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_quote_items_task ON public.quote_items(created_task_id);

-- ============================================================
-- 3. QUOTE ACTIVITIES (Detailed Audit Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,

  -- ACTIVITY TYPE
  activity_type VARCHAR(50) NOT NULL,
  -- created, sent, viewed, commented, revised, approved, rejected,
  -- converted_to_project, change_order_applied, etc.

  -- WHO
  user_id UUID REFERENCES auth.users(id), -- NULL for client actions
  client_name VARCHAR(255), -- For client actions

  -- WHAT
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  -- { "ip_address": "...", "user_agent": "...", "page_viewed": "...", "time_spent": 120 }

  -- WHEN
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_activities_quote_id ON public.quote_activities(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_activities_created_at ON public.quote_activities(created_at DESC);

-- ============================================================
-- 4. CLIENT INTERACTIONS (Comments, Revisions, Questions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_client_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,

  -- INTERACTION TYPE
  interaction_type VARCHAR(50) NOT NULL,
  -- comment, question, revision_request, approve_item, reject_item

  -- TARGET (What they're commenting on)
  target_type VARCHAR(50), -- whole_quote, line_item, terms, scope
  target_id UUID, -- ID of line item, section, etc.

  -- CONTENT
  content TEXT NOT NULL,
  client_name VARCHAR(255),
  client_email VARCHAR(255),

  -- RESOLUTION
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_interactions_quote ON public.quote_client_interactions(quote_id);
CREATE INDEX IF NOT EXISTS idx_client_interactions_target ON public.quote_client_interactions(target_id);

-- ============================================================
-- 5. QUOTE TEMPLATES BY TYPE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- TEMPLATE TYPE
  template_type VARCHAR(20) DEFAULT 'proposal' CHECK (template_type IN ('proposal', 'bid', 'estimate', 'change_order', 'maintenance')),
  category VARCHAR(100), -- residential, commercial, renovation, etc.

  -- CONTENT
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { "items": [...], "settings": {...}, "branding": {...} }

  default_items JSONB DEFAULT '[]'::jsonb,
  default_terms TEXT,
  default_payment_terms TEXT,
  default_tax_rate DECIMAL(5,2) DEFAULT 0,
  default_valid_days INTEGER DEFAULT 30,

  -- USAGE TRACKING
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT false,
  is_system_template BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_templates_user_id ON public.quote_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_templates_type ON public.quote_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_quote_templates_category ON public.quote_templates(category);

-- ============================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_client_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. CREATE RLS POLICIES
-- ============================================================

-- QUOTES POLICIES
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
CREATE POLICY "Users can view their own quotes"
  ON public.quotes FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own quotes" ON public.quotes;
CREATE POLICY "Users can insert their own quotes"
  ON public.quotes FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;
CREATE POLICY "Users can update their own quotes"
  ON public.quotes FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.quotes;
CREATE POLICY "Users can delete their own quotes"
  ON public.quotes FOR DELETE
  USING (user_id = auth.uid());

-- QUOTE ITEMS POLICIES
DROP POLICY IF EXISTS "Users can manage quote items" ON public.quote_items;
CREATE POLICY "Users can manage quote items"
  ON public.quote_items FOR ALL
  USING (
    quote_id IN (
      SELECT id FROM public.quotes WHERE user_id = auth.uid()
    )
  );

-- QUOTE ACTIVITIES POLICIES
DROP POLICY IF EXISTS "Users can manage quote activities" ON public.quote_activities;
CREATE POLICY "Users can manage quote activities"
  ON public.quote_activities FOR ALL
  USING (
    quote_id IN (
      SELECT id FROM public.quotes WHERE user_id = auth.uid()
    )
  );

-- CLIENT INTERACTIONS POLICIES
DROP POLICY IF EXISTS "Users can manage client interactions" ON public.quote_client_interactions;
CREATE POLICY "Users can manage client interactions"
  ON public.quote_client_interactions FOR ALL
  USING (
    quote_id IN (
      SELECT id FROM public.quotes WHERE user_id = auth.uid()
    )
  );

-- TEMPLATES POLICIES
DROP POLICY IF EXISTS "Users can view templates" ON public.quote_templates;
CREATE POLICY "Users can view templates"
  ON public.quote_templates FOR SELECT
  USING (user_id = auth.uid() OR is_public = true);

DROP POLICY IF EXISTS "Users can manage their templates" ON public.quote_templates;
CREATE POLICY "Users can manage their templates"
  ON public.quote_templates FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- 8. GRANT PERMISSIONS
-- ============================================================
GRANT ALL ON public.quotes TO authenticated;
GRANT ALL ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_activities TO authenticated;
GRANT ALL ON public.quote_client_interactions TO authenticated;
GRANT ALL ON public.quote_templates TO authenticated;

-- ============================================================
-- 9. AUTO-CALCULATION FUNCTIONS
-- ============================================================

-- Update line item totals
CREATE OR REPLACE FUNCTION update_line_item_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate line total
  NEW.line_total := NEW.quantity * NEW.unit_price;

  -- Calculate tax if taxable
  IF NEW.is_taxable THEN
    NEW.tax_amount := NEW.line_total * (NEW.tax_rate / 100);
  ELSE
    NEW.tax_amount := 0;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_line_item_totals ON public.quote_items;
CREATE TRIGGER trigger_update_line_item_totals
BEFORE INSERT OR UPDATE ON public.quote_items
FOR EACH ROW
EXECUTE FUNCTION update_line_item_totals();

-- Update quote totals
CREATE OR REPLACE FUNCTION update_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
  quote_subtotal DECIMAL(12,2);
  quote_cost DECIMAL(12,2);
  quote_tax DECIMAL(12,2);
  quote_discount DECIMAL(12,2);
  quote_total DECIMAL(12,2);
  quote_deposit DECIMAL(12,2);
  quote_record RECORD;
BEGIN
  SELECT * INTO quote_record FROM public.quotes
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);

  -- Calculate subtotal and cost from line items
  SELECT
    COALESCE(SUM(line_total), 0),
    COALESCE(SUM(quantity * COALESCE(cost_price, 0)), 0)
  INTO quote_subtotal, quote_cost
  FROM public.quote_items
  WHERE quote_id = quote_record.id;

  -- Calculate tax
  quote_tax := quote_subtotal * (quote_record.tax_rate / 100);

  -- Calculate discount
  IF quote_record.discount_type = 'percentage' THEN
    quote_discount := quote_subtotal * (quote_record.discount_value / 100);
  ELSE
    quote_discount := quote_record.discount_value;
  END IF;

  -- Calculate total
  quote_total := quote_subtotal + quote_tax - quote_discount;

  -- Calculate deposit
  quote_deposit := quote_total * (quote_record.deposit_required / 100);

  -- Update quote
  UPDATE public.quotes
  SET
    subtotal = quote_subtotal,
    total_cost = quote_cost,
    tax_amount = quote_tax,
    discount_amount = quote_discount,
    total_amount = quote_total,
    deposit_amount = quote_deposit,
    updated_at = NOW()
  WHERE id = quote_record.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quote_totals ON public.quote_items;
CREATE TRIGGER trigger_update_quote_totals
AFTER INSERT OR UPDATE OR DELETE ON public.quote_items
FOR EACH ROW
EXECUTE FUNCTION update_quote_totals();

-- ============================================================
-- 10. SMART QUOTE NUMBERING BY TYPE
-- ============================================================
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix VARCHAR(4);
  type_prefix VARCHAR(4);
  sequence_num INTEGER;
  new_quote_number VARCHAR(50);
BEGIN
  -- Get current year
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- Get type prefix
  type_prefix := CASE NEW.quote_type
    WHEN 'proposal' THEN 'PROP'
    WHEN 'bid' THEN 'BID'
    WHEN 'estimate' THEN 'EST'
    WHEN 'change_order' THEN 'CHG'
    WHEN 'maintenance' THEN 'MNT'
    ELSE 'QUOT'
  END;

  -- Get next sequence for this type and year
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO sequence_num
  FROM public.quotes
  WHERE quote_type = NEW.quote_type
  AND year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND user_id = NEW.user_id;

  -- Generate: Q-2024-PROP-001
  new_quote_number := 'Q-' || year_prefix || '-' || type_prefix || '-' || LPAD(sequence_num::TEXT, 3, '0');

  NEW.quote_number := new_quote_number;
  NEW.year := EXTRACT(YEAR FROM CURRENT_DATE);
  NEW.sequence_number := sequence_num;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_quote_number ON public.quotes;
CREATE TRIGGER trigger_generate_quote_number
BEFORE INSERT ON public.quotes
FOR EACH ROW
WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
EXECUTE FUNCTION generate_quote_number();

-- ============================================================
-- 11. LOG QUOTE ACTIVITIES
-- ============================================================
CREATE OR REPLACE FUNCTION log_quote_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.quote_activities (quote_id, activity_type, description, user_id)
    VALUES (NEW.id, 'created', 'Quote created', NEW.created_by);

  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status != NEW.status THEN
      INSERT INTO public.quote_activities (quote_id, activity_type, description, user_id, metadata)
      VALUES (
        NEW.id,
        'status_changed',
        'Status changed from ' || OLD.status || ' to ' || NEW.status,
        NEW.created_by,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;

    -- Log conversion to project
    IF OLD.converted_to_project_id IS NULL AND NEW.converted_to_project_id IS NOT NULL THEN
      INSERT INTO public.quote_activities (quote_id, activity_type, description, user_id, metadata)
      VALUES (
        NEW.id,
        'converted_to_project',
        'Quote converted to project',
        NEW.created_by,
        jsonb_build_object(
          'project_id', NEW.converted_to_project_id,
          'conversion_type', NEW.conversion_type
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_quote_activity ON public.quotes;
CREATE TRIGGER trigger_log_quote_activity
AFTER INSERT OR UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION log_quote_activity();

-- ============================================================
-- 12. QUOTE → PROJECT CONVERSION WORKFLOW
-- ============================================================

-- Function to convert approved proposal/bid to new project
CREATE OR REPLACE FUNCTION convert_quote_to_project(quote_id_param UUID)
RETURNS UUID AS $$
DECLARE
  quote_record RECORD;
  new_project_id UUID;
  item_record RECORD;
  new_task_id UUID;
BEGIN
  -- Get quote details
  SELECT * INTO quote_record FROM public.quotes WHERE id = quote_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  IF quote_record.status != 'approved' THEN
    RAISE EXCEPTION 'Quote must be approved before conversion';
  END IF;

  IF quote_record.converted_to_project_id IS NOT NULL THEN
    RAISE EXCEPTION 'Quote already converted to project';
  END IF;

  -- Create new project
  INSERT INTO public.projects (
    user_id,
    name,
    description,
    client_id,
    status,
    start_date,
    budget,
    created_at,
    updated_at
  ) VALUES (
    quote_record.user_id,
    quote_record.title,
    'Created from ' || quote_record.quote_number || '\n\n' || COALESCE(quote_record.description, ''),
    quote_record.client_id,
    'planning',
    CURRENT_DATE,
    quote_record.total_amount,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_project_id;

  -- Update quote with project link
  UPDATE public.quotes
  SET
    converted_to_project_id = new_project_id,
    converted_at = NOW(),
    conversion_type = 'new_project',
    updated_at = NOW()
  WHERE id = quote_id_param;

  -- Auto-create tasks from line items (if enabled)
  IF quote_record.auto_create_tasks THEN
    FOR item_record IN
      SELECT * FROM public.quote_items
      WHERE quote_id = quote_id_param
      AND convert_to_task = true
      ORDER BY sort_order
    LOOP
      -- Create task from line item
      INSERT INTO public.tasks (
        user_id,
        project_id,
        title,
        description,
        status,
        priority,
        estimated_hours,
        created_at,
        updated_at
      ) VALUES (
        quote_record.user_id,
        new_project_id,
        item_record.description,
        COALESCE(item_record.detailed_description, item_record.notes, ''),
        'pending',
        'medium',
        CASE
          WHEN item_record.unit = 'hours' THEN item_record.quantity
          ELSE NULL
        END,
        NOW(),
        NOW()
      )
      RETURNING id INTO new_task_id;

      -- Link task back to quote item
      UPDATE public.quote_items
      SET created_task_id = new_task_id
      WHERE id = item_record.id;
    END LOOP;
  END IF;

  -- Log activity
  INSERT INTO public.quote_activities (
    quote_id,
    activity_type,
    description,
    user_id,
    metadata
  ) VALUES (
    quote_id_param,
    'converted_to_project',
    'Quote converted to project: ' || new_project_id,
    quote_record.user_id,
    jsonb_build_object(
      'project_id', new_project_id,
      'conversion_type', 'new_project'
    )
  );

  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 13. CHANGE ORDER → UPDATE PROJECT WORKFLOW
-- ============================================================

-- Function to apply change order to existing project
CREATE OR REPLACE FUNCTION apply_change_order_to_project(quote_id_param UUID)
RETURNS UUID AS $$
DECLARE
  quote_record RECORD;
  target_project_id UUID;
  item_record RECORD;
  new_task_id UUID;
  current_budget DECIMAL(12,2);
BEGIN
  -- Get quote details
  SELECT * INTO quote_record FROM public.quotes WHERE id = quote_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  IF quote_record.quote_type != 'change_order' THEN
    RAISE EXCEPTION 'Quote must be a change order';
  END IF;

  IF quote_record.status != 'approved' THEN
    RAISE EXCEPTION 'Change order must be approved';
  END IF;

  IF quote_record.project_id IS NULL THEN
    RAISE EXCEPTION 'Change order must be linked to a project';
  END IF;

  target_project_id := quote_record.project_id;

  -- Update project budget
  SELECT budget INTO current_budget FROM public.projects WHERE id = target_project_id;

  UPDATE public.projects
  SET
    budget = current_budget + quote_record.total_amount,
    updated_at = NOW()
  WHERE id = target_project_id;

  -- Update quote with conversion info
  UPDATE public.quotes
  SET
    converted_to_project_id = target_project_id,
    converted_at = NOW(),
    conversion_type = 'change_order',
    updated_at = NOW()
  WHERE id = quote_id_param;

  -- Create tasks from change order line items (if enabled)
  IF quote_record.auto_create_tasks THEN
    FOR item_record IN
      SELECT * FROM public.quote_items
      WHERE quote_id = quote_id_param
      AND convert_to_task = true
      ORDER BY sort_order
    LOOP
      -- Create task
      INSERT INTO public.tasks (
        user_id,
        project_id,
        title,
        description,
        status,
        priority,
        estimated_hours,
        created_at,
        updated_at
      ) VALUES (
        quote_record.user_id,
        target_project_id,
        '[CHANGE ORDER] ' || item_record.description,
        'From ' || quote_record.quote_number || '\n\n' || COALESCE(item_record.detailed_description, item_record.notes, ''),
        'pending',
        'high', -- Change orders are higher priority
        CASE
          WHEN item_record.unit = 'hours' THEN item_record.quantity
          ELSE NULL
        END,
        NOW(),
        NOW()
      )
      RETURNING id INTO new_task_id;

      -- Link task back to quote item
      UPDATE public.quote_items
      SET created_task_id = new_task_id
      WHERE id = item_record.id;
    END LOOP;
  END IF;

  -- Log activity
  INSERT INTO public.quote_activities (
    quote_id,
    activity_type,
    description,
    user_id,
    metadata
  ) VALUES (
    quote_id_param,
    'change_order_applied',
    'Change order applied to project: ' || target_project_id,
    quote_record.user_id,
    jsonb_build_object(
      'project_id', target_project_id,
      'budget_increase', quote_record.total_amount,
      'conversion_type', 'change_order'
    )
  );

  RETURN target_project_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 14. AUTO-TRIGGER CONVERSION ON APPROVAL
-- ============================================================

-- Automatically convert quotes to projects when approved
CREATE OR REPLACE FUNCTION auto_convert_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed to 'approved'
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN

    -- Check if auto_create_project is enabled
    IF NEW.auto_create_project THEN

      -- Handle based on quote type
      IF NEW.quote_type IN ('proposal', 'bid') THEN
        -- Convert to new project
        PERFORM convert_quote_to_project(NEW.id);

      ELSIF NEW.quote_type = 'change_order' AND NEW.project_id IS NOT NULL THEN
        -- Apply change order to existing project
        PERFORM apply_change_order_to_project(NEW.id);

      END IF;

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_convert_on_approval ON public.quotes;
CREATE TRIGGER trigger_auto_convert_on_approval
AFTER UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION auto_convert_on_approval();

-- ============================================================
-- 15. ANALYTICS VIEW FOR QUOTE PERFORMANCE
-- ============================================================

CREATE OR REPLACE VIEW quote_analytics AS
SELECT
  q.user_id,
  q.quote_type,
  q.status,
  DATE_TRUNC('month', q.created_at) as month,
  COUNT(*) as quote_count,
  SUM(q.total_amount) as total_value,
  AVG(q.total_amount) as avg_value,
  AVG(q.profit_margin) as avg_margin,
  COUNT(CASE WHEN q.status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN q.status = 'rejected' THEN 1 END) as rejected_count,
  COUNT(CASE WHEN q.converted_to_project_id IS NOT NULL THEN 1 END) as converted_count,
  AVG(EXTRACT(EPOCH FROM (q.client_approved_at - q.sent_at)) / 86400) as avg_days_to_approval
FROM public.quotes q
GROUP BY q.user_id, q.quote_type, q.status, DATE_TRUNC('month', q.created_at);

-- ============================================================
-- 16. HELPER FUNCTIONS FOR CLIENT PORTAL
-- ============================================================

-- Function to record quote view by client
CREATE OR REPLACE FUNCTION record_quote_view(
  quote_id_param UUID,
  client_name_param VARCHAR(255) DEFAULT NULL,
  metadata_param JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  -- Update view count and timestamp
  UPDATE public.quotes
  SET
    view_count = view_count + 1,
    last_viewed_at = NOW(),
    first_viewed_at = COALESCE(first_viewed_at, NOW()),
    updated_at = NOW()
  WHERE id = quote_id_param;

  -- Update status to 'viewed' if currently 'sent'
  UPDATE public.quotes
  SET status = 'viewed'
  WHERE id = quote_id_param AND status = 'sent';

  -- Log activity
  INSERT INTO public.quote_activities (
    quote_id,
    activity_type,
    description,
    client_name,
    metadata
  ) VALUES (
    quote_id_param,
    'viewed',
    'Quote viewed by client',
    client_name_param,
    metadata_param
  );
END;
$$ LANGUAGE plpgsql;

-- Function to add client comment/question
CREATE OR REPLACE FUNCTION add_client_interaction(
  quote_id_param UUID,
  interaction_type_param VARCHAR(50),
  content_param TEXT,
  client_name_param VARCHAR(255),
  client_email_param VARCHAR(255),
  target_type_param VARCHAR(50) DEFAULT NULL,
  target_id_param UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_interaction_id UUID;
BEGIN
  -- Create interaction
  INSERT INTO public.quote_client_interactions (
    quote_id,
    interaction_type,
    content,
    client_name,
    client_email,
    target_type,
    target_id
  ) VALUES (
    quote_id_param,
    interaction_type_param,
    content_param,
    client_name_param,
    client_email_param,
    target_type_param,
    target_id_param
  )
  RETURNING id INTO new_interaction_id;

  -- Update quote status to 'commented'
  UPDATE public.quotes
  SET status = 'commented'
  WHERE id = quote_id_param AND status IN ('sent', 'viewed');

  -- Log activity
  INSERT INTO public.quote_activities (
    quote_id,
    activity_type,
    description,
    client_name,
    metadata
  ) VALUES (
    quote_id_param,
    'client_' || interaction_type_param,
    'Client ' || interaction_type_param || ': ' || LEFT(content_param, 100),
    client_name_param,
    jsonb_build_object(
      'interaction_id', new_interaction_id,
      'interaction_type', interaction_type_param
    )
  );

  RETURN new_interaction_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SETUP COMPLETE!
-- ============================================================

SELECT 'QuoteHub Enhanced Schema - Business Workflow System Created!' as status;
