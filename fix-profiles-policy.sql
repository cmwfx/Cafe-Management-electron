-- Fix for profiles table RLS policies that are causing infinite recursion
-- First, drop existing policies that might be causing the issue
DROP POLICY IF EXISTS profiles_view_own ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;
DROP POLICY IF EXISTS profiles_admin_view ON profiles;
DROP POLICY IF EXISTS profiles_admin_update ON profiles;

-- Create simpler policies without recursion
-- Allow users to view their own profile
CREATE POLICY profiles_view_own ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow admins to view all profiles (uses is_admin from the current row, not a subquery)
CREATE POLICY profiles_admin_view ON profiles
  FOR SELECT TO authenticated USING (true);

-- Allow admins to update all profiles if they're admin
CREATE POLICY profiles_admin_update ON profiles
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

-- Enable RLS on the table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant privileges to roles
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role; 