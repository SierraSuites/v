# Deploy Database Schema to Supabase

## Overview
This guide will help you deploy the master database schema to your Supabase project.

## File Location
**Schema File:** `database/master-schema.sql` (887 lines)

## Deployment Steps

### Option 1: Supabase Dashboard (Recommended for First Time)

1. **Login to Supabase**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "+ New Query"

3. **Copy and Paste Schema**
   - Open `database/master-schema.sql` in a text editor
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Execute the Schema**
   - Click "Run" or press Ctrl+Enter (Cmd+Enter on Mac)
   - Wait for execution to complete
   - Check for any errors in the output

5. **Verify Tables Created**
   - Go to "Table Editor" in the left sidebar
   - You should see all tables listed:
     - `companies`
     - `user_profiles`
     - `projects`
     - `tasks`
     - `photos`
     - `quotes`
     - `reports`
     - `contacts`
     - `leads`
     - `punch_items`
     - `sustainability_data`
     - And many more...

### Option 2: Supabase CLI (For Advanced Users)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db push --db-url "YOUR_DATABASE_URL" < database/master-schema.sql
```

## What Gets Created

### Core Tables (11)
1. **companies** - Multi-tenant company data
2. **user_profiles** - User information extending auth.users
3. **projects** - Construction projects
4. **tasks** - Task management
5. **photos** - FieldSnap photo storage metadata
6. **quotes** - QuoteHub quote management
7. **reports** - ReportCenter reports
8. **contacts** - CRM contacts
9. **leads** - CRM leads
10. **punch_items** - Punch list items
11. **sustainability_data** - Sustainability tracking

### Supporting Tables (15+)
- Team management (teams, team_members, team_invitations)
- Document management (documents, document_versions)
- Communication (messages, notifications)
- Activity tracking (activity_logs, audit_logs)
- File storage (storage_allocations, file_metadata)
- AI features (ai_analyses, ai_predictions)
- Weather data (weather_data)
- Custom fields (custom_fields, custom_field_values)
- And more...

### Extensions Enabled
- `uuid-ossp` - UUID generation
- `pgcrypto` - Cryptographic functions

### Indexes Created
- Over 50 performance indexes
- Covering common query patterns
- Foreign key indexes for joins

## Post-Deployment Checks

### 1. Verify Table Count
```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public';
```
Expected: ~30+ tables

### 2. Check for Errors
Look at the SQL Editor output for any red error messages.

### 3. Test a Simple Query
```sql
SELECT * FROM companies LIMIT 1;
SELECT * FROM user_profiles LIMIT 1;
```

### 4. Verify Indexes
```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## Important Notes

### RLS (Row Level Security)
- ⚠️ **RLS policies are NOT included in this schema**
- RLS will be added in Week 6 (security lockdown phase)
- For now, tables are accessible to authenticated users
- **Do not deploy to production without RLS!**

### Backward Compatibility
- The schema includes fields for backward compatibility with old code
- Some tables have duplicate fields (e.g., `user_profiles` has both `company_id` and `subscription_tier`)
- This allows gradual migration from old to new architecture

### Storage Buckets
The schema includes metadata tables, but you need to create storage buckets separately:

1. Go to Storage in Supabase Dashboard
2. Create these buckets:
   - `photos` - For FieldSnap images
   - `documents` - For project documents
   - `avatars` - For user profile pictures
   - `reports` - For generated PDF reports

## Troubleshooting

### Error: "relation already exists"
- Some tables may already exist from previous work
- You can either:
  - Drop existing tables first (⚠️ destroys data)
  - Comment out the CREATE TABLE statements for existing tables
  - Use `CREATE TABLE IF NOT EXISTS` (already in schema)

### Error: "extension already exists"
- This is safe to ignore
- Extensions are already installed

### Error: "permission denied"
- Make sure you're connected to the right project
- Check that you have admin access

## Next Steps

After deployment:
1. ✅ Test the dashboard page (connects to these tables)
2. ✅ Build out the Projects page
3. ✅ Build out the Tasks page
4. ✅ Build out the Quotes page
5. ✅ Connect FieldSnap to storage
6. ⚠️ Add RLS policies (Week 6)

## Need Help?

If you encounter any issues:
1. Check the SQL Editor output for specific error messages
2. Verify your Supabase project is active
3. Make sure you have admin permissions
4. Try running smaller sections of the schema at a time

---

**Schema Location:** `database/master-schema.sql`
**Created:** January 21, 2026
**Tables:** 30+ core and supporting tables
**Lines:** 887 lines of SQL
