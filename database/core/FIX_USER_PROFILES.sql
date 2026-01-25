-- ============================================================
-- FIX: Auto-create user profiles on registration AND email confirmation
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_confirmed();

-- Create function to handle new user registration (creates profile immediately)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new profile for the user when they register
  -- Profile is created even before email confirmation
  INSERT INTO public.user_profiles (
    id,
    full_name,
    company_name,
    country,
    phone,
    plan,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', 'US'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'selected_plan', 'starter'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicates if profile already exists

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call function on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also ensure profile exists when email is confirmed (backup)
CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- Double-check profile exists when email is confirmed
  INSERT INTO public.user_profiles (
    id,
    full_name,
    company_name,
    country,
    phone,
    plan,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', 'US'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'selected_plan', 'starter'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email confirmation
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_user_confirmed();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
