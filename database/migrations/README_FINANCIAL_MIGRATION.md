# Financial Module Database Migration

## Overview
This migration creates the complete database infrastructure for **Module 12: Financial Management**, including invoices, payments, expenses, progress billing, change orders, and QuickBooks integration.

## Migration File
`202602110957-FINANCIAL_MODULE_COMPLETE.sql`

## What This Migration Creates

### Tables (6)
1. **invoices** - Invoice management with line items, tax calculations, payment tracking
2. **payments** - Payment records with multiple methods (check, ACH, wire, credit card, etc.)
3. **expenses** - Expense tracking with receipt scanning, OCR, billable tracking
4. **progress_billing** - AIA-style progress billing (G702/G703 forms)
5. **change_orders** - Project change order tracking
6. **quickbooks_connections** - QuickBooks Online OAuth integration

### Triggers (4)
1. **update_invoice_on_payment** - Automatically updates invoice status and amounts when payments recorded
2. **check_overdue_invoices** - Function to mark invoices as overdue (call daily via cron)
3. **update_updated_at_column** - Auto-updates `updated_at` timestamps on all financial tables
4. **Payment cascade triggers** - Recalculates invoice totals on payment insert/update/delete

### RLS Policies (24)
- Complete row-level security for all 6 tables
- Integrates with Module 10 RBAC permission system
- Enforces company-level data isolation
- Permission-based access control (canManageFinances, canViewFinancials, etc.)

### Database Functions (1)
- **get_financial_stats(company_id)** - Returns comprehensive financial statistics including:
  - Accounts receivable totals
  - Aging report buckets (0-30, 31-60, 61-90, 90+ days)
  - Monthly and YTD revenue/expenses
  - Profit margins

## How to Apply This Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `202602110957-FINANCIAL_MODULE_COMPLETE.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Wait for completion (~5-10 seconds)
8. Verify tables created: Run `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%invoice%' OR tablename LIKE '%payment%' OR tablename LIKE '%expense%';`

### Option 2: Supabase CLI
```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push database/migrations/202602110957-FINANCIAL_MODULE_COMPLETE.sql
```

### Option 3: Direct PostgreSQL Connection
```bash
# Connect via psql
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the migration file
\i database/migrations/202602110957-FINANCIAL_MODULE_COMPLETE.sql
```

## Verification Steps

After applying the migration, run these verification queries:

```sql
-- 1. Check all tables were created
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('invoices', 'payments', 'expenses', 'progress_billing', 'change_orders', 'quickbooks_connections');

-- Expected: 6 rows, all with rowsecurity = true

-- 2. Check RLS policies exist
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'invoice%' OR tablename LIKE 'payment%' OR tablename LIKE 'expense%';

-- Expected: ~24 policies

-- 3. Check triggers exist
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('invoices', 'payments', 'expenses', 'progress_billing', 'change_orders');

-- Expected: Multiple triggers

-- 4. Test the financial stats function
SELECT get_financial_stats('YOUR-COMPANY-ID'::uuid);

-- Expected: JSON object with financial statistics

-- 5. Check indexes were created
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('invoices', 'payments', 'expenses');

-- Expected: ~15-20 indexes
```

## Post-Migration Steps

1. **Test RBAC Permissions**
   - Ensure Module 10 (RBAC) is already deployed
   - Verify financial permissions exist:
     - `canManageFinances`
     - `canViewFinancials`
     - `canApproveExpenses`
   - Test with different user roles

2. **Configure QuickBooks Integration** (if needed)
   - Set up OAuth app in QuickBooks Developer Portal
   - Configure redirect URLs
   - Store client ID and secret in environment variables

3. **Set Up Cron Job for Overdue Invoices**
   ```sql
   -- Run this daily at midnight to mark overdue invoices
   SELECT check_overdue_invoices();
   ```

   Or use Supabase Edge Functions:
   ```typescript
   // Create a scheduled function that runs daily
   Deno.cron("check overdue invoices", "0 0 * * *", async () => {
     await supabase.rpc('check_overdue_invoices');
   });
   ```

4. **Seed Initial Data** (Optional for Testing)
   - Create sample invoices, payments, expenses
   - Test real-time subscriptions
   - Verify triggers fire correctly

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- WARNING: This will delete ALL financial data!
DROP TABLE IF EXISTS public.quickbooks_connections CASCADE;
DROP TABLE IF EXISTS public.change_orders CASCADE;
DROP TABLE IF EXISTS public.progress_billing CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;

DROP FUNCTION IF EXISTS get_financial_stats(UUID);
DROP FUNCTION IF EXISTS check_overdue_invoices();
DROP FUNCTION IF EXISTS update_invoice_on_payment();
DROP FUNCTION IF EXISTS update_updated_at_column();
```

## Dependencies

This migration requires:
- **Module 10 (RBAC)** - Must be deployed first for permission checks
- **CRM Module** - `crm_contacts` table must exist (for invoice contact_id foreign key)
- **Projects Module** - `projects` table must exist (for invoice/expense project_id foreign key)
- **Companies & User Profiles** - Core tables must exist

If any dependencies are missing, the migration will fail with foreign key constraint errors.

## Troubleshooting

### Error: relation "crm_contacts" does not exist
**Solution**: Deploy CRM module first, or temporarily remove the foreign key constraint

### Error: permission denied for function
**Solution**: Ensure you're running as postgres user or have SUPERUSER privileges

### Error: role "auth.uid()" does not exist
**Solution**: This is normal if running outside Supabase. RLS policies will work in Supabase environment.

### Slow Performance
**Solution**: All necessary indexes are created. If queries are still slow:
```sql
-- Analyze tables for query optimization
ANALYZE public.invoices;
ANALYZE public.payments;
ANALYZE public.expenses;
```

## Next Steps After Migration

1. Build invoice creation UI ([invoices/new/page.tsx](../../app/financial/invoices/new/page.tsx))
2. Build payment tracking dashboard ([financial/page.tsx](../../app/financial/page.tsx))
3. Build expense management UI
4. Implement PDF generation for invoices
5. Set up QuickBooks OAuth flow
6. Create comprehensive tests

## Support

If you encounter issues:
1. Check Supabase logs in Dashboard → Logs
2. Verify RLS policies with `SELECT * FROM pg_policies WHERE tablename = 'invoices';`
3. Test permissions with different user roles
4. Check trigger execution with test data

---

**Module 12 Status**: Database 100% ✅ | UI 0% | Integration 0%

**Total Progress**: 40% Complete (Database foundation complete)
