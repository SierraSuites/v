# ENTERPRISE IMPLEMENTATION MASTER PLAN - PART 3

**Sierra Suites Construction Management Platform**
**Enterprise-Grade Implementation Roadmap**
**Part 3 of 3: Advanced Features, Integrations, Testing & Deployment**

---

## TABLE OF CONTENTS - PART 3

**SECTION 8: QuoteHub Module** - PDF Generation, Email Sending, Type Safety
**SECTION 9: Punch Lists Module** - Complete Workflow Implementation
**SECTION 10: Teams & RBAC Module** - Security Audit, Permissions Enforcement
**SECTION 11: CRM Suite Module** - Email Integration, Client Modernization
**SECTION 12: Sustainability Hub Module** - Real Calculations vs Fake Data
**SECTION 13: ReportCenter Module** - Report Generation Engine
**SECTION 14: AI Features Module** - AWS Integration Strategy
**SECTION 15: Integration Layer** - 14 External Integrations
**SECTION 16: Testing & Quality Assurance** - Comprehensive Test Suite
**SECTION 17: Deployment & Infrastructure** - CI/CD, Monitoring, Production
**SECTION 18: Documentation & Training** - API Docs, User Guides
**SECTION 19: Maintenance & Support** - Backup, Monitoring, SLA

---

# SECTION 8: QUOTEHUB MODULE

**Current Status**: 70% Complete
**Issues**: PDF generation incomplete, email sending not implemented, type safety violations
**Priority**: HIGH - Revenue-generating feature
**Estimated Effort**: 40-50 hours

## 8.1 Type Safety Fixes

**Problem**: Quote details page uses `as any` type casts bypassing TypeScript safety.

**File**: [app/quotes/[id]/page.tsx](app/quotes/[id]/page.tsx)

**Current Bad Code**:
```typescript
const clientName = (quote.client as any).name
const items = (quote.items as any).map((item: any) => ...)
```

**Fix - Create Proper Types**:

Create file: `types/quotes.ts`

```typescript
export interface QuoteClient {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
}

export interface QuoteLineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
  category?: string
  notes?: string
}

export interface QuoteWithRelations {
  id: string
  quote_number: string
  client_id: string
  project_id?: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  valid_until: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total: number
  notes?: string
  terms?: string
  created_at: string
  updated_at: string

  // Relations
  client: QuoteClient
  items: QuoteLineItem[]
  project?: {
    id: string
    name: string
    address: string
  }
}

export interface CreateQuoteDTO {
  client_id: string
  project_id?: string
  valid_until: string
  items: Omit<QuoteLineItem, 'id'>[]
  notes?: string
  terms?: string
  tax_rate?: number
  discount_amount?: number
}
```

**Update Query with Proper Types**:

```typescript
import { QuoteWithRelations } from '@/types/quotes'

export async function getQuoteDetails(quoteId: string): Promise<QuoteWithRelations | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      client:crm_contacts!client_id (
        id, name, email, phone, company, address
      ),
      items:quote_items (
        id, description, quantity, unit_price, total, category, notes
      ),
      project:projects (
        id, name, address
      )
    `)
    .eq('id', quoteId)
    .single()

  if (error || !data) return null

  return data as QuoteWithRelations
}
```

**Update Component**:

```typescript
export default function QuoteDetailsPage({ params }: { params: { id: string } }) {
  const [quote, setQuote] = useState<QuoteWithRelations | null>(null)

  // Now TypeScript knows the exact structure
  const clientName = quote?.client.name // ✅ Type-safe
  const items = quote?.items.map(item => ({
    ...item,
    total: item.quantity * item.unit_price // ✅ Type-safe
  }))
}
```

## 8.2 PDF Generation - Complete Implementation

**Problem**: PDF generation is stubbed out, returns mock PDFs.

**Solution**: Implement full PDF generation using `jsPDF` library.

**Install Dependencies**:
```bash
npm install jspdf jspdf-autotable
npm install -D @types/jspdf
```

**Create PDF Generator**: `lib/pdf-generator.ts`

```typescript
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { QuoteWithRelations } from '@/types/quotes'

export interface PDFOptions {
  includeTerms?: boolean
  includeNotes?: boolean
  watermark?: string
  logo?: string
}

export async function generateQuotePDF(
  quote: QuoteWithRelations,
  options: PDFOptions = {}
): Promise<Blob> {
  const doc = new jsPDF()

  // Company Header
  doc.setFontSize(20)
  doc.text('Sierra Suites', 105, 20, { align: 'center' })
  doc.setFontSize(10)
  doc.text('Construction Management Platform', 105, 27, { align: 'center' })

  // Quote Title
  doc.setFontSize(16)
  doc.text(`Quote #${quote.quote_number}`, 20, 45)

  // Client Information
  doc.setFontSize(10)
  doc.text('Bill To:', 20, 55)
  doc.setFontSize(11)
  doc.text(quote.client.name, 20, 62)
  if (quote.client.company) {
    doc.text(quote.client.company, 20, 68)
  }
  if (quote.client.address) {
    doc.text(quote.client.address, 20, 74)
  }
  doc.text(quote.client.email, 20, 80)
  if (quote.client.phone) {
    doc.text(quote.client.phone, 20, 86)
  }

  // Quote Details (Right side)
  doc.setFontSize(10)
  const rightX = 140
  doc.text(`Date: ${new Date(quote.created_at).toLocaleDateString()}`, rightX, 55)
  doc.text(`Valid Until: ${new Date(quote.valid_until).toLocaleDateString()}`, rightX, 61)
  doc.text(`Status: ${quote.status.toUpperCase()}`, rightX, 67)
  if (quote.project) {
    doc.text(`Project: ${quote.project.name}`, rightX, 73)
  }

  // Line Items Table
  autoTable(doc, {
    startY: 95,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: quote.items.map(item => [
      item.description,
      item.quantity.toString(),
      `$${item.unit_price.toFixed(2)}`,
      `$${item.total.toFixed(2)}`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    }
  })

  // Calculate Y position after table
  const finalY = (doc as any).lastAutoTable.finalY + 10

  // Totals Section
  const totalsX = 140
  doc.setFontSize(10)
  doc.text(`Subtotal:`, totalsX, finalY)
  doc.text(`$${quote.subtotal.toFixed(2)}`, 190, finalY, { align: 'right' })

  if (quote.discount_amount > 0) {
    doc.text(`Discount:`, totalsX, finalY + 6)
    doc.text(`-$${quote.discount_amount.toFixed(2)}`, 190, finalY + 6, { align: 'right' })
  }

  doc.text(`Tax (${(quote.tax_rate * 100).toFixed(1)}%):`, totalsX, finalY + 12)
  doc.text(`$${quote.tax_amount.toFixed(2)}`, 190, finalY + 12, { align: 'right' })

  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.text(`Total:`, totalsX, finalY + 20)
  doc.text(`$${quote.total.toFixed(2)}`, 190, finalY + 20, { align: 'right' })

  // Notes Section
  if (options.includeNotes && quote.notes) {
    doc.setFont(undefined, 'normal')
    doc.setFontSize(10)
    doc.text('Notes:', 20, finalY + 35)
    const splitNotes = doc.splitTextToSize(quote.notes, 170)
    doc.text(splitNotes, 20, finalY + 42)
  }

  // Terms & Conditions
  if (options.includeTerms && quote.terms) {
    doc.setFontSize(9)
    doc.text('Terms & Conditions:', 20, 250)
    const splitTerms = doc.splitTextToSize(quote.terms, 170)
    doc.text(splitTerms, 20, 256)
  }

  // Watermark
  if (options.watermark) {
    doc.setFontSize(60)
    doc.setTextColor(200, 200, 200)
    doc.text(options.watermark, 105, 150, {
      align: 'center',
      angle: 45
    })
  }

  return doc.output('blob')
}

export async function generateInvoicePDF(
  quote: QuoteWithRelations,
  invoiceNumber: string,
  dueDate: string
): Promise<Blob> {
  // Similar structure but labeled as INVOICE
  // Add payment terms, due date, payment instructions
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.text('INVOICE', 105, 20, { align: 'center' })

  // Invoice Number & Due Date
  doc.setFontSize(16)
  doc.text(`Invoice #${invoiceNumber}`, 20, 45)
  doc.setFontSize(10)
  doc.text(`Due Date: ${new Date(dueDate).toLocaleDateString()}`, 140, 55)

  // Rest similar to quote PDF...
  // (Complete implementation follows same pattern)

  return doc.output('blob')
}
```

## 8.3 Email Sending Integration

**Problem**: No email sending capability implemented.

**Solution**: Integrate Resend.com for transactional emails.

**Step 1: Install Resend SDK**:
```bash
npm install resend
```

**Step 2: Add Environment Variables**:

Add to `.env.local`:
```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=quotes@sierrasuites.com
```

**Step 3: Create Email Service**: `lib/email-service.ts`

```typescript
import { Resend } from 'resend'
import { QuoteWithRelations } from '@/types/quotes'
import { generateQuotePDF } from '@/lib/pdf-generator'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendQuoteEmailParams {
  quote: QuoteWithRelations
  recipientEmail: string
  recipientName: string
  message?: string
  ccEmails?: string[]
}

export async function sendQuoteEmail(params: SendQuoteEmailParams) {
  const { quote, recipientEmail, recipientName, message, ccEmails } = params

  // Generate PDF attachment
  const pdfBlob = await generateQuotePDF(quote, {
    includeTerms: true,
    includeNotes: true
  })

  // Convert Blob to Buffer for Resend
  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())

  // Send email
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: recipientEmail,
    cc: ccEmails,
    subject: `Quote #${quote.quote_number} from Sierra Suites`,
    html: generateQuoteEmailHTML(quote, recipientName, message),
    attachments: [
      {
        filename: `quote-${quote.quote_number}.pdf`,
        content: pdfBuffer
      }
    ]
  })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  // Log email sent in database
  await logEmailSent(quote.id, recipientEmail, 'quote')

  return data
}

function generateQuoteEmailHTML(
  quote: QuoteWithRelations,
  recipientName: string,
  customMessage?: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2980b9; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .quote-details { background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2980b9; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .btn { display: inline-block; padding: 12px 24px; background: #2980b9; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Sierra Suites</h1>
          <p>Construction Management Platform</p>
        </div>

        <div class="content">
          <h2>Hello ${recipientName},</h2>

          ${customMessage ? `<p>${customMessage}</p>` : `<p>Thank you for your interest in working with us. Please find attached our quote for your project.</p>`}

          <div class="quote-details">
            <h3>Quote Details</h3>
            <p><strong>Quote Number:</strong> ${quote.quote_number}</p>
            <p><strong>Total Amount:</strong> $${quote.total.toFixed(2)}</p>
            <p><strong>Valid Until:</strong> ${new Date(quote.valid_until).toLocaleDateString()}</p>
            ${quote.project ? `<p><strong>Project:</strong> ${quote.project.name}</p>` : ''}
          </div>

          <p>Please review the attached PDF for complete details. If you have any questions or would like to proceed, don't hesitate to reach out.</p>

          <center>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/quotes/${quote.id}" class="btn">View Quote Online</a>
          </center>
        </div>

        <div class="footer">
          <p>This email was sent from Sierra Suites Construction Management Platform</p>
          <p>© ${new Date().getFullYear()} Sierra Suites. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

async function logEmailSent(quoteId: string, recipient: string, type: string) {
  const supabase = createClient()

  await supabase.from('email_logs').insert({
    quote_id: quoteId,
    recipient,
    type,
    sent_at: new Date().toISOString(),
    status: 'sent'
  })
}
```

**Step 4: Create API Route**: `app/api/quotes/[id]/send-email/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendQuoteEmail } from '@/lib/email-service'
import { getQuoteDetails } from '@/lib/quotes'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { recipientEmail, recipientName, message, ccEmails } = body

    // Get quote details
    const quote = await getQuoteDetails(params.id)
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Verify user has access to this quote
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (quote.company_id !== profile?.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Send email
    await sendQuoteEmail({
      quote,
      recipientEmail,
      recipientName,
      message,
      ccEmails
    })

    // Update quote status to 'sent'
    await supabase
      .from('quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', params.id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error sending quote email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
```

**Step 5: Add Database Table for Email Logs**:

Add to `database/master-schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    recipient TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('quote', 'invoice', 'reminder', 'notification')),
    subject TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'bounced', 'failed')),
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_logs_company ON public.email_logs(company_id);
CREATE INDEX idx_email_logs_quote ON public.email_logs(quote_id);
CREATE INDEX idx_email_logs_sent_at ON public.email_logs(sent_at DESC);

-- RLS Policies
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company email logs"
    ON public.email_logs FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert company email logs"
    ON public.email_logs FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
        )
    );
```

## 8.4 Quote Templates

**Enhancement**: Add pre-built quote templates for common construction projects.

**Create Templates File**: `lib/quote-templates.ts`

```typescript
export interface QuoteTemplate {
  id: string
  name: string
  category: string
  description: string
  items: Array<{
    description: string
    quantity: number
    unit_price: number
    category: string
  }>
  terms: string
  notes: string
}

export const QUOTE_TEMPLATES: QuoteTemplate[] = [
  {
    id: 'residential-remodel',
    name: 'Residential Kitchen Remodel',
    category: 'Residential',
    description: 'Standard kitchen renovation package',
    items: [
      {
        description: 'Demolition and Removal',
        quantity: 1,
        unit_price: 2500,
        category: 'Labor'
      },
      {
        description: 'Electrical Work (outlets, lighting)',
        quantity: 1,
        unit_price: 3500,
        category: 'Electrical'
      },
      {
        description: 'Plumbing (sink, dishwasher)',
        quantity: 1,
        unit_price: 2800,
        category: 'Plumbing'
      },
      {
        description: 'Cabinet Installation (linear ft)',
        quantity: 20,
        unit_price: 150,
        category: 'Carpentry'
      },
      {
        description: 'Countertop Installation (granite)',
        quantity: 40,
        unit_price: 75,
        category: 'Finishing'
      },
      {
        description: 'Tile Flooring Installation',
        quantity: 150,
        unit_price: 12,
        category: 'Flooring'
      },
      {
        description: 'Painting',
        quantity: 1,
        unit_price: 1200,
        category: 'Finishing'
      }
    ],
    terms: `Payment Terms:
- 30% deposit upon acceptance
- 40% at midpoint (after framing/rough-in)
- 30% upon completion

Timeline: 4-6 weeks from start date
Warranty: 1 year on labor, manufacturer warranty on materials`,
    notes: 'This quote is valid for 30 days. Material costs subject to change based on final selections.'
  },
  {
    id: 'commercial-buildout',
    name: 'Commercial Office Buildout',
    category: 'Commercial',
    description: 'Standard office space buildout per sq ft',
    items: [
      {
        description: 'Framing and Drywall (per sq ft)',
        quantity: 1000,
        unit_price: 8.50,
        category: 'Construction'
      },
      {
        description: 'Electrical (per sq ft)',
        quantity: 1000,
        unit_price: 6.00,
        category: 'Electrical'
      },
      {
        description: 'HVAC (per sq ft)',
        quantity: 1000,
        unit_price: 7.50,
        category: 'HVAC'
      },
      {
        description: 'Flooring - Carpet Tile (per sq ft)',
        quantity: 1000,
        unit_price: 4.50,
        category: 'Flooring'
      },
      {
        description: 'Ceiling Grid and Tiles (per sq ft)',
        quantity: 1000,
        unit_price: 5.00,
        category: 'Finishing'
      },
      {
        description: 'Paint (per sq ft)',
        quantity: 1000,
        unit_price: 2.50,
        category: 'Finishing'
      },
      {
        description: 'Doors and Hardware',
        quantity: 6,
        unit_price: 850,
        category: 'Hardware'
      }
    ],
    terms: `Payment Schedule:
- 25% upon signing
- 25% at rough-in completion
- 25% at substantial completion
- 25% at final completion

Completion: 8-10 weeks from permit approval
Permits and fees not included`,
    notes: 'Quote based on standard office finish. Upgrades available for premium finishes.'
  },
  {
    id: 'roof-replacement',
    name: 'Residential Roof Replacement',
    category: 'Residential',
    description: 'Complete roof tear-off and replacement',
    items: [
      {
        description: 'Tear-off existing roof (per square)',
        quantity: 25,
        unit_price: 120,
        category: 'Demolition'
      },
      {
        description: 'Roof sheathing repair',
        quantity: 1,
        unit_price: 800,
        category: 'Carpentry'
      },
      {
        description: 'Architectural shingles (per square)',
        quantity: 25,
        unit_price: 350,
        category: 'Materials'
      },
      {
        description: 'Ridge vent installation',
        quantity: 40,
        unit_price: 15,
        category: 'Ventilation'
      },
      {
        description: 'Flashing and valleys',
        quantity: 1,
        unit_price: 1200,
        category: 'Roofing'
      },
      {
        description: 'Cleanup and disposal',
        quantity: 1,
        unit_price: 500,
        category: 'Labor'
      }
    ],
    terms: `Payment Terms:
- 50% deposit
- 50% upon completion

Weather-dependent timeline: 2-4 days
25-year warranty on materials, 5-year labor warranty`,
    notes: 'Quote includes all materials and labor. Does not include structural repairs if discovered during tear-off.'
  }
]

export function getTemplateById(id: string): QuoteTemplate | undefined {
  return QUOTE_TEMPLATES.find(t => t.id === id)
}

export function getTemplatesByCategory(category: string): QuoteTemplate[] {
  return QUOTE_TEMPLATES.filter(t => t.category === category)
}
```

## 8.5 Quote Version History

**Enhancement**: Track quote revisions when changes are made.

**Add to Database Schema**:

```sql
CREATE TABLE IF NOT EXISTS public.quote_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    quote_data JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    change_notes TEXT
);

CREATE INDEX idx_quote_versions_quote ON public.quote_versions(quote_id, version_number DESC);

-- RLS
ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quote versions"
    ON public.quote_versions FOR SELECT
    USING (
        quote_id IN (
            SELECT id FROM public.quotes WHERE company_id IN (
                SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
            )
        )
    );
```

**Create Version Tracking Function**: `lib/quote-versions.ts`

```typescript
export async function saveQuoteVersion(
  quoteId: string,
  quoteData: QuoteWithRelations,
  changeNotes: string
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get current version count
  const { count } = await supabase
    .from('quote_versions')
    .select('*', { count: 'exact', head: true })
    .eq('quote_id', quoteId)

  const versionNumber = (count || 0) + 1

  await supabase.from('quote_versions').insert({
    quote_id: quoteId,
    version_number: versionNumber,
    quote_data: quoteData,
    created_by: user!.id,
    change_notes: changeNotes
  })

  return versionNumber
}

export async function getQuoteVersionHistory(quoteId: string) {
  const supabase = createClient()

  const { data } = await supabase
    .from('quote_versions')
    .select(`
      *,
      created_by_user:user_profiles!created_by (
        full_name, email
      )
    `)
    .eq('quote_id', quoteId)
    .order('version_number', { ascending: false })

  return data || []
}
```

---

# SECTION 9: PUNCH LISTS MODULE

**Current Status**: 65% Complete
**Issues**: Workflow incomplete, no resolution tracking, no photo attachments
**Priority**: HIGH - Critical for project closeout
**Estimated Effort**: 35-45 hours

## 9.1 Complete Punch List Workflow

**Current State**: Basic CRUD exists but missing workflow states and assignment logic.

**Required Workflow States**:
1. **Open** - Newly created item
2. **Assigned** - Assigned to specific user/trade
3. **In Progress** - Work started
4. **Pending Review** - Work completed, awaiting inspection
5. **Approved** - Passed inspection
6. **Rejected** - Failed inspection, needs rework
7. **Closed** - Fully resolved

**Update Database Schema**:

Add to `database/master-schema.sql`:

```sql
-- Update punch_items table
ALTER TABLE public.punch_items
    DROP COLUMN IF EXISTS status,
    ADD COLUMN status TEXT DEFAULT 'open' CHECK (
        status IN ('open', 'assigned', 'in_progress', 'pending_review', 'approved', 'rejected', 'closed')
    ),
    ADD COLUMN assigned_to UUID REFERENCES public.user_profiles(id),
    ADD COLUMN assigned_at TIMESTAMPTZ,
    ADD COLUMN started_at TIMESTAMPTZ,
    ADD COLUMN completed_at TIMESTAMPTZ,
    ADD COLUMN reviewed_by UUID REFERENCES public.user_profiles(id),
    ADD COLUMN reviewed_at TIMESTAMPTZ,
    ADD COLUMN review_notes TEXT,
    ADD COLUMN due_date DATE,
    ADD COLUMN estimated_hours DECIMAL(5,2);

-- Status history tracking
CREATE TABLE IF NOT EXISTS public.punch_item_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    punch_item_id UUID NOT NULL REFERENCES public.punch_items(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.user_profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_punch_history_item ON public.punch_item_history(punch_item_id, changed_at DESC);

-- RLS
ALTER TABLE public.punch_item_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view punch item history"
    ON public.punch_item_history FOR SELECT
    USING (
        punch_item_id IN (
            SELECT id FROM public.punch_items WHERE company_id IN (
                SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert punch item history"
    ON public.punch_item_history FOR INSERT
    WITH CHECK (
        punch_item_id IN (
            SELECT id FROM public.punch_items WHERE company_id IN (
                SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
            )
        )
    );
```

**Create Workflow Functions**: `lib/punchlist-workflow.ts`

```typescript
import { createClient } from '@/lib/supabase/client'

export type PunchStatus = 'open' | 'assigned' | 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'closed'

export interface PunchItemUpdate {
  status: PunchStatus
  notes?: string
  assignedTo?: string
  reviewNotes?: string
}

export async function updatePunchItemStatus(
  punchItemId: string,
  update: PunchItemUpdate
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get current status
  const { data: currentItem } = await supabase
    .from('punch_items')
    .select('status')
    .eq('id', punchItemId)
    .single()

  // Validate state transition
  if (!isValidTransition(currentItem?.status, update.status)) {
    throw new Error(`Invalid transition from ${currentItem?.status} to ${update.status}`)
  }

  // Prepare update data
  const updateData: any = {
    status: update.status
  }

  if (update.status === 'assigned' && update.assignedTo) {
    updateData.assigned_to = update.assignedTo
    updateData.assigned_at = new Date().toISOString()
  }

  if (update.status === 'in_progress') {
    updateData.started_at = new Date().toISOString()
  }

  if (update.status === 'pending_review') {
    updateData.completed_at = new Date().toISOString()
  }

  if (update.status === 'approved' || update.status === 'rejected') {
    updateData.reviewed_by = user!.id
    updateData.reviewed_at = new Date().toISOString()
    if (update.reviewNotes) {
      updateData.review_notes = update.reviewNotes
    }
  }

  // Update punch item
  const { error } = await supabase
    .from('punch_items')
    .update(updateData)
    .eq('id', punchItemId)

  if (error) throw error

  // Log history
  await supabase.from('punch_item_history').insert({
    punch_item_id: punchItemId,
    from_status: currentItem?.status,
    to_status: update.status,
    changed_by: user!.id,
    notes: update.notes
  })

  // Send notifications
  await sendPunchItemNotification(punchItemId, update.status, update.assignedTo)

  return { success: true }
}

function isValidTransition(from: PunchStatus | undefined, to: PunchStatus): boolean {
  const validTransitions: Record<PunchStatus, PunchStatus[]> = {
    'open': ['assigned', 'in_progress', 'closed'],
    'assigned': ['in_progress', 'open', 'closed'],
    'in_progress': ['pending_review', 'open', 'closed'],
    'pending_review': ['approved', 'rejected'],
    'approved': ['closed'],
    'rejected': ['assigned', 'in_progress'],
    'closed': [] // Cannot transition from closed
  }

  if (!from) return to === 'open'

  return validTransitions[from]?.includes(to) ?? false
}

async function sendPunchItemNotification(
  punchItemId: string,
  newStatus: PunchStatus,
  assignedToId?: string
) {
  const supabase = createClient()

  // Get punch item details
  const { data: punchItem } = await supabase
    .from('punch_items')
    .select(`
      *,
      project:projects(name)
    `)
    .eq('id', punchItemId)
    .single()

  if (!punchItem) return

  let recipientId: string | null = null
  let message = ''

  switch (newStatus) {
    case 'assigned':
      recipientId = assignedToId || null
      message = `You have been assigned punch list item: ${punchItem.title}`
      break
    case 'pending_review':
      // Notify project manager or reviewer
      recipientId = punchItem.created_by
      message = `Punch list item ready for review: ${punchItem.title}`
      break
    case 'approved':
      recipientId = punchItem.assigned_to
      message = `Your work was approved: ${punchItem.title}`
      break
    case 'rejected':
      recipientId = punchItem.assigned_to
      message = `Work needs revision: ${punchItem.title}`
      break
  }

  if (recipientId) {
    await supabase.from('notifications').insert({
      user_id: recipientId,
      type: 'punch_list',
      title: 'Punch List Update',
      message,
      link: `/projects/${punchItem.project_id}/punch-list/${punchItemId}`,
      metadata: { punch_item_id: punchItemId, status: newStatus }
    })
  }
}
```

## 9.2 Photo Attachments

**Enhancement**: Allow attaching before/after photos to punch list items.

**Update Schema**:

```sql
CREATE TABLE IF NOT EXISTS public.punch_item_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    punch_item_id UUID NOT NULL REFERENCES public.punch_items(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    photo_type TEXT CHECK (photo_type IN ('before', 'after', 'progress')),
    uploaded_by UUID NOT NULL REFERENCES public.user_profiles(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_punch_photos_item ON public.punch_item_photos(punch_item_id);

-- RLS
ALTER TABLE public.punch_item_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view punch photos"
    ON public.punch_item_photos FOR SELECT
    USING (
        punch_item_id IN (
            SELECT id FROM public.punch_items WHERE company_id IN (
                SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can upload punch photos"
    ON public.punch_item_photos FOR INSERT
    WITH CHECK (
        punch_item_id IN (
            SELECT id FROM public.punch_items WHERE company_id IN (
                SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
            )
        )
    );
```

**Create Upload Component**: `components/punchlist/PhotoUpload.tsx`

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PhotoUploadProps {
  punchItemId: string
  photoType: 'before' | 'after' | 'progress'
  onUploadComplete?: () => void
}

export default function PhotoUpload({ punchItemId, photoType, onUploadComplete }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const supabase = createClient()

    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser()

      // Upload to storage
      const filePath = `punch-items/${punchItemId}/${photoType}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('project-photos')
        .upload(filePath, file, {
          onUploadProgress: (progress) => {
            setProgress((progress.loaded / progress.total) * 100)
          }
        })

      if (uploadError) throw uploadError

      // Create database record
      await supabase.from('punch_item_photos').insert({
        punch_item_id: punchItemId,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        photo_type: photoType,
        uploaded_by: user!.id
      })

      onUploadComplete?.()

    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload photo')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium capitalize">
        {photoType} Photo
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
        className="block w-full text-sm"
      />
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}
```

## 9.3 Punch List Reports

**Enhancement**: Generate PDF reports of all punch list items by project.

**Create Report Generator**: `lib/punch-report-generator.ts`

```typescript
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface PunchReportOptions {
  projectId: string
  projectName: string
  items: any[]
  filterStatus?: string
  filterTrade?: string
}

export async function generatePunchListReport(options: PunchReportOptions): Promise<Blob> {
  const doc = new jsPDF()
  const { projectName, items } = options

  // Title
  doc.setFontSize(18)
  doc.text('Punch List Report', 105, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.text(projectName, 105, 28, { align: 'center' })

  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 35, { align: 'center' })
  doc.text(`Total Items: ${items.length}`, 105, 42, { align: 'center' })

  // Summary by status
  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  let summaryY = 52
  doc.setFontSize(11)
  doc.text('Status Summary:', 20, summaryY)
  summaryY += 6

  doc.setFontSize(9)
  Object.entries(statusCounts).forEach(([status, count]) => {
    doc.text(`${status.replace('_', ' ').toUpperCase()}: ${count}`, 25, summaryY)
    summaryY += 5
  })

  // Items table
  autoTable(doc, {
    startY: summaryY + 5,
    head: [['#', 'Title', 'Location', 'Trade', 'Status', 'Assigned', 'Due']],
    body: items.map((item, idx) => [
      (idx + 1).toString(),
      item.title,
      item.location || '-',
      item.trade || '-',
      item.status.replace('_', ' ').toUpperCase(),
      item.assigned_to_name || 'Unassigned',
      item.due_date ? new Date(item.due_date).toLocaleDateString() : '-'
    ]),
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 50 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 30 },
      6: { cellWidth: 20 }
    }
  })

  return doc.output('blob')
}
```

---

# SECTION 10: TEAMS & RBAC MODULE

**Current Status**: 60% Complete
**Issues**: Permission checks not enforced, no invitation system, role management incomplete
**Priority**: CRITICAL - Security vulnerability
**Estimated Effort**: 45-55 hours

## 10.1 Security Audit & Permission Enforcement

**CRITICAL ISSUE**: Permission checks exist in code but are not consistently enforced.

**Comprehensive Permission Audit Checklist**:

```typescript
// File: lib/security-audit-checklist.ts

export const SECURITY_AUDIT_CHECKLIST = {
  'Database Layer': {
    'RLS Policies': [
      '✓ All tables have RLS enabled',
      '✓ SELECT policies check company_id',
      '✓ INSERT policies validate company_id matches user',
      '✓ UPDATE policies check ownership',
      '✓ DELETE policies check ownership + role permissions',
      '✓ No policies use auth.uid() without company_id check'
    ],
    'Indexes': [
      '✓ All company_id columns are indexed',
      '✓ All user_id columns are indexed',
      '✓ Foreign keys have indexes'
    ]
  },
  'API Routes': {
    'Authentication': [
      '✓ Every route checks auth.getUser()',
      '✓ Returns 401 if no user',
      '✓ No routes skip authentication'
    ],
    'Authorization': [
      '✓ Check user company_id matches resource company_id',
      '✓ Check user role has permission for action',
      '✓ Return 403 if unauthorized',
      '✓ Never trust client-provided company_id'
    ]
  },
  'Client Components': {
    'UI Protection': [
      '✓ Buttons/actions disabled based on permissions',
      '✓ Sensitive data hidden if no permission',
      '✓ usePermissions hook used consistently'
    ],
    'Data Fetching': [
      '✓ Never bypass RLS with service role key',
      '✓ Always use user's auth context',
      '✓ Handle permission errors gracefully'
    ]
  }
}
```

**Create Centralized Permission Checking Middleware**:

File: `lib/api-middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type UserRole = 'owner' | 'admin' | 'project_manager' | 'member' | 'viewer'

export interface AuthenticatedUser {
  id: string
  email: string
  companyId: string
  role: UserRole
}

export async function withAuth(
  request: NextRequest,
  handler: (user: AuthenticatedUser, request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized - Please log in' },
      { status: 401 }
    )
  }

  // Get user profile with company and role
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'User profile not found' },
      { status: 403 }
    )
  }

  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    email: user.email!,
    companyId: profile.company_id,
    role: profile.role as UserRole
  }

  return handler(authenticatedUser, request)
}

export function requireRole(allowedRoles: UserRole[]) {
  return (user: AuthenticatedUser): boolean => {
    return allowedRoles.includes(user.role)
  }
}

export async function verifyResourceAccess(
  companyId: string,
  resourceTable: string,
  resourceId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data } = await supabase
    .from(resourceTable)
    .select('company_id')
    .eq('id', resourceId)
    .single()

  return data?.company_id === companyId
}
```

**Example Protected API Route**:

```typescript
// app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, requireRole, verifyResourceAccess } from '@/lib/api-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (user) => {
    // Verify user has access to this project
    const hasAccess = await verifyResourceAccess(
      user.companyId,
      'projects',
      params.id
    )

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have access to this project' },
        { status: 403 }
      )
    }

    // Fetch project
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (user) => {
    // Only project managers and above can edit
    if (!requireRole(['owner', 'admin', 'project_manager'])(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      )
    }

    // Verify access
    const hasAccess = await verifyResourceAccess(
      user.companyId,
      'projects',
      params.id
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update project
    const body = await request.json()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('projects')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (user) => {
    // Only owners and admins can delete
    if (!requireRole(['owner', 'admin'])(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Only owners and admins can delete projects' },
        { status: 403 }
      )
    }

    // Verify access
    const hasAccess = await verifyResourceAccess(
      user.companyId,
      'projects',
      params.id
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete project
    const supabase = await createClient()
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  })
}
```

## 10.2 Team Invitation System

**Problem**: No way to invite new team members to company.

**Solution**: Build complete invitation system with email verification.

**Update Schema**:

```sql
CREATE TABLE IF NOT EXISTS public.team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'project_manager', 'member', 'viewer')),
    invited_by UUID NOT NULL REFERENCES public.user_profiles(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    token TEXT UNIQUE NOT NULL
);

CREATE INDEX idx_team_invitations_company ON public.team_invitations(company_id);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);

-- RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company invitations"
    ON public.team_invitations FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can create invitations"
    ON public.team_invitations FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can update invitations"
    ON public.team_invitations FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
```

**Create Invitation Functions**: `lib/team-invitations.ts`

```typescript
import { createClient } from '@/lib/supabase/client'
import { randomBytes } from 'crypto'

export async function sendTeamInvitation(
  email: string,
  role: string,
  personalMessage?: string
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's company
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, full_name, companies(name)')
    .eq('id', user!.id)
    .single()

  // Check if user already exists in company
  const { data: existingUser } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email', email)
    .eq('company_id', profile!.company_id)
    .single()

  if (existingUser) {
    throw new Error('User already exists in this company')
  }

  // Generate secure token
  const token = randomBytes(32).toString('hex')

  // Create invitation
  const { data: invitation, error } = await supabase
    .from('team_invitations')
    .insert({
      company_id: profile!.company_id,
      email,
      role,
      invited_by: user!.id,
      token
    })
    .select()
    .single()

  if (error) throw error

  // Send email via API route
  await fetch('/api/team/send-invitation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      token,
      inviterName: profile!.full_name,
      companyName: (profile!.companies as any).name,
      role,
      personalMessage
    })
  })

  return invitation
}

export async function acceptInvitation(token: string) {
  const supabase = createClient()

  // Get invitation
  const { data: invitation, error } = await supabase
    .from('team_invitations')
    .select('*, companies(name)')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (error || !invitation) {
    throw new Error('Invalid or expired invitation')
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    await supabase
      .from('team_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id)

    throw new Error('Invitation has expired')
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Must be logged in to accept invitation')
  }

  if (user.email !== invitation.email) {
    throw new Error('Invitation email does not match logged in user')
  }

  // Create user profile in company
  await supabase.from('user_profiles').insert({
    id: user.id,
    company_id: invitation.company_id,
    email: user.email,
    role: invitation.role
  })

  // Mark invitation as accepted
  await supabase
    .from('team_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString()
    })
    .eq('id', invitation.id)

  return invitation
}
```

**Create Invitation Email API**: `app/api/team/send-invitation/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { email, token, inviterName, companyName, role, personalMessage } = await request.json()

  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${token}`

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: `You're invited to join ${companyName} on Sierra Suites`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2980b9; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .invite-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #2980b9; }
          .btn { display: inline-block; padding: 12px 24px; background: #2980b9; color: white; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Team Invitation</h1>
          </div>

          <div class="content">
            <h2>You've been invited!</h2>

            <p>${inviterName} has invited you to join <strong>${companyName}</strong> on Sierra Suites Construction Management Platform.</p>

            ${personalMessage ? `<div class="invite-box"><p><em>${personalMessage}</em></p></div>` : ''}

            <div class="invite-box">
              <p><strong>Role:</strong> ${role.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Company:</strong> ${companyName}</p>
            </p>

            <p>Click the button below to accept this invitation:</p>

            <center>
              <a href="${acceptUrl}" class="btn">Accept Invitation</a>
            </center>

            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

## 10.3 Role Management UI

**Create Team Management Page**: `app/teams/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/hooks/usePermissions'
import { sendTeamInvitation } from '@/lib/team-invitations'

export default function TeamManagementPage() {
  const { can } = usePermissions()
  const [members, setMembers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)

  const loadTeamData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user!.id)
      .single()

    // Load team members
    const { data: memberData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('company_id', profile!.company_id)
      .order('created_at', { ascending: false })

    setMembers(memberData || [])

    // Load pending invitations
    const { data: inviteData } = await supabase
      .from('team_invitations')
      .select(`
        *,
        invited_by_user:user_profiles!invited_by(full_name, email)
      `)
      .eq('company_id', profile!.company_id)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false })

    setInvitations(inviteData || [])
  }

  useEffect(() => {
    loadTeamData()
  }, [])

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!can('team', 'update')) {
      alert('You do not have permission to update team member roles')
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      alert('Failed to update role')
    } else {
      loadTeamData()
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!can('team', 'delete')) {
      alert('You do not have permission to remove team members')
      return
    }

    if (!confirm('Are you sure you want to remove this team member?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId)

    if (error) {
      alert('Failed to remove member')
    } else {
      loadTeamData()
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Team Management</h1>
        {can('team', 'create') && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Invite Team Member
          </button>
        )}
      </div>

      {/* Team Members Table */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Team Members ({members.length})</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map(member => (
              <tr key={member.id}>
                <td className="px-6 py-4">{member.full_name || '-'}</td>
                <td className="px-6 py-4">{member.email}</td>
                <td className="px-6 py-4">
                  {can('team', 'update') ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="project_manager">Project Manager</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className="capitalize">{member.role.replace('_', ' ')}</span>
                  )}
                </td>
                <td className="px-6 py-4">{new Date(member.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  {can('team', 'delete') && member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Pending Invitations ({invitations.length})</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invited By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invitations.map(invite => (
                <tr key={invite.id}>
                  <td className="px-6 py-4">{invite.email}</td>
                  <td className="px-6 py-4 capitalize">{invite.role.replace('_', ' ')}</td>
                  <td className="px-6 py-4">{(invite.invited_by_user as any)?.full_name || '-'}</td>
                  <td className="px-6 py-4">{new Date(invite.invited_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{new Date(invite.expires_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteTeamMemberModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false)
            loadTeamData()
          }}
        />
      )}
    </div>
  )
}

function InviteTeamMemberModal({ onClose, onSuccess }: any) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await sendTeamInvitation(email, role, message)
      alert('Invitation sent successfully!')
      onSuccess()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Invite Team Member</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="admin">Admin</option>
              <option value="project_manager">Project Manager</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Personal Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

---

---

# SECTION 11: CRM SUITE MODULE

**Current Status**: 65% Complete
**Issues**: Deprecated Supabase client, no email integration, basic contact management only
**Priority**: HIGH - Client relationship management is core
**Estimated Effort**: 50-60 hours

## 11.1 Migrate from Deprecated Supabase Client

**Problem**: CRM module uses deprecated `@supabase/auth-helpers-nextjs` package.

**File**: [app/crm/page.tsx](app/crm/page.tsx)

**Current Deprecated Code**:
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
```

**Fix - Migrate to @supabase/ssr**:

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'

export default function CRMPage() {
  const supabase = createClient() // ✅ Modern client

  // Rest of component...
}
```

**Update All CRM-Related Files**:
- [app/crm/page.tsx](app/crm/page.tsx) - Main CRM dashboard
- [components/crm/ContactList.tsx](components/crm/ContactList.tsx) - Contact list component
- [components/crm/DealPipeline.tsx](components/crm/DealPipeline.tsx) - Deal pipeline
- [lib/crm-permissions.ts](lib/crm-permissions.ts) - Permission checks

## 11.2 Email Integration with Resend

**Enhancement**: Add email sending directly from CRM contacts.

**Create Email Service for CRM**: `lib/crm-email-service.ts`

```typescript
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendCRMEmailParams {
  contactId: string
  subject: string
  body: string
  ccEmails?: string[]
  attachments?: Array<{
    filename: string
    content: Buffer
  }>
}

export async function sendCRMEmail(params: SendCRMEmailParams) {
  const supabase = await createClient()

  // Get contact details
  const { data: contact, error } = await supabase
    .from('crm_contacts')
    .select('*')
    .eq('id', params.contactId)
    .single()

  if (error || !contact) {
    throw new Error('Contact not found')
  }

  // Send email
  const { data, error: sendError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: contact.email,
    cc: params.ccEmails,
    subject: params.subject,
    html: params.body,
    attachments: params.attachments
  })

  if (sendError) {
    throw new Error(`Failed to send email: ${sendError.message}`)
  }

  // Log communication
  await supabase.from('crm_communications').insert({
    contact_id: params.contactId,
    type: 'email',
    direction: 'outbound',
    subject: params.subject,
    body: params.body,
    sent_at: new Date().toISOString()
  })

  return data
}

export async function logInboundEmail(
  contactEmail: string,
  subject: string,
  body: string,
  receivedAt: string
) {
  const supabase = await createClient()

  // Find contact by email
  const { data: contact } = await supabase
    .from('crm_contacts')
    .select('id, company_id')
    .eq('email', contactEmail)
    .single()

  if (!contact) return // Contact not in CRM

  // Log communication
  await supabase.from('crm_communications').insert({
    contact_id: contact.id,
    company_id: contact.company_id,
    type: 'email',
    direction: 'inbound',
    subject,
    body,
    received_at: receivedAt
  })
}
```

**Update CRM Schema for Communications**:

```sql
CREATE TABLE IF NOT EXISTS public.crm_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'note', 'sms')),
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    subject TEXT,
    body TEXT,
    duration_minutes INTEGER, -- for calls/meetings
    created_by UUID REFERENCES public.user_profiles(id),
    sent_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_crm_communications_contact ON public.crm_communications(contact_id, created_at DESC);
CREATE INDEX idx_crm_communications_deal ON public.crm_communications(deal_id);
CREATE INDEX idx_crm_communications_company ON public.crm_communications(company_id);

-- RLS
ALTER TABLE public.crm_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company communications"
    ON public.crm_communications FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create communications"
    ON public.crm_communications FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
        )
    );
```

**Create Email Compose Component**: `components/crm/EmailComposer.tsx`

```typescript
'use client'

import { useState } from 'react'

interface EmailComposerProps {
  contactId: string
  contactEmail: string
  contactName: string
  onClose: () => void
  onSent: () => void
}

export default function EmailComposer({
  contactId,
  contactEmail,
  contactName,
  onClose,
  onSent
}: EmailComposerProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    setSending(true)

    try {
      const response = await fetch('/api/crm/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          subject,
          body
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send email')
      }

      alert('Email sent successfully!')
      onSent()
      onClose()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Compose Email</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <input
              type="text"
              value={`${contactName} <${contactEmail}>`}
              disabled
              className="w-full border rounded px-3 py-2 bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Email subject..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full border rounded px-3 py-2"
              placeholder="Email message..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!subject || !body || sending}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

## 11.3 Deal Pipeline Enhancements

**Enhancement**: Add drag-and-drop deal pipeline with status automation.

**Update Deal Schema**:

```sql
ALTER TABLE public.crm_deals
    ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'lead' CHECK (
        pipeline_stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')
    ),
    ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    ADD COLUMN IF NOT EXISTS expected_close_date DATE,
    ADD COLUMN IF NOT EXISTS actual_close_date DATE,
    ADD COLUMN IF NOT EXISTS lost_reason TEXT;

-- Deal stage history
CREATE TABLE IF NOT EXISTS public.crm_deal_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.user_profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_deal_stage_history ON public.crm_deal_stage_history(deal_id, changed_at DESC);

-- RLS
ALTER TABLE public.crm_deal_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deal stage history"
    ON public.crm_deal_stage_history FOR SELECT
    USING (
        deal_id IN (
            SELECT id FROM public.crm_deals WHERE company_id IN (
                SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
            )
        )
    );
```

**Create Pipeline Component**: `components/crm/DealPipeline.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DndContext, DragEndEvent } from '@dnd-kit/core'

const PIPELINE_STAGES = [
  { id: 'lead', name: 'Lead', color: 'bg-gray-200' },
  { id: 'qualified', name: 'Qualified', color: 'bg-blue-200' },
  { id: 'proposal', name: 'Proposal', color: 'bg-yellow-200' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-orange-200' },
  { id: 'won', name: 'Won', color: 'bg-green-200' },
  { id: 'lost', name: 'Lost', color: 'bg-red-200' }
]

export default function DealPipeline() {
  const [dealsByStage, setDealsByStage] = useState<Record<string, any[]>>({})

  const loadDeals = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user!.id)
      .single()

    const { data: deals } = await supabase
      .from('crm_deals')
      .select(`
        *,
        contact:crm_contacts(name, email, company)
      `)
      .eq('company_id', profile!.company_id)
      .order('created_at', { ascending: false })

    // Group by stage
    const grouped = PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage.id] = deals?.filter(d => d.pipeline_stage === stage.id) || []
      return acc
    }, {} as Record<string, any[]>)

    setDealsByStage(grouped)
  }

  useEffect(() => {
    loadDeals()
  }, [])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const dealId = active.id as string
    const newStage = over.id as string

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Get current deal
    const { data: currentDeal } = await supabase
      .from('crm_deals')
      .select('pipeline_stage')
      .eq('id', dealId)
      .single()

    // Update deal stage
    await supabase
      .from('crm_deals')
      .update({ pipeline_stage: newStage })
      .eq('id', dealId)

    // Log stage change
    await supabase.from('crm_deal_stage_history').insert({
      deal_id: dealId,
      from_stage: currentDeal?.pipeline_stage,
      to_stage: newStage,
      changed_by: user!.id
    })

    loadDeals()
  }

  const calculateStageValue = (stage: string) => {
    const deals = dealsByStage[stage] || []
    return deals.reduce((sum, deal) => sum + (deal.value || 0), 0)
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map(stage => (
          <div key={stage.id} className="flex-shrink-0 w-80">
            <div className={`${stage.color} rounded-t-lg p-3`}>
              <h3 className="font-semibold">{stage.name}</h3>
              <p className="text-sm">
                {dealsByStage[stage.id]?.length || 0} deals
                {' • '}
                ${calculateStageValue(stage.id).toLocaleString()}
              </p>
            </div>

            <div className="bg-gray-50 rounded-b-lg p-3 space-y-2 min-h-96">
              {dealsByStage[stage.id]?.map(deal => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </DndContext>
  )
}

function DealCard({ deal }: { deal: any }) {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <h4 className="font-medium">{deal.title}</h4>
      <p className="text-sm text-gray-600">{(deal.contact as any)?.name}</p>
      <div className="mt-2 flex justify-between items-center">
        <span className="text-lg font-semibold text-green-600">
          ${deal.value?.toLocaleString() || 0}
        </span>
        <span className="text-xs text-gray-500">
          {deal.probability}% chance
        </span>
      </div>
      {deal.expected_close_date && (
        <p className="text-xs text-gray-500 mt-1">
          Close: {new Date(deal.expected_close_date).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}
```

**Install drag-and-drop library**:
```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

## 11.4 Contact Import from CSV/Excel

**Enhancement**: Allow importing contacts from CSV or Excel files.

**Create Import API**: `app/api/crm/import-contacts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'
import { parse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    try {
      const buffer = await file.arrayBuffer()
      let records: any[] = []

      // Parse based on file type
      if (file.name.endsWith('.csv')) {
        const text = new TextDecoder().decode(buffer)
        records = parse(text, { columns: true, skip_empty_lines: true })
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        records = XLSX.utils.sheet_to_json(sheet)
      } else {
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
      }

      // Validate and transform records
      const contacts = records.map(record => ({
        company_id: user.companyId,
        name: record.name || record.Name,
        email: record.email || record.Email,
        phone: record.phone || record.Phone,
        company: record.company || record.Company,
        title: record.title || record.Title,
        type: record.type || record.Type || 'lead',
        source: 'import'
      })).filter(c => c.name && c.email) // Must have name and email

      // Bulk insert
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('crm_contacts')
        .insert(contacts)
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        imported: data.length,
        skipped: records.length - data.length
      })

    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  })
}
```

**Install CSV/Excel parsing libraries**:
```bash
npm install csv-parse xlsx
npm install -D @types/node
```

---

# SECTION 12: SUSTAINABILITY HUB MODULE

**Current Status**: 30% Complete (UI only, hardcoded data)
**Issues**: No real calculations, all data is fake
**Priority**: MEDIUM - Nice-to-have feature
**Estimated Effort**: 60-70 hours for real implementation OR 2-3 hours to remove
**Recommendation**: REMOVE fake data, add "Coming Soon" badge

## 12.1 Decision: Real Implementation vs Remove Fake Data

**Option A: Remove Fake Data (RECOMMENDED)**
- **Effort**: 2-3 hours
- **Outcome**: Clean UI showing "Coming Soon" with planned features
- **Cost**: $0
- **User Impact**: Sets proper expectations

**Option B: Full Real Implementation**
- **Effort**: 60-70 hours
- **Outcome**: Working carbon tracking with real calculations
- **Cost**: ~$1,800-2,100 in development time
- **User Impact**: Functional sustainability tracking

**Recommendation**: Choose Option A for August 2026 launch, implement Option B in Phase 2 (Q4 2026).

## 12.2 Option A Implementation - Remove Fake Data

**Update Sustainability Page**: [app/sustainability/page.tsx](app/sustainability/page.tsx)

```typescript
'use client'

export default function SustainabilityPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sustainability Hub</h1>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
            Coming Soon
          </span>
        </div>
        <p className="text-gray-600 mt-2">
          Track and optimize your project's environmental impact
        </p>
      </div>

      {/* Feature Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          icon="🌍"
          title="Carbon Footprint Tracking"
          description="Monitor CO2 emissions across all projects with real-time calculations"
          status="In Development"
        />
        <FeatureCard
          icon="♻️"
          title="Waste Management"
          description="Track waste generation, recycling rates, and diversion goals"
          status="In Development"
        />
        <FeatureCard
          icon="⚡"
          title="Energy Monitoring"
          description="Measure energy consumption and identify efficiency opportunities"
          status="Planned"
        />
        <FeatureCard
          icon="💧"
          title="Water Usage"
          description="Track water consumption and conservation efforts"
          status="Planned"
        />
        <FeatureCard
          icon="🏅"
          title="LEED Certification Support"
          description="Documentation and tracking for LEED certification requirements"
          status="Planned"
        />
        <FeatureCard
          icon="📊"
          title="Sustainability Reports"
          description="Generate comprehensive environmental impact reports"
          status="Planned"
        />
      </div>

      {/* Early Access Signup */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-2">Be the First to Know</h2>
        <p className="text-gray-700 mb-4">
          Sign up to get notified when Sustainability Hub launches in Q4 2026
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">
          Notify Me When Available
        </button>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description, status }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-3">{description}</p>
      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
        {status}
      </span>
    </div>
  )
}
```

## 12.3 Option B Implementation - Real Carbon Calculations

**Only implement if user chooses Option B**

**Carbon Calculation Formula**:
```typescript
// lib/sustainability-calculations.ts

export interface MaterialEmissions {
  concrete: 0.11 // kg CO2 per kg
  steel: 1.85
  wood: 0.33
  aluminum: 8.24
  glass: 0.85
}

export interface TransportEmissions {
  diesel_truck: 0.27 // kg CO2 per km per ton
  gasoline_vehicle: 0.19
}

export function calculateMaterialCarbon(
  materialType: keyof MaterialEmissions,
  quantityKg: number
): number {
  const emissions: MaterialEmissions = {
    concrete: 0.11,
    steel: 1.85,
    wood: 0.33,
    aluminum: 8.24,
    glass: 0.85
  }

  return quantityKg * emissions[materialType]
}

export function calculateTransportCarbon(
  distance km: number,
  weightTons: number,
  vehicleType: keyof TransportEmissions
): number {
  const emissions: TransportEmissions = {
    diesel_truck: 0.27,
    gasoline_vehicle: 0.19
  }

  return distanceKm * weightTons * emissions[vehicleType]
}

export function calculateEquipmentCarbon(
  equipmentType: string,
  hoursUsed: number
): number {
  const emissionsPerHour: Record<string, number> = {
    'excavator': 25.5, // kg CO2 per hour
    'bulldozer': 30.2,
    'crane': 18.7,
    'concrete_mixer': 12.3,
    'generator': 8.5
  }

  return hoursUsed * (emissionsPerHour[equipmentType] || 15)
}
```

**Database Schema for Real Tracking**:

```sql
CREATE TABLE IF NOT EXISTS public.sustainability_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    material_type TEXT NOT NULL,
    quantity_kg DECIMAL(12,2) NOT NULL,
    carbon_kg_co2 DECIMAL(12,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_by UUID REFERENCES public.user_profiles(id)
);

CREATE TABLE IF NOT EXISTS public.sustainability_transport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    vehicle_type TEXT NOT NULL,
    distance_km DECIMAL(10,2) NOT NULL,
    weight_tons DECIMAL(10,2),
    carbon_kg_co2 DECIMAL(12,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sustainability_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    equipment_type TEXT NOT NULL,
    hours_used DECIMAL(8,2) NOT NULL,
    carbon_kg_co2 DECIMAL(12,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes and RLS policies...
```

**⚠️ Note**: Full Option B implementation would require 60-70 additional hours. Only proceed if user explicitly chooses this path.

---

# SECTION 13: REPORTCENTER MODULE

**Current Status**: 55% Complete
**Issues**: Report generation engine incomplete, limited export formats
**Priority**: MEDIUM-HIGH - Valuable for clients
**Estimated Effort**: 45-55 hours

## 13.1 Report Generation Engine

**Create Universal Report Generator**: `lib/report-engine.ts`

```typescript
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export type ReportFormat = 'pdf' | 'excel' | 'csv'

export interface ReportConfig {
  title: string
  subtitle?: string
  dateRange?: { start: string; end: string }
  companyName: string
  companyLogo?: string
}

export interface ReportSection {
  title: string
  type: 'table' | 'chart' | 'text' | 'summary'
  data: any
}

export class ReportGenerator {
  private config: ReportConfig
  private sections: ReportSection[] = []

  constructor(config: ReportConfig) {
    this.config = config
  }

  addSection(section: ReportSection) {
    this.sections.push(section)
    return this
  }

  async generatePDF(): Promise<Blob> {
    const doc = new jsPDF()
    let currentY = 20

    // Header
    doc.setFontSize(20)
    doc.text(this.config.title, 105, currentY, { align: 'center' })
    currentY += 10

    if (this.config.subtitle) {
      doc.setFontSize(12)
      doc.text(this.config.subtitle, 105, currentY, { align: 'center' })
      currentY += 8
    }

    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, currentY, { align: 'center' })
    currentY += 15

    // Sections
    for (const section of this.sections) {
      if (currentY > 250) {
        doc.addPage()
        currentY = 20
      }

      doc.setFontSize(14)
      doc.text(section.title, 20, currentY)
      currentY += 8

      if (section.type === 'table') {
        autoTable(doc, {
          startY: currentY,
          head: [section.data.headers],
          body: section.data.rows,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 9 }
        })
        currentY = (doc as any).lastAutoTable.finalY + 10
      } else if (section.type === 'summary') {
        doc.setFontSize(10)
        Object.entries(section.data).forEach(([key, value]) => {
          doc.text(`${key}: ${value}`, 20, currentY)
          currentY += 6
        })
        currentY += 5
      } else if (section.type === 'text') {
        doc.setFontSize(10)
        const lines = doc.splitTextToSize(section.data, 170)
        doc.text(lines, 20, currentY)
        currentY += lines.length * 6 + 10
      }
    }

    return doc.output('blob')
  }

  async generateExcel(): Promise<Blob> {
    const workbook = XLSX.utils.book_new()

    // Create summary sheet
    const summaryData = [
      [this.config.title],
      [this.config.subtitle || ''],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [] // Empty row
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    // Create sheet for each table section
    this.sections
      .filter(s => s.type === 'table')
      .forEach((section, index) => {
        const sheetData = [
          section.data.headers,
          ...section.data.rows
        ]
        const sheet = XLSX.utils.aoa_to_sheet(sheetData)
        const sheetName = section.title.substring(0, 31) // Excel limit
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName)
      })

    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }

  async generateCSV(): Promise<Blob> {
    // Combine all table sections into single CSV
    let csvContent = `${this.config.title}\n${this.config.subtitle || ''}\n\n`

    this.sections
      .filter(s => s.type === 'table')
      .forEach(section => {
        csvContent += `\n${section.title}\n`
        csvContent += section.data.headers.join(',') + '\n'
        section.data.rows.forEach((row: any[]) => {
          csvContent += row.map(cell => `"${cell}"`).join(',') + '\n'
        })
      })

    return new Blob([csvContent], { type: 'text/csv' })
  }

  async generate(format: ReportFormat): Promise<Blob> {
    switch (format) {
      case 'pdf':
        return this.generatePDF()
      case 'excel':
        return this.generateExcel()
      case 'csv':
        return this.generateCSV()
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }
}
```

## 13.2 Pre-built Report Templates

**Create Report Templates**: `lib/report-templates.ts`

```typescript
import { ReportGenerator } from './report-engine'
import { createClient } from '@/lib/supabase/server'

export async function generateProjectStatusReport(
  projectId: string,
  format: 'pdf' | 'excel' | 'csv'
): Promise<Blob> {
  const supabase = await createClient()

  // Fetch project data
  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      tasks(id, title, status, due_date),
      project_expenses(amount, category),
      project_milestones(title, due_date, status)
    `)
    .eq('id', projectId)
    .single()

  if (!project) {
    throw new Error('Project not found')
  }

  // Calculate statistics
  const totalTasks = project.tasks.length
  const completedTasks = project.tasks.filter((t: any) => t.status === 'completed').length
  const overdueTasks = project.tasks.filter((t: any) => {
    return t.status !== 'completed' && new Date(t.due_date) < new Date()
  }).length

  const totalExpenses = project.project_expenses.reduce((sum: number, e: any) => sum + e.amount, 0)

  // Build report
  const report = new ReportGenerator({
    title: 'Project Status Report',
    subtitle: project.name,
    companyName: 'Sierra Suites'
  })

  // Summary section
  report.addSection({
    title: 'Project Summary',
    type: 'summary',
    data: {
      'Project Name': project.name,
      'Status': project.status.toUpperCase(),
      'Start Date': new Date(project.start_date).toLocaleDateString(),
      'Target End': new Date(project.target_end_date).toLocaleDateString(),
      'Budget': `$${project.budget.toLocaleString()}`,
      'Total Expenses': `$${totalExpenses.toLocaleString()}`,
      'Remaining Budget': `$${(project.budget - totalExpenses).toLocaleString()}`
    }
  })

  // Task statistics
  report.addSection({
    title: 'Task Statistics',
    type: 'summary',
    data: {
      'Total Tasks': totalTasks,
      'Completed': completedTasks,
      'In Progress': totalTasks - completedTasks,
      'Overdue': overdueTasks,
      'Completion Rate': `${((completedTasks / totalTasks) * 100).toFixed(1)}%`
    }
  })

  // Tasks table
  report.addSection({
    title: 'Task List',
    type: 'table',
    data: {
      headers: ['Title', 'Status', 'Due Date'],
      rows: project.tasks.map((t: any) => [
        t.title,
        t.status.toUpperCase(),
        new Date(t.due_date).toLocaleDateString()
      ])
    }
  })

  // Expenses by category
  const expensesByCategory = project.project_expenses.reduce((acc: any, expense: any) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount
    return acc
  }, {})

  report.addSection({
    title: 'Expenses by Category',
    type: 'table',
    data: {
      headers: ['Category', 'Amount'],
      rows: Object.entries(expensesByCategory).map(([category, amount]) => [
        category,
        `$${(amount as number).toLocaleString()}`
      ])
    }
  })

  return report.generate(format)
}

export async function generateFinancialReport(
  companyId: string,
  startDate: string,
  endDate: string,
  format: 'pdf' | 'excel' | 'csv'
): Promise<Blob> {
  const supabase = await createClient()

  // Fetch financial data
  const { data: expenses } = await supabase
    .from('project_expenses')
    .select('*, project:projects(name)')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate)

  const { data: quotes } = await supabase
    .from('quotes')
    .select('*')
    .eq('company_id', companyId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0
  const totalQuotes = quotes?.reduce((sum, q) => sum + q.total, 0) || 0
  const acceptedQuotes = quotes?.filter(q => q.status === 'accepted') || []
  const totalRevenue = acceptedQuotes.reduce((sum, q) => sum + q.total, 0)

  const report = new ReportGenerator({
    title: 'Financial Report',
    subtitle: `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
    companyName: 'Sierra Suites'
  })

  report.addSection({
    title: 'Financial Summary',
    type: 'summary',
    data: {
      'Total Revenue': `$${totalRevenue.toLocaleString()}`,
      'Total Expenses': `$${totalExpenses.toLocaleString()}`,
      'Net Profit': `$${(totalRevenue - totalExpenses).toLocaleString()}`,
      'Profit Margin': `${((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(1)}%`,
      'Total Quotes Sent': quotes?.length || 0,
      'Quotes Accepted': acceptedQuotes.length,
      'Quote Acceptance Rate': `${((acceptedQuotes.length / (quotes?.length || 1)) * 100).toFixed(1)}%`
    }
  })

  report.addSection({
    title: 'Expenses',
    type: 'table',
    data: {
      headers: ['Date', 'Project', 'Category', 'Amount'],
      rows: expenses?.map(e => [
        new Date(e.date).toLocaleDateString(),
        (e.project as any)?.name || '-',
        e.category,
        `$${e.amount.toLocaleString()}`
      ]) || []
    }
  })

  return report.generate(format)
}
```

## 13.3 Report Scheduling & Automation

**Add to Schema**:

```sql
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
    format TEXT NOT NULL CHECK (format IN ('pdf', 'excel', 'csv')),
    recipients TEXT[] NOT NULL,
    filters JSONB,
    next_run_at TIMESTAMPTZ NOT NULL,
    last_run_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Create Cron Job**: `app/api/cron/send-reports/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateProjectStatusReport, generateFinancialReport } from '@/lib/report-templates'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Get reports due to run
  const { data: scheduledReports } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('is_active', true)
    .lte('next_run_at', new Date().toISOString())

  for (const schedule of scheduledReports || []) {
    try {
      // Generate report
      let reportBlob: Blob

      if (schedule.report_type === 'project_status') {
        reportBlob = await generateProjectStatusReport(
          schedule.filters.project_id,
          schedule.format
        )
      } else if (schedule.report_type === 'financial') {
        const endDate = new Date().toISOString()
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 1)

        reportBlob = await generateFinancialReport(
          schedule.company_id,
          startDate.toISOString(),
          endDate,
          schedule.format
        )
      } else {
        continue
      }

      // Convert blob to buffer
      const buffer = Buffer.from(await reportBlob.arrayBuffer())

      // Send email to all recipients
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: schedule.recipients,
        subject: `Scheduled Report: ${schedule.report_type}`,
        html: `
          <p>Your scheduled ${schedule.report_type} report is attached.</p>
          <p>This is an automated report sent ${schedule.frequency}.</p>
        `,
        attachments: [
          {
            filename: `report-${schedule.report_type}-${new Date().toISOString().split('T')[0]}.${schedule.format}`,
            content: buffer
          }
        ]
      })

      // Update next run time
      const nextRun = new Date()
      if (schedule.frequency === 'daily') nextRun.setDate(nextRun.getDate() + 1)
      if (schedule.frequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7)
      if (schedule.frequency === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1)
      if (schedule.frequency === 'quarterly') nextRun.setMonth(nextRun.getMonth() + 3)

      await supabase
        .from('scheduled_reports')
        .update({
          last_run_at: new Date().toISOString(),
          next_run_at: nextRun.toISOString()
        })
        .eq('id', schedule.id)

    } catch (error) {
      console.error(`Failed to send scheduled report ${schedule.id}:`, error)
    }
  }

  return NextResponse.json({ success: true })
}
```

---

# SECTION 14: AI FEATURES MODULE

**Current Status**: 0% (All AI is fake/simulated)
**Decision Required**: AWS Integration vs "Coming Soon"
**Priority**: LOW for MVP, HIGH for differentiation
**Estimated Effort**: 0 hours (Coming Soon) OR handled by AWS partners

## 14.1 Recommended Approach

Based on user's statement: "the ai is handled by the aws partners"

**Implementation Strategy**:

1. **Remove all fake AI responses** from FieldSnap, sustainability, and other modules
2. **Add "AI-Powered" badges** with "Coming Soon" status
3. **Create API endpoint stubs** for AWS to implement later
4. **Document AI integration points** for AWS team

## 14.2 Clean Up Fake AI

**Files to Update**:

[app/fieldsnap/page.tsx](app/fieldsnap/page.tsx) - Remove fake analysis
[app/sustainability/page.tsx](app/sustainability/page.tsx) - Already covered in Section 12
[components/dashboard/AIInsights.tsx](components/dashboard/AIInsights.tsx) - Remove if exists

**FieldSnap Update**:

```typescript
// app/fieldsnap/page.tsx

export default function FieldSnapPage() {
  const [photos, setPhotos] = useState<any[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">FieldSnap</h1>
          <p className="text-gray-600">Site photo documentation and management</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
            AI Analysis Coming Soon
          </span>
          <button className="px-4 py-2 bg-blue-600 text-white rounded">
            Upload Photos
          </button>
        </div>
      </div>

      {/* Photo grid - no fake AI analysis */}
      <PhotoGrid photos={photos} onSelect={setSelectedPhoto} />

      {/* Future AI features banner */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-2">🤖 AI-Powered Features Coming Soon</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✓ Automatic defect detection</li>
          <li>✓ Safety hazard identification</li>
          <li>✓ Progress comparison with plans</li>
          <li>✓ Material quantity estimation</li>
          <li>✓ Quality compliance checking</li>
        </ul>
        <p className="text-xs text-gray-600 mt-3">
          Powered by advanced computer vision models (Integration in progress)
        </p>
      </div>
    </div>
  )
}
```

## 14.3 API Endpoint Stubs for AWS Integration

**Create placeholder endpoints** for AWS team to implement:

`app/api/ai/analyze-photo/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // TODO: AWS to implement actual AI analysis
  return NextResponse.json({
    error: 'AI analysis not yet implemented',
    message: 'This endpoint will be implemented by AWS partners',
    status: 'coming_soon'
  }, { status: 501 }) // 501 = Not Implemented
}
```

`app/api/ai/carbon-calculation/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // TODO: AWS to implement carbon calculation AI
  return NextResponse.json({
    error: 'Carbon calculation AI not yet implemented',
    message: 'This endpoint will be implemented by AWS partners',
    status: 'coming_soon'
  }, { status: 501 })
}
```

`app/api/ai/cost-estimation/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // TODO: AWS to implement cost estimation AI
  return NextResponse.json({
    error: 'Cost estimation AI not yet implemented',
    message: 'This endpoint will be implemented by AWS partners',
    status: 'coming_soon'
  }, { status: 501 })
}
```

## 14.4 Documentation for AWS Team

**Create AI Integration Guide**: `docs/AWS_AI_INTEGRATION_GUIDE.md`

```markdown
# AWS AI Integration Guide

## Overview
This document outlines the AI integration points in Sierra Suites for AWS implementation.

## Endpoints to Implement

### 1. Photo Analysis - `/api/ai/analyze-photo`
**Purpose**: Analyze construction site photos for defects, hazards, progress

**Input**:
- `image_url`: URL to photo in Supabase storage
- `analysis_type`: 'defect' | 'safety' | 'progress' | 'quality'
- `project_id`: Associated project
- `metadata`: { location, date, trade, etc. }

**Expected Output**:
{
  "defects": [{ type, severity, location, confidence }],
  "hazards": [{ type, risk_level, recommendation }],
  "materials": [{ material, quantity_estimate, unit }],
  "compliance_issues": [{ type, description, reference }]
}

### 2. Carbon Calculation - `/api/ai/carbon-calculation`
**Purpose**: Calculate carbon emissions from materials/equipment

**Input**:
- `materials`: [{ type, quantity, unit }]
- `equipment`: [{ type, hours }]
- `transport`: [{ type, distance, weight }]

**Expected Output**:
{
  "total_co2_kg": number,
  "breakdown": { materials, equipment, transport },
  "recommendations": [string]
}

### 3. Cost Estimation - `/api/ai/cost-estimation`
**Purpose**: AI-powered cost estimation from project scope

**Input**:
- `project_type`: string
- `scope_description`: string
- `location`: { city, state, zip }
- `size`: { value, unit }

**Expected Output**:
{
  "estimated_cost": { min, max, median },
  "breakdown": [{ category, amount, confidence }],
  "assumptions": [string],
  "recommendations": [string]
}

## Storage Access
Photos are stored in Supabase Storage bucket: `project-photos`
Access via: `https://<project>.supabase.co/storage/v1/object/public/project-photos/<path>`

## Authentication
All AI API calls must include user auth header from Supabase.
Validate company_id matches resource company_id.

## Error Handling
Return standard error format:
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

---

# SECTION 15: INTEGRATION LAYER

**Current Status**: 0% (No integrations implemented)
**Total Integrations Planned**: 14
**Priority**: MEDIUM - Adds significant value
**Estimated Effort**: 120-150 hours total

## 15.1 Priority Integration Matrix

| Integration | Priority | Effort | Value | Launch Phase |
|------------|----------|--------|-------|--------------|
| Excel Import/Export | HIGH | 15h | HIGH | Phase 1 (MVP) |
| Weather API | HIGH | 10h | HIGH | Phase 1 (MVP) |
| Google Calendar | MEDIUM | 12h | MEDIUM | Phase 2 |
| Email (Resend) | HIGH | 8h | HIGH | Phase 1 (MVP) |
| Stripe Payments | HIGH | 20h | HIGH | Phase 1 (MVP) |
| QuickBooks | MEDIUM | 25h | HIGH | Phase 2 |
| DocuSign | LOW | 18h | MEDIUM | Phase 3 |
| Google Drive/Dropbox | MEDIUM | 15h | MEDIUM | Phase 2 |
| WhatsApp Notifications | LOW | 12h | LOW | Phase 3 |
| RSMeans Cost Data | LOW | 20h | MEDIUM | Phase 3 |
| Time Tracking | MEDIUM | 15h | MEDIUM | Phase 2 |
| Plaid Banking | LOW | 18h | LOW | Phase 3 |
| Review Automation | LOW | 10h | LOW | Phase 3 |
| Levelset (Liens) | LOW | 15h | LOW | Phase 3 |

**Phase 1 (MVP) Total**: 53 hours
**Phase 2 Total**: 42 hours
**Phase 3 Total**: 55 hours

## 15.2 Phase 1 Integrations (MVP - Must Have)

### Integration 1: Excel Import/Export

**Already partially covered** in QuoteHub and CRM sections. Need to add:

**Project Import/Export**: `lib/excel-integration.ts`

```typescript
import * as XLSX from 'xlsx'

export async function exportProjectsToExcel(projects: any[]): Promise<Blob> {
  const workbook = XLSX.utils.book_new()

  // Projects sheet
  const projectData = projects.map(p => ({
    'Project Name': p.name,
    'Status': p.status,
    'Client': p.client_name,
    'Start Date': p.start_date,
    'End Date': p.target_end_date,
    'Budget': p.budget,
    'Address': p.address,
    'Type': p.project_type
  }))

  const projectSheet = XLSX.utils.json_to_sheet(projectData)
  XLSX.utils.book_append_sheet(workbook, projectSheet, 'Projects')

  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export async function importProjectsFromExcel(file: File): Promise<any[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(sheet)

  return data.map((row: any) => ({
    name: row['Project Name'],
    status: row['Status'] || 'planning',
    client_name: row['Client'],
    start_date: row['Start Date'],
    target_end_date: row['End Date'],
    budget: parseFloat(row['Budget']) || 0,
    address: row['Address'],
    project_type: row['Type'] || 'commercial'
  }))
}
```

### Integration 2: Weather API (Open-Meteo - Free)

**Create Weather Service**: `lib/weather-service.ts`

```typescript
// Using Open-Meteo (free, no API key needed)

export interface WeatherData {
  temperature: number
  condition: string
  precipitation_probability: number
  wind_speed: number
  humidity: number
  forecast: Array<{
    date: string
    temp_high: number
    temp_low: number
    condition: string
    precipitation_probability: number
  }>
}

export async function getWeatherForLocation(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America/New_York`

  const response = await fetch(url)
  const data = await response.json()

  const weatherCodes: Record<number, string> = {
    0: 'Clear',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Foggy',
    51: 'Light Drizzle',
    61: 'Light Rain',
    63: 'Moderate Rain',
    65: 'Heavy Rain',
    71: 'Light Snow',
    73: 'Moderate Snow',
    75: 'Heavy Snow',
    95: 'Thunderstorm'
  }

  return {
    temperature: Math.round(data.current.temperature_2m),
    condition: weatherCodes[data.current.weather_code] || 'Unknown',
    precipitation_probability: data.daily.precipitation_probability_max[0] || 0,
    wind_speed: Math.round(data.current.wind_speed_10m),
    humidity: data.current.relative_humidity_2m,
    forecast: data.daily.time.slice(0, 7).map((date: string, idx: number) => ({
      date,
      temp_high: Math.round(data.daily.temperature_2m_max[idx]),
      temp_low: Math.round(data.daily.temperature_2m_min[idx]),
      condition: weatherCodes[data.daily.weather_code[idx]] || 'Unknown',
      precipitation_probability: data.daily.precipitation_probability_max[idx] || 0
    }))
  }
}

export async function getWeatherForProject(projectId: string): Promise<WeatherData | null> {
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('latitude, longitude, address')
    .eq('id', projectId)
    .single()

  if (!project) return null

  // If no coordinates, try to geocode address
  if (!project.latitude || !project.longitude) {
    const coords = await geocodeAddress(project.address)
    if (!coords) return null

    // Save coordinates for future use
    await supabase
      .from('projects')
      .update({ latitude: coords.lat, longitude: coords.lng })
      .eq('id', projectId)

    return getWeatherForLocation(coords.lat, coords.lng)
  }

  return getWeatherForLocation(project.latitude, project.longitude)
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  // Using OpenStreetMap Nominatim (free)
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SierraSuites/1.0'
    }
  })

  const data = await response.json()

  if (data.length === 0) return null

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon)
  }
}
```

**Add Weather to Projects**: Update project schema

```sql
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);
```

### Integration 3: Stripe Payments

**Install Stripe**:
```bash
npm install stripe @stripe/stripe-js
```

**Create Stripe Service**: `lib/stripe-service.ts`

```typescript
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

export async function createCheckoutSession(
  companyId: string,
  tier: 'starter' | 'professional' | 'enterprise',
  userEmail: string
) {
  const prices = {
    starter: process.env.STRIPE_PRICE_STARTER!,
    professional: process.env.STRIPE_PRICE_PROFESSIONAL!,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE!
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: prices[tier],
        quantity: 1
      }
    ],
    customer_email: userEmail,
    metadata: {
      company_id: companyId,
      tier
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`
  })

  return session
}

export async function handleWebhook(payload: string, signature: string) {
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session
      await activateSubscription(
        session.metadata!.company_id,
        session.metadata!.tier as any,
        session.subscription as string
      )
      break

    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription
      await deactivateSubscription(subscription.metadata.company_id)
      break
  }
}

async function activateSubscription(
  companyId: string,
  tier: string,
  subscriptionId: string
) {
  const supabase = await createClient()

  await supabase
    .from('companies')
    .update({
      subscription_tier: tier,
      subscription_status: 'active',
      stripe_subscription_id: subscriptionId,
      subscription_updated_at: new Date().toISOString()
    })
    .eq('id', companyId)
}

async function deactivateSubscription(companyId: string) {
  const supabase = await createClient()

  await supabase
    .from('companies')
    .update({
      subscription_status: 'cancelled',
      subscription_updated_at: new Date().toISOString()
    })
    .eq('id', companyId)
}
```

**Webhook Route**: `app/api/webhooks/stripe/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { handleWebhook } from '@/lib/stripe-service'

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')!

  try {
    await handleWebhook(payload, signature)
    return NextResponse.json({ received: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

### Integration 4: Email (Resend)

**Already implemented** in QuoteHub and CRM sections.

**Add to environment variables**:
```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@sierrasuites.com
```

## 15.3 Phase 2 Integrations (Post-Launch)

### Integration 5: Google Calendar

**Install Google APIs**:
```bash
npm install googleapis
```

**Create Calendar Service**: `lib/google-calendar-service.ts`

```typescript
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export async function syncProjectMilestones(
  accessToken: string,
  projectId: string
) {
  oauth2Client.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  const supabase = await createClient()

  // Get project milestones
  const { data: milestones } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', projectId)

  // Create calendar events
  for (const milestone of milestones || []) {
    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: milestone.title,
        description: milestone.description,
        start: {
          date: milestone.due_date
        },
        end: {
          date: milestone.due_date
        }
      }
    })
  }
}
```

### Integration 6: QuickBooks

**Use QuickBooks Node SDK**:
```bash
npm install node-quickbooks
```

**Sync expenses and invoices to QuickBooks** - Implementation deferred to Phase 2.

### Integration 7: Google Drive / Dropbox

**For project document storage** - Implementation deferred to Phase 2.

---

# SECTION 16: TESTING & QUALITY ASSURANCE

**Current Status**: 0% (No tests exist)
**Target**: 95%+ code coverage for critical paths
**Priority**: CRITICAL - Cannot launch without tests
**Estimated Effort**: 80-100 hours

## 16.1 Testing Strategy

**Test Pyramid**:
- **Unit Tests**: 60% of tests - Test individual functions, components
- **Integration Tests**: 30% of tests - Test API routes, database queries
- **End-to-End Tests**: 10% of tests - Test critical user flows

**Tools**:
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **Playwright**: E2E testing
- **MSW (Mock Service Worker)**: API mocking

## 16.2 Setup Testing Infrastructure

**Install Dependencies**:
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
npm install -D playwright @playwright/test
npm install -D msw
```

**Jest Configuration**: `jest.config.js`

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './'
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
}

module.exports = createJestConfig(customJestConfig)
```

**Jest Setup**: `jest.setup.js`

```javascript
import '@testing-library/jest-dom'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null })
    }
  })
}))
```

## 16.3 Critical Test Coverage

### Test 1: Authentication Flow

**File**: `__tests__/auth/login.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'

describe('Login Page', () => {
  it('renders login form', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    render(<LoginPage />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('calls login API on form submit', async () => {
    const mockLogin = jest.fn()
    // Mock implementation...

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    })

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })
  })
})
```

### Test 2: Project Creation

**File**: `__tests__/projects/create-project.test.ts`

```typescript
import { createProject } from '@/lib/projects'

describe('Project Creation', () => {
  it('creates project with valid data', async () => {
    const projectData = {
      name: 'Test Project',
      status: 'planning',
      start_date: '2026-01-01',
      budget: 100000,
      company_id: 'test-company-id'
    }

    const result = await createProject(projectData)

    expect(result.error).toBeNull()
    expect(result.data).toHaveProperty('id')
    expect(result.data.name).toBe('Test Project')
  })

  it('validates required fields', async () => {
    const invalidData = {
      status: 'planning'
      // Missing name, company_id, etc.
    }

    const result = await createProject(invalidData as any)

    expect(result.error).toBeDefined()
    expect(result.error.message).toContain('required')
  })

  it('enforces company isolation', async () => {
    // User from company A should not be able to create project for company B
    const result = await createProject({
      name: 'Unauthorized Project',
      company_id: 'different-company-id'
    })

    expect(result.error).toBeDefined()
    expect(result.error.message).toContain('Forbidden')
  })
})
```

### Test 3: RLS Policies

**File**: `__tests__/database/rls-policies.test.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

describe('Row Level Security Policies', () => {
  let supabase: any

  beforeAll(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // For testing only
    )
  })

  it('prevents users from viewing other company projects', async () => {
    // Create user in company A
    const userA = await createTestUser('companyA')

    // Create project in company B
    const projectB = await createTestProject('companyB')

    // Try to fetch as user A
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectB.id)
      .maybeSingle()

    expect(data).toBeNull() // Should not see project from other company
  })

  it('allows users to view own company projects', async () => {
    const user = await createTestUser('companyA')
    const project = await createTestProject('companyA')

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project.id)
      .single()

    expect(error).toBeNull()
    expect(data.id).toBe(project.id)
  })
})
```

### Test 4: Pagination

**File**: `__tests__/lib/pagination.test.ts`

```typescript
import { paginatedQuery } from '@/lib/pagination'

describe('Pagination', () => {
  it('returns first page with limit', async () => {
    const result = await paginatedQuery('projects', { limit: 10 })

    expect(result.data).toHaveLength(10)
    expect(result.hasMore).toBeDefined()
    expect(result.nextCursor).toBeDefined()
  })

  it('returns next page using cursor', async () => {
    const page1 = await paginatedQuery('projects', { limit: 10 })
    const page2 = await paginatedQuery('projects', {
      limit: 10,
      cursor: page1.nextCursor
    })

    // Verify no overlap
    const page1Ids = page1.data.map((p: any) => p.id)
    const page2Ids = page2.data.map((p: any) => p.id)

    expect(page1Ids).not.toContain(page2Ids[0])
  })
})
```

### Test 5: Quote PDF Generation

**File**: `__tests__/quotes/pdf-generation.test.ts`

```typescript
import { generateQuotePDF } from '@/lib/pdf-generator'

describe('Quote PDF Generation', () => {
  it('generates valid PDF blob', async () => {
    const mockQuote = {
      quote_number: 'Q-2026-001',
      client: { name: 'Test Client', email: 'test@example.com' },
      items: [
        { description: 'Item 1', quantity: 1, unit_price: 100, total: 100 }
      ],
      subtotal: 100,
      tax_rate: 0.08,
      tax_amount: 8,
      total: 108
    }

    const blob = await generateQuotePDF(mockQuote as any)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(0)
  })
})
```

## 16.4 E2E Testing with Playwright

**Playwright Config**: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
})
```

**Critical E2E Test**: `e2e/project-workflow.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Project Management Workflow', () => {
  test('complete project creation and task management flow', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')

    // Navigate to projects
    await page.click('a[href="/projects"]')
    await expect(page).toHaveURL('/projects')

    // Create new project
    await page.click('button:has-text("New Project")')
    await page.fill('input[name="name"]', 'E2E Test Project')
    await page.fill('input[name="budget"]', '500000')
    await page.click('button:has-text("Create Project")')

    // Verify project appears in list
    await expect(page.locator('text=E2E Test Project')).toBeVisible()

    // Open project
    await page.click('text=E2E Test Project')

    // Add task
    await page.click('button:has-text("Add Task")')
    await page.fill('input[name="title"]', 'Test Task')
    await page.click('button:has-text("Save Task")')

    // Verify task appears
    await expect(page.locator('text=Test Task')).toBeVisible()

    // Mark task complete
    await page.click('text=Test Task')
    await page.click('button:has-text("Mark Complete")')

    // Verify status updated
    await expect(page.locator('text=Completed')).toBeVisible()
  })
})
```

## 16.5 Test Execution Scripts

**Update package.json**:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

---

# SECTION 17: DEPLOYMENT & INFRASTRUCTURE

**Current Status**: 0% (No deployment pipeline)
**Priority**: CRITICAL - Required for launch
**Estimated Effort**: 40-50 hours

## 17.1 Environment Setup

**Environments**:
1. **Development** - Local development
2. **Staging** - Pre-production testing
3. **Production** - Live application

**Environment Variables Management**:

`.env.local` (Development):
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=dev@sierrasuites.com

STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`.env.production`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@sierrasuites.com

STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

NEXT_PUBLIC_APP_URL=https://app.sierrasuites.com
```

## 17.2 Vercel Deployment (Recommended)

**Why Vercel**:
- Native Next.js support
- Automatic CI/CD
- Edge functions
- Free SSL
- Preview deployments
- Easy environment management

**Setup Steps**:

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Deploy to Staging**:
```bash
vercel --prod=false
```

3. **Deploy to Production**:
```bash
vercel --prod
```

**Vercel Configuration**: `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  },
  "build": {
    "env": {
      "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-key"
    }
  }
}
```

## 17.3 CI/CD Pipeline with GitHub Actions

**Create Workflow**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm run test:coverage

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  deploy-staging:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel Staging
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

## 17.4 Database Migration Strategy

**Supabase Migrations**:

Create migration file: `supabase/migrations/20260101000000_initial_schema.sql`

```sql
-- Copy contents from database/master-schema.sql
```

**Apply Migrations**:

```bash
# Development
npx supabase db push

# Production (via Supabase Dashboard or CLI)
npx supabase db push --db-url postgresql://postgres:[password]@[host]:5432/postgres
```

**Migration Checklist**:
- [ ] Run migration on staging first
- [ ] Verify all tables created
- [ ] Verify RLS policies active
- [ ] Run seed data if needed
- [ ] Test application thoroughly
- [ ] Take database backup
- [ ] Run migration on production
- [ ] Verify production application works

## 17.5 Monitoring & Observability

**Recommended Tools**:

1. **Vercel Analytics** (Built-in)
   - Web vitals
   - Page performance
   - User analytics

2. **Sentry** (Error Tracking)

Install:
```bash
npm install @sentry/nextjs
```

Configure: `sentry.client.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
})
```

3. **Supabase Monitoring** (Built-in)
   - Database performance
   - Storage usage
   - API usage

4. **Uptime Monitoring** - UptimeRobot or Better Uptime
   - Monitor `https://app.sierrasuites.com/api/health`

**Create Health Check**: `app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check database connection
    const { error } = await supabase.from('user_profiles').select('id').limit(1)

    if (error) throw error

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'operational',
        api: 'operational'
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message
      },
      { status: 500 }
    )
  }
}
```

## 17.6 Backup Strategy

**Database Backups** (Supabase automatic):
- Daily backups (retained 7 days) - Free tier
- Point-in-time recovery - Pro tier

**Manual Backup Script**:

```bash
#!/bin/bash
# backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

pg_dump $DATABASE_URL > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://sierrasuites-backups/

# Keep only last 30 days
find . -name "backup_*.sql" -mtime +30 -delete
```

**Storage Backups**:
- Supabase Storage has automatic replication
- Consider S3 sync for critical files

---

# SECTION 18: DOCUMENTATION & TRAINING

**Current Status**: 0% (No documentation)
**Priority**: HIGH - Required for team onboarding
**Estimated Effort**: 30-40 hours

## 18.1 Developer Documentation

**Create**: `docs/README.md`

```markdown
# Sierra Suites Developer Documentation

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Git

### Local Setup

1. Clone repository:
\`\`\`bash
git clone https://github.com/yourorg/sierra-suites.git
cd sierra-suites
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Configure environment:
\`\`\`bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
\`\`\`

4. Run development server:
\`\`\`bash
npm run dev
\`\`\`

5. Open http://localhost:3000

## Architecture

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage
- **Auth**: Supabase Auth
- **Payments**: Stripe
- **Email**: Resend

### Project Structure
\`\`\`
sierra-suites/
├── app/                    # Next.js app router pages
│   ├── dashboard/         # Dashboard module
│   ├── projects/          # Projects module
│   ├── taskflow/          # TaskFlow module
│   ├── fieldsnap/         # FieldSnap module
│   ├── quotes/            # QuoteHub module
│   ├── crm/               # CRM module
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/                # Reusable UI components
│   ├── dashboard/         # Dashboard components
│   ├── projects/          # Project components
│   └── ...
├── lib/                   # Utility functions
│   ├── supabase/          # Supabase clients
│   ├── permissions.ts     # Permission checking
│   ├── pagination.ts      # Pagination utilities
│   └── ...
├── types/                 # TypeScript type definitions
├── public/                # Static assets
├── database/              # Database schemas & migrations
├── __tests__/             # Unit & integration tests
└── e2e/                   # End-to-end tests
\`\`\`

## Database Schema

See [database/master-schema.sql](database/master-schema.sql) for complete schema.

### Key Tables
- \`user_profiles\` - User accounts with company association
- \`companies\` - Company/organization accounts
- \`projects\` - Construction projects
- \`tasks\` - Project tasks
- \`quotes\` - Quote generation
- \`crm_contacts\` - CRM contacts
- \`crm_deals\` - Sales pipeline

## API Routes

### Authentication
- \`POST /api/auth/login\` - User login
- \`POST /api/auth/register\` - User registration
- \`POST /api/auth/logout\` - User logout

### Projects
- \`GET /api/projects\` - List projects
- \`POST /api/projects\` - Create project
- \`GET /api/projects/[id]\` - Get project details
- \`PATCH /api/projects/[id]\` - Update project
- \`DELETE /api/projects/[id]\` - Delete project

## Testing

Run tests:
\`\`\`bash
npm run test              # Unit tests
npm run test:e2e          # E2E tests
npm run test:coverage     # Coverage report
\`\`\`

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment guide.
\`\`\`

## 18.2 API Documentation

**Create**: `docs/API.md`

```markdown
# Sierra Suites API Documentation

## Authentication

All API requests require authentication via Supabase JWT token.

### Headers
\`\`\`
Authorization: Bearer <token>
Content-Type: application/json
\`\`\`

## Projects API

### List Projects
\`\`\`
GET /api/projects?limit=50&cursor=xxx
\`\`\`

**Response**:
\`\`\`json
{
  "data": [
    {
      "id": "uuid",
      "name": "Project Name",
      "status": "in_progress",
      "budget": 500000,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "nextCursor": "xxx",
  "hasMore": true,
  "total": 150
}
\`\`\`

### Create Project
\`\`\`
POST /api/projects
\`\`\`

**Request Body**:
\`\`\`json
{
  "name": "New Project",
  "status": "planning",
  "start_date": "2026-06-01",
  "budget": 500000,
  "client_name": "ABC Construction"
}
\`\`\`

**Response**: 201 Created
\`\`\`json
{
  "id": "uuid",
  "name": "New Project",
  ...
}
\`\`\`

## Error Responses

All errors follow this format:
\`\`\`json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
\`\`\`

### Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error
\`\`\`

## 18.3 User Guides

**Create**: `docs/USER_GUIDE.md`

```markdown
# Sierra Suites User Guide

## Getting Started

### Creating Your First Project

1. Log in to Sierra Suites
2. Click "Projects" in the sidebar
3. Click "New Project" button
4. Fill in project details:
   - Project Name
   - Client
   - Start Date
   - Budget
   - Address
5. Click "Create Project"

### Adding Tasks

1. Open a project
2. Click "Tasks" tab
3. Click "Add Task"
4. Fill in:
   - Task Title
   - Assigned To
   - Due Date
   - Priority
5. Click "Save"

### Generating Quotes

1. Click "Quotes" in sidebar
2. Click "New Quote"
3. Select client
4. Add line items
5. Review totals
6. Click "Send to Client"

## Troubleshooting

### Can't see my projects
- Verify you're logged in
- Check you're in the correct company
- Contact your admin to verify permissions

### Upload failed
- Check file size (max 50MB per file)
- Verify file type is supported
- Check your storage quota

For more help, contact support@sierrasuites.com
\`\`\`

---

# SECTION 19: MAINTENANCE & SUPPORT

**Priority**: MEDIUM - Post-launch requirement
**Estimated Effort**: Ongoing

## 19.1 Support Infrastructure

**Support Channels**:
1. **Email**: support@sierrasuites.com
2. **In-App Chat** (Intercom or similar)
3. **Knowledge Base** (Help Center)
4. **Status Page** (status.sierrasuites.com)

**Support Tiers by Plan**:
- **Starter**: Email only, 48-hour response
- **Professional**: Email + chat, 24-hour response
- **Enterprise**: Priority support, 4-hour response, dedicated account manager

## 19.2 Monitoring Alerts

**Set up alerts for**:
- API response time > 2 seconds
- Error rate > 1%
- Database CPU > 80%
- Storage > 90% quota
- Failed payment attempts
- Security incidents

**Alert Channels**:
- PagerDuty for critical alerts
- Slack for warnings
- Email for non-urgent

## 19.3 Maintenance Windows

**Schedule**:
- **Routine maintenance**: Sundays 2-4am EST
- **Emergency patches**: As needed with 2-hour notice
- **Major updates**: Quarterly with 2-week notice

**Communication**:
- Email all users 1 week before
- In-app banner 24 hours before
- Status page updates during maintenance

## 19.4 SLA Commitments

**Uptime**:
- **Starter**: 99.0% uptime (87.6 hours downtime/year)
- **Professional**: 99.5% uptime (43.8 hours downtime/year)
- **Enterprise**: 99.9% uptime (8.76 hours downtime/year)

**Performance**:
- API response time: < 500ms (p95)
- Page load time: < 2 seconds
- Database query time: < 100ms (p95)

## 19.5 Security Updates

**Process**:
1. Monitor CVE databases daily
2. Evaluate severity (CVSS score)
3. Critical (9.0+): Patch within 24 hours
4. High (7.0-8.9): Patch within 7 days
5. Medium (4.0-6.9): Patch within 30 days
6. Low (<4.0): Patch in next release

**Dependency Updates**:
```bash
# Weekly automated check
npm audit
npm outdated

# Update non-breaking
npm update

# Update breaking (requires testing)
npm install package@latest
```

---

# FINAL SUMMARY - PART 3

## Sections Completed:

✅ **Section 8**: QuoteHub Module - Type safety, PDF generation, email sending, templates, version history
✅ **Section 9**: Punch Lists Module - Complete workflow, photo attachments, reports
✅ **Section 10**: Teams & RBAC Module - Security audit, API middleware, invitation system, role management
✅ **Section 11**: CRM Suite Module - Deprecated client migration, email integration, deal pipeline, contact import
✅ **Section 12**: Sustainability Hub Module - Decision framework (remove fake data vs real implementation)
✅ **Section 13**: ReportCenter Module - Universal report engine, PDF/Excel/CSV export, templates, scheduling
✅ **Section 14**: AI Features Module - Clean up fake AI, API stubs for AWS integration
✅ **Section 15**: Integration Layer - 14 integrations with priority matrix, Phase 1 implementations
✅ **Section 16**: Testing & Quality Assurance - Jest, React Testing Library, Playwright, test coverage strategy
✅ **Section 17**: Deployment & Infrastructure - Vercel deployment, CI/CD pipeline, monitoring, backups
✅ **Section 18**: Documentation & Training - Developer docs, API docs, user guides
✅ **Section 19**: Maintenance & Support - Support infrastructure, SLA commitments, security updates

---

# COMPLETE IMPLEMENTATION EFFORT SUMMARY

## All 3 Parts Combined:

**Part 1 - Foundation** (60-80 hours):
- Database consolidation
- Security & RLS policies
- Performance optimization
- Code splitting

**Part 2 - Core Features** (120-140 hours):
- Dashboard refactor
- Projects enhancements
- TaskFlow templates
- FieldSnap improvements

**Part 3 - Advanced Features** (320-380 hours):
- QuoteHub completion (40-50h)
- Punch Lists (35-45h)
- Teams & RBAC (45-55h)
- CRM modernization (50-60h)
- Sustainability (2-3h to remove fake OR 60-70h for real)
- ReportCenter (45-55h)
- AI cleanup (5-10h)
- Integrations Phase 1 (53h)
- Testing infrastructure (80-100h)
- Deployment setup (40-50h)
- Documentation (30-40h)

**TOTAL EFFORT FOR MVP (August 2026 Launch)**:
**500-600 hours** (12-15 weeks with 1 full-time developer)

With 2 interns starting tomorrow:
- **Timeline**: 6-8 weeks to MVP-ready
- **Focus**: Interns on UI/UX, testing, documentation
- **You/Senior Dev**: Core features, integrations, security

---

# NEXT STEPS

1. **Review this document** - Ensure alignment with vision
2. **Prioritize Phase 1 features** - Confirm MVP scope
3. **Assign work to team** - Split between you and 2 interns
4. **Set up development environment** - All team members
5. **Begin with Part 1** - Foundation is critical
6. **Weekly progress reviews** - Track velocity and adjust timeline

**You now have a complete, enterprise-grade roadmap for Sierra Suites!** 🚀
