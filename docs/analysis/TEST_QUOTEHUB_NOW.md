# 🧪 Test QuoteHub Enhanced - Quick Start

## 1️⃣ Start the Server (30 seconds)

```bash
cd c:\Users\as_ka\OneDrive\Desktop\new
npm run dev
```

Wait for: `✓ Ready on http://localhost:3000`

## 2️⃣ Open QuoteHub

Navigate to: **http://localhost:3000/quotes**

You should see:
- Empty quotes list (if first time)
- Stats dashboard (0 quotes)
- **"+ New Quote"** button

## 3️⃣ Create Your First Proposal (2 minutes)

### Click "+ New Quote"

### **STEP 1: Select Quote Type**
- Click the **"Proposal"** card (📋 icon, blue)
- Should highlight with blue border
- Click **"Next →"**

### **STEP 2: Basic Information**
Fill in:
- **Title**: "Test Kitchen Renovation"
- **Client**: Select any client (or create one if needed)
- **Quote Date**: Today (pre-filled)
- **Valid Until**: 30 days out (pre-filled)

Check these boxes:
- ✅ **Auto-create project when approved**
- ✅ **Auto-create tasks from line items**

Should see green box: "When this quote is approved, a new project will be automatically created..."

Click **"Next →"**

### **STEP 3: Line Items**
Click **"+ Add Item"** three times

**Item 1**:
- Description: "Demo existing cabinets"
- Category: "Demo"
- Quantity: 16
- Unit: hours
- Unit Price: 75
- ✅ **"Create task for this item"** should be checked (green box)
- ☑️ Taxable: checked

**Item 2**:
- Description: "Install new cabinets"
- Category: "Installation"
- Quantity: 1
- Unit: ea
- Unit Price: 8500
- ✅ **"Create task"** checked
- ☑️ Taxable: checked

**Item 3**:
- Description: "Paint kitchen"
- Category: "Finishing"
- Quantity: 1
- Unit: ea
- Unit Price: 1200
- ✅ **"Create task"** checked
- ☑️ Taxable: checked

You should see line totals: $1,200, $8,500, $1,200

Click **"Next →"**

### **STEP 4: Pricing & Discounts**
- **Tax Rate**: 8.5%
- **Discount**: Leave at 0
- **Deposit Required**: 50%
- **Currency**: USD

Should see total: ~$11,000 with ~$5,500 deposit

Click **"Next →"**

### **STEP 5: Terms & Conditions**
- **Payment Terms**: Keep "Net 30"
- **Terms & Conditions**: Leave default or type anything
- **Notes**: Optional
- **Internal Notes**: Optional

Click **"Next →"**

### **STEP 6: Review & Submit**
Check the summary:
- Should show **"Proposal"** at top
- 3 line items listed
- Each item shows **"✓ Will create task"** badge
- Purple box shows: **"Will automatically create tasks from 3 line items"**
- Total: ~$11,000

Click **"✓ Create Quote"**

## 4️⃣ View the Quote

You should be redirected to the quote detail page.

Check:
- Quote number: **Q-2024-PROP-001** (or similar)
- Status: **Draft**
- All 3 line items visible
- Total matches

## 5️⃣ Test the Magic! (Approval → Project Creation)

On the quote detail page:

1. Find the **Status dropdown** (should say "Draft")
2. Change it to **"Approved"**
3. Wait 1-2 seconds...

## 6️⃣ Check What Was Created

### Go to Projects Page
**http://localhost:3000/projects**

You should see:
- ✅ **NEW PROJECT**: "Test Kitchen Renovation"
- Budget: ~$11,000
- Status: Planning
- Description: "Created from Q-2024-PROP-001"

### Go to TaskFlow Page
**http://localhost:3000/taskflow**

You should see:
- ✅ **NEW TASK**: "Demo existing cabinets" (Status: Pending)
- ✅ **NEW TASK**: "Install new cabinets" (Status: Pending)
- ✅ **NEW TASK**: "Paint kitchen" (Status: Pending)

All tasks should be linked to the new project!

## 7️⃣ Test Change Order (Advanced)

### Go back to Quotes
**http://localhost:3000/quotes**

Click **"+ New Quote"**

### **STEP 1: Select Quote Type**
- Click **"Change Order"** card (🔄 icon, orange)
- Click "Next"

### **STEP 2: Basic Information**
- **Title**: "Additional Shelving"
- **Client**: Same client as before
- **Project**: ⚠️ **MUST SELECT** the project you just created ("Test Kitchen Renovation")
  - This field is required for change orders!
  - Orange background
- Dates: Keep defaults

Should see orange message: "This change order will add to the selected project's budget when approved"

Click "Next"

### **STEP 3: Line Items**
Add 1 item:
- Description: "Custom shelving unit"
- Quantity: 2
- Unit: ea
- Unit Price: 500
- ✅ "Create task" checked

Click "Next" through remaining steps

### **STEP 4-6**: Quick setup
- Tax: 8.5%
- Terms: Whatever
- Review: Should show **orange box** saying "Will add $1,085 to project budget"

Click **"Create Quote"**

### Approve the Change Order
1. Change status to **"Approved"**
2. Wait 1-2 seconds

### Check Project Budget
Go to: **http://localhost:3000/projects**

Find "Test Kitchen Renovation"
- Budget should now be: **~$12,085** (original $11,000 + new $1,085)

### Check Tasks
Go to: **http://localhost:3000/taskflow**

You should see:
- ✅ **NEW TASK**: **"[CHANGE ORDER] Custom shelving unit"**
- Priority: High (change orders are high priority)

## 8️⃣ Test Smart Numbering

Create another proposal:
- Same steps as test #1
- Quote number should be: **Q-2024-PROP-002**

Create another change order:
- Quote number should be: **Q-2024-CHG-002**

Each type has its own sequence!

## ✅ Success Checklist

You've successfully tested QuoteHub if:
- ✅ Created a proposal quote
- ✅ Saw smart numbering (Q-YYYY-PROP-001)
- ✅ Quote showed "Create task" checkboxes
- ✅ Approved quote → Project was auto-created
- ✅ 3 tasks were auto-created from line items
- ✅ Created a change order linked to project
- ✅ Approved change order → Project budget increased
- ✅ Change order task was created with [CHANGE ORDER] prefix

## 🐛 Troubleshooting

### "Cannot create quote"
→ Check console for errors. Likely missing client or project.

### "Quote number undefined"
→ Database trigger didn't fire. Check that migration ran successfully.

### Project not created after approval
→ Check:
1. Auto-create project was checked?
2. Quote status is "approved"?
3. Console for errors?
4. Database trigger exists? (Run migration again)

### Change order fails
→ Must select a project! It's required for change orders.

### No tasks created
→ Check:
1. "Auto-create tasks" was checked in Step 2?
2. Line items had "Create task" checked (green box)?
3. Quote status is "approved"?

## 🎉 If Everything Works

**Congratulations!** You have a working quote-to-project workflow system!

What you can do now:
1. Create quotes of different types
2. See them automatically convert to projects
3. Have tasks auto-generated from line items
4. Track change orders that update project budgets
5. Never manually copy data between quotes and projects again!

## 📊 What to Check in Database (Optional)

If you want to see what's happening under the hood:

### In Supabase SQL Editor:

```sql
-- See all quotes with their types
SELECT quote_number, quote_type, status, converted_to_project_id, total_amount
FROM quotes
ORDER BY created_at DESC;

-- See which quote items became tasks
SELECT
  qi.description,
  qi.convert_to_task,
  qi.created_task_id,
  t.title as task_title
FROM quote_items qi
LEFT JOIN tasks t ON t.id = qi.created_task_id
WHERE qi.convert_to_task = true;

-- See quote activities (conversion log)
SELECT
  qa.activity_type,
  qa.description,
  qa.created_at,
  q.quote_number
FROM quote_activities qa
JOIN quotes q ON q.id = qa.quote_id
WHERE qa.activity_type IN ('converted_to_project', 'change_order_applied')
ORDER BY qa.created_at DESC;
```

---

**Time to complete**: 5-10 minutes total
**Difficulty**: Easy - just follow the steps!
**Result**: Working quote-to-project workflow automation 🚀
