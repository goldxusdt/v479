-- Security Hardening: Advanced Firewall & WAF Simulation Features

-- 1. Security Events Table for centralized logging
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL, -- 'blocked_ip', 'rate_limit_exceeded', 'sql_injection_attempt', 'unauthorized_access'
    severity TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    ip_address TEXT,
    user_id UUID REFERENCES auth.users(id),
    endpoint TEXT,
    payload JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all security events
CREATE POLICY "Admins view all security events" ON security_events
    FOR SELECT TO authenticated
    USING (is_admin(auth.uid()));

-- 2. Enhanced Firewall Logic: Function to check if a request should be blocked
CREATE OR REPLACE FUNCTION check_request_security(
    p_ip TEXT,
    p_endpoint TEXT,
    p_user_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_is_blocked BOOLEAN := FALSE;
    v_block_reason TEXT;
BEGIN
    -- Check if IP is explicitly blocked in firewall_rules
    SELECT TRUE, description INTO v_is_blocked, v_block_reason
    FROM firewall_rules
    WHERE type = 'ip_block' AND value = p_ip AND is_active = TRUE;

    IF v_is_blocked THEN
        INSERT INTO security_events (event_type, severity, ip_address, user_id, endpoint, description)
        VALUES ('blocked_ip_access', 'high', p_ip, p_user_id, p_endpoint, 'Access attempt from blocked IP: ' || v_block_reason);
        RETURN jsonb_build_object('blocked', TRUE, 'reason', 'Your IP is blocked by the system firewall.');
    END IF;

    -- Check for aggressive rate limiting (simulated)
    -- This is a placeholder for more complex logic that could be called from Edge Functions
    
    RETURN jsonb_build_object('blocked', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger for suspicious activities (e.g., rapid failed login attempts)
-- This logic would ideally be in auth.users trigger or app-level middleware
-- For now, we provide the infrastructure.

-- 4. Firewall Rule types expansion
-- Ensure type can handle 'geo_block', 'ip_whitelist', etc.
-- (Assuming firewall_rules.type is TEXT)

-- Add a default rule for demonstration
INSERT INTO firewall_rules (type, value, description, is_active)
VALUES ('geo_block', 'unknown', 'Block requests from undefined geographic locations', FALSE)
ON CONFLICT DO NOTHING;
