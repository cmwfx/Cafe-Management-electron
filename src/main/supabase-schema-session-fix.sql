-- Fix for session extension issue
-- The current RLS policy prevents users from extending expired sessions
-- because it requires is_active = true for updates, but expired sessions have is_active = false

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS sessions_update_own ON sessions;

-- Create a more permissive policy that allows users to update their own sessions
-- regardless of the is_active status (for session extensions)
CREATE POLICY sessions_update_own ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create a stored procedure to safely extend sessions with proper permissions
CREATE OR REPLACE FUNCTION extend_user_session(
  session_id UUID,
  end_user_id UUID,
  new_end_time TIMESTAMP WITH TIME ZONE,
  new_duration_minutes INTEGER,
  new_credits_used INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the session for the specified user
  UPDATE sessions
  SET 
    is_active = true,
    end_time = new_end_time,
    duration_minutes = new_duration_minutes,
    credits_used = new_credits_used
  WHERE 
    id = session_id 
    AND user_id = end_user_id;
  
  -- Return true if the update was successful
  RETURN FOUND;
END;
$$;

-- Create a stored procedure to safely end sessions with proper permissions
CREATE OR REPLACE FUNCTION end_user_session(
  session_id UUID,
  end_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the session to inactive for the specified user
  UPDATE sessions
  SET 
    is_active = false,
    end_time = NOW()
  WHERE 
    id = session_id 
    AND user_id = end_user_id;
  
  -- Return true if the update was successful
  RETURN FOUND;
END;
$$; 