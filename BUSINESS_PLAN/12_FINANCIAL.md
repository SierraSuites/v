# FINANCIAL MANAGEMENT - COMPLETE IMPLEMENTATION PLAN

**Module**: Invoicing, Payments, Budget Tracking
**Current Status**: 20% Complete (Mostly Missing)
**Target Status**: 90% Complete
**Priority**: CRITICAL (Get Paid)
**Timeline**: 2 weeks

---

## BUSINESS PURPOSE

Financial management is how you get paid and stay profitable:
1. **Invoicing** - Create and send professional invoices
2. **Payment Tracking** - Know who owes what
3. **Expense Management** - Track costs in real-time
4. **Cash Flow** - Predict when money comes in/out
5. **Profitability** - Which projects make money?

**User Story**: "It's the 25th. Payroll is due in 5 days ($45K). I need to know: Who owes me money? When will they pay? Can I cover payroll? I also need to invoice 3 completed projects ($125K total), track which invoices are overdue, and see if the Smith project is still profitable (costs are creeping up)."

---

## KEY FEATURES (Must Build from Scratch)

### 1. Invoice Creation
```
💰 CREATE INVOICE

CLIENT: Acme Corporation (John Smith)
PROJECT: Downtown Office Renovation

INVOICE #: INV-2026-045
INVOICE DATE: Jan 22, 2026
DUE DATE: Feb 21, 2026 (Net 30)

LINE ITEMS:
┌────────────────────────────────────────────────┐
│ Description              Qty    Rate    Amount │
├────────────────────────────────────────────────┤
│ Framing - Floor 3       1 LS  $45,000  $45,000│
│ Electrical rough-in     1 LS  $28,000  $28,000│
│ Plumbing rough-in       1 LS  $15,000  $15,000│
│ Materials               1 LS  $22,000  $22,000│
├────────────────────────────────────────────────┤
│ Subtotal:                              $110,000│
│ Sales Tax (7%):                         $7,700│
│ TOTAL:                                $117,700│
│                                                │
│ Previous Payments:                    -$85,000│
│ BALANCE DUE:                          $32,700 │
└────────────────────────────────────────────────┘

PAYMENT TERMS:
Net 30 days
Late fee: 1.5% per month after due date

PAYMENT METHODS:
☑ Check payable to: The Sierra Suites Construction
☑ ACH/Wire: [Bank details]
☑ Credit Card: [Pay online link]

NOTES:
Thank you for your business. Contact us with any
questions about this invoice.

[Save Draft] [Send to Client] [Preview PDF]
```

### 2. Payment Tracking Dashboard
```
💵 ACCOUNTS RECEIVABLE

OUTSTANDING: $145,300 (7 invoices)
OVERDUE: $22,500 (2 invoices) 🔴

┌────────────────────────────────────────────────┐
│ OVERDUE (Action Required)                     │
├────────────────────────────────────────────────┤
│ INV-2026-032 | Oak Street Project             │
│ Amount: $15,200                                │
│ Due: Jan 5 (17 days overdue) 🔴               │
│ Client: ABC Properties                         │
│ Last contact: Jan 10                           │
│ [Send Reminder] [Call Client] [Payment Plan]  │
├────────────────────────────────────────────────┤
│ INV-2026-038 | Warehouse Repair               │
│ Amount: $7,300                                 │
│ Due: Jan 15 (7 days overdue) 🔴               │
│ [Send Reminder]                                │
└────────────────────────────────────────────────┘

AGING REPORT:
├─ Current (0-30 days): $95,000 (5 invoices)
├─ 31-60 days: $27,800 (1 invoice)
├─ 61-90 days: $15,200 (1 invoice)
└─ 90+ days: $7,300 (1 invoice) 🔴

EXPECTED PAYMENTS (Next 30 Days):
Jan 25: $32,700 (Acme Corp - likely)
Jan 30: $28,000 (Smith Residence - confirmed)
Feb 5: $34,300 (Johnson Properties - likely)
TOTAL EXPECTED: $95,000

[View All Invoices] [Aging Report] [Send Reminders]
```

### 3. Expense Tracking
```
💸 EXPENSES - Downtown Office

MTD EXPENSES: $62,450
BUDGET REMAINING: $26,250

RECENT EXPENSES:
┌────────────────────────────────────────────────┐
│ Jan 22 | Home Depot       | $2,450 | Materials│
│ Receipt: 📎 receipt_2945.jpg                   │
│ Category: Materials                            │
│ Payment: Company Card (***1234)                │
│ [View] [Edit] [Categorize]                    │
├────────────────────────────────────────────────┤
│ Jan 22 | ABC Electrical   | $3,200 | Labor    │
│ Invoice: 📎 invoice_abc_145.pdf                │
│ Paid: ACH on Jan 22                            │
│ [View] [Mark Billable to Client]              │
├────────────────────────────────────────────────┤
│ Jan 21 | Concrete Co      | $8,900 | Materials│
│ Status: Pending payment                        │
│ Due: Feb 5                                     │
│ [Schedule Payment] [Mark Paid]                 │
└────────────────────────────────────────────────┘

BY CATEGORY (MTD):
├─ Materials: $32,100 (51%)
├─ Labor: $18,900 (30%)
├─ Subcontractors: $8,200 (13%)
├─ Equipment: $2,450 (4%)
└─ Other: $800 (1%)

RECEIPT SCANNING:
[📷 Take Photo] → AI extracts:
• Vendor: Home Depot
• Amount: $2,450.38
• Date: 01/22/2026
• Category: Materials (suggested)
[Approve & Save]
```

### 4. Progress Billing (AIA-style)
```
📊 PROGRESS BILLING - Downtown Office

CONTRACT VALUE: $450,000

BILLING PERIOD: Month 2 (Feb 1-28)

WORK COMPLETED TO DATE:
┌────────────────────────────────────────────────┐
│ Item              | % Complete | Amount        │
├────────────────────────────────────────────────┤
│ Site Prep         | 100%       | $15,000       │
│ Foundation        | 100%       | $65,000       │
│ Framing           | 75%        | $56,250/$75K  │
│ Electrical Rough  | 50%        | $14,000/$28K  │
│ Plumbing Rough    | 50%        | $7,500/$15K   │
│ HVAC              | 0%         | $0/$25K       │
│ Drywall           | 0%         | $0/$45K       │
│ ...               |            |               │
├────────────────────────────────────────────────┤
│ TOTAL COMPLETED:  | 40%        | $180,000      │
└────────────────────────────────────────────────┘

BILLING SUMMARY:
Total Contract: $450,000
Work Complete to Date: $180,000 (40%)
Less Previous Payments: $110,000
Less Retainage (10%): $7,000
AMOUNT DUE THIS PERIOD: $63,000

CHANGE ORDERS:
├─ CO-001: Additional outlets (+$1,200) ✅ Approved
├─ CO-002: Upgraded fixtures (+$3,450) ✅ Approved
└─ Total Change Orders: +$4,650

ADJUSTED CONTRACT: $454,650

[Generate AIA G702] [Generate AIA G703] [Create Invoice]
```

### 5. Cash Flow Forecasting
```
💰 CASH FLOW FORECAST - Next 90 Days

                Week 1   Week 2   Week 3   Week 4
BEGINNING       $179K    $165K    $210K    $184K
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CASH IN:
Invoices paid   +$32K    +$95K    +$28K    +$34K
Down payments   +$15K    $0       +$22K    $0
              ───────  ───────  ───────  ───────
Total In        +$47K    +$95K    +$50K    +$34K

CASH OUT:
Payroll         -$45K    $0       -$45K    $0
Materials       -$8K     -$12K    -$15K    -$18K
Subcontractors  -$6K     -$28K    -$14K    -$22K
Equipment       -$2K     -$3K     -$2K     -$4K
Operating       -$0K     -$7K     $0K      -$8K
              ───────  ───────  ───────  ───────
Total Out       -$61K    -$50K    -$76K    -$52K

NET CHANGE      -$14K    +$45K    -$26K    -$18K
ENDING BALANCE  $165K    $210K    $184K    $166K
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALERTS:
⚠️ Large payroll Week 1 ($45K) - Ensure receivables collected
✅ Strong cash position Week 2 ($95K incoming)
⚠️ Another payroll Week 3 - plan accordingly

SCENARIO ANALYSIS:
Best case (all invoices paid on time): $210K balance
Expected case: $166K balance
Worst case (2 invoices delayed): $142K balance

Minimum safe balance: $50K
Cushion: $116K ✅ Healthy
```

### 6. QuickBooks Integration
```
🔗 ACCOUNTING INTEGRATION

QUICKBOOKS ONLINE
Status: ✅ Connected
Last Sync: 2 hours ago

SYNC SETTINGS:
☑ Auto-sync invoices (when sent)
☑ Auto-sync expenses (daily)
☑ Auto-sync payments (real-time)
☑ Two-way sync (updates flow both ways)

SYNC SUMMARY (Last 30 Days):
├─ Invoices synced: 23
├─ Expenses synced: 156
├─ Payments synced: 18
└─ Errors: 0 ✅

CHART OF ACCOUNTS MAPPING:
Sierra Suites          → QuickBooks
────────────────────────────────────
Revenue:Construction   → 4000:Construction Income
Expense:Materials      → 5000:Cost of Goods Sold
Expense:Labor          → 5100:Direct Labor
Expense:Subcontractors → 5200:Subcontractors
...

[Sync Now] [View Sync Log] [Disconnect]
```

---

## DATABASE SCHEMA

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  project_id UUID REFERENCES projects(id),
  contact_id UUID NOT NULL REFERENCES crm_contacts(id),

  -- Invoice Info
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,

  -- Line Items
  line_items JSONB NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,

  -- Payments
  amount_paid DECIMAL(12, 2) DEFAULT 0,
  balance_due DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,

  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Terms
  payment_terms TEXT, -- 'Net 30', 'Due on receipt', etc.
  notes TEXT,

  -- Integration
  quickbooks_id VARCHAR(100),
  synced_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Payment Info
  payment_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method TEXT, -- 'check', 'ach', 'wire', 'credit_card', 'cash'

  -- Details
  reference_number VARCHAR(100), -- Check number, transaction ID
  notes TEXT,

  -- Integration
  quickbooks_id VARCHAR(100),

  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update invoice status and amounts
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  invoice_total DECIMAL(12, 2);
  total_paid DECIMAL(12, 2);
BEGIN
  SELECT total_amount INTO invoice_total
  FROM invoices WHERE id = NEW.invoice_id;

  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM payments WHERE invoice_id = NEW.invoice_id;

  UPDATE invoices
  SET
    amount_paid = total_paid,
    status = CASE
      WHEN total_paid >= invoice_total THEN 'paid'
      WHEN total_paid > 0 THEN 'partial'
      WHEN due_date < CURRENT_DATE THEN 'overdue'
      ELSE status
    END,
    paid_at = CASE WHEN total_paid >= invoice_total THEN NOW() ELSE paid_at END
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_update_invoice
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status();
```

---

## SUCCESS METRICS

- **Target**: 90% invoices paid within terms
- **Target**: <5 days average payment collection time
- **Target**: Zero late payroll due to cash flow

---

**Financial is 20% done (almost nothing exists). This is CRITICAL - without invoicing and payment tracking, you can't run a business. Build this FIRST. 💰**
