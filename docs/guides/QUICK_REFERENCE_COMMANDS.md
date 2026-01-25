# QUICK REFERENCE COMMANDS

**Sierra Suites - Developer Quick Reference**
**Essential commands and snippets for daily development**

---

## DEVELOPMENT COMMANDS

### Start Development Server
```bash
npm run dev
# Opens at http://localhost:3000
```

### Build for Production
```bash
npm run build
npm run start  # Test production build locally
```

### Linting & Formatting
```bash
npm run lint                    # Check for linting errors
npm run lint:fix                # Auto-fix linting errors
npx prettier --write .          # Format all files
```

### Testing
```bash
npm test                        # Run all unit tests
npm run test:watch              # Watch mode for development
npm run test:coverage           # Generate coverage report
npm run test:e2e                # Run Playwright E2E tests
npm run test:e2e:ui             # E2E tests with UI
```

### Database Commands
```bash
# Supabase CLI
npx supabase start              # Start local Supabase
npx supabase stop               # Stop local Supabase
npx supabase db reset           # Reset local database
npx supabase db push            # Push schema to remote
npx supabase migration new [name]  # Create new migration
```

### Dependency Management
```bash
npm install [package]           # Install package
npm install -D [package]        # Install dev dependency
npm update                      # Update all packages
npm audit                       # Check for vulnerabilities
npm audit fix                   # Fix vulnerabilities
npm outdated                    # Check for outdated packages
```

### Deployment
```bash
vercel                          # Deploy to preview
vercel --prod                   # Deploy to production
vercel env pull                 # Pull environment variables
vercel logs                     # View deployment logs
```

---

## CODE SNIPPETS

### Create New Page
```typescript
// app/[page-name]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PageName() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user!.id)
      .single()

    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('company_id', profile!.company_id)

    setData(data || [])
    setLoading(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Page Title</h1>
      {/* Content here */}
    </div>
  )
}
```

### Create New API Route
```typescript
// app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  return withAuth(request, async (user) => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('company_id', user.companyId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  })
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    const body = await request.json()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('table_name')
      .insert({
        ...body,
        company_id: user.companyId,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  })
}
```

### Create New Component
```typescript
// components/[feature]/ComponentName.tsx
'use client'

import { useState } from 'react'

interface ComponentNameProps {
  data: any
  onUpdate?: (data: any) => void
}

export default function ComponentName({ data, onUpdate }: ComponentNameProps) {
  const [state, setState] = useState<any>(null)

  const handleAction = async () => {
    // Handle action
    onUpdate?.(data)
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3">Component Title</h3>
      {/* Component content */}
    </div>
  )
}
```

### Database Query with Pagination
```typescript
import { paginatedQuery } from '@/lib/pagination'

const result = await paginatedQuery('table_name', {
  limit: 50,
  cursor: nextCursor,
  orderBy: 'created_at'
})

setData(prev => [...prev, ...result.data])
setNextCursor(result.nextCursor)
setHasMore(result.hasMore)
```

### File Upload
```typescript
const handleUpload = async (file: File) => {
  const supabase = createClient()
  const filePath = `${projectId}/${Date.now()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('bucket-name')
    .upload(filePath, file, {
      onUploadProgress: (progress) => {
        const percentage = (progress.loaded / progress.total) * 100
        setProgress(percentage)
      }
    })

  if (uploadError) throw uploadError

  // Create database record
  await supabase.from('table_name').insert({
    file_path: filePath,
    file_name: file.name,
    file_size: file.size
  })
}
```

### Send Email
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL!,
  to: 'user@example.com',
  subject: 'Email Subject',
  html: '<h1>Email content</h1>'
})
```

### Generate PDF
```typescript
import { generateQuotePDF } from '@/lib/pdf-generator'

const blob = await generateQuotePDF(quote, {
  includeTerms: true,
  includeNotes: true
})

// Download
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'document.pdf'
a.click()
URL.revokeObjectURL(url)
```

---

## DATABASE QUERIES

### Get User's Company
```typescript
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()

const { data: profile } = await supabase
  .from('user_profiles')
  .select('company_id, role')
  .eq('id', user!.id)
  .single()
```

### Check User Permission
```typescript
import { usePermissions } from '@/hooks/usePermissions'

const { can } = usePermissions()

if (can('projects', 'create')) {
  // Allow action
}
```

### Query with Joins
```typescript
const { data } = await supabase
  .from('projects')
  .select(`
    *,
    team_members:project_members (
      id,
      role,
      user:user_profiles (
        full_name,
        email
      )
    ),
    documents:project_documents (*),
    tasks:tasks (*)
  `)
  .eq('id', projectId)
  .single()
```

### Bulk Insert
```typescript
const items = [
  { name: 'Item 1', value: 100 },
  { name: 'Item 2', value: 200 }
]

const { data, error } = await supabase
  .from('table_name')
  .insert(items)
  .select()
```

### Real-time Subscription
```typescript
const channel = supabase
  .channel('table-changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'tasks',
      filter: `project_id=eq.${projectId}`
    },
    (payload) => {
      console.log('New task:', payload.new)
      // Update UI
    }
  )
  .subscribe()

// Cleanup
return () => {
  supabase.removeChannel(channel)
}
```

---

## COMMON PATTERNS

### Loading States
```typescript
const [loading, setLoading] = useState(false)

const handleAction = async () => {
  setLoading(true)
  try {
    await someAsyncOperation()
  } catch (error) {
    console.error(error)
    alert('Operation failed')
  } finally {
    setLoading(false)
  }
}

return (
  <button
    onClick={handleAction}
    disabled={loading}
    className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
  >
    {loading ? 'Loading...' : 'Click Me'}
  </button>
)
```

### Modal Pattern
```typescript
const [showModal, setShowModal] = useState(false)

return (
  <>
    <button onClick={() => setShowModal(true)}>Open Modal</button>

    {showModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">Modal Title</h2>
          {/* Modal content */}
          <button onClick={() => setShowModal(false)}>Close</button>
        </div>
      </div>
    )}
  </>
)
```

### Form Handling
```typescript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: ''
})

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFormData({
    ...formData,
    [e.target.name]: e.target.value
  })
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  })

  if (response.ok) {
    alert('Success!')
  }
}

return (
  <form onSubmit={handleSubmit}>
    <input
      name="name"
      value={formData.name}
      onChange={handleChange}
      required
    />
    <button type="submit">Submit</button>
  </form>
)
```

### Error Handling
```typescript
try {
  const response = await fetch('/api/endpoint')

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return data

} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message)
  }

  // Log to Sentry in production
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error)
  }

  throw error
}
```

---

## TAILWIND COMMON CLASSES

### Layout
```
Container: max-w-7xl mx-auto px-4
Grid: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
Flex: flex items-center justify-between
Spacing: space-y-4 (vertical), space-x-4 (horizontal)
```

### Cards
```
Basic Card: bg-white rounded-lg shadow p-6
Bordered Card: bg-white border rounded-lg p-4
Hover Card: bg-white rounded-lg shadow hover:shadow-lg transition-shadow
```

### Buttons
```
Primary: px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700
Secondary: px-4 py-2 border rounded hover:bg-gray-50
Danger: px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700
Disabled: disabled:opacity-50 disabled:cursor-not-allowed
```

### Forms
```
Input: w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500
Select: w-full border rounded px-3 py-2
Textarea: w-full border rounded px-3 py-2 resize-none
Label: block text-sm font-medium mb-1
Error: text-red-600 text-sm mt-1
```

### Text
```
Heading 1: text-4xl font-bold
Heading 2: text-2xl font-semibold
Heading 3: text-lg font-semibold
Body: text-gray-700
Muted: text-gray-500 text-sm
```

### Status Badges
```
Success: px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full
Warning: px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full
Error: px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full
Info: px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full
```

---

## GIT COMMANDS

### Daily Workflow
```bash
git status                      # Check current changes
git add .                       # Stage all changes
git commit -m "message"         # Commit changes
git push                        # Push to remote

# Better commit message
git commit -m "feat: add user dashboard

- Add dashboard stats component
- Implement real-time updates
- Add weather widget"
```

### Branch Management
```bash
git checkout -b feature/new-feature    # Create new branch
git checkout main                      # Switch to main
git merge feature/new-feature          # Merge branch
git branch -d feature/new-feature      # Delete branch
```

### Undo Changes
```bash
git restore file.ts             # Discard changes in file
git restore --staged file.ts    # Unstage file
git reset HEAD~1                # Undo last commit (keep changes)
git reset --hard HEAD~1         # Undo last commit (discard changes)
```

### Pull Request
```bash
git checkout -b fix/bug-name
# Make changes
git add .
git commit -m "fix: resolve bug description"
git push -u origin fix/bug-name
# Create PR on GitHub
```

---

## ENVIRONMENT VARIABLES

### Required Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Resend (Email)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@sierrasuites.com

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_PROFESSIONAL=price_xxx
STRIPE_PRICE_ENTERPRISE=price_xxx

# App
NEXT_PUBLIC_APP_URL=https://app.sierrasuites.com
CRON_SECRET=xxx

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# Google (Optional)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=xxx
```

---

## TROUBLESHOOTING

### Build Errors

**Error: Module not found**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Error: Type errors**
```bash
# Check TypeScript config
npx tsc --noEmit

# Fix common issues
- Add type imports
- Check for 'any' types
- Verify interface definitions
```

**Error: Environment variable undefined**
```bash
# Restart dev server after adding env vars
npm run dev

# Verify .env.local exists and has correct format
```

### Database Errors

**Error: RLS policy violation**
```sql
-- Check if RLS is enabled
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

**Error: Foreign key violation**
```sql
-- Check if referenced record exists
SELECT * FROM referenced_table WHERE id = 'xxx';

-- Check foreign key constraints
SELECT * FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY';
```

### Supabase Errors

**Error: Invalid API key**
- Check environment variables
- Verify key in Supabase dashboard
- Ensure no extra spaces in .env file

**Error: Storage upload failed**
- Check bucket exists
- Verify RLS policies on storage.objects
- Check file size limits

### Common Fixes

**App won't start**:
```bash
rm -rf .next
npm run dev
```

**Hot reload not working**:
```bash
# Restart dev server
# Check for syntax errors
```

**Tests failing**:
```bash
# Clear test cache
npm test -- --clearCache

# Check for async issues
# Ensure proper mocking
```

---

## USEFUL LINKS

- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind Docs**: https://tailwindcss.com/docs
- **React Docs**: https://react.dev
- **TypeScript Docs**: https://www.typescriptlang.org/docs
- **Stripe Docs**: https://stripe.com/docs
- **Resend Docs**: https://resend.com/docs
- **Vercel Docs**: https://vercel.com/docs

**Internal Docs**:
- Developer Guide: `docs/README.md`
- API Documentation: `docs/API.md`
- Deployment Guide: `docs/DEPLOYMENT.md`

---

## KEYBOARD SHORTCUTS (VS Code)

```
Ctrl/Cmd + P        - Quick file open
Ctrl/Cmd + Shift + P - Command palette
Ctrl/Cmd + B        - Toggle sidebar
Ctrl/Cmd + /        - Toggle comment
Ctrl/Cmd + D        - Select next occurrence
Ctrl/Cmd + Shift + F - Search across files
F2                  - Rename symbol
Alt + Up/Down       - Move line up/down
Ctrl/Cmd + Space    - Trigger IntelliSense
```

---

**Keep this document open while coding for quick reference!** 📚