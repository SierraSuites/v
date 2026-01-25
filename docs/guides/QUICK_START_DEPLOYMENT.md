# 🚀 Quick Start Deployment - 30 Minutes to Live

**Get The Sierra Suites running in production in 30 minutes**

---

## ⚡ FASTEST PATH TO PRODUCTION

### Step 1: Environment Setup (2 minutes)

1. Create `.env.local` in project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

Get these from Supabase Dashboard → Settings → API

---

### Step 2: Deploy Database (15 minutes)

**Open Supabase Dashboard → SQL Editor**

#### 2a. Create Tables (5 min)
1. New Query → Paste `database/master-schema.sql` → Run
2. Verify: See 30+ tables in Table Editor ✅

#### 2b. Add Security (5 min)
1. New Query → Paste `database/rls-policies.sql` → Run
2. Verify: See 50+ policies in Authentication → Policies ✅

#### 2c. Add Functions (5 min)
1. New Query → Paste `database/functions-and-triggers.sql` → Run
2. Verify: Run this query:
```sql
SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public';
-- Should return 10+
```

---

### Step 3: Create Storage Buckets (5 minutes)

**Supabase Dashboard → Storage**

1. **New bucket:** `project-documents` (Public, 50MB limit)
2. **New bucket:** `fieldsnap-photos` (Public, 50MB limit)
3. **New bucket:** `user-avatars` (Public, 5MB limit)

**Add policies to each bucket** (copy/paste for each):
```sql
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'BUCKET_NAME');
CREATE POLICY "Users can read files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'BUCKET_NAME');
CREATE POLICY "Users can delete files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'BUCKET_NAME');
CREATE POLICY "Users can update files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'BUCKET_NAME');
```
(Replace `BUCKET_NAME` with: project-documents, fieldsnap-photos, user-avatars)

---

### Step 4: Deploy to Vercel (5 minutes)

1. Push code to GitHub:
```bash
git add .
git commit -m "Ready for production"
git push
```

2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub

3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (will be `https://your-project.vercel.app`)

4. Click Deploy (wait 3 minutes)

---

### Step 5: Test (3 minutes)

1. Visit your Vercel URL
2. Click "Register"
3. Create account
4. Create a test project
5. Upload a test photo

**If all 5 steps work: ✅ YOU'RE LIVE!**

---

## 🆘 TROUBLESHOOTING (if something breaks)

### Error: "Failed to fetch"
- Check `.env.local` has correct Supabase URL
- Verify Supabase project is running

### Error: "Row Level Security policy violation"
- Rerun `database/rls-policies.sql`
- Verify user has `company_id` in `user_profiles`

### Error: "Bucket not found"
- Create missing storage buckets
- Check bucket names match exactly

### Error: 404 on Vercel
- Check build logs in Vercel dashboard
- Verify `npm run build` works locally

---

## 📚 DETAILED GUIDES (if you need more help)

- **Full Database Setup:** [DATABASE_DEPLOYMENT_GUIDE.md](DATABASE_DEPLOYMENT_GUIDE.md)
- **Complete Deployment:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Supabase Docs:** https://supabase.com/docs

---

## ✅ PRODUCTION CHECKLIST

After deployment, verify:

- [ ] User registration works
- [ ] Login works
- [ ] User can create project
- [ ] User can upload documents
- [ ] User can upload photos
- [ ] Dashboard loads data
- [ ] Multi-tenant isolation (create 2nd user, verify data separation)
- [ ] All 4 modules accessible (Dashboard, Projects, FieldSnap, Quotes)

---

**Time:** 30 minutes
**Difficulty:** Easy (copy/paste)
**Cost:** $0 (Supabase + Vercel free tiers)
**Result:** Live production app 🎉
