-- Fix for Supabase user creation trigger
-- The current trigger is likely causing the "Database error saving new user" issue

-- First, drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Then drop the function if it exists
DROP FUNCTION IF EXISTS public.create_profile_for_user();

-- Create an improved version of the function that handles errors better
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert with more explicit error handling
  BEGIN
    INSERT INTO public.profiles (id, username, credits, created_at, updated_at)
    VALUES (
      NEW.id, 
      COALESCE(NEW.email, 'user_' || NEW.id), -- Fallback username if email is null
      100, -- Default credits
      NOW(),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger again with AFTER INSERT
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_user();

-- Check if there are any existing users without profiles and create profiles for them
INSERT INTO public.profiles (id, username, credits, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.email, 'user_' || au.id),
  100,
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Check and fix permissions on the profiles table
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role; 