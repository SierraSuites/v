# PUNCHLIST - IMPLEMENTATION QUALITY GUIDE

**Module**: Defect & Issue Tracking (Module 11)
**Business Purpose**: Final walkthrough management, quality control, client signoff
**Target Quality**: 92%+ before launch
**Priority**: HIGH - Quality & payment release

---

## 1. CORE QUALITY REQUIREMENTS

### 1.1 Critical Feature: Mobile Punch List Creator

**Standard**: MUST work offline. Photos MUST upload when connectivity restored. Before/after comparison MUST be side-by-side. Digital signature MUST be legally binding.

**Why It Matters**: Final walkthrough = final payment. Example: $14,670 retainer released only after all punch items complete. Client signs digitally on iPad during walkthrough. Payment invoice auto-generated. Without mobile punch list, walkthrough takes 3 hours with clipboard + manual entry. With mobile, 45 minutes on-site.

**Database Schema**:
```sql
CREATE TABLE punch_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Walkthrough info
  walkthrough_date DATE NOT NULL,
  conducted_by UUID NOT NULL REFERENCES auth.users(id),
  inspector_name VARCHAR(255), -- Client or building inspector
  inspector_email VARCHAR(255),
  inspector_company VARCHAR(255),

  -- Status
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'complete', 'signed_off'
  target_completion_date DATE,
  actual_completion_date DATE,

  -- Summary (auto-calculated)
  total_items INT DEFAULT 0,
  completed_items INT DEFAULT 0,
  completion_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN total_items > 0
      THEN (completed_items::DECIMAL / total_items) * 100
      ELSE 0
    END
  ) STORED,

  -- By severity
  critical_items INT DEFAULT 0,
  major_items INT DEFAULT 0,
  minor_items INT DEFAULT 0,
  cosmetic_items INT DEFAULT 0,

  -- Sign-off
  signed_off_by VARCHAR(255),
  signed_off_at TIMESTAMPTZ,
  signature_data TEXT, -- Base64 signature image
  signature_ip INET,

  -- Financial
  final_payment_amount DECIMAL(12, 2),
  final_payment_released BOOLEAN DEFAULT false,
  final_payment_invoice_id UUID REFERENCES invoices(id),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_punch_lists_project ON punch_lists(project_id, status);
CREATE INDEX idx_punch_lists_company ON punch_lists(company_id);

CREATE TABLE punch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  punch_list_id UUID NOT NULL REFERENCES punch_lists(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Item info
  item_number INT NOT NULL, -- Sequential within punch list
  description TEXT NOT NULL,
  location VARCHAR(255), -- "Kitchen - Island", "Floor 2, Room 204"

  -- Classification
  category TEXT NOT NULL, -- 'electrical', 'plumbing', 'carpentry', 'painting', 'flooring', 'hvac', 'other'
  severity TEXT NOT NULL DEFAULT 'minor', -- 'critical', 'major', 'minor', 'cosmetic'

  -- Assignment
  responsible_party TEXT, -- 'gc', 'electrician', 'plumber', 'carpenter', 'painter', specific company
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,

  -- Status
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'complete', 'verified', 'rejected'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),

  -- Photos
  before_photo_url TEXT,
  after_photo_url TEXT,
  additional_photos TEXT[], -- Array of URLs

  -- Resolution
  resolution_notes TEXT,
  rejection_reason TEXT,
  time_spent_hours DECIMAL(4, 2),
  cost_to_fix DECIMAL(10, 2),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(punch_list_id, item_number),
  CHECK (severity IN ('critical', 'major', 'minor', 'cosmetic')),
  CHECK (status IN ('open', 'in_progress', 'complete', 'verified', 'rejected'))
);

CREATE INDEX idx_punch_items_list ON punch_items(punch_list_id, status);
CREATE INDEX idx_punch_items_assigned ON punch_items(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_punch_items_due ON punch_items(due_date) WHERE due_date IS NOT NULL AND status NOT IN ('complete', 'verified');

-- RLS Policies
ALTER TABLE punch_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company punch lists"
  ON punch_lists FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage punch lists"
  ON punch_lists FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND (r.permissions->>'projects'->>'edit' = 'true' OR r.permissions->>'projects'->>'create' = 'true')
    )
  );

CREATE POLICY "Users can view punch items"
  ON punch_items FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Assigned users can update punch items"
  ON punch_items FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'projects'->>'edit' = 'true'
    )
  );

-- Trigger to update punch list summary
CREATE OR REPLACE FUNCTION update_punch_list_summary()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE punch_lists
  SET
    total_items = (SELECT COUNT(*) FROM punch_items WHERE punch_list_id = COALESCE(NEW.punch_list_id, OLD.punch_list_id)),
    completed_items = (SELECT COUNT(*) FROM punch_items WHERE punch_list_id = COALESCE(NEW.punch_list_id, OLD.punch_list_id) AND status IN ('complete', 'verified')),
    critical_items = (SELECT COUNT(*) FROM punch_items WHERE punch_list_id = COALESCE(NEW.punch_list_id, OLD.punch_list_id) AND severity = 'critical'),
    major_items = (SELECT COUNT(*) FROM punch_items WHERE punch_list_id = COALESCE(NEW.punch_list_id, OLD.punch_list_id) AND severity = 'major'),
    minor_items = (SELECT COUNT(*) FROM punch_items WHERE punch_list_id = COALESCE(NEW.punch_list_id, OLD.punch_list_id) AND severity = 'minor'),
    cosmetic_items = (SELECT COUNT(*) FROM punch_items WHERE punch_list_id = COALESCE(NEW.punch_list_id, OLD.punch_list_id) AND severity = 'cosmetic'),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.punch_list_id, OLD.punch_list_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER punch_item_update_summary
  AFTER INSERT OR UPDATE OR DELETE ON punch_items
  FOR EACH ROW
  EXECUTE FUNCTION update_punch_list_summary();

-- Trigger to auto-update punch list status
CREATE OR REPLACE FUNCTION update_punch_list_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_items INT;
  v_completed_items INT;
BEGIN
  SELECT total_items, completed_items
  INTO v_total_items, v_completed_items
  FROM punch_lists
  WHERE id = NEW.id;

  IF v_total_items > 0 AND v_completed_items = v_total_items THEN
    NEW.status := 'complete';
    NEW.actual_completion_date := CURRENT_DATE;
  ELSIF v_completed_items > 0 THEN
    NEW.status := 'in_progress';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER punch_list_auto_status
  BEFORE UPDATE OF total_items, completed_items ON punch_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_punch_list_status();
```

**API Implementation**:
```typescript
// app/api/punch-lists/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createPunchListSchema = z.object({
  project_id: z.string().uuid(),
  walkthrough_date: z.string(),
  inspector_name: z.string(),
  inspector_email: z.string().email().optional(),
  target_completion_date: z.string().optional(),
  final_payment_amount: z.number().optional(),
})

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await req.json()

    const validatedData = createPunchListSchema.parse(body)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const { data: punchList, error } = await supabase
      .from('punch_lists')
      .insert({
        ...validatedData,
        company_id: profile.company_id,
        conducted_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ punchList }, { status: 201 })

  } catch (error) {
    console.error('Error creating punch list:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// app/api/punch-lists/[id]/items/route.ts

const createPunchItemSchema = z.object({
  description: z.string().min(1),
  location: z.string(),
  category: z.enum(['electrical', 'plumbing', 'carpentry', 'painting', 'flooring', 'hvac', 'other']),
  severity: z.enum(['critical', 'major', 'minor', 'cosmetic']),
  responsible_party: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().optional(),
  before_photo_url: z.string().url().optional(),
})

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await req.json()

    const validatedData = createPunchItemSchema.parse(body)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get punch list to verify access and get next item number
    const { data: punchList } = await supabase
      .from('punch_lists')
      .select('*, project:projects(id, company_id)')
      .eq('id', params.id)
      .single()

    if (!punchList) {
      return NextResponse.json({ error: 'Punch list not found' }, { status: 404 })
    }

    // Get next item number
    const { data: lastItem } = await supabase
      .from('punch_items')
      .select('item_number')
      .eq('punch_list_id', params.id)
      .order('item_number', { ascending: false })
      .limit(1)
      .single()

    const itemNumber = (lastItem?.item_number || 0) + 1

    const { data: punchItem, error } = await supabase
      .from('punch_items')
      .insert({
        ...validatedData,
        punch_list_id: params.id,
        project_id: punchList.project_id,
        company_id: punchList.project.company_id,
        item_number: itemNumber,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ punchItem }, { status: 201 })

  } catch (error) {
    console.error('Error creating punch item:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// app/api/punch-lists/[id]/signoff/route.ts

const signoffSchema = z.object({
  signed_off_by: z.string().min(1),
  signature_data: z.string().min(1), // Base64 image
  final_payment_amount: z.number().optional(),
})

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await req.json()

    const validatedData = signoffSchema.parse(body)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get punch list
    const { data: punchList } = await supabase
      .from('punch_lists')
      .select('*, project:projects(*)')
      .eq('id', params.id)
      .single()

    if (!punchList) {
      return NextResponse.json({ error: 'Punch list not found' }, { status: 404 })
    }

    // Verify all items complete
    const { data: incompleteItems } = await supabase
      .from('punch_items')
      .select('id')
      .eq('punch_list_id', params.id)
      .not('status', 'in', '(complete,verified)')

    if (incompleteItems && incompleteItems.length > 0) {
      return NextResponse.json(
        { error: `${incompleteItems.length} items still incomplete` },
        { status: 400 }
      )
    }

    // Update punch list with sign-off
    const { data: updatedList, error } = await supabase
      .from('punch_lists')
      .update({
        status: 'signed_off',
        signed_off_by: validatedData.signed_off_by,
        signed_off_at: new Date().toISOString(),
        signature_data: validatedData.signature_data,
        signature_ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        final_payment_amount: validatedData.final_payment_amount || punchList.final_payment_amount,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    // Create final payment invoice if amount specified
    if (validatedData.final_payment_amount && validatedData.final_payment_amount > 0) {
      const { data: invoice } = await supabase
        .from('invoices')
        .insert({
          company_id: punchList.project.company_id,
          project_id: punchList.project_id,
          invoice_number: `INV-${Date.now()}`,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'draft',
          subtotal: validatedData.final_payment_amount,
          tax: 0,
          total: validatedData.final_payment_amount,
          notes: `Final payment upon punch list completion - ${punchList.project.name}`,
        })
        .select()
        .single()

      // Link invoice to punch list
      await supabase
        .from('punch_lists')
        .update({ final_payment_invoice_id: invoice.id })
        .eq('id', params.id)
    }

    // Update project status to complete
    await supabase
      .from('projects')
      .update({ status: 'complete', completion_date: new Date().toISOString().split('T')[0] })
      .eq('id', punchList.project_id)

    return NextResponse.json({ punchList: updatedList })

  } catch (error) {
    console.error('Error signing off punch list:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Testing Checklist**:
- [ ] Punch list creation with project assignment
- [ ] Add/edit/delete punch items
- [ ] Before/after photo upload and display
- [ ] Item status transitions (open → in_progress → complete → verified)
- [ ] Automatic punch list completion when all items done
- [ ] Digital signature capture
- [ ] Sign-off validation (all items must be complete)
- [ ] Final payment invoice auto-creation
- [ ] Project status update to complete on sign-off
- [ ] Mobile responsive layout
- [ ] Offline support for field use
- [ ] PDF export with before/after photos

**Success Metrics**:
- 95%+ punch lists completed before deadline
- <3 days average item resolution time
- 100% digital sign-off (no paper)
- <5 items per project average (industry: 15-25)

---

## 2. USER EXPERIENCE QUALITY STANDARDS

- Mobile-first design (punch lists created on-site)
- Voice-to-text for descriptions
- Quick photo capture from camera
- Swipe gestures for item completion
- Before/after photo comparison slider
- Signature pad for client sign-off

---

## 3. PERFORMANCE REQUIREMENTS

- Punch list load: <500ms
- Photo upload: <2 seconds per photo
- Item creation: <300ms
- Sign-off processing: <1 second
- PDF generation: <5 seconds

---

## 4. SECURITY REQUIREMENTS

- Digital signatures legally binding
- IP address logged for sign-offs
- Photos stored in private S3 bucket
- Sign-off cannot be revoked or edited
- RLS prevents cross-company access

---

## 5. PRE-LAUNCH CHECKLIST

- [ ] Mobile punch list creator works offline
- [ ] Before/after photo comparison displays correctly
- [ ] Digital signature legally compliant
- [ ] Final payment invoice auto-generated
- [ ] Project status updates to complete on sign-off
- [ ] PDF export includes all photos and signatures
- [ ] Email notification sent to client on completion

---

## 6. SUCCESS METRICS

- 95% on-time punch list completion
- <3 days average resolution time
- 100% digital sign-off rate
- 4.8/5 client satisfaction with punch list process

---

## 7. COMPETITIVE EDGE

**vs Procore**: Similar features, we're mobile-optimized
**vs Buildertrend**: Basic punch lists, we have before/after comparison + digital sign-off
**Us**: Mobile-first, offline support, instant final payment processing

**Win**: "Completed final walkthrough in 45 minutes, client signed on iPad, got paid next day."
