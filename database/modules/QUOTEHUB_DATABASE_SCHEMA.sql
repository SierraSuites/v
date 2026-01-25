-- ============================================
-- QUOTEHUB DATABASE SCHEMA
-- ============================================
-- Purpose: Professional quote and proposal management for construction
-- Features: Templates, pricing engine, client management, PDF generation
-- ============================================

-- ============================================
-- 1. CLIENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  address JSONB, -- { street, city, state, zip, country }
  website TEXT,

  -- Contact details
  contact_person TEXT,
  contact_title TEXT,

  -- Classification
  client_type TEXT CHECK (client_type IN ('residential', 'commercial', 'industrial', 'government', 'other')) DEFAULT 'residential',
  industry TEXT,

  -- Preferences
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'sms')) DEFAULT 'email',
  tax_exempt BOOLEAN DEFAULT false,

  -- Metadata
  notes TEXT,
  tags TEXT[],
  total_quotes_sent INTEGER DEFAULT 0,
  total_quotes_accepted INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for clients
CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_type ON clients(client_type);
CREATE INDEX idx_clients_created ON clients(created_at DESC);

-- ============================================
-- 2. QUOTES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  quote_number TEXT UNIQUE NOT NULL, -- "QS-2024-001"

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  quote_type TEXT CHECK (quote_type IN ('estimate', 'proposal', 'bid', 'change_order')) DEFAULT 'estimate',

  -- Status tracking
  status TEXT CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted')) DEFAULT 'draft',

  -- Client information
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_contact_info JSONB, -- Snapshot at quote creation

  -- Pricing details
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',

  -- Payment terms
  payment_terms TEXT, -- "Net 30", "50% deposit", etc.
  payment_schedule JSONB, -- [{ percentage, due_date, description }]

  -- Validity and dates
  valid_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  first_viewed_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Scope and terms
  scope_of_work TEXT,
  terms_and_conditions TEXT,
  notes TEXT, -- Internal notes
  client_notes TEXT, -- Notes visible to client

  -- Template reference
  template_id UUID REFERENCES quote_templates(id) ON DELETE SET NULL,

  -- Settings
  show_line_item_details BOOLEAN DEFAULT true,
  require_signature BOOLEAN DEFAULT false,
  signature_data JSONB, -- { name, date, ip, signature_url }

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Full text search
  search_vector tsvector
);

-- Indexes for quotes
CREATE INDEX idx_quotes_company ON quotes(company_id);
CREATE INDEX idx_quotes_client ON quotes(client_id);
CREATE INDEX idx_quotes_project ON quotes(project_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_number ON quotes(quote_number);
CREATE INDEX idx_quotes_created ON quotes(created_at DESC);
CREATE INDEX idx_quotes_valid_until ON quotes(valid_until);
CREATE INDEX idx_quotes_search ON quotes USING gin(search_vector);

-- ============================================
-- 3. QUOTE LINE ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,

  -- Item details
  item_type TEXT CHECK (item_type IN ('labor', 'material', 'equipment', 'subcontractor', 'overhead', 'profit', 'permit', 'other')) NOT NULL,
  category TEXT, -- Framing, Electrical, Plumbing, etc.
  description TEXT NOT NULL,
  detailed_description TEXT,

  -- Pricing
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'hours', -- hours, days, units, sqft, lbs, etc.
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  -- Markup and margins
  cost_price DECIMAL(10,2), -- Actual cost (not shown to client)
  markup_percentage DECIMAL(5,2),
  margin_percentage DECIMAL(5,2),

  -- Optionality
  is_optional BOOLEAN DEFAULT false,
  is_taxable BOOLEAN DEFAULT true,

  -- Display
  sort_order INTEGER DEFAULT 0,
  show_in_summary BOOLEAN DEFAULT true,

  -- Metadata
  sku TEXT,
  supplier TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for line items
CREATE INDEX idx_quote_line_items_quote ON quote_line_items(quote_id);
CREATE INDEX idx_quote_line_items_type ON quote_line_items(item_type);
CREATE INDEX idx_quote_line_items_category ON quote_line_items(category);
CREATE INDEX idx_quote_line_items_sort ON quote_line_items(quote_id, sort_order);

-- ============================================
-- 4. QUOTE TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS quote_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Template info
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('residential', 'commercial', 'industrial', 'renovation', 'landscaping', 'specialty', 'custom')) DEFAULT 'custom',
  subcategory TEXT,

  -- Template structure
  template_data JSONB NOT NULL, -- Serialized line items and settings

  -- Pricing defaults
  default_tax_rate DECIMAL(5,2) DEFAULT 0,
  default_payment_terms TEXT,
  default_terms_and_conditions TEXT,

  -- Visibility
  is_public BOOLEAN DEFAULT FALSE, -- System templates vs company templates
  is_active BOOLEAN DEFAULT TRUE,

  -- Usage stats
  times_used INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for templates
CREATE INDEX idx_quote_templates_company ON quote_templates(company_id);
CREATE INDEX idx_quote_templates_category ON quote_templates(category);
CREATE INDEX idx_quote_templates_active ON quote_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_quote_templates_public ON quote_templates(is_public) WHERE is_public = true;

-- ============================================
-- 5. QUOTE ACTIVITIES
-- ============================================

CREATE TABLE IF NOT EXISTS quote_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT CHECK (activity_type IN ('created', 'updated', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted', 'comment', 'reminder')) NOT NULL,
  description TEXT NOT NULL,

  -- Actor
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  ip_address INET,
  user_agent TEXT,

  -- Additional data
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activities
CREATE INDEX idx_quote_activities_quote ON quote_activities(quote_id);
CREATE INDEX idx_quote_activities_type ON quote_activities(activity_type);
CREATE INDEX idx_quote_activities_created ON quote_activities(created_at DESC);

-- ============================================
-- 6. QUOTE DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS quote_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,

  -- Document info
  document_type TEXT CHECK (document_type IN ('pdf', 'attachment', 'signature', 'photo')) NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,

  -- Document metadata
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,

  -- Generation details (for PDFs)
  generated_at TIMESTAMPTZ,
  generated_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for documents
CREATE INDEX idx_quote_documents_quote ON quote_documents(quote_id);
CREATE INDEX idx_quote_documents_type ON quote_documents(document_type);
CREATE INDEX idx_quote_documents_current ON quote_documents(is_current) WHERE is_current = true;

-- ============================================
-- 7. PRICING CATALOG (Optional - for quick item lookup)
-- ============================================

CREATE TABLE IF NOT EXISTS pricing_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Item details
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  item_type TEXT CHECK (item_type IN ('labor', 'material', 'equipment', 'subcontractor', 'other')) NOT NULL,

  -- Pricing
  unit TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  markup_percentage DECIMAL(5,2),

  -- Metadata
  sku TEXT,
  supplier TEXT,
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for pricing catalog
CREATE INDEX idx_pricing_catalog_company ON pricing_catalog(company_id);
CREATE INDEX idx_pricing_catalog_category ON pricing_catalog(category);
CREATE INDEX idx_pricing_catalog_type ON pricing_catalog(item_type);
CREATE INDEX idx_pricing_catalog_active ON pricing_catalog(is_active) WHERE is_active = true;

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  count INTEGER;
  quote_num TEXT;
BEGIN
  year := EXTRACT(YEAR FROM NOW())::TEXT;

  -- Get count of quotes for this company this year
  SELECT COUNT(*) INTO count
  FROM quotes
  WHERE company_id = company_uuid
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  count := count + 1;
  quote_num := 'QS-' || year || '-' || LPAD(count::TEXT, 4, '0');

  RETURN quote_num;
END;
$$ LANGUAGE plpgsql;

-- Calculate quote totals
CREATE OR REPLACE FUNCTION calculate_quote_totals(quote_uuid UUID)
RETURNS TABLE(
  subtotal DECIMAL(12,2),
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2)
) AS $$
DECLARE
  quote_tax_rate DECIMAL(5,2);
  quote_discount DECIMAL(12,2);
  line_items_total DECIMAL(12,2);
BEGIN
  -- Get quote tax rate and discount
  SELECT q.tax_rate, q.discount_amount INTO quote_tax_rate, quote_discount
  FROM quotes q
  WHERE q.id = quote_uuid;

  -- Calculate line items total
  SELECT COALESCE(SUM(total_price), 0) INTO line_items_total
  FROM quote_line_items
  WHERE quote_id = quote_uuid
    AND is_taxable = true;

  -- Calculate totals
  subtotal := line_items_total - COALESCE(quote_discount, 0);
  tax_amount := subtotal * (quote_tax_rate / 100);
  total_amount := subtotal + tax_amount;

  RETURN QUERY SELECT subtotal, tax_amount, total_amount;
END;
$$ LANGUAGE plpgsql;

-- Get quote statistics
CREATE OR REPLACE FUNCTION get_quote_stats(company_uuid UUID, date_from TIMESTAMPTZ DEFAULT NULL, date_to TIMESTAMPTZ DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_quotes', (
      SELECT COUNT(*)
      FROM quotes
      WHERE company_id = company_uuid
        AND (date_from IS NULL OR created_at >= date_from)
        AND (date_to IS NULL OR created_at <= date_to)
    ),
    'draft', (
      SELECT COUNT(*)
      FROM quotes
      WHERE company_id = company_uuid
        AND status = 'draft'
        AND (date_from IS NULL OR created_at >= date_from)
        AND (date_to IS NULL OR created_at <= date_to)
    ),
    'sent', (
      SELECT COUNT(*)
      FROM quotes
      WHERE company_id = company_uuid
        AND status = 'sent'
        AND (date_from IS NULL OR created_at >= date_from)
        AND (date_to IS NULL OR created_at <= date_to)
    ),
    'accepted', (
      SELECT COUNT(*)
      FROM quotes
      WHERE company_id = company_uuid
        AND status = 'accepted'
        AND (date_from IS NULL OR created_at >= date_from)
        AND (date_to IS NULL OR created_at <= date_to)
    ),
    'rejected', (
      SELECT COUNT(*)
      FROM quotes
      WHERE company_id = company_uuid
        AND status = 'rejected'
        AND (date_from IS NULL OR created_at >= date_from)
        AND (date_to IS NULL OR created_at <= date_to)
    ),
    'total_value', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM quotes
      WHERE company_id = company_uuid
        AND (date_from IS NULL OR created_at >= date_from)
        AND (date_to IS NULL OR created_at <= date_to)
    ),
    'accepted_value', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM quotes
      WHERE company_id = company_uuid
        AND status = 'accepted'
        AND (date_from IS NULL OR created_at >= date_from)
        AND (date_to IS NULL OR created_at <= date_to)
    ),
    'conversion_rate', (
      SELECT CASE
        WHEN COUNT(*) FILTER (WHERE status = 'sent') = 0 THEN 0
        ELSE ROUND(
          (COUNT(*) FILTER (WHERE status = 'accepted')::DECIMAL /
           COUNT(*) FILTER (WHERE status = 'sent')::DECIMAL) * 100,
          2
        )
      END
      FROM quotes
      WHERE company_id = company_uuid
        AND (date_from IS NULL OR created_at >= date_from)
        AND (date_to IS NULL OR created_at <= date_to)
    )
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_templates_updated_at
  BEFORE UPDATE ON quote_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update quote search vector
CREATE OR REPLACE FUNCTION update_quote_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.quote_number, '') || ' ' ||
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quotes_search_vector
  BEFORE INSERT OR UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_quote_search_vector();

-- Log quote activity on status change
CREATE OR REPLACE FUNCTION log_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO quote_activities (quote_id, activity_type, description)
    VALUES (
      NEW.id,
      LOWER(NEW.status),
      'Quote status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_quote_status
  AFTER UPDATE ON quotes
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_quote_status_change();

-- ============================================
-- 10. ROW-LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_catalog ENABLE ROW LEVEL SECURITY;

-- Clients policies
CREATE POLICY "users_view_their_company_clients" ON clients
FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "users_manage_their_company_clients" ON clients
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Quotes policies
CREATE POLICY "users_view_their_company_quotes" ON quotes
FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "users_manage_their_company_quotes" ON quotes
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Quote line items policies (inherit from quotes)
CREATE POLICY "users_view_quote_line_items" ON quote_line_items
FOR SELECT USING (
  quote_id IN (
    SELECT id FROM quotes WHERE company_id IN (
      SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "users_manage_quote_line_items" ON quote_line_items
FOR ALL USING (
  quote_id IN (
    SELECT id FROM quotes WHERE company_id IN (
      SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
);

-- Templates policies
CREATE POLICY "users_view_templates" ON quote_templates
FOR SELECT USING (
  is_public = true OR
  company_id IN (
    SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "users_manage_company_templates" ON quote_templates
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Activities policies
CREATE POLICY "users_view_quote_activities" ON quote_activities
FOR SELECT USING (
  quote_id IN (
    SELECT id FROM quotes WHERE company_id IN (
      SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
);

-- Documents policies
CREATE POLICY "users_view_quote_documents" ON quote_documents
FOR SELECT USING (
  quote_id IN (
    SELECT id FROM quotes WHERE company_id IN (
      SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "users_manage_quote_documents" ON quote_documents
FOR ALL USING (
  quote_id IN (
    SELECT id FROM quotes WHERE company_id IN (
      SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
);

-- Pricing catalog policies
CREATE POLICY "users_view_pricing_catalog" ON pricing_catalog
FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "users_manage_pricing_catalog" ON pricing_catalog
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- ============================================
-- SCHEMA COMPLETE
-- ============================================

-- To verify installation, run:
-- SELECT * FROM get_quote_stats((SELECT company_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1));
-- SELECT generate_quote_number((SELECT company_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1));
