-- Add columns for MFA locking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS mfa_failed_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS mfa_locked_until timestamp with time zone;

-- Ensure admin_security_logs table exists
CREATE TABLE IF NOT EXISTS admin_security_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id uuid REFERENCES auth.users(id),
    event_type text NOT NULL,
    ip_address text,
    user_agent text,
    outcome text,
    additional_details jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Policy to allow admins to view all logs, and users to view their own
-- DROP POLICY IF EXISTS if needed, or use CREATE POLICY IF NOT EXISTS (postgres 9.5+)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all security logs' AND tablename = 'admin_security_logs') THEN
        CREATE POLICY "Admins can view all security logs" ON admin_security_logs
            FOR SELECT TO authenticated
            USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own security logs' AND tablename = 'admin_security_logs') THEN
        CREATE POLICY "Users can view their own security logs" ON admin_security_logs
            FOR SELECT TO authenticated
            USING (admin_id = auth.uid());
    END IF;
END
$$;
