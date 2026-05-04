-- Create firewall_rules table
CREATE TABLE IF NOT EXISTS firewall_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    target_endpoint TEXT DEFAULT 'ALL',
    rate_limit_window INTEGER DEFAULT 60,
    rate_limit_max INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create waf_analytics table
CREATE TABLE IF NOT EXISTS waf_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_date DATE DEFAULT current_date,
    total_requests INTEGER DEFAULT 0,
    blocked_requests INTEGER DEFAULT 0,
    threat_count INTEGER DEFAULT 0,
    avg_latency INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create security_reports table
CREATE TABLE IF NOT EXISTS security_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    score INTEGER DEFAULT 0,
    vulnerabilities_found JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS (just to be safe and then add policies)
ALTER TABLE firewall_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE waf_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Create policies for admins
DO $$ 
BEGIN
    -- firewall_rules
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage firewall rules') THEN
        CREATE POLICY "Admins can manage firewall rules" ON firewall_rules
        FOR ALL TO authenticated
        USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role));
    END IF;

    -- waf_analytics
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view waf analytics') THEN
        CREATE POLICY "Admins can view waf analytics" ON waf_analytics
        FOR SELECT TO authenticated
        USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role));
    END IF;

    -- security_reports
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage security reports') THEN
        CREATE POLICY "Admins can manage security reports" ON security_reports
        FOR ALL TO authenticated
        USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role));
    END IF;

    -- admin_security_logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view security logs') THEN
        CREATE POLICY "Admins can view security logs" ON admin_security_logs
        FOR SELECT TO authenticated
        USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can insert security logs') THEN
        CREATE POLICY "System can insert security logs" ON admin_security_logs
        FOR INSERT TO authenticated
        WITH CHECK (true);
    END IF;

    -- login_attempts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view login attempts') THEN
        CREATE POLICY "Admins can view login attempts" ON login_attempts
        FOR SELECT TO authenticated
        USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role));
    END IF;

    -- rate_limit_logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view rate limit logs') THEN
        CREATE POLICY "Admins can view rate limit logs" ON rate_limit_logs
        FOR SELECT TO authenticated
        USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role));
    END IF;

    -- security_events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view security events') THEN
        CREATE POLICY "Admins can view security events" ON security_events
        FOR SELECT TO authenticated
        USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role));
    END IF;
END $$;

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE security_events;
ALTER PUBLICATION supabase_realtime ADD TABLE login_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE firewall_rules;
