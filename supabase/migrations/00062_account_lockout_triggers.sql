-- Account Lockout Logic: Temporarily disable accounts after repeated failed logins

-- 1. Table for tracking failed attempts
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    email TEXT,
    ip_address TEXT,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempt_time);

-- 2. Function to check if account should be locked
CREATE OR REPLACE FUNCTION check_account_lockout(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_failed_count INTEGER;
    v_lockout_threshold INTEGER := 5; -- Lock after 5 failed attempts
    v_lockout_duration INTERVAL := INTERVAL '15 minutes';
BEGIN
    SELECT COUNT(*) INTO v_failed_count
    FROM login_attempts
    WHERE email = p_email
      AND success = FALSE
      AND attempt_time > NOW() - v_lockout_duration;

    RETURN v_failed_count >= v_lockout_threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Modify profiles to include lockout status if not present
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'locked_until') THEN
        ALTER TABLE profiles ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 4. RLS for security logs (Admins only)
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view login attempts" ON login_attempts FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Note: Actual enforcement of the lockout typically happens in the application login flow 
-- or a custom Auth trigger if supported by the provider.
