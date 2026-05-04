-- Ensure SMTP settings keys exist in the settings table
INSERT INTO public.settings (key, value, description)
VALUES 
  ('smtp_user', '', 'SMTP username (usually an email address)'),
  ('smtp_pass', '', 'SMTP password'),
  ('smtp_host', 'smtp.hostinger.com', 'SMTP host server address'),
  ('smtp_port', '465', 'SMTP port (465 for SSL, 587 for STARTTLS)')
ON CONFLICT (key) DO NOTHING;
