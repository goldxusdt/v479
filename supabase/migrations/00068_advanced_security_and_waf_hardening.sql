-- Add Rate Limiting and Endpoint restrictions to firewall_rules
ALTER TABLE firewall_rules ADD COLUMN IF NOT EXISTS target_endpoint TEXT; -- Specific endpoint or 'ALL'
ALTER TABLE firewall_rules ADD COLUMN IF NOT EXISTS rate_limit_window INT; -- In seconds
ALTER TABLE firewall_rules ADD COLUMN IF NOT EXISTS rate_limit_max INT; -- Max requests in window
ALTER TABLE firewall_rules ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'block'; -- 'block', 'allow', 'rate_limit'

-- Create table for security audit reports
CREATE TABLE IF NOT EXISTS security_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'running', 'completed', 'failed'
  compliance_type TEXT NOT NULL, -- 'OWASP', 'PCI-DSS', 'GDPR', 'ALL'
  vulnerabilities_found JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS for security_reports
ALTER TABLE security_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage reports
CREATE POLICY "Admins can manage security reports"
ON security_reports
FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Function to record security events from WAF
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_severity TEXT,
  p_description TEXT,
  p_ip_address TEXT,
  p_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO security_events (
    event_type,
    severity,
    description,
    ip_address,
    user_id,
    metadata
  ) VALUES (
    p_event_type,
    p_severity,
    p_description,
    p_ip_address,
    p_user_id,
    p_metadata
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
