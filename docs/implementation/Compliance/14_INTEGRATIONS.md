# INTEGRATIONS - COMPLETE IMPLEMENTATION PLAN

**Module**: Third-Party Integrations & API
**Current Status**: 10% Complete (Almost Nothing)
**Target Status**: 85% Complete
**Priority**: MEDIUM (Ecosystem Play)
**Timeline**: 2 weeks

---

## BUSINESS PURPOSE

No software is an island. Integrations extend value:
1. **Accounting** - QuickBooks, Xero sync financials
2. **Payments** - Stripe for online payments
3. **Signatures** - DocuSign, Adobe Sign for contracts
4. **Email** - Gmail, Outlook for communication
5. **Calendars** - Google Calendar, Outlook events
6. **Storage** - Dropbox, Google Drive for files
7. **Communication** - Slack for team notifications

---

## PRIORITY INTEGRATIONS

### 1. QuickBooks Online (CRITICAL)
```
🔗 QUICKBOOKS ONLINE INTEGRATION

WHY: Every contractor uses QB for bookkeeping

FEATURES:
├─ Auto-sync invoices (when created/sent)
├─ Auto-sync expenses (daily batch)
├─ Auto-sync payments (real-time)
├─ Two-way sync (updates flow both ways)
├─ Chart of accounts mapping
└─ Customer/vendor sync

SETUP:
1. OAuth authentication
2. Map accounts
3. Choose sync frequency
4. Test connection

STATUS: ⚠️ Not implemented
PRIORITY: CRITICAL (30% of users will require this)
TIME: 3-4 days
```

### 2. Stripe Payment Processing (CRITICAL)
```
💳 STRIPE INTEGRATION

WHY: Accept credit cards for invoices

FEATURES:
├─ Online invoice payment
├─ Deposit collection
├─ Subscription billing (for SaaS pricing)
├─ ACH payments
└─ Payment links

SETUP:
1. Create Stripe account
2. API keys
3. Webhook endpoints
4. Payment page styling

IMPLEMENTATION:
```typescript
// lib/stripe.ts
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function createPaymentIntent(
  invoiceId: string,
  amount: number
) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    metadata: { invoice_id: invoiceId }
  })

  return paymentIntent
}

export async function createInvoicePaymentLink(invoice: Invoice) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: invoice.line_items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: { name: item.description },
        unit_amount: Math.round(item.amount * 100)
      },
      quantity: 1
    })),
    success_url: `${process.env.APP_URL}/invoices/${invoice.id}/paid`,
    cancel_url: `${process.env.APP_URL}/invoices/${invoice.id}`,
    metadata: { invoice_id: invoice.id }
  })

  return session.url
}
```

STATUS: ⚠️ Not implemented
PRIORITY: CRITICAL (online payments expected)
TIME: 2-3 days
```

### 3. Gmail/Outlook Email (HIGH)
```
📧 EMAIL INTEGRATION

WHY: Auto-log emails with clients

FEATURES:
├─ Send emails from app
├─ Auto-log client emails to CRM
├─ Email tracking (opens, clicks)
├─ Calendar event sync
└─ Contact sync

SETUP (Gmail):
1. Google OAuth
2. Gmail API permissions
3. Webhook for incoming emails
4. Calendar API for events

SETUP (Outlook):
1. Microsoft OAuth
2. Graph API permissions
3. Change notifications
4. Calendar sync

STATUS: ⚠️ Basic email sending only
PRIORITY: HIGH (CRM needs this)
TIME: 4-5 days
```

### 4. DocuSign/Adobe Sign (MEDIUM)
```
✍️ E-SIGNATURE INTEGRATION

WHY: Digital contract signing

FEATURES:
├─ Send contracts for signature
├─ Track signature status
├─ Automated reminders
├─ Legal audit trail
└─ Template management

IMPLEMENTATION OPTIONS:
A. DocuSign (Industry standard, $25/mo per user)
B. Adobe Sign (Similar, $25/mo per user)
C. Native (Free, but less features)

RECOMMENDATION: Start native, add DocuSign as premium

STATUS: ⚠️ Native only (basic)
PRIORITY: MEDIUM
TIME: 3 days for DocuSign integration
```

### 5. Zapier (MEDIUM)
```
⚡ ZAPIER INTEGRATION

WHY: Connect to 3,000+ apps without coding

USE CASES:
├─ New project → Create Google Drive folder
├─ Invoice sent → Log in Airtable
├─ Task completed → Send Slack message
├─ New lead → Add to Mailchimp
└─ Photo uploaded → Backup to Dropbox

SETUP:
1. Create Zapier app listing
2. Implement OAuth
3. Define triggers:
   - New project
   - New task
   - Invoice sent
   - Payment received
   - Photo uploaded
4. Define actions:
   - Create project
   - Create task
   - Update project status

STATUS: ⚠️ Not implemented
PRIORITY: MEDIUM (power users love this)
TIME: 5-6 days
```

### 6. Google Calendar/Outlook Calendar (MEDIUM)
```
📅 CALENDAR INTEGRATION

WHY: Sync meetings, inspections

FEATURES:
├─ Two-way sync of events
├─ Meeting scheduling from app
├─ Inspection reminders
├─ Client meeting tracking
└─ Team availability

IMPLEMENTATION:
- Google Calendar API
- Microsoft Graph API
- iCal feed export (universal)

STATUS: ⚠️ Not implemented
PRIORITY: MEDIUM
TIME: 3 days
```

### 7. Slack/Microsoft Teams (LOW)
```
💬 TEAM COMMUNICATION

WHY: Real-time notifications

FEATURES:
├─ Project updates to channels
├─ Task assignments notify users
├─ Daily digest messages
├─ Alert notifications
└─ Commands: "/sierra create task"

IMPLEMENTATION:
```typescript
// lib/slack.ts
import { WebClient } from '@slack/web-api'

const slack = new WebClient(process.env.SLACK_BOT_TOKEN)

export async function notifyChannel(
  channel: string,
  message: string
) {
  await slack.chat.postMessage({
    channel,
    text: message,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message
        }
      }
    ]
  })
}

// Usage: notifyChannel('#projects', 'New task assigned to you')
```

STATUS: ⚠️ Not implemented
PRIORITY: LOW (nice-to-have)
TIME: 2 days
```

---

## PUBLIC API

```
🔌 THE SIERRA SUITES API

PURPOSE: Let customers build custom integrations

AUTHENTICATION: API Keys + OAuth 2.0

ENDPOINTS:

GET /api/v1/projects
GET /api/v1/projects/:id
POST /api/v1/projects
PUT /api/v1/projects/:id
DELETE /api/v1/projects/:id

GET /api/v1/tasks
POST /api/v1/tasks
PUT /api/v1/tasks/:id

GET /api/v1/contacts
POST /api/v1/contacts

GET /api/v1/photos
POST /api/v1/photos

RATE LIMITS:
- Free tier: 100 requests/hour
- Pro tier: 1,000 requests/hour
- Enterprise: 10,000 requests/hour

WEBHOOKS:
POST https://customer.com/webhook
{
  "event": "project.created",
  "data": { ... },
  "timestamp": "2026-01-22T10:30:00Z"
}

Events:
- project.created
- project.updated
- task.created
- task.completed
- invoice.sent
- invoice.paid
- photo.uploaded

DOCUMENTATION:
https://api.sierrasuites.com/docs
Interactive API explorer
Code examples (curl, JS, Python, Ruby)
```

---

## IMPLEMENTATION PRIORITIES

### Phase 1 (Must-Have for Launch):
1. ✅ Stripe payment processing (CRITICAL)
2. ✅ QuickBooks sync (CRITICAL)
3. ✅ Email sending (Gmail/SendGrid)

### Phase 2 (3 months):
4. Gmail/Outlook integration
5. DocuSign integration
6. Calendar sync

### Phase 3 (6 months):
7. Public API + docs
8. Zapier app
9. Slack/Teams bots

### Phase 4 (12 months):
10. Google Drive/Dropbox
11. Additional accounting (Xero, Sage)
12. Payment processors (Square, PayPal)

---

## DATABASE SCHEMA

```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Integration
  integration_type TEXT NOT NULL, -- 'quickbooks', 'stripe', 'gmail', etc.
  is_active BOOLEAN DEFAULT false,

  -- Auth
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Config
  settings JSONB DEFAULT '{}',

  -- Status
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT, -- 'success', 'failed', 'in_progress'
  error_message TEXT,

  -- Stats
  total_syncs INT DEFAULT 0,
  failed_syncs INT DEFAULT 0,

  connected_at TIMESTAMPTZ DEFAULT NOW(),
  connected_by UUID REFERENCES auth.users(id)
);

CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id),

  -- Log Entry
  sync_type TEXT, -- 'invoice', 'expense', 'contact'
  action TEXT, -- 'create', 'update', 'delete'
  external_id TEXT, -- ID in external system

  -- Status
  status TEXT NOT NULL, -- 'success', 'failed'
  error_message TEXT,

  -- Data
  request_payload JSONB,
  response_payload JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Key Info
  key_name VARCHAR(255) NOT NULL,
  key_value VARCHAR(64) NOT NULL UNIQUE, -- hashed
  key_prefix VARCHAR(16), -- For display: "sk_live_abc..."

  -- Permissions
  permissions JSONB DEFAULT '{}', -- Which endpoints allowed

  -- Usage
  rate_limit INT DEFAULT 100, -- Per hour
  requests_made INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## SUCCESS METRICS

- **Target**: 40% of paid users connect at least 1 integration
- **Target**: QuickBooks most popular (60% of integrations)
- **Target**: <1% failed syncs

---

**Integrations is 10% done (nothing really works). QuickBooks and Stripe are CRITICAL for paid users. API opens enterprise opportunities. 🔗**
