-- Add security log columns
ALTER TABLE login_attempts 
ADD COLUMN IF NOT EXISTS geolocation JSONB,
ADD COLUMN IF NOT EXISTS device_fingerprint JSONB;

-- Add customizable withdrawal settings
INSERT INTO platform_settings (setting_key, setting_value)
VALUES 
  ('withdrawal_cooling_period_default', '48'),
  ('withdrawal_cycle_duration_hours', '360'),
  ('first_deposit_cooling_period_hours', '48')
ON CONFLICT (setting_key) DO NOTHING;
