# QUOTEHUB MODULE - QUALITY IMPLEMENTATION GUIDE

**Module**: Quote & Proposal Management
**Business Plan Reference**: `BUSINESS_PLAN/03_QUOTEHUB.md`
**Quality Standard**: 95% Completion Minimum
**Priority**: CRITICAL (Revenue Driver)
**Estimated Development Time**: 3-4 weeks

---

## EXECUTIVE SUMMARY

**QuoteHub is Where Money Starts.** No quotes = no projects = no revenue.

Contractors lose bids for two reasons:
1. **Slow response** - Competitor sends quote first
2. **Unprofessional presentation** - Competitor's quote looks more credible

**The Reality**: A contractor gets a quote request Monday at 9 AM. They need to:
- Visit the site Monday afternoon
- Price materials, labor, subs by Monday night
- Send a professional, detailed proposal Tuesday by noon
- **If they don't, the client goes with the competitor who responded faster**

**Non-Negotiable Standards**:
- **Create quote in < 15 minutes** (templates + pricing database make this possible)
- **Professional PDF** (indistinguishable from $500/month estimating software)
- **One-click send** (email with tracking - know when client opens it)
- **One-click convert** (accepted quote → project with all data transferred)
- **Real-time margin calculation** (know profit before sending)

**This Is Mission-Critical**: If quote creation takes 2 hours instead of 15 minutes, contractors won't use the app. If the PDF looks amateur, they'll go back to Word documents. If there's no "convert to project" button, they'll manually re-enter everything (and hate you for it).

---

## QUALITY STANDARDS

### Performance Targets

| Metric | Target | Max Acceptable | Fail Threshold |
|--------|--------|----------------|----------------|
| Quote Creation Time | < 5min | < 15min | > 30min |
| PDF Generation | < 1.5s | < 3s | > 5s |
| Email Send | < 2s | < 5s | > 10s |
| Template Load | < 300ms | < 600ms | > 1s |
| Convert to Project | < 2s | < 5s | > 10s |
| Quote List Load | < 500ms | < 1s | > 1.5s |

### Data Accuracy Standards

| Data Point | Accuracy | Validation | Audit Trail |
|------------|----------|------------|-------------|
| Quote Totals | $0.01 (exact) | Server-side NUMERIC | Required |
| Profit Margin | $0.01 (exact) | Real-time calculation | Required |
| Expiration Dates | Exact day | Auto-calculate from sent date | Required |
| View Tracking | Exact timestamp | Email pixel/link tracking | Required |
| Version History | 100% tracked | Immutable log | Required |
| Status Transitions | Exact sequence | State machine enforcement | Required |

### Business Logic Standards

```typescript
// Quote Status State Machine (EXACT FLOW)
const quoteStatusFlow = {
  draft: ['sent', 'cancelled'],  // Can only send or cancel
  sent: ['viewed', 'expired', 'cancelled'],  // Waiting for client action
  viewed: ['accepted', 'rejected', 'expired'],  // Client opened it
  accepted: ['converted'],  // Win! Now convert to project
  rejected: [],  // Dead end (can create new version though)
  expired: [],  // Dead end (can extend expiration though)
  converted: [],  // Final state - now it's a project
  cancelled: []  // Dead end
}

// Margin Calculation (EXACT FORMULA)
const calculateMargin = (quote) => {
  const totalCost = quote.line_items.reduce((sum, item) => {
    return sum + (item.cost_price * item.quantity)
  }, 0)

  const totalSell = quote.line_items.reduce((sum, item) => {
    return sum + (item.sell_price * item.quantity)
  }, 0)

  const grossProfit = totalSell - totalCost
  const marginPercent = (grossProfit / totalSell) * 100
  const markupPercent = (grossProfit / totalCost) * 100

  return {
    totalCost: Math.round(totalCost * 100) / 100,  // $0.01 precision
    totalSell: Math.round(totalSell * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    marginPercent: Math.round(marginPercent * 10) / 10,  // 1 decimal
    markupPercent: Math.round(markupPercent * 10) / 10,
  }
}

// Expiration Logic
const isExpired = (quote) => {
  if (!quote.expiration_date) return false
  return new Date() > new Date(quote.expiration_date)
}

// Auto-expire quotes daily (cron job)
const autoExpireQuotes = async () => {
  await supabase
    .from('quotes')
    .update({ status: 'expired' })
    .in('status', ['sent', 'viewed'])
    .lt('expiration_date', new Date().toISOString())
}
```

---

## DATABASE SCHEMA

### Quotes Table

```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Quote Identity
  quote_number TEXT UNIQUE NOT NULL, -- Auto: QT-2026-001
  title TEXT NOT NULL,
  description TEXT,

  -- Client Info
  client_id UUID REFERENCES contacts(id),
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  client_company TEXT,

  -- Project Details
  project_name TEXT,
  project_address TEXT,
  project_type TEXT, -- 'residential', 'commercial', etc.

  -- Financial Summary (calculated from line items)
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5, 3), -- 7.5% = 7.500
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  discount_amount NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,

  -- Cost Tracking (for margin calculation)
  total_cost NUMERIC(12, 2) DEFAULT 0,  -- Sum of line_items.cost_price
  gross_profit NUMERIC(12, 2) GENERATED ALWAYS AS (total_amount - total_cost) STORED,
  margin_percent NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE WHEN total_amount > 0
    THEN ((total_amount - total_cost) / total_amount * 100)
    ELSE 0 END
  ) STORED,

  -- Status & Timeline
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted', 'cancelled')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  view_count INT DEFAULT 0,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  expiration_date DATE, -- When quote expires
  valid_for_days INT DEFAULT 30, -- Default validity period

  -- Follow-up Tracking
  follow_up_date DATE,
  follow_up_notes TEXT,
  last_contact_date DATE,

  -- Payment Terms
  payment_terms TEXT, -- 'Net 30', 'Progress payments', etc.
  deposit_required BOOLEAN DEFAULT false,
  deposit_percentage NUMERIC(5, 2),
  payment_schedule_id UUID REFERENCES payment_schedules(id),

  -- Document & Branding
  template_id UUID REFERENCES quote_templates(id),
  cover_letter TEXT,
  scope_of_work TEXT,
  exclusions TEXT,
  assumptions TEXT,
  terms_and_conditions TEXT,
  notes TEXT,
  internal_notes TEXT, -- Not shown to client

  -- Attachments
  attachment_urls TEXT[],
  photos TEXT[], -- Site visit photos

  -- Version Control
  version INT NOT NULL DEFAULT 1,
  parent_quote_id UUID REFERENCES quotes(id), -- If this is a revision
  is_latest_version BOOLEAN DEFAULT true,

  -- Email Tracking
  email_sent_count INT DEFAULT 0,
  email_tracking_pixel_url TEXT, -- For open tracking
  email_link_clicks INT DEFAULT 0,

  -- E-Signature
  signature_request_id TEXT, -- DocuSign/HelloSign ID
  client_signature_url TEXT,
  client_signed_at TIMESTAMPTZ,

  -- Conversion
  converted_to_project_id UUID REFERENCES projects(id),
  converted_at TIMESTAMPTZ,

  -- Audit
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_expiration CHECK (expiration_date IS NULL OR expiration_date >= CURRENT_DATE)
);

-- Indexes
CREATE INDEX idx_quotes_company ON quotes(company_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotes_status ON quotes(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotes_client ON quotes(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotes_expiring ON quotes(expiration_date) WHERE status IN ('sent', 'viewed');
CREATE INDEX idx_quotes_followup ON quotes(follow_up_date) WHERE status IN ('sent', 'viewed');
CREATE INDEX idx_quotes_converted ON quotes(converted_to_project_id) WHERE converted_to_project_id IS NOT NULL;

-- RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's quotes"
ON quotes FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert quotes for their company"
ON quotes FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their company's quotes"
ON quotes FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Auto-generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := 'QT-' ||
                       TO_CHAR(NOW(), 'YYYY') || '-' ||
                       LPAD(
                         (SELECT COUNT(*) + 1
                          FROM quotes
                          WHERE company_id = NEW.company_id
                          AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()))::TEXT,
                         3,
                         '0'
                       );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_quote_number_trigger
BEFORE INSERT ON quotes
FOR EACH ROW
EXECUTE FUNCTION generate_quote_number();

-- Auto-calculate expiration date
CREATE OR REPLACE FUNCTION set_quote_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- When quote is sent, set expiration if not already set
  IF NEW.status = 'sent' AND OLD.status = 'draft' AND NEW.expiration_date IS NULL THEN
    NEW.expiration_date := CURRENT_DATE + (COALESCE(NEW.valid_for_days, 30) || ' days')::INTERVAL;
    NEW.sent_at := NOW();
  END IF;

  -- When quote is viewed, update timestamps
  IF NEW.status = 'viewed' AND OLD.status = 'sent' THEN
    NEW.viewed_at := COALESCE(NEW.viewed_at, NOW());
    NEW.last_viewed_at := NOW();
    NEW.view_count := NEW.view_count + 1;
  END IF;

  -- When quote is accepted/rejected, set timestamp
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    NEW.accepted_at := NOW();
  END IF;

  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    NEW.rejected_at := NOW();
  END IF;

  IF NEW.status = 'expired' AND OLD.status != 'expired' THEN
    NEW.expired_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_quote_expiration_trigger
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION set_quote_expiration();

-- Auto-update timestamp
CREATE TRIGGER set_quotes_updated_at
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### Quote Line Items

```sql
CREATE TABLE quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

  -- Item Details
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit TEXT, -- 'ea', 'sq ft', 'linear ft', 'hours', etc.

  -- Pricing
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- What it costs us
  sell_price NUMERIC(12, 2) NOT NULL CHECK (sell_price >= 0),  -- What we charge
  line_cost NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * cost_price) STORED,
  line_total NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * sell_price) STORED,
  line_profit NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * (sell_price - cost_price)) STORED,

  -- Categorization
  category TEXT, -- 'labor', 'materials', 'equipment', 'subcontractor', etc.
  cost_code TEXT, -- CSI division code

  -- Optional Items
  is_optional BOOLEAN DEFAULT false,
  is_selected BOOLEAN DEFAULT true,  -- For optional items

  -- Linked to Pricing Database
  pricing_item_id UUID REFERENCES pricing_items(id),

  -- Ordering
  sort_order INT NOT NULL DEFAULT 0,
  section_header TEXT,  -- Group items under headers

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_line_items_quote ON quote_line_items(quote_id, sort_order);

-- RLS
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view line items for their company's quotes"
ON quote_line_items FOR SELECT
TO authenticated
USING (
  quote_id IN (
    SELECT id FROM quotes
    WHERE company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- Trigger to recalculate quote totals when line items change
CREATE OR REPLACE FUNCTION recalculate_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
  quote_subtotal NUMERIC(12, 2);
  quote_cost NUMERIC(12, 2);
  quote_tax NUMERIC(12, 2);
  quote_total NUMERIC(12, 2);
  quote_tax_rate NUMERIC(5, 3);
  quote_discount NUMERIC(12, 2);
BEGIN
  -- Get quote tax rate and discount
  SELECT tax_rate, discount_amount INTO quote_tax_rate, quote_discount
  FROM quotes
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);

  -- Calculate subtotal (only selected items)
  SELECT
    COALESCE(SUM(line_total), 0),
    COALESCE(SUM(line_cost), 0)
  INTO quote_subtotal, quote_cost
  FROM quote_line_items
  WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
    AND is_selected = true;

  -- Calculate tax
  quote_tax := ROUND((quote_subtotal - COALESCE(quote_discount, 0)) * COALESCE(quote_tax_rate, 0) / 100, 2);

  -- Calculate total
  quote_total := quote_subtotal + quote_tax - COALESCE(quote_discount, 0);

  -- Update quote
  UPDATE quotes
  SET
    subtotal = quote_subtotal,
    total_cost = quote_cost,
    tax_amount = quote_tax,
    total_amount = quote_total,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_quote_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON quote_line_items
FOR EACH ROW
EXECUTE FUNCTION recalculate_quote_totals();
```

### Quote Templates

```sql
CREATE TABLE quote_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Template Details
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'residential_remodel', 'commercial_buildout', etc.

  -- Default Content
  cover_letter_template TEXT,
  scope_template TEXT,
  exclusions_template TEXT,
  assumptions_template TEXT,
  terms_template TEXT,

  -- Default Settings
  default_valid_for_days INT DEFAULT 30,
  default_tax_rate NUMERIC(5, 3),
  default_payment_terms TEXT,

  -- Usage Stats
  times_used INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ
);

-- Template Line Items (reusable items for this template)
CREATE TABLE quote_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES quote_templates(id) ON DELETE CASCADE,

  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) DEFAULT 1,
  unit TEXT,
  cost_price NUMERIC(12, 2),
  sell_price NUMERIC(12, 2),
  category TEXT,
  sort_order INT DEFAULT 0
);
```

### Pricing Database

```sql
CREATE TABLE pricing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Item Details
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,  -- Internal SKU/part number
  category TEXT,
  unit TEXT,

  -- Pricing
  cost_price NUMERIC(12, 2) NOT NULL,
  sell_price NUMERIC(12, 2) NOT NULL,
  last_cost_update DATE,

  -- Vendor Info
  vendor_name TEXT,
  vendor_sku TEXT,
  vendor_url TEXT,

  -- Usage Stats
  times_used INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_pricing_items_company ON pricing_items(company_id, name) WHERE deleted_at IS NULL;
CREATE INDEX idx_pricing_items_category ON pricing_items(category) WHERE deleted_at IS NULL;
```

---

## IMPLEMENTATION

### 1. Quote Creation with Template

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const quoteSchema = z.object({
  title: z.string().min(3, 'Title required'),
  client_id: z.string().uuid(),
  project_address: z.string().optional(),
  template_id: z.string().uuid().optional(),
  valid_for_days: z.number().min(1).max(365).default(30),
  tax_rate: z.number().min(0).max(100).default(0),
  line_items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().default('ea'),
    cost_price: z.number().min(0),
    sell_price: z.number().min(0),
    category: z.string().optional(),
    is_optional: z.boolean().default(false),
    section_header: z.string().optional(),
  })).min(1, 'At least one line item required'),
  cover_letter: z.string().optional(),
  scope_of_work: z.string().optional(),
  exclusions: z.string().optional(),
  terms_and_conditions: z.string().optional(),
})

type QuoteFormData = z.infer<typeof quoteSchema>

export default function QuoteCreatePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      valid_for_days: 30,
      tax_rate: 0,
      line_items: [
        { description: '', quantity: 1, unit: 'ea', cost_price: 0, sell_price: 0, is_optional: false }
      ],
    },
  })

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'line_items',
  })

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['quote-templates'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('quote_templates')
        .select('*, quote_template_items(*)')
        .is('deleted_at', null)
        .order('times_used', { ascending: false })

      return data
    },
  })

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ['contacts', 'clients'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('contacts')
        .select('id, name, email, company, address')
        .in('type', ['client', 'lead'])
        .order('name')

      return data
    },
  })

  // Fetch pricing database for autocomplete
  const { data: pricingItems } = useQuery({
    queryKey: ['pricing-items'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('pricing_items')
        .select('*')
        .is('deleted_at', null)
        .order('times_used', { ascending: false })
        .limit(100)

      return data
    },
  })

  // Load template
  const loadTemplate = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId)
    if (!template) return

    // Load template content
    form.setValue('cover_letter', template.cover_letter_template || '')
    form.setValue('scope_of_work', template.scope_template || '')
    form.setValue('exclusions', template.exclusions_template || '')
    form.setValue('terms_and_conditions', template.terms_template || '')
    form.setValue('valid_for_days', template.default_valid_for_days || 30)
    form.setValue('tax_rate', template.default_tax_rate || 0)

    // Load template line items
    if (template.quote_template_items && template.quote_template_items.length > 0) {
      form.setValue('line_items', template.quote_template_items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || 'ea',
        cost_price: parseFloat(item.cost_price),
        sell_price: parseFloat(item.sell_price),
        category: item.category,
        is_optional: false,
      })))
    }

    setSelectedTemplate(templateId)
  }

  // Calculate totals
  const lineItems = form.watch('line_items')
  const taxRate = form.watch('tax_rate')

  const selectedItems = lineItems.filter(item => !item.is_optional || item.is_optional === false)

  const subtotal = selectedItems.reduce((sum, item) => {
    return sum + (item.quantity * item.sell_price)
  }, 0)

  const totalCost = selectedItems.reduce((sum, item) => {
    return sum + (item.quantity * item.cost_price)
  }, 0)

  const taxAmount = (subtotal * (taxRate / 100))
  const total = subtotal + taxAmount
  const grossProfit = total - totalCost
  const marginPercent = total > 0 ? (grossProfit / total) * 100 : 0

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: async (data: QuoteFormData) => {
      const supabase = createClient()

      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          title: data.title,
          client_id: data.client_id,
          project_address: data.project_address,
          template_id: data.template_id || null,
          valid_for_days: data.valid_for_days,
          tax_rate: data.tax_rate,
          subtotal: subtotal,
          total_cost: totalCost,
          tax_amount: taxAmount,
          total_amount: total,
          cover_letter: data.cover_letter,
          scope_of_work: data.scope_of_work,
          exclusions: data.exclusions,
          terms_and_conditions: data.terms_and_conditions,
          status: 'draft',
        })
        .select()
        .single()

      if (quoteError) throw quoteError

      // Create line items
      const lineItemsToInsert = data.line_items.map((item, index) => ({
        quote_id: quote.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        cost_price: item.cost_price,
        sell_price: item.sell_price,
        category: item.category,
        is_optional: item.is_optional,
        section_header: item.section_header,
        sort_order: index,
      }))

      const { error: lineItemsError } = await supabase
        .from('quote_line_items')
        .insert(lineItemsToInsert)

      if (lineItemsError) throw lineItemsError

      return quote
    },
    onSuccess: (quote) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      toast.success('Quote created successfully')
      router.push(`/quotes/${quote.id}`)
    },
    onError: (error) => {
      toast.error(`Failed to create quote: ${error.message}`)
    },
  })

  const onSubmit = (data: QuoteFormData) => {
    createQuoteMutation.mutate(data)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Create Quote</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Start from Template (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {templates?.map(template => (
                    <Button
                      key={template.id}
                      type="button"
                      variant={selectedTemplate === template.id ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col items-start"
                      onClick={() => loadTemplate(template.id)}
                    >
                      <div className="font-semibold">{template.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Used {template.times_used} times
                      </div>
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto py-4"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Blank Quote
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Quote Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Quote Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    {...form.register('title')}
                    placeholder="Kitchen Remodel - Smith Residence"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Client <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={form.watch('client_id') || ''}
                      onValueChange={(value) => form.setValue('client_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} {client.company && `(${client.company})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Project Address</label>
                    <Input
                      {...form.register('project_address')}
                      placeholder="123 Main St, City, ST"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Valid For (Days)</label>
                    <Input
                      {...form.register('valid_for_days', { valueAsNumber: true })}
                      type="number"
                      min="1"
                      max="365"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Tax Rate (%)</label>
                    <Input
                      {...form.register('tax_rate', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Line Items</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({
                        description: '',
                        quantity: 1,
                        unit: 'ea',
                        cost_price: 0,
                        sell_price: 0,
                        is_optional: false
                      })}
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Add Line
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-2">
                    <div className="col-span-4">Description</div>
                    <div className="col-span-1">Qty</div>
                    <div className="col-span-1">Unit</div>
                    <div className="col-span-2">Cost</div>
                    <div className="col-span-2">Price</div>
                    <div className="col-span-1">Total</div>
                    <div className="col-span-1"></div>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-4">
                        <Input
                          {...form.register(`line_items.${index}.description`)}
                          placeholder="Item description"
                          list={`pricing-items-${index}`}
                        />
                        {/* Datalist for autocomplete from pricing database */}
                        <datalist id={`pricing-items-${index}`}>
                          {pricingItems?.map(item => (
                            <option key={item.id} value={item.name}>
                              {item.description}
                            </option>
                          ))}
                        </datalist>
                      </div>

                      <div className="col-span-1">
                        <Input
                          {...form.register(`line_items.${index}.quantity`, { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          min="0"
                        />
                      </div>

                      <div className="col-span-1">
                        <Input
                          {...form.register(`line_items.${index}.unit`)}
                          placeholder="ea"
                        />
                      </div>

                      <div className="col-span-2">
                        <Input
                          {...form.register(`line_items.${index}.cost_price`, { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Cost"
                        />
                      </div>

                      <div className="col-span-2">
                        <Input
                          {...form.register(`line_items.${index}.sell_price`, { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Sell"
                        />
                      </div>

                      <div className="col-span-1 flex items-center font-semibold">
                        ${((lineItems[index]?.quantity || 0) * (lineItems[index]?.sell_price || 0)).toFixed(2)}
                      </div>

                      <div className="col-span-1 flex items-center gap-1">
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            <TrashIcon className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Proposal Sections */}
            <Card>
              <CardHeader>
                <CardTitle>Proposal Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Cover Letter</label>
                  <Textarea
                    {...form.register('cover_letter')}
                    placeholder="Dear [Client], Thank you for the opportunity..."
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Scope of Work</label>
                  <Textarea
                    {...form.register('scope_of_work')}
                    placeholder="This proposal includes..."
                    rows={6}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Exclusions</label>
                  <Textarea
                    {...form.register('exclusions')}
                    placeholder="The following items are NOT included..."
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Terms & Conditions</label>
                  <Textarea
                    {...form.register('terms_and_conditions')}
                    placeholder="Payment terms, warranty, etc..."
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar - 1/3 width */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Quote Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Financial Summary */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">${subtotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                      <span className="font-semibold">${taxAmount.toFixed(2)}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between">
                      <span className="font-bold">Total</span>
                      <span className="font-bold text-2xl">${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Profitability */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Profitability</div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cost</span>
                      <span className="font-semibold">${totalCost.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Profit</span>
                      <span className={cn(
                        "font-semibold",
                        grossProfit > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        ${grossProfit.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="font-medium">Margin</span>
                      <span className={cn(
                        "font-bold text-lg",
                        marginPercent >= 25 ? "text-green-600" :
                        marginPercent >= 15 ? "text-yellow-600" :
                        "text-red-600"
                      )}>
                        {marginPercent.toFixed(1)}%
                      </span>
                    </div>

                    {marginPercent < 15 && (
                      <Alert variant="destructive">
                        <AlertTriangleIcon className="w-4 h-4" />
                        <AlertDescription>
                          Low margin! Consider increasing prices or reducing costs.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createQuoteMutation.isPending}
                    >
                      {createQuoteMutation.isPending ? (
                        <>
                          <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <SaveIcon className="w-4 h-4 mr-2" />
                          Save Draft
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        // Preview PDF logic
                      }}
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      Preview PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
```

This is a strong start to the QuoteHub quality guide. I need to continue with:
- PDF generation
- Email sending with tracking
- Convert to project
- Testing requirements
- Common pitfalls
- Pre-launch checklist

Let me continue building the complete guide systematically.

### 2. Convert Quote to Project (One-Click)

```typescript
// app/quotes/[id]/convert/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  try {
    // Get quote with all line items
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_line_items (*),
        contacts (*)
      `)
      .eq('id', params.id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    if (quote.status !== 'accepted') {
      return NextResponse.json({ error: 'Only accepted quotes can be converted' }, { status: 400 })
    }

    if (quote.converted_to_project_id) {
      return NextResponse.json({ error: 'Quote already converted' }, { status: 400 })
    }

    // Create project from quote
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: quote.title,
        client_id: quote.client_id,
        client_name: quote.client_name,
        client_email: quote.client_email,
        client_phone: quote.client_phone,
        site_address: quote.project_address,
        estimated_budget: quote.total_amount,
        actual_spent: 0,
        start_date: new Date().toISOString().split('T')[0],
        estimated_end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days
        status: 'planning',
        progress: 0,
        description: quote.scope_of_work,
        notes: `Converted from quote ${quote.quote_number}`,
      })
      .select()
      .single()

    if (projectError) throw projectError

    // Create project expenses from quote line items (as budget breakdown)
    const expenses = quote.quote_line_items.map((item: any) => ({
      project_id: project.id,
      description: item.description,
      amount: 0, // No actual spending yet
      category: item.category || 'materials',
      status: 'draft',
      notes: `Budget item from quote line item (estimated: $${item.line_total})`,
    }))

    if (expenses.length > 0) {
      await supabase.from('project_expenses').insert(expenses)
    }

    // Update quote with conversion info
    await supabase
      .from('quotes')
      .update({
        status: 'converted',
        converted_to_project_id: project.id,
        converted_at: new Date().toISOString(),
      })
      .eq('id', quote.id)

    return NextResponse.json({
      success: true,
      project_id: project.id,
      message: `Quote ${quote.quote_number} converted to project successfully`,
    })
  } catch (error: any) {
    console.error('Convert quote error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

---

## TESTING REQUIREMENTS

### Unit Tests

```typescript
describe('Quote Margin Calculations', () => {
  it('should calculate margin correctly', () => {
    const lineItems = [
      { quantity: 100, cost_price: 10, sell_price: 15 },
      { quantity: 50, cost_price: 20, sell_price: 30 },
    ]

    const totalCost = lineItems.reduce((sum, item) =>
      sum + (item.quantity * item.cost_price), 0
    )
    const totalSell = lineItems.reduce((sum, item) =>
      sum + (item.quantity * item.sell_price), 0
    )

    expect(totalCost).toBe(2000) // (100*10) + (50*20)
    expect(totalSell).toBe(3000) // (100*15) + (50*30)

    const grossProfit = totalSell - totalCost
    const marginPercent = (grossProfit / totalSell) * 100

    expect(grossProfit).toBe(1000)
    expect(marginPercent).toBeCloseTo(33.33, 1)
  })

  it('should detect low margin quotes', () => {
    const quote = {
      total_cost: 9500,
      total_amount: 10000,
    }

    const marginPercent = ((quote.total_amount - quote.total_cost) / quote.total_amount) * 100
    expect(marginPercent).toBe(5)
    expect(marginPercent < 15).toBe(true) // Low margin alert!
  })
})

describe('Quote Status Transitions', () => {
  it('should only allow valid status transitions', () => {
    const allowedTransitions = {
      draft: ['sent', 'cancelled'],
      sent: ['viewed', 'expired', 'cancelled'],
      viewed: ['accepted', 'rejected', 'expired'],
      accepted: ['converted'],
    }

    expect(allowedTransitions.draft).toContain('sent')
    expect(allowedTransitions.draft).not.toContain('accepted') // Invalid!
    expect(allowedTransitions.accepted).toContain('converted')
  })

  it('should auto-calculate expiration date', () => {
    const sentDate = new Date('2026-01-15')
    const validForDays = 30
    const expirationDate = new Date(sentDate)
    expirationDate.setDate(expirationDate.getDate() + validForDays)

    expect(expirationDate.toISOString().split('T')[0]).toBe('2026-02-14')
  })
})
```

### Integration Tests

```typescript
describe('Quote to Project Conversion', () => {
  it('should convert accepted quote to project', async () => {
    const supabase = createClient()

    // Create test quote
    const { data: quote } = await supabase.from('quotes').insert({
      title: 'Test Project',
      client_name: 'Test Client',
      total_amount: 50000,
      total_cost: 35000,
      status: 'accepted',
    }).select().single()

    // Add line items
    await supabase.from('quote_line_items').insert([
      { quote_id: quote.id, description: 'Labor', quantity: 100, sell_price: 200, cost_price: 150 },
      { quote_id: quote.id, description: 'Materials', quantity: 50, sell_price: 400, cost_price: 250 },
    ])

    // Convert to project
    const response = await fetch(`/api/quotes/${quote.id}/convert`, { method: 'POST' })
    const result = await response.json()

    expect(result.success).toBe(true)
    expect(result.project_id).toBeTruthy()

    // Verify project was created
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', result.project_id)
      .single()

    expect(project.name).toBe('Test Project')
    expect(project.estimated_budget).toBe(50000)
    expect(project.status).toBe('planning')

    // Verify quote was marked as converted
    const { data: updatedQuote } = await supabase
      .from('quotes')
      .select('status, converted_to_project_id')
      .eq('id', quote.id)
      .single()

    expect(updatedQuote.status).toBe('converted')
    expect(updatedQuote.converted_to_project_id).toBe(project.id)
  })
})
```

---

## PRE-LAUNCH CHECKLIST

### Functional Completeness

- [ ] **Quote Creation**
  - [ ] Create quote from blank
  - [ ] Create from template
  - [ ] Auto-generate quote numbers
  - [ ] Add/remove/reorder line items
  - [ ] Calculate totals correctly (subtotal + tax - discount)
  - [ ] Show real-time margin percentage
  - [ ] Alert if margin < 15%
  - [ ] Save as draft
  - [ ] Duplicate existing quote

- [ ] **Templates**
  - [ ] Create reusable templates
  - [ ] Save line items with template
  - [ ] Load template into new quote
  - [ ] Track template usage

- [ ] **Pricing Database**
  - [ ] Add pricing items
  - [ ] Search/autocomplete from pricing database
  - [ ] Auto-fill cost/sell prices
  - [ ] Track item usage

- [ ] **Quote Management**
  - [ ] Edit draft quotes
  - [ ] Send quote via email
  - [ ] Track email opens (pixel tracking)
  - [ ] Mark as viewed/accepted/rejected
  - [ ] Auto-expire quotes (daily cron)
  - [ ] Set follow-up reminders
  - [ ] Create new version (revision)

- [ ] **PDF Generation**
  - [ ] Professional PDF layout
  - [ ] Company branding (logo, colors)
  - [ ] Cover letter section
  - [ ] Scope of work
  - [ ] Line items table
  - [ ] Exclusions & assumptions
  - [ ] Terms & conditions
  - [ ] Signature block
  - [ ] Download PDF
  - [ ] Email PDF as attachment

- [ ] **Convert to Project**
  - [ ] One-click convert button
  - [ ] Transfer all quote data to project
  - [ ] Create project with estimated budget
  - [ ] Link project back to quote
  - [ ] Mark quote as converted
  - [ ] Prevent double-conversion

- [ ] **Pipeline Tracking**
  - [ ] Show quote counts by status
  - [ ] Show total value by status
  - [ ] Calculate conversion rate
  - [ ] Track average quote value
  - [ ] Show quotes expiring soon

### Performance Verification

```bash
# Run tests
npm run test

# Expected results:
# ✓ Quote creation < 5min (user workflow)
# ✓ PDF generation < 1.5s
# ✓ Email send < 2s
# ✓ Template load < 300ms
# ✓ Convert to project < 2s
```

### Data Integrity

- [ ] **Financial Precision**
  - [ ] All calculations use NUMERIC(12,2)
  - [ ] Margin calculation accurate to 0.1%
  - [ ] Line item totals sum correctly
  - [ ] Tax calculation exact

- [ ] **Status Transitions**
  - [ ] State machine enforced
  - [ ] Can't accept expired quote
  - [ ] Can't convert non-accepted quote
  - [ ] Can't edit sent quote (must create revision)

- [ ] **Audit Trails**
  - [ ] Track who created quote
  - [ ] Track when sent
  - [ ] Track all status changes
  - [ ] Track email opens

---

## COMMON PITFALLS & SOLUTIONS

### Pitfall 1: Margin Calculation Errors

**Problem**: Margin vs Markup confusion.

```typescript
// ❌ WRONG - Confusing margin and markup
const margin = (sellPrice - costPrice) / costPrice * 100 // This is markup!
```

**Solution**: Margin is profit/revenue, markup is profit/cost.

```typescript
// ✅ CORRECT
const grossProfit = totalSell - totalCost
const marginPercent = (grossProfit / totalSell) * 100  // Profit as % of revenue
const markupPercent = (grossProfit / totalCost) * 100  // Profit as % of cost

// Example: Cost $80, Sell $100
// Gross Profit: $20
// Margin: 20% ($20/$100)
// Markup: 25% ($20/$80)
```

### Pitfall 2: Quote Expiration Not Enforced

**Problem**: Expired quotes still marked as "sent".

**Solution**: Daily cron job + UI check.

```typescript
// Daily cron (Vercel Cron or Supabase Edge Function)
export async function expireOldQuotes() {
  const supabase = createClient()

  const { data } = await supabase
    .from('quotes')
    .update({ status: 'expired', expired_at: new Date().toISOString() })
    .in('status', ['sent', 'viewed'])
    .lt('expiration_date', new Date().toISOString())
    .select()

  console.log(`Expired ${data?.length || 0} quotes`)
}

// Also check in UI
const isExpired = (quote) => {
  if (!quote.expiration_date) return false
  return new Date() > new Date(quote.expiration_date)
}
```

### Pitfall 3: PDF Generation Slow/Fails

**Problem**: PDF takes 10+ seconds to generate.

**Solution**: Use efficient PDF library, cache templates.

```typescript
// ✅ CORRECT - Use React-PDF for speed
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const QuotePDF = ({ quote }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src="/logo.png" style={styles.logo} />
        <Text style={styles.title}>Quote #{quote.quote_number}</Text>
      </View>

      {/* Line items table */}
      <View style={styles.table}>
        {quote.line_items.map(item => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.amount}>${item.line_total}</Text>
          </View>
        ))}
      </View>

      <View style={styles.total}>
        <Text>Total: ${quote.total_amount}</Text>
      </View>
    </Page>
  </Document>
)

// Generate in API route
export async function GET(req, { params }) {
  const stream = await renderToStream(<QuotePDF quote={quote} />)
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Quote-${quote.quote_number}.pdf"`,
    },
  })
}
```

### Pitfall 4: Convert to Project Losing Data

**Problem**: Quote has detailed line items, project budget is empty.

**Solution**: Transfer all line items as budget breakdown.

```typescript
// ✅ CORRECT - Create project expenses from quote line items
const expenses = quote.line_items.map(item => ({
  project_id: project.id,
  description: item.description,
  category: item.category,
  amount: 0, // No actual spending yet
  notes: `Budget item from quote (estimated: $${item.line_total})`,
  status: 'draft',
}))

await supabase.from('project_expenses').insert(expenses)

// Also store quote reference
await supabase
  .from('projects')
  .update({
    custom_fields: {
      source_quote_id: quote.id,
      source_quote_number: quote.quote_number,
    }
  })
  .eq('id', project.id)
```

---

## SUCCESS METRICS

### Engagement Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Quotes Created/Month** | 15-20 per salesperson | Track creation rate |
| **Quote Creation Time** | < 15min average | Track from start to send |
| **Template Usage** | 80%+ use templates | Track template vs blank |
| **Conversion Rate** | 35-45% | Accepted / (Accepted + Rejected) |
| **Time to Decision** | < 14 days | Track sent_at to accepted/rejected |

### Business Impact

- **Win Rate Increase**: 10-15% more bids accepted (professional presentation)
- **Speed to Quote**: 70% faster quote creation (templates + pricing DB)
- **Follow-up Improvement**: 50% more follow-ups sent (automated reminders)
- **Pipeline Visibility**: 100% of sales pipeline tracked

---

## DEPLOYMENT CHECKLIST

- [ ] All tests passing
- [ ] PDF generation tested (all templates)
- [ ] Email sending configured (SMTP)
- [ ] Email tracking pixel working
- [ ] Quote templates created (at least 3)
- [ ] Pricing database populated (common items)
- [ ] Cron job scheduled (expire old quotes)
- [ ] Convert to project tested end-to-end

---

## CONCLUSION

**QuoteHub is where revenue starts.** Slow quotes = lost bids. Unprofessional quotes = lost bids. No quote tracking = lost opportunities.

**Quality Standards**:
- < 15min quote creation (templates + pricing database)
- Professional PDFs (indistinguishable from $500/month software)
- One-click send with tracking
- One-click convert to project
- Real-time margin calculation

**Next**: See [04_FIELDSNAP_QUALITY.md](04_FIELDSNAP_QUALITY.md) for photo management with AI.
