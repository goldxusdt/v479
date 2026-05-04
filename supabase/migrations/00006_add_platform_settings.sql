-- Create platform settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Insert default wallet addresses
INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
  ('deposit_wallet_bep20', 'YOUR_BEP20_WALLET_ADDRESS', 'BEP-20 (BSC) deposit wallet address'),
  ('deposit_wallet_trc20', 'YOUR_TRC20_WALLET_ADDRESS', 'TRC-20 (TRON) deposit wallet address')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can read, only admins can update
CREATE POLICY "Anyone can view platform settings" ON platform_settings
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins can update platform settings" ON platform_settings
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- Create index
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(setting_key);