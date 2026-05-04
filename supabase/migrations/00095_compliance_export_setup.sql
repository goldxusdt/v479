-- Create compliance_audit_exports table
CREATE TABLE IF NOT EXISTS public.compliance_audit_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  export_format text NOT NULL, -- 'pdf', 'csv', 'excel'
  document_id text UNIQUE NOT NULL,
  file_hash text NOT NULL,
  record_count integer NOT NULL,
  filters jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS: Only admins can see export logs
ALTER TABLE public.compliance_audit_exports ENABLE ROW LEVEL SECURITY;

-- Assuming is_admin() exists from previous turns
CREATE POLICY "Admins can view compliance exports" ON public.compliance_audit_exports
  FOR SELECT TO authenticated USING (is_admin());

-- Insert default settings
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
('compliance_email', 'reports@goldxusdt.com', 'Compliance email for audit reports'),
('compliance_org_name', 'GoldX USDT', 'Organization name for audit reports')
ON CONFLICT (setting_key) DO UPDATE SET description = EXCLUDED.description;
