-- Add website management settings
INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
  ('contact_email', 'support@goldxusdt.com', 'Contact email address displayed on website'),
  ('site_name', 'Gold X Usdt', 'Website name'),
  ('site_description', 'Premium MLM Investment Platform with 10% Monthly ROI', 'Website description'),
  ('logo_url', '', 'Custom logo URL (leave empty to use default)'),
  ('favicon_url', '', 'Custom favicon URL (leave empty to use default)')
ON CONFLICT (setting_key) DO NOTHING;