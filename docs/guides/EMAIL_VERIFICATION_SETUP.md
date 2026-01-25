# Email Verification Setup Guide

## Complete Setup Instructions

Follow these steps **in order** to enable email verification for your app.

---

## Step 1: Configure Supabase Email Settings

### 1.1 Enable Email Confirmations

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Providers** → **Email**
3. Make sure **"Confirm email"** is **ENABLED** (toggle ON)
4. Click **Save**

### 1.2 Set Redirect URLs

1. Still in **Authentication** settings, scroll to **"Redirect URLs"**
2. Add these URLs (replace with your actual domain in production):
   ```
   http://localhost:3000/auth/verify-email
   http://localhost:3000/login
   https://yourdomain.com/auth/verify-email
   https://yourdomain.com/login
   ```
3. Set **Site URL** to: `http://localhost:3000` (or your production URL)
4. Click **Save**

### 1.3 Customize Email Template (Optional but Recommended)

1. Go to **Authentication** → **Email Templates**
2. Click on **"Confirm signup"**
3. Customize the email template if desired
4. Make sure the button/link uses: `{{ .ConfirmationURL }}`
5. Click **Save**

---

## Step 2: Set Up Database Tables

### 2.1 Run Essential Database Setup

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `ESSENTIAL_SQL_SETUP.sql`
4. Paste and click **Run**
5. Wait for "Success" message

### 2.2 Run User Profile Trigger Setup

1. In **SQL Editor**, create another **"New Query"**
2. Copy the entire contents of `FIX_USER_PROFILES.sql`
3. Paste and click **Run**
4. This creates automatic profile creation when users register

---

## Step 3: Update Environment Variables

Make sure your `.env.local` file has these variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from: **Supabase Dashboard** → **Settings** → **API**

---

## Step 4: Test the Email Verification Flow

### 4.1 Start Your Development Server

```bash
npm run dev
```

### 4.2 Register a New Account

1. Go to http://localhost:3000/register
2. Fill in all registration details
3. Complete all 3 steps
4. Click **"Complete Registration"**

### 4.3 Check Email Verification Screen

You should see:
- ✅ A "Check Your Email" screen
- ✅ Your email address displayed
- ✅ Instructions to verify

### 4.4 Verify Email

1. **Check your email inbox** (and spam folder!)
2. **Click the verification link** in the email
3. You should be redirected to `/auth/verify-email`
4. See "Email Verified!" success message
5. Automatically redirect to `/login` after 3 seconds

### 4.5 Login

1. Enter your email and password
2. Click **"Sign In"**
3. You should be redirected to `/dashboard`
4. **Your actual name should appear** (not "John Doe")

---

## How It Works

### Registration Flow

```
User registers
    ↓
Account created (email_confirmed_at = null)
    ↓
User profile created via trigger (with user data)
    ↓
Verification email sent
    ↓
User sees "Check Your Email" screen
```

### Verification Flow

```
User clicks email link (on any device)
    ↓
Supabase verifies token
    ↓
email_confirmed_at updated
    ↓
Redirect to /auth/verify-email
    ↓
Success message shown
    ↓
Auto-redirect to /login after 3s
```

### Login Flow

```
User enters credentials
    ↓
Supabase checks if email_confirmed_at exists
    ↓
If not verified: Show error
    ↓
If verified: Login successful
    ↓
Redirect to /dashboard
    ↓
User profile loaded (shows real name)
```

---

## Troubleshooting

### Issue: Not Receiving Verification Email

**Solutions:**
1. Check spam/junk folder
2. In Supabase, go to **Authentication** → **Users** → Find your user → Click "Send verification email"
3. Make sure your email provider isn't blocking Supabase emails

### Issue: Verification Link Shows Error

**Solutions:**
1. Make sure redirect URL is configured in Supabase (Step 1.2)
2. Check that the link hasn't expired (links expire after 1 hour by default)
3. Register again with a new account

### Issue: Dashboard Shows "John Doe" Instead of Real Name

**Solutions:**
1. Make sure you ran `FIX_USER_PROFILES.sql` in Step 2.2
2. Delete the test user and register again
3. Manually check if profile exists:
   ```sql
   SELECT * FROM user_profiles WHERE id = 'your-user-id';
   ```

### Issue: Can Login Without Verifying Email

**Solutions:**
1. Make sure "Confirm email" is ENABLED in Authentication settings
2. Delete test users and try registering fresh
3. Check Supabase logs for any errors

---

## What Was Changed in the Code

### New Files Created:
- `app/auth/verify-email/page.tsx` - Email verification success page
- `FIX_USER_PROFILES.sql` - Database triggers for auto-profile creation
- `EMAIL_VERIFICATION_SETUP.md` - This guide

### Files Modified:
- `app/register/page.tsx` - Added "Check Your Email" screen
- `app/login/page.tsx` - Added success message for verified users
- `FIX_USER_PROFILES.sql` - Updated to handle email confirmation

---

## Production Deployment

When deploying to production (e.g., Vercel):

1. Update Supabase redirect URLs to include your production domain:
   ```
   https://yourdomain.com/auth/verify-email
   https://yourdomain.com/login
   ```

2. Set Site URL to your production domain

3. Update environment variables in your hosting platform

4. Test the entire flow in production

---

## Security Notes

- ✅ Email verification prevents fake accounts
- ✅ User profiles are only accessible by authenticated users
- ✅ Verification links expire after 1 hour
- ✅ Users cannot access dashboard without verifying email
- ✅ All database operations use Row Level Security (RLS)

---

## Next Steps

After email verification is working:

1. ✅ Run remaining SQL files for other features:
   - `TASKFLOW_DATABASE_SETUP.sql`
   - `PROJECTS_SQL_SETUP.sql`
   - `FIELDSNAP_SQL_SETUP.sql`
   - `PUNCH_LIST_DATABASE_SCHEMA.sql`
   - `QUOTEHUB_DATABASE_SCHEMA.sql`

2. ✅ Set up additional environment variables (Stripe, Weather API, etc.)

3. ✅ Test all features in the dashboard

---

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check Supabase logs (Dashboard → Logs)
3. Verify all SQL scripts ran successfully
4. Make sure environment variables are set correctly
