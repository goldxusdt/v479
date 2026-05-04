-- Add new fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS withdrawal_wallet_address TEXT,
ADD COLUMN IF NOT EXISTS monthly_roi_percentage DECIMAL(5,2) DEFAULT 10.00;

-- Create settings table for global configurations
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value, description)
VALUES 
  ('global_auto_withdrawal_enabled', 'true', 'Master switch for all auto-withdrawals'),
  ('monthly_roi_percentage', '10.00', 'Monthly ROI percentage for all users'),
  ('daily_roi_percentage', '0.33', 'Daily ROI percentage (monthly / 30)')
ON CONFLICT (key) DO NOTHING;

-- Create index for settings
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Add RLS policies for settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view settings"
ON settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update settings"
ON settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create function to credit daily ROI
CREATE OR REPLACE FUNCTION credit_daily_roi()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deposit_record RECORD;
  daily_roi_amount DECIMAL(10,2);
  daily_roi_rate DECIMAL(5,4);
BEGIN
  -- Get daily ROI rate from settings (default 0.33%)
  SELECT CAST(value AS DECIMAL) / 100 INTO daily_roi_rate
  FROM settings
  WHERE key = 'daily_roi_percentage'
  LIMIT 1;
  
  IF daily_roi_rate IS NULL THEN
    daily_roi_rate := 0.0033; -- Default 0.33%
  END IF;

  -- Loop through all approved deposits
  FOR deposit_record IN
    SELECT d.id, d.user_id, d.amount, d.created_at
    FROM deposits d
    WHERE d.status = 'approved'
    AND d.created_at <= NOW()
  LOOP
    -- Calculate daily ROI
    daily_roi_amount := deposit_record.amount * daily_roi_rate;
    
    -- Credit to ROI wallet
    UPDATE wallets
    SET roi_balance = roi_balance + daily_roi_amount,
        updated_at = NOW()
    WHERE user_id = deposit_record.user_id;
    
    -- Create ROI record
    INSERT INTO roi_records (user_id, deposit_id, amount, created_at)
    VALUES (deposit_record.user_id, deposit_record.id, daily_roi_amount, NOW());
  END LOOP;
END;
$$;

COMMENT ON FUNCTION credit_daily_roi() IS 'Credits daily ROI (0.33%) to all users with approved deposits';