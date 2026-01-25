# Mobile Setup Guide

This guide will help you configure your app to work seamlessly on mobile devices during development and in production.

## For Local Development (Testing on Mobile Phone)

### Step 1: Find Your Computer's Network IP

Your development server shows this when it starts:
```
- Local:        http://localhost:3000
- Network:      http://10.141.161.32:3000
```

The **Network** URL is what you'll use on your mobile phone.

### Step 2: Configure Supabase for Mobile Testing

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `qjswuwcqyzeuqqqltykz`
3. Navigate to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add these URLs (one per line):
   ```
   http://localhost:3000/**
   http://10.141.161.32:3000/**
   ```
   *(Replace `10.141.161.32` with your actual network IP if different)*

5. Under **Site URL**, you can keep it as `http://localhost:3000` for now

6. Click **Save**

### Step 3: Update Your Environment Variable (Optional)

If you want password reset emails to use your network IP by default:

1. Open `.env.local`
2. Change this line:
   ```
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
   To:
   ```
   NEXT_PUBLIC_APP_URL=http://10.141.161.32:3000
   ```
3. Restart your development server (`npm run dev`)

### Step 4: Access From Your Mobile Phone

1. Make sure your phone is on the **same WiFi network** as your computer
2. On your phone's browser, go to: `http://10.141.161.32:3000`
3. You can now test registration, login, and password reset on your phone!

---

## For Production Deployment

When you deploy your app to a hosting service (Vercel, Netlify, etc.):

### Step 1: Deploy Your App

Deploy to your preferred hosting service. You'll get a URL like:
- `https://your-app.vercel.app`
- `https://your-app.netlify.app`
- Or your custom domain: `https://yourdomain.com`

### Step 2: Update Environment Variables

In your production environment, set:
```
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

### Step 3: Update Supabase for Production

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Update **Site URL** to: `https://your-production-domain.com`
3. Add to **Redirect URLs**:
   ```
   https://your-production-domain.com/**
   ```

### Step 4: Test on Mobile

Your app will now work perfectly on any mobile device accessing your production URL!

---

## Troubleshooting

### Password Reset Link Not Working on Mobile

**Problem**: Email contains `localhost:3000` link which doesn't work on mobile

**Solution**:
1. Make sure you've added your network IP to Supabase redirect URLs (see Step 2 above)
2. Access the app from your phone using the network IP: `http://10.141.161.32:3000`
3. Request password reset from there - the email will use the network IP

### Cannot Access Site on Mobile

**Problem**: Browser shows "Can't reach this page" or "Connection refused"

**Solutions**:
1. Verify your phone is on the **same WiFi network** as your computer
2. Check if your computer's firewall is blocking port 3000
   - Windows: Go to Windows Defender Firewall → Allow an app → Allow Next.js
3. Make sure the development server is running (`npm run dev`)
4. Try using your computer's IP address instead (check with `ipconfig` on Windows)

### Email Not Sending

**Problem**: No password reset email received

**Solutions**:
1. Check your spam/junk folder
2. Verify email settings in Supabase Dashboard → Authentication → Email Templates
3. Check Supabase Dashboard → Authentication → Logs for any errors

---

## Current Configuration

- **Supabase URL**: `https://qjswuwcqyzeuqqqltykz.supabase.co`
- **Local Dev**: `http://localhost:3000`
- **Network IP**: `http://10.141.161.32:3000` (use this on mobile)
- **Status**: ✅ Code is configured for mobile support

**Next Step**: Add your network IP to Supabase redirect URLs (see Step 2 above)
