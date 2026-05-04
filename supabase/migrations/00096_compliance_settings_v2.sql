-- Insert default settings into the table the UI uses
INSERT INTO public.settings (key, value, description)
VALUES 
('compliance_email', 'reports@goldxusdt.com', 'Compliance email for audit reports'),
('compliance_org_name', 'GoldX USDT', 'Organization name for audit reports')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;
