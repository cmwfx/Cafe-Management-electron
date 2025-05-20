-- Schema for Cafe Management System

-- Enable the UUID extension for generating user IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Supabase Auth)
-- This is automatically created by Supabase Auth, we just reference it

-- Profiles table to store user-specific information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  credits INTEGER NOT NULL DEFAULT 0,
  first_name TEXT,
  last_name TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a trigger to create a profile entry when a new user is created
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, credits)
  VALUES (NEW.id, NEW.email, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();

-- Sessions table to store user session information
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  computer_id TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER NOT NULL,
  credits_used INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Computers table to store computer information
CREATE TABLE IF NOT EXISTS computers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'available',
  last_user_id UUID REFERENCES profiles(id),
  last_active TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit transactions table to track credit changes
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  session_id UUID REFERENCES sessions(id),
  admin_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing configurations
CREATE TABLE IF NOT EXISTS configurations (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Insert some default configurations
INSERT INTO configurations (id, value, description)
VALUES
  ('pricing', '{"per_minute": 0.10, "per_hour": 5, "minimum_minutes": 15}', 'Default pricing configuration for sessions'),
  ('system', '{"maintenance_mode": false, "version": "1.0.0"}', 'System-wide configuration');

-- Set up Row Level Security (RLS) policies

-- Profiles table policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY profiles_view_own ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow admins to view all profiles
CREATE POLICY profiles_admin_view ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Allow admins to update all profiles
CREATE POLICY profiles_admin_update ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Sessions table policies
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own sessions
CREATE POLICY sessions_view_own ON sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own sessions
CREATE POLICY sessions_insert_own ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own active sessions
CREATE POLICY sessions_update_own ON sessions
  FOR UPDATE USING (auth.uid() = user_id AND is_active = true);

-- Allow admins to view all sessions
CREATE POLICY sessions_admin_view ON sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Allow admins to insert and update all sessions
CREATE POLICY sessions_admin_write ON sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Credit transactions policies
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own transactions
CREATE POLICY transactions_view_own ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view, insert, and update all transactions
CREATE POLICY transactions_admin_all ON credit_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Computers table policies
ALTER TABLE computers ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view computers
CREATE POLICY computers_view_all ON computers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can insert, update, delete computers
CREATE POLICY computers_admin_write ON computers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Configurations table policies
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view configurations
CREATE POLICY configurations_view_all ON configurations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can insert, update, delete configurations
CREATE POLICY configurations_admin_write ON configurations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Create an admin user function
CREATE OR REPLACE FUNCTION create_admin_user(email TEXT, password TEXT, admin_key TEXT)
RETURNS TEXT AS $$
DECLARE
  new_user_id UUID;
  correct_admin_key TEXT := 'cafesuperadmin'; -- This should be stored in a secure way
BEGIN
  -- Check admin key
  IF admin_key != correct_admin_key THEN
    RETURN 'Invalid admin key';
  END IF;
  
  -- Create user
  BEGIN
    new_user_id := (SELECT id FROM auth.users WHERE auth.users.email = create_admin_user.email);
    
    IF new_user_id IS NULL THEN
      -- User doesn't exist, let's create one
      new_user_id := extensions.uuid_generate_v4();
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role)
      VALUES (
        new_user_id,
        email,
        auth.crypt(password, auth.gen_salt('bf')),
        NOW(),
        'authenticated'
      );
    ELSE
      -- User exists, update the password
      UPDATE auth.users
      SET encrypted_password = auth.crypt(password, auth.gen_salt('bf'))
      WHERE id = new_user_id;
    END IF;
    
    -- Update the profile to be an admin
    UPDATE profiles
    SET is_admin = true
    WHERE id = new_user_id;
    
    RETURN 'Admin user created or updated successfully';
  EXCEPTION WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 