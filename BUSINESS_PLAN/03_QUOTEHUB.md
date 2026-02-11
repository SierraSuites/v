# QUOTEHUB - COMPLETE IMPLEMENTATION PLAN

**Module**: Quote & Proposal Management
**Current Status**: 60% Complete (Basic CRUD Works)
**Target Status**: 95% Complete
**Priority**: HIGH (Pre-Sales Revenue Driver)
**Timeline**: 3 weeks

---

## BUSINESS PURPOSE

QuoteHub is where revenue starts. Before you can track a project, you need to win it. This module needs to:
1. **Win More Work** - Professional quotes beat competitors
2. **Price Accurately** - Historical data prevents underpricing
3. **Speed Up Sales** - Create quotes in minutes, not hours
4. **Track Pipeline** - Know what's coming in Q1, Q2, Q3
5. **Convert to Projects** - One click from accepted quote to active project

**User Story**: "I get a quote request Monday morning. I need to send a professional, detailed, accurate proposal by Tuesday afternoon or I lose the bid. I also need to know my profit margin and track whether they accepted or went with someone else."

---

## CURRENT STATE ANALYSIS

### What Works ✅
- **Basic CRUD** - Create, read, update, delete quotes
- **Quote listing** - View all quotes in list
- **Status tracking** - Draft, sent, viewed, accepted, rejected, expired
- **Search & filtering** - Filter by status, search by number/client
- **Statistics dashboard** - Total quotes, conversion rate, total value
- **Client association** - Link quote to CRM contact
- **Line items** - Add multiple items with pricing
- **Total calculations** - Auto-sum line items
- **Duplicate quotes** - Clone existing quotes
- **PDF generation** - Basic PDF export (route exists at `/quotes/[id]/pdf`)

### What's Broken ❌
- **PDF quality is basic** - No branding, looks unprofessional
- **No email sending** - Can't send quote directly from app
- **No templates** - Every quote built from scratch
- **No pricing database** - Can't save/reuse common items
- **Version control missing** - Can't track quote revisions
- **No e-signature** - Can't get client signature digitally
- **Status tracking is manual** - User must manually mark "sent", "viewed", "accepted"
- **No follow-up system** - No reminders to follow up
- **No quote expiration** - Quotes expire but nothing happens
- **Currency handling basic** - Only supports one currency per quote

### What's Missing Completely ❌
- **Template Library** - Pre-built templates for common job types
- **Pricing Database** - Save items with costs and sell prices
- **Material Cost Integration** - Pull current prices from suppliers
- **Margin Calculator** - Show profit margin in real-time
- **Optional Items** - Add/remove items client can choose
- **Alternative Pricing** - Show "Good, Better, Best" options
- **Payment Schedules** - Define when payments are due
- **Terms & Conditions** - Legal boilerplate
- **Branding** - Company logo, colors, custom fonts
- **Email Integration** - Send from app, track opens
- **E-Signature** - DocuSign/Adobe Sign integration
- **Quote Analytics** - Win rate by job type, price point
- **Automated Follow-ups** - "Did you review the quote?"
- **Proposal Sections** - Cover letter, scope, exclusions, assumptions
- **Photo Attachments** - Include photos of site visit
- **Video Integration** - Embedded walkthrough videos
- **One-Click Convert** - Quote → Project with one button

---

## COMPLETE FEATURE SPECIFICATION

### 1. **Enhanced Quote List View** (Priority: HIGH)

**Current**: Basic table with quote number, client, amount, status
**Needed**: Pipeline visibility

#### Enhanced Display:
```
💼 QUOTEHUB - Sales Pipeline

┌─────────────────────────────────────────────────────┐
│ PIPELINE OVERVIEW                                   │
├─────────────────────────────────────────────────────┤
│ 📝 15 Draft ($428K)     │ 📤 8 Sent ($625K)        │
│ 👀 3 Viewed ($142K)     │ ✅ 4 Accepted ($380K)    │
│ ❌ 2 Rejected ($95K)    │ 📊 Conversion: 42%       │
└─────────────────────────────────────────────────────┘

QUOTES (Showing 20 of 32)
Sort: [Newest ↓] Amount | Status | Expiration

┌────────────────────────────────────────────────────┐
│ QT-2026-045 • Office Renovation                    │
│ Acme Corporation • $142,500                        │
├────────────────────────────────────────────────────┤
│ Status: 👀 VIEWED (2 times)                        │
│ Last viewed: Jan 21, 3:42 PM                       │
│ Expires: Jan 31 (9 days remaining) ⚠️             │
│ Follow-up: Due today 🔔                            │
├────────────────────────────────────────────────────┤
│ [📧 Email] [📞 Call] [📝 Edit] [📋 Duplicate]     │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ QT-2026-044 • Kitchen Remodel                      │
│ Smith Family • $48,900                             │
├────────────────────────────────────────────────────┤
│ Status: ✅ ACCEPTED                                │
│ Accepted: Jan 20, 2026                            │
│ Margin: $12,200 (24.9%) ✅                         │
├────────────────────────────────────────────────────┤
│ [🚀 Convert to Project] [📄 View Contract]        │
└────────────────────────────────────────────────────┘
```

#### Pipeline Metrics:
```typescript
interface QuotePipelineStats {
  // Counts by status
  draft_count: number
  sent_count: number
  viewed_count: number
  accepted_count: number
  rejected_count: number
  expired_count: number

  // Values by status
  draft_value: number
  sent_value: number
  viewed_value: number
  accepted_value: number
  rejected_value: number

  // Conversion metrics
  conversion_rate: number // (accepted / (accepted + rejected)) * 100
  average_quote_value: number
  average_time_to_decision_days: number
  win_rate_by_value_range: {
    under_50k: number
    from_50k_to_100k: number
    from_100k_to_250k: number
    over_250k: number
  }

  // Activity metrics
  quotes_sent_this_month: number
  quotes_accepted_this_month: number
  revenue_won_this_month: number
}
```

Implementation:
- [ ] Create pipeline stats function
- [ ] Add status-based filtering with counts
- [ ] Implement follow-up reminder system
- [ ] Track quote views (email pixel tracking)
- [ ] Add bulk actions (Send, Archive, Delete)
- [ ] Create aging report (quotes sent >7 days ago)

---

### 2. **Quote Builder - Complete Redesign** (Priority: CRITICAL)

**Current**: Simple form with line items
**Needed**: Professional proposal builder

#### Step-by-Step Wizard:

**STEP 1: Basic Info**
```
CREATE NEW QUOTE

Client: [Select from CRM ▼] or [+ Add New Client]
Project Name: ___________________________
Project Address: ________________________
Quote Valid Until: [30 days ▼] or [Custom date]

Template: [Use Template ▼]
├─ Residential Remodel
├─ Commercial Build-out
├─ Kitchen & Bath
├─ Roofing Project
├─ Electrical Service
└─ Start from Blank

[Next: Add Items →]
```

**STEP 2: Line Items with Pricing Database**
```
LINE ITEMS

ITEM 1:
Category: [Labor ▼]
Description: Demolition and site prep
┌──────────────────────────────────────┐
│ 💡 SUGGESTIONS (from pricing DB):    │
│ • Demo & Haul Away (avg: $2,500)     │
│ • Site Preparation (avg: $1,800)     │
│ • Full Demo Service (avg: $3,200)    │
└──────────────────────────────────────┘

Quantity: [40] Unit: [hours ▼]
Unit Cost: $65.00 (your cost: $45.00)
Total: $2,600
Markup: 44% | Margin: $800

Tax: [☑] Taxable

[+ Add Item] [+ Add Section Header] [+ Add Optional Item]

─────────────────────────────────────
ITEM LIBRARY (Quick Add):
Recent Items | Saved Items | Templates

├─ Drywall installation ($2.50/sqft)  [+]
├─ Electrical rough-in ($85/hr)       [+]
├─ Plumbing fixtures (per unit)       [+]
└─ Paint labor ($1.80/sqft)           [+]
```

**STEP 3: Pricing Strategy**
```
PRICING & OPTIONS

BASE PACKAGE: $48,900
├─ Labor: $22,400
├─ Materials: $18,600
├─ Subcontractors: $6,500
└─ Markup: $1,400

OPTIONAL ADD-ONS (Client can select):
□ Upgraded fixtures (+$3,200)
□ Extended warranty (+$800)
□ Expedited timeline (+$2,500)

ALTERNATIVE PRICING:
┌──────────────────────────────────────┐
│ 💰 GOOD:    $42,500 (Standard)      │
│ 💎 BETTER:  $48,900 (Recommended)    │
│ 🏆 BEST:    $56,200 (Premium)        │
└──────────────────────────────────────┘

PAYMENT SCHEDULE:
├─ Deposit (30%): $14,670 - Due upon signing
├─ Progress (40%): $19,560 - Due at rough-in
└─ Final (30%): $14,670 - Due at completion

DISCOUNT:
□ Early Payment Discount (3% if paid in full)
□ Referral Discount ($500 off)
Custom: _____ ($ or %)
```

**STEP 4: Scope & Terms**
```
PROPOSAL CONTENT

COVER LETTER:
[Rich text editor with template]
"Dear [Client Name],

Thank you for the opportunity to bid on your kitchen
remodel project. We're excited to bring your vision to
life..."

SCOPE OF WORK:
☑ Use template scope for Kitchen Remodel

[Rich text editor]
• Remove existing cabinets, countertops, and flooring
• Install new custom cabinetry
• Install quartz countertops
• ...

EXCLUSIONS (What's NOT included):
• Appliances (client-provided)
• Structural modifications
• Permits and fees

ASSUMPTIONS:
• Access to water and electricity on site
• Work area will be cleared by owner
• ...

PROJECT TIMELINE:
Start Date: Feb 15, 2026
Duration: 6 weeks
Completion: Mar 28, 2026

TERMS & CONDITIONS:
☑ Use standard T&C template

WARRANTY:
☑ 1 year workmanship warranty
☑ 2 year materials warranty
```

**STEP 5: Branding & Preview**
```
CUSTOMIZE APPEARANCE

Company Logo: [Upload]
Brand Color: [#FF6B6B]
Header Style: [Modern ▼]

PREVIEW:
┌────────────────────────────────────┐
│ [LOGO]    CONSTRUCTION QUOTE       │
│           Quote #QT-2026-045       │
├────────────────────────────────────┤
│ TO:                                │
│ John Smith                         │
│ Acme Corporation                   │
│ 123 Main St, Chicago IL            │
│                                    │
│ FROM:                              │
│ The Sierra Suites Construction     │
│ ...                                │
├────────────────────────────────────┤
│ PROJECT DETAILS...                 │
│ LINE ITEMS...                      │
│ TOTAL: $48,900                     │
├────────────────────────────────────┤
│ [ACCEPT QUOTE] [SIGN HERE]         │
└────────────────────────────────────┘

[Save Draft] [Send to Client] [Download PDF]
```

### Database Schema:

```sql
-- Enhanced quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_template_id UUID REFERENCES quote_templates(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS parent_quote_id UUID REFERENCES quotes(id); -- For revisions
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS expires_at DATE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT false;

-- Quote sections (cover letter, scope, terms, etc.)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS cover_letter TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS scope_of_work TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS exclusions TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS assumptions TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS timeline TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS warranty_terms TEXT;

-- Payment schedule
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_schedule JSONB DEFAULT '[]';
/* Example:
[
  { "name": "Deposit", "percentage": 30, "amount": 14670, "due_on": "signing" },
  { "name": "Progress", "percentage": 40, "amount": 19560, "due_on": "rough-in" },
  { "name": "Final", "percentage": 30, "amount": 14670, "due_on": "completion" }
]
*/

-- Branding
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS brand_color VARCHAR(7) DEFAULT '#FF6B6B';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Quote line items (already exists, enhance)
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS category TEXT; -- 'labor', 'materials', 'subcontractor', 'equipment', 'permit', 'other'
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(12, 2); -- Your cost
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12, 2); -- Sell price
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS markup_percentage DECIMAL(5, 2);
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT false;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN DEFAULT true;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS cost_code VARCHAR(50);

-- Create quote templates table
CREATE TABLE quote_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Template Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category TEXT, -- 'residential', 'commercial', 'remodel', 'new_construction', etc.

  -- Default Content
  default_cover_letter TEXT,
  default_scope_of_work TEXT,
  default_exclusions TEXT,
  default_assumptions TEXT,
  default_terms_and_conditions TEXT,
  default_warranty_terms TEXT,

  -- Default Items (JSON array of line items)
  default_line_items JSONB DEFAULT '[]',

  -- Metadata
  times_used INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pricing database table
CREATE TABLE pricing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Item Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category TEXT,

  -- Pricing
  unit VARCHAR(50) DEFAULT 'each', -- 'each', 'sqft', 'hour', 'day', 'lf', 'cf', etc.
  default_cost DECIMAL(12, 2), -- What you pay
  default_price DECIMAL(12, 2), -- What you charge
  default_markup_percentage DECIMAL(5, 2),

  -- Usage Stats (for "Suggestions")
  times_used INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Vendor
  preferred_vendor VARCHAR(255),
  vendor_sku VARCHAR(100),
  vendor_url TEXT,
  last_price_update DATE,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quote alternatives (Good/Better/Best)
CREATE TABLE quote_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id),

  -- Alternative Info
  name VARCHAR(100) NOT NULL, -- 'Good', 'Better', 'Best' or custom
  description TEXT,
  sequence_order INT NOT NULL,

  -- Pricing
  total_amount DECIMAL(12, 2) NOT NULL,
  line_items JSONB NOT NULL,

  -- Selection
  is_recommended BOOLEAN DEFAULT false,
  is_selected BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quote follow-ups table
CREATE TABLE quote_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id),

  -- Follow-up Info
  follow_up_type TEXT NOT NULL, -- 'email', 'call', 'meeting', 'manual'
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  is_completed BOOLEAN DEFAULT false,

  -- Content
  notes TEXT,
  outcome TEXT, -- 'no_answer', 'left_voicemail', 'spoke_with_client', 'scheduled_meeting', etc.

  -- Automation
  auto_send_email BOOLEAN DEFAULT false,
  email_template_id UUID,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Implementation Tasks:
- [ ] Create all new tables (templates, pricing_items, alternatives, follow_ups)
- [ ] Build step-by-step quote wizard
- [ ] Create pricing database UI
- [ ] Build template library
- [ ] Add Good/Better/Best pricing options
- [ ] Implement payment schedule builder
- [ ] Create rich text editors for content sections
- [ ] Add branding customization
- [ ] Build live preview

---

### 3. **Professional PDF Generation** (Priority: CRITICAL)

**Current**: Basic PDF route exists
**Needed**: Beautiful, branded, professional proposals

#### PDF Design:

```
Page 1 - Cover Page:
┌────────────────────────────────────────┐
│                                        │
│         [COMPANY LOGO]                 │
│                                        │
│      CONSTRUCTION PROPOSAL             │
│                                        │
│   Kitchen Remodel - Smith Residence    │
│                                        │
│         Quote #QT-2026-044             │
│         January 22, 2026               │
│                                        │
│         Total: $48,900                 │
│                                        │
│  ────────────────────────────────────  │
│                                        │
│  Prepared for:                         │
│  John & Jane Smith                     │
│  456 Oak Avenue                        │
│  Chicago, IL 60601                     │
│                                        │
│  Prepared by:                          │
│  Mike Johnson, Project Manager         │
│  The Sierra Suites Construction        │
│  mike@construction.com                 │
│  (555) 123-4567                        │
│                                        │
└────────────────────────────────────────┘

Page 2 - Cover Letter:
┌────────────────────────────────────────┐
│  Dear John and Jane,                   │
│                                        │
│  Thank you for the opportunity to bid  │
│  on your kitchen remodel project...    │
│                                        │
│  [Full cover letter content]           │
│                                        │
│  Sincerely,                            │
│  Mike Johnson                          │
│  [Signature]                           │
└────────────────────────────────────────┘

Page 3 - Project Overview:
┌────────────────────────────────────────┐
│  PROJECT DETAILS                       │
│                                        │
│  Project Name: Kitchen Remodel         │
│  Location: 456 Oak Ave, Chicago IL     │
│  Timeline: Feb 15 - Mar 28 (6 weeks)   │
│  Project Manager: Mike Johnson         │
│                                        │
│  SCOPE OF WORK                         │
│  • Remove existing cabinets...         │
│  • Install new custom cabinetry...     │
│  • Install quartz countertops...       │
│  ...                                   │
└────────────────────────────────────────┘

Page 4 - Pricing:
┌────────────────────────────────────────┐
│  DETAILED PRICING                      │
│                                        │
│  LABOR                                 │
│  Demolition (40 hrs @ $65/hr)  $2,600 │
│  Cabinet installation (80 hrs) $6,400 │
│  ...                                   │
│                            ───────────  │
│  Labor Subtotal:              $22,400  │
│                                        │
│  MATERIALS                             │
│  Custom cabinets               $12,500 │
│  Quartz countertops             $4,200 │
│  ...                                   │
│                            ───────────  │
│  Materials Subtotal:          $18,600  │
│                                        │
│  SUBCONTRACTORS                        │
│  Plumbing rough-in              $2,800 │
│  Electrical work                $3,700 │
│                            ───────────  │
│  Subcontractors Subtotal:      $6,500  │
│                                        │
│  ═══════════════════════════════════   │
│  SUBTOTAL:                    $47,500  │
│  Tax (7%):                     $1,400  │
│  TOTAL:                       $48,900  │
└────────────────────────────────────────┘

Page 5 - Payment Schedule:
┌────────────────────────────────────────┐
│  PAYMENT SCHEDULE                      │
│                                        │
│  Deposit (30%): $14,670                │
│  Due upon contract signing             │
│                                        │
│  Progress Payment (40%): $19,560       │
│  Due upon rough-in completion          │
│                                        │
│  Final Payment (30%): $14,670          │
│  Due upon project completion           │
│                                        │
│  ─────────────────────────────────────  │
│                                        │
│  EARLY PAYMENT DISCOUNT                │
│  Pay in full upfront: Save 3% ($1,467) │
│  New Total: $47,433                    │
└────────────────────────────────────────┘

Page 6 - Terms:
┌────────────────────────────────────────┐
│  EXCLUSIONS                            │
│  The following are NOT included:       │
│  • Appliances (client-provided)        │
│  • Structural modifications            │
│  • Building permits and fees           │
│                                        │
│  ASSUMPTIONS                           │
│  • Access to water/electricity on site │
│  • Work area cleared by owner          │
│  • No hazardous materials present      │
│                                        │
│  WARRANTY                              │
│  • 1 year workmanship warranty         │
│  • 2 year materials warranty           │
│  • Manufacturer warranties pass-thru   │
│                                        │
│  TERMS & CONDITIONS                    │
│  [Full legal T&C text]                 │
└────────────────────────────────────────┘

Page 7 - Signature Page:
┌────────────────────────────────────────┐
│  ACCEPTANCE                            │
│                                        │
│  This quote is valid until: Feb 15     │
│                                        │
│  By signing below, you accept this     │
│  proposal and authorize work to begin. │
│                                        │
│  Client Signature:                     │
│  _____________________  Date: ______   │
│                                        │
│  Print Name:                           │
│  _____________________                 │
│                                        │
│  ─────────────────────────────────────  │
│                                        │
│  [QR CODE: View Online]                │
│  [QR CODE: E-Sign]                     │
│                                        │
└────────────────────────────────────────┘
```

Implementation (using `@react-pdf/renderer` or similar):
```typescript
// lib/pdf-generator-quote.ts

import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  coverPage: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  // ... more styles
})

export const QuotePDF = ({ quote, company }) => (
  <Document>
    {/* Cover Page */}
    <Page size="A4" style={styles.page}>
      <View style={styles.coverPage}>
        {company.logo_url && <Image src={company.logo_url} style={styles.logo} />}
        <Text style={styles.title}>CONSTRUCTION PROPOSAL</Text>
        <Text style={styles.projectName}>{quote.title}</Text>
        <Text style={styles.quoteNumber}>Quote #{quote.quote_number}</Text>
        <Text style={styles.date}>{formatDate(quote.created_at)}</Text>
        <Text style={styles.total}>Total: {formatCurrency(quote.total_amount)}</Text>
        {/* ... */}
      </View>
    </Page>

    {/* Cover Letter */}
    {quote.cover_letter && (
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Dear {quote.client.first_name},</Text>
        <Text style={styles.bodyText}>{quote.cover_letter}</Text>
      </Page>
    )}

    {/* Project Overview */}
    <Page size="A4" style={styles.page}>
      {/* ... */}
    </Page>

    {/* Pricing */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>DETAILED PRICING</Text>
      {groupedLineItems.map(group => (
        <View key={group.category}>
          <Text style={styles.categoryHeader}>{group.category.toUpperCase()}</Text>
          {group.items.map(item => (
            <View key={item.id} style={styles.lineItem}>
              <Text style={styles.lineItemDescription}>
                {item.description} ({item.quantity} {item.unit} @ {formatCurrency(item.unit_price)})
              </Text>
              <Text style={styles.lineItemAmount}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
          <View style={styles.subtotal}>
            <Text>Subtotal:</Text>
            <Text>{formatCurrency(group.subtotal)}</Text>
          </View>
        </View>
      ))}
      {/* Total */}
    </Page>

    {/* Additional pages... */}
  </Document>
)
```

Implementation Tasks:
- [ ] Install PDF generation library
- [ ] Design professional PDF template
- [ ] Add company branding (logo, colors)
- [ ] Implement multi-page layout
- [ ] Add QR codes for online viewing/signing
- [ ] Create print-optimized version
- [ ] Add watermark for draft quotes
- [ ] Generate thumbnail previews

---

### 4. **Email Integration & Tracking** (Priority: HIGH)

**Purpose**: Send quotes from app, track engagement

#### Send Quote Flow:
```
SEND QUOTE: QT-2026-045

To: john.smith@acme.com
CC: jane.smith@acme.com
Subject: [Proposal for Kitchen Remodel - $48,900]

Message:
┌────────────────────────────────────────┐
│ Dear John,                             │
│                                        │
│ Attached is our proposal for your     │
│ kitchen remodel project.               │
│                                        │
│ Key details:                           │
│ • Total Investment: $48,900            │
│ • Timeline: 6 weeks                    │
│ • Start Date: Feb 15, 2026             │
│                                        │
│ You can view and digitally sign the   │
│ proposal online:                       │
│ [View Proposal Button]                 │
│                                        │
│ This quote expires: Feb 15, 2026       │
│                                        │
│ Questions? Call me: (555) 123-4567     │
│                                        │
│ Best regards,                          │
│ Mike Johnson                           │
└────────────────────────────────────────┘

Attachments:
☑ Quote_QT-2026-045.pdf (324 KB)
☑ Portfolio Photos (optional)

☑ Track email opens
☑ Track link clicks
☑ Track PDF downloads
☑ Notify me when viewed

[Schedule Send] [Send Now]
```

#### Email Tracking Dashboard:
```
QUOTE ENGAGEMENT - QT-2026-045

Email sent: Jan 22, 2:45 PM

📧 DELIVERY STATUS:
✅ Delivered to john.smith@acme.com
✅ Delivered to jane.smith@acme.com

👀 VIEW ACTIVITY:
├─ Jan 22, 3:12 PM - Email opened (john.smith@acme.com)
├─ Jan 22, 3:15 PM - Clicked "View Proposal"
├─ Jan 22, 3:16 PM - Viewed PDF (2 min 34 sec)
├─ Jan 22, 6:42 PM - Email opened again
└─ Jan 23, 9:15 AM - Viewed PDF again (4 min 12 sec)

📊 ENGAGEMENT SCORE: 85/100 (High Interest)
Prediction: 78% likely to accept

RECOMMENDED NEXT STEPS:
✅ Follow up call scheduled for Jan 24
⏰ Reminder: Quote expires in 9 days
```

Database Schema:
```sql
CREATE TABLE quote_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id),

  -- Email Details
  to_email VARCHAR(255)[] NOT NULL,
  cc_email VARCHAR(255)[],
  bcc_email VARCHAR(255)[],
  subject VARCHAR(255) NOT NULL,
  message_body TEXT NOT NULL,

  -- Sending
  sent_at TIMESTAMPTZ,
  send_status TEXT DEFAULT 'draft', -- 'draft', 'sending', 'sent', 'failed'
  provider_message_id VARCHAR(255), -- From SendGrid/Postmark/etc.

  -- Tracking (using tracking pixel)
  open_count INT DEFAULT 0,
  first_opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,

  link_click_count INT DEFAULT 0,
  first_clicked_at TIMESTAMPTZ,

  pdf_view_count INT DEFAULT 0,
  pdf_view_duration_seconds INT DEFAULT 0,

  -- Metadata
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quote_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_email_id UUID NOT NULL REFERENCES quote_emails(id),

  -- Event
  event_type TEXT NOT NULL, -- 'opened', 'clicked', 'pdf_viewed', 'bounced', 'complained'
  event_timestamp TIMESTAMPTZ NOT NULL,

  -- Context
  recipient_email VARCHAR(255),
  user_agent TEXT,
  ip_address INET,
  location JSONB, -- City, state, country from IP

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Implementation Tasks:
- [ ] Integrate email provider (SendGrid, Postmark, or AWS SES)
- [ ] Create email templates
- [ ] Implement tracking pixel
- [ ] Add link click tracking
- [ ] Track PDF views with unique URLs
- [ ] Build engagement dashboard
- [ ] Add engagement scoring
- [ ] Create follow-up suggestions based on engagement

---

### 5. **E-Signature Integration** (Priority: HIGH)

**Purpose**: Get client acceptance digitally

#### Options:

**Option A: Simple Native E-Signature**
```
DIGITAL SIGNATURE

I, __________________, hereby accept the proposal
for Kitchen Remodel as outlined in Quote #QT-2026-045
for a total of $48,900.

Draw your signature:
┌────────────────────────────────────────┐
│                                        │
│      [Canvas for signature drawing]    │
│                                        │
└────────────────────────────────────────┘
[Clear] [Save Signature]

☑ I agree to the terms and conditions
☑ I authorize work to begin

Date: January 23, 2026
IP Address: 192.168.1.1 (for legal verification)

[Submit Acceptance]
```

**Option B: DocuSign/Adobe Sign Integration**
```
E-SIGNATURE OPTIONS

Choose signing method:

├─ 📝 Basic E-Sign (Free)
│  Simple signature capture
│  Legally binding
│  Instant acceptance
│  [Use Basic E-Sign]
│
├─ 📄 DocuSign (Premium)
│  Full audit trail
│  Multi-party signing
│  Advanced verification
│  Industry standard
│  [Send via DocuSign]
│
└─ 📑 Adobe Sign (Premium)
   Similar to DocuSign
   PDF workflow
   [Send via Adobe]
```

Database Schema:
```sql
CREATE TABLE quote_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id),

  -- Signature Data
  signature_method TEXT NOT NULL, -- 'native', 'docusign', 'adobe_sign'
  signature_image_url TEXT, -- For native signatures (base64 or S3 URL)
  signature_data JSONB, -- Full signature object from provider

  -- Signer Info
  signer_name VARCHAR(255) NOT NULL,
  signer_email VARCHAR(255) NOT NULL,
  signer_ip_address INET,
  signer_user_agent TEXT,

  -- Timestamp
  signed_at TIMESTAMPTZ NOT NULL,

  -- Legal
  accepted_terms BOOLEAN DEFAULT true,
  audit_trail JSONB, -- Full legal audit trail

  -- Provider-specific
  docusign_envelope_id VARCHAR(255),
  adobe_agreement_id VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_signed BOOLEAN DEFAULT false;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signed_by_name VARCHAR(255);
```

Implementation Tasks:
- [ ] Build native signature capture (using canvas)
- [ ] Integrate DocuSign API (optional premium)
- [ ] Integrate Adobe Sign API (optional premium)
- [ ] Create legal audit trail
- [ ] Auto-update quote status on signature
- [ ] Send confirmation email to client
- [ ] Notify sales team of acceptance
- [ ] Trigger project creation (if enabled)

---

### 6. **One-Click Quote → Project Conversion** (Priority: CRITICAL)

**Purpose**: Win quote Friday, start project Monday

#### Conversion Flow:
```
QUOTE ACCEPTED! 🎉

Quote QT-2026-044: Kitchen Remodel
Accepted by: John Smith
Amount: $48,900

┌────────────────────────────────────────┐
│ READY TO CONVERT TO PROJECT?           │
├────────────────────────────────────────┤
│ This will:                             │
│ ✅ Create new project                  │
│ ✅ Copy all quote details              │
│ ✅ Set budget to $48,900               │
│ ✅ Create initial tasks                │
│ ✅ Assign project manager              │
│ ✅ Invite client to portal             │
│                                        │
│ Project Start Date: [Feb 15, 2026]    │
│ Project Manager: [Mike Johnson ▼]     │
│ Project Template: [Kitchen Remodel ▼] │
│                                        │
│ ☑ Import line items as budget items   │
│ ☑ Create tasks from template          │
│ ☑ Send welcome email to client        │
│ ☑ Schedule kickoff meeting            │
│                                        │
│ [Cancel] [Create Project →]            │
└────────────────────────────────────────┘
```

After Conversion:
```
✅ PROJECT CREATED!

Project #PRJ-2026-125 created successfully

What's been set up:
✅ Project: Kitchen Remodel - Smith Residence
✅ Budget: $48,900 (from quote line items)
✅ Timeline: Feb 15 - Mar 28 (6 weeks)
✅ Team: Mike Johnson (PM), +3 team members
✅ Tasks: 24 tasks created from template
✅ Client Portal: John Smith invited
✅ First Meeting: Kickoff scheduled for Feb 14

NEXT STEPS:
├─ Review and adjust timeline
├─ Order materials (lead time: 2 weeks)
├─ Schedule subcontractors
└─ Prepare site

[Go to Project] [Schedule Team] [Order Materials]
```

Implementation:
```typescript
// lib/quotes-to-projects.ts

export async function convertQuoteToProject(quoteId: string, options: {
  startDate: Date
  projectManagerId: string
  templateId?: string
  importLineItems: boolean
  createTasks: boolean
  inviteClient: boolean
}) {
  const supabase = createClient()

  // 1. Get quote details
  const { data: quote } = await supabase
    .from('quotes')
    .select(`
      *,
      quote_items (*),
      client:crm_contacts (*)
    `)
    .eq('id', quoteId)
    .single()

  // 2. Create project
  const { data: project } = await supabase
    .from('projects')
    .insert([{
      name: quote.title,
      status: 'planning',
      start_date: options.startDate,
      estimated_budget: quote.total_amount,
      client_id: quote.client_id,
      project_manager_id: options.projectManagerId,
      // ... more fields
    }])
    .select()
    .single()

  // 3. Import line items as budget items (if enabled)
  if (options.importLineItems) {
    const budgetItems = quote.quote_items.map(item => ({
      project_id: project.id,
      category: item.category,
      description: item.description,
      estimated_amount: item.total,
      // ...
    }))

    await supabase.from('budget_items').insert(budgetItems)
  }

  // 4. Create tasks from template (if enabled)
  if (options.createTasks && options.templateId) {
    const { data: templateTasks } = await supabase
      .from('task_templates')
      .select('*')
      .eq('template_id', options.templateId)

    const tasks = templateTasks.map(tt => ({
      project_id: project.id,
      title: tt.title,
      description: tt.description,
      due_date: addDays(options.startDate, tt.due_offset_days),
      // ...
    }))

    await supabase.from('tasks').insert(tasks)
  }

  // 5. Invite client to portal (if enabled)
  if (options.inviteClient && quote.client) {
    await inviteClientToPortal({
      projectId: project.id,
      email: quote.client.email,
      name: `${quote.client.first_name} ${quote.client.last_name}`
    })
  }

  // 6. Update quote status
  await supabase
    .from('quotes')
    .update({
      status: 'converted',
      converted_to_project_id: project.id,
      converted_at: new Date().toISOString()
    })
    .eq('id', quoteId)

  // 7. Log activity
  await logActivity({
    type: 'quote_converted',
    project_id: project.id,
    title: `Quote ${quote.quote_number} converted to project`,
    metadata: { quote_id: quoteId }
  })

  return project
}
```

Database Updates:
```sql
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS converted_to_project_id UUID REFERENCES projects(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_from_quote_id UUID REFERENCES quotes(id);
```

Implementation Tasks:
- [ ] Create conversion function
- [ ] Build conversion wizard UI
- [ ] Map quote line items to budget
- [ ] Create project from template
- [ ] Auto-invite client to portal
- [ ] Send kickoff emails
- [ ] Update quote status
- [ ] Track conversion metrics

---

### 7. **Analytics & Reporting** (Priority: MEDIUM)

**Purpose**: Understand sales performance

#### Reports:

**A. Win Rate Analysis**
```
📊 QUOTE PERFORMANCE - Last 90 Days

OVERALL:
├─ Quotes Sent: 47
├─ Accepted: 22 (46.8%)
├─ Rejected: 18 (38.3%)
└─ Pending: 7 (14.9%)

WIN RATE BY VALUE:
├─ Under $50K:      18/25 (72%) ✅
├─ $50K - $100K:    3/12 (25%) ⚠️
├─ $100K - $250K:   1/8 (12.5%) 🔴
└─ Over $250K:      0/2 (0%) 🔴

INSIGHT: We're winning small jobs but losing big ones.
Recommendation: Review pricing strategy for larger projects.

WIN RATE BY PROJECT TYPE:
├─ Kitchen Remodel: 12/15 (80%) ✅
├─ Bathroom:        6/10 (60%) ✅
├─ Additions:       2/8 (25%) ⚠️
└─ Commercial:      2/14 (14%) 🔴

INSIGHT: Strong in residential remodels, weak in commercial.
```

**B. Pricing Analysis**
```
💰 PRICING INSIGHTS

AVERAGE QUOTE VALUE: $87,400
AVERAGE WON VALUE: $52,300
AVERAGE LOST VALUE: $142,700

We're losing bigger deals - possibly pricing too high?

MARKUP ANALYSIS:
├─ Average Markup: 28%
├─ Winning Quotes: 24% avg markup
├─ Losing Quotes: 35% avg markup

INSIGHT: Lower margins win more often.

TOP COMPETITORS (mentioned in rejections):
├─ ABC Construction: Won 8 deals against us
├─ XYZ Builders: Won 5 deals
└─ Quality Homes: Won 3 deals
```

**C. Time-to-Decision**
```
⏱️ SALES CYCLE ANALYSIS

AVERAGE TIME FROM SEND TO DECISION: 12 days

BY DECISION:
├─ Accepted: 8 days avg
├─ Rejected: 16 days avg
└─ No Response: 24+ days

INSIGHT: Quick decisions are usually "yes", delays = "no"

FOLLOW-UP EFFECTIVENESS:
├─ 0 follow-ups: 25% win rate
├─ 1 follow-up: 45% win rate
├─ 2 follow-ups: 62% win rate
└─ 3+ follow-ups: 55% win rate (diminishing returns)

RECOMMENDATION: Always do 2 follow-ups.
```

Implementation:
- [ ] Create analytics dashboard
- [ ] Track win/loss reasons
- [ ] Calculate sales cycle metrics
- [ ] Build competitor tracking
- [ ] Create pricing recommendations
- [ ] Add forecasting (pipeline value → expected revenue)

---

## TECHNICAL IMPLEMENTATION

### API Routes:

```typescript
// app/api/quotes/route.ts
export async function POST(request: NextRequest) {
  const { data: authData, error: authError } = await requireAuth(request)
  if (authError) return authError

  const rateLimitError = rateLimit(request, `quotes-create-${authData.user.id}`, 20, 60000)
  if (rateLimitError) return rateLimitError

  const body = await request.json()

  // Create quote
  const { data: quote, error } = await createQuote({
    ...body,
    company_id: authData.user.company_id,
    created_by: authData.user.id
  })

  if (error) return handleApiError(error)

  const response = NextResponse.json({ data: quote })
  return addRateLimitHeaders(response, `quotes-create-${authData.user.id}`, 20)
}

// app/api/quotes/[id]/send/route.ts
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { data: authData, error: authError } = await requireAuth(request)
  if (authError) return authError

  const rateLimitError = rateLimit(request, `quotes-send-${authData.user.id}`, 10, 60000)
  if (rateLimitError) return rateLimitError

  const { to, cc, subject, message } = await request.json()

  // Send email
  const result = await sendQuoteEmail({
    quoteId: params.id,
    to,
    cc,
    subject,
    message,
    sentBy: authData.user.id
  })

  const response = NextResponse.json({ data: result })
  return addRateLimitHeaders(response, `quotes-send-${authData.user.id}`, 10)
}

// app/api/quotes/[id]/convert/route.ts
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { data: authData, error: authError } = await requireAuth(request)
  if (authError) return authError

  const options = await request.json()

  // Convert to project
  const project = await convertQuoteToProject(params.id, options)

  return NextResponse.json({ data: project })
}
```

---

## UI/UX REQUIREMENTS

### Design Principles

**1. Professional First Impression**
- Quotes represent your company - make them beautiful
- Clean, modern PDF design
- Consistent branding

**2. Speed Wins Deals**
- Create quote in <5 minutes
- Templates for common jobs
- Pricing database eliminates guesswork

**3. Sales Intelligence**
- Know when client viewed quote
- Track engagement
- Follow-up reminders

### Mobile Considerations

**Field Sales Mode**:
- Create quotes from phone (site visit)
- Quick pricing lookups
- Voice-to-text for scope
- Photo attachments from site

---

## SUCCESS METRICS

### Adoption
- **Target**: 100% of quotes created in system
- **Measure**: Quotes created per week

### Conversion
- **Target**: 50% quote acceptance rate
- **Measure**: Accepted / (Accepted + Rejected)

### Speed
- **Target**: <10 minutes to create quote
- **Measure**: Time from creation to sending

### Engagement
- **Target**: 80% of quotes are viewed
- **Measure**: Email tracking data

---

## ROLLOUT PLAN

### Week 1: Foundation
- [ ] Create enhanced database schema
- [ ] Build pricing database
- [ ] Create template library
- [ ] Enhance quote builder UI

### Week 2: Professional PDFs
- [ ] Design PDF templates
- [ ] Implement PDF generation
- [ ] Add branding customization
- [ ] Test printing

### Week 3: Email & Tracking
- [ ] Integrate email provider
- [ ] Build email composer
- [ ] Implement tracking
- [ ] Create engagement dashboard

### Week 4: Conversion & Analytics
- [ ] Build quote → project conversion
- [ ] Create analytics dashboard
- [ ] Add e-signature (basic)
- [ ] Launch beta

---

## COMPETITIVE EDGE

**vs CoConstruct**: Their quotes are complex, ours are simpler
**vs Buildertrend**: Similar features, we're faster
**vs Jobber**: They're service-focused, we're construction-specific

**What Makes Us Better**:
1. 🎯 Templates for every job type
2. 📊 Pricing intelligence from past quotes
3. 📧 Email tracking shows engagement
4. 🤖 AI-suggested pricing (future)
5. ⚡ One-click conversion to project

---

**QuoteHub is 60% done because CRUD works. But beautiful PDFs, email tracking, and smart conversion are what sell subscriptions. Focus on making quotes look amazing first. 💼**
