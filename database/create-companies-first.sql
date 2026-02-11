-- ============================================================================
-- CREATE COMPANIES TABLE FIRST
-- ============================================================================
-- This must run BEFORE any other migrations
-- Creates the companies table that other tables depend on
-- ============================================================================

-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  size TEXT CHECK (size IN ('solo', 'small', 'medium', 'large')),
  website TEXT,
  address JSONB,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  subscription_tier TEXT CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')) DEFAULT 'starter',
  subscription_status TEXT CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled')) DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_subscription ON public.companies(subscription_tier, subscription_status);
CREATE INDEX IF NOT EXISTS idx_companies_stripe ON public.companies(stripe_customer_id);

-- Create a default company if none exists
INSERT INTO public.companies (name, subscription_tier, subscription_status)
SELECT 'Default Company', 'starter', 'trial'
WHERE NOT EXISTS (SELECT 1 FROM public.companies LIMIT 1);

-- Show created company
SELECT id, name, subscription_tier, created_at FROM public.companies;
