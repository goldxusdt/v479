-- Fix missing relationship for security_events
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'security_events_user_id_fkey'
    ) THEN
        ALTER TABLE security_events 
        ADD CONSTRAINT security_events_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Fix missing relationship for login_attempts
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'login_attempts_user_id_fkey'
    ) THEN
        ALTER TABLE login_attempts 
        ADD CONSTRAINT login_attempts_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create admin_security_logs table
CREATE TABLE IF NOT EXISTS admin_security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- values: mfa_enabled, mfa_disabled, mfa_recovery_code_used
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    outcome TEXT NOT NULL, -- values: success, failure
    additional_details JSONB
);

-- Enable RLS
ALTER TABLE admin_security_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION can_manage_security_logs()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for admin_security_logs
CREATE POLICY "Admins can view all logs" ON admin_security_logs
FOR SELECT USING (can_manage_security_logs());

CREATE POLICY "System can insert logs" ON admin_security_logs
FOR INSERT WITH CHECK (true); -- Usually inserted via Edge Function or Server Side logic

-- Reload schema for PostgREST (usually not needed but good practice after DDL)
NOTIFY pgrst, 'reload schema';
