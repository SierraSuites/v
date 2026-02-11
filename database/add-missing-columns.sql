-- ============================================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================
-- This migration adds any missing columns to existing tables
-- Safe to run multiple times - only adds columns that don't exist
-- ============================================================================

-- Add company_id to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON public.user_profiles(company_id);
  END IF;
END$$;

-- Add full_name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN full_name TEXT;
  END IF;
END$$;

-- Add name column to user_profiles if it doesn't exist (some code uses 'name' instead of 'full_name')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN name TEXT;
  END IF;
END$$;

-- Sync name and full_name columns if both exist
DO $$
BEGIN
  -- If both columns exist, copy name to full_name where full_name is null
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'name'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'full_name'
  ) THEN
    UPDATE public.user_profiles
    SET full_name = name
    WHERE full_name IS NULL AND name IS NOT NULL;

    UPDATE public.user_profiles
    SET name = full_name
    WHERE name IS NULL AND full_name IS NOT NULL;
  END IF;
END$$;

-- Add is_active if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END$$;

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;
