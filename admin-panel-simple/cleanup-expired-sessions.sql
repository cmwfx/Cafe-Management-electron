-- Function to automatically expire sessions that have passed their end time
-- This will be run periodically to clean up expired sessions

-- Create a function that expires sessions
CREATE OR REPLACE FUNCTION expire_sessions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update sessions where current time is past the calculated end time and is_active is still true
    WITH expired_sessions AS (
        UPDATE sessions 
        SET is_active = false, 
            end_time = COALESCE(end_time, start_time + INTERVAL '1 minute' * duration_minutes)
        WHERE is_active = true 
        AND (
            -- Check if end_time is set and has passed
            (end_time IS NOT NULL AND end_time < NOW()) 
            OR 
            -- Check if calculated end time has passed (when end_time is null)
            (end_time IS NULL AND start_time + INTERVAL '1 minute' * duration_minutes < NOW())
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO expired_count FROM expired_sessions;
    
    -- Log the operation if any sessions were expired
    IF expired_count > 0 THEN
        RAISE NOTICE 'Expired % sessions at %', expired_count, NOW();
    END IF;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Option A: Manual execution (you can call this function manually)
-- SELECT expire_sessions();

-- Option B: If you have pg_cron extension (available in some Supabase plans)
-- This will run every minute to check for expired sessions
-- You would run this in the Supabase SQL editor:
-- SELECT cron.schedule('expire-sessions', '* * * * *', 'SELECT expire_sessions();');

-- Option C: Alternative approach - Create a view that dynamically determines active status
-- This doesn't change the table but gives you current active status
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    *,
    CASE 
        WHEN is_active = false THEN false
        WHEN end_time IS NOT NULL AND end_time < NOW() THEN false
        WHEN end_time IS NULL AND start_time + INTERVAL '1 minute' * duration_minutes < NOW() THEN false
        ELSE true
    END AS truly_active
FROM sessions;

-- Grant permissions
GRANT EXECUTE ON FUNCTION expire_sessions() TO authenticated;
GRANT SELECT ON active_sessions TO authenticated;
GRANT SELECT ON active_sessions TO anon; 