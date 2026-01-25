-- ============================================================
-- QUOTEHUB COMPLETE DATABASE SETUP
-- Run this in Supabase SQL Editor to set up QuoteHub module
-- ============================================================

-- ============================================================
-- 1. CREATE CONTACTS TABLE (for clients)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name VARCHAR(255),
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United States',
  contact_type VARCHAR(50) DEFAULT 'client', -- client, vendor, subcontractor
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. CREATE QUOTES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  client_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'approved', 'rejected', 'expired')),

  -- Financial fields
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_type VARCHAR(20) DEFAULT 'fixed', -- fixed or percentage
  discount_value DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  deposit_required DECIMAL(5,2) DEFAULT 0,
  deposit_amount DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Dates
  quote_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Additional details
  approved_by VARCHAR(255),
  rejection_reason TEXT,
  notes TEXT,
  internal_notes TEXT,
  terms_conditions TEXT,
  payment_terms TEXT,

  -- Branding and customization
  branding JSONB DEFAULT '{"logo": null, "primaryColor": "#2563EB", "accentColor": "#F97316"}'::jsonb,

  -- Tracking
  email_sent_count INTEGER DEFAULT 0,
  last_email_sent_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for quote number lookup
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON public.quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON public.quotes(client_id);

-- ============================================================
-- 3. CREATE QUOTE LINE ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  item_number INTEGER NOT NULL,
  category VARCHAR(100),
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1 CHECK (quantity > 0),
  unit VARCHAR(50) DEFAULT 'ea',
  unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  line_total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  is_optional BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_sort_order ON public.quote_items(quote_id, sort_order);

-- ============================================================
-- 4. CREATE QUOTE TEMPLATES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  template_type VARCHAR(50) DEFAULT 'custom', -- custom, system, shared

  -- Template content
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Structure: { "items": [...], "settings": {...}, "branding": {...} }

  -- Template settings
  default_terms TEXT,
  default_payment_terms TEXT,
  default_tax_rate DECIMAL(5,2) DEFAULT 0,
  default_valid_days INTEGER DEFAULT 30,

  -- Usage tracking
  is_public BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_templates_user_id ON public.quote_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_templates_category ON public.quote_templates(category);

-- ============================================================
-- 5. CREATE QUOTE ACTIVITIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  -- Types: created, edited, sent, viewed, commented, approved, rejected, expired, converted
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Metadata can include: {ip_address, user_agent, location, changes, etc.}

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_activities_quote_id ON public.quote_activities(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_activities_created_at ON public.quote_activities(created_at DESC);

-- ============================================================
-- 6. CREATE QUOTE EMAIL TRACKING TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  sent_to VARCHAR(255) NOT NULL,
  sent_from VARCHAR(255),
  subject VARCHAR(500),
  message_body TEXT,

  -- Tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,

  -- Technical details
  ip_address INET,
  user_agent TEXT,
  location VARCHAR(255),

  -- Email service metadata
  email_service_id VARCHAR(255), -- For tracking with SendGrid/Mailgun
  email_status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, bounced, failed

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_emails_quote_id ON public.quote_emails(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_emails_sent_at ON public.quote_emails(sent_at DESC);

-- ============================================================
-- 7. CREATE QUOTE COMMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  comment_text TEXT NOT NULL,
  comment_type VARCHAR(50) DEFAULT 'internal', -- internal, client, revision_request
  is_client_visible BOOLEAN DEFAULT false,

  -- Threading
  parent_comment_id UUID REFERENCES public.quote_comments(id) ON DELETE CASCADE,

  -- Mentions
  mentioned_users UUID[],

  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_comments_quote_id ON public.quote_comments(quote_id);

-- ============================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. CREATE RLS POLICIES
-- ============================================================

-- CONTACTS POLICIES
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
CREATE POLICY "Users can view their own contacts"
  ON public.contacts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own contacts" ON public.contacts;
CREATE POLICY "Users can insert their own contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
CREATE POLICY "Users can update their own contacts"
  ON public.contacts FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;
CREATE POLICY "Users can delete their own contacts"
  ON public.contacts FOR DELETE
  USING (user_id = auth.uid());

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

-- QUOTE TEMPLATES POLICIES
DROP POLICY IF EXISTS "Users can view templates" ON public.quote_templates;
CREATE POLICY "Users can view templates"
  ON public.quote_templates FOR SELECT
  USING (user_id = auth.uid() OR is_public = true);

DROP POLICY IF EXISTS "Users can manage their templates" ON public.quote_templates;
CREATE POLICY "Users can manage their templates"
  ON public.quote_templates FOR ALL
  USING (user_id = auth.uid());

-- QUOTE ACTIVITIES POLICIES
DROP POLICY IF EXISTS "Users can view quote activities" ON public.quote_activities;
CREATE POLICY "Users can view quote activities"
  ON public.quote_activities FOR ALL
  USING (
    quote_id IN (
      SELECT id FROM public.quotes WHERE user_id = auth.uid()
    )
  );

-- QUOTE EMAILS POLICIES
DROP POLICY IF EXISTS "Users can manage quote emails" ON public.quote_emails;
CREATE POLICY "Users can manage quote emails"
  ON public.quote_emails FOR ALL
  USING (
    quote_id IN (
      SELECT id FROM public.quotes WHERE user_id = auth.uid()
    )
  );

-- QUOTE COMMENTS POLICIES
DROP POLICY IF EXISTS "Users can manage quote comments" ON public.quote_comments;
CREATE POLICY "Users can manage quote comments"
  ON public.quote_comments FOR ALL
  USING (
    quote_id IN (
      SELECT id FROM public.quotes WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 10. GRANT PERMISSIONS
-- ============================================================
GRANT ALL ON public.contacts TO authenticated;
GRANT ALL ON public.quotes TO authenticated;
GRANT ALL ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_templates TO authenticated;
GRANT ALL ON public.quote_activities TO authenticated;
GRANT ALL ON public.quote_emails TO authenticated;
GRANT ALL ON public.quote_comments TO authenticated;

-- ============================================================
-- 11. CREATE FUNCTIONS FOR AUTO-CALCULATIONS
-- ============================================================

-- Function to update quote totals when line items change
CREATE OR REPLACE FUNCTION update_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
  quote_subtotal DECIMAL(12,2);
  quote_tax DECIMAL(12,2);
  quote_discount DECIMAL(12,2);
  quote_total DECIMAL(12,2);
  quote_deposit DECIMAL(12,2);
  quote_record RECORD;
BEGIN
  -- Get the quote record
  SELECT * INTO quote_record FROM public.quotes
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);

  -- Calculate subtotal from all line items
  SELECT COALESCE(SUM(line_total), 0) INTO quote_subtotal
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

  -- Update the quote
  UPDATE public.quotes
  SET
    subtotal = quote_subtotal,
    tax_amount = quote_tax,
    discount_amount = quote_discount,
    total_amount = quote_total,
    deposit_amount = quote_deposit,
    updated_at = NOW()
  WHERE id = quote_record.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update quote totals
DROP TRIGGER IF EXISTS trigger_update_quote_totals ON public.quote_items;
CREATE TRIGGER trigger_update_quote_totals
AFTER INSERT OR UPDATE OR DELETE ON public.quote_items
FOR EACH ROW
EXECUTE FUNCTION update_quote_totals();

-- Function to update line item totals
CREATE OR REPLACE FUNCTION update_line_item_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate line total
  NEW.line_total := NEW.quantity * NEW.unit_price;

  -- Calculate tax for this line item
  NEW.tax_amount := NEW.line_total * (NEW.tax_rate / 100);

  -- Update timestamp
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for line item calculations
DROP TRIGGER IF EXISTS trigger_update_line_item_totals ON public.quote_items;
CREATE TRIGGER trigger_update_line_item_totals
BEFORE INSERT OR UPDATE ON public.quote_items
FOR EACH ROW
EXECUTE FUNCTION update_line_item_totals();

-- Function to generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix VARCHAR(4);
  sequence_num INTEGER;
  new_quote_number VARCHAR(50);
BEGIN
  -- Get current year
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(quote_number FROM '\d+$') AS INTEGER
    )
  ), 0) + 1 INTO sequence_num
  FROM public.quotes
  WHERE quote_number LIKE 'Q-' || year_prefix || '-%'
  AND user_id = NEW.user_id;

  -- Generate new quote number: Q-2024-001
  new_quote_number := 'Q-' || year_prefix || '-' || LPAD(sequence_num::TEXT, 3, '0');

  NEW.quote_number := new_quote_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate quote number
DROP TRIGGER IF EXISTS trigger_generate_quote_number ON public.quotes;
CREATE TRIGGER trigger_generate_quote_number
BEFORE INSERT ON public.quotes
FOR EACH ROW
WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
EXECUTE FUNCTION generate_quote_number();

-- Function to log quote activities
CREATE OR REPLACE FUNCTION log_quote_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.quote_activities (quote_id, activity_type, description, created_by)
    VALUES (NEW.id, 'created', 'Quote created', NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO public.quote_activities (quote_id, activity_type, description, created_by, metadata)
      VALUES (
        NEW.id,
        'status_changed',
        'Status changed from ' || OLD.status || ' to ' || NEW.status,
        NEW.created_by,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log activities
DROP TRIGGER IF EXISTS trigger_log_quote_activity ON public.quotes;
CREATE TRIGGER trigger_log_quote_activity
AFTER INSERT OR UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION log_quote_activity();

-- ============================================================
-- 12. INSERT DEFAULT QUOTE TEMPLATES
-- ============================================================

-- We'll add default templates after user creation, so skip for now

-- ============================================================
-- 13. CREATE VIEWS FOR ANALYTICS
-- ============================================================

CREATE OR REPLACE VIEW quote_analytics AS
SELECT
  user_id,
  COUNT(*) as total_quotes,
  COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
  COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
  SUM(total_amount) FILTER (WHERE status = 'approved') as approved_value,
  SUM(total_amount) as total_value,
  CASE
    WHEN COUNT(*) FILTER (WHERE status IN ('sent', 'approved', 'rejected')) > 0
    THEN ROUND(
      (COUNT(*) FILTER (WHERE status = 'approved')::DECIMAL /
       COUNT(*) FILTER (WHERE status IN ('sent', 'approved', 'rejected'))::DECIMAL * 100),
      2
    )
    ELSE 0
  END as conversion_rate,
  AVG(total_amount) as average_quote_value
FROM public.quotes
GROUP BY user_id;

-- ============================================================
-- SETUP COMPLETE!
-- ============================================================

SELECT 'QuoteHub database setup completed successfully!' as status;
