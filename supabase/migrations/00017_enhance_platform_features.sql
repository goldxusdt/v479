-- 1. Add referral level flags and performance tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_level_5_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS referral_level_6_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS referral_level_7_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS referral_level_8_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS referral_level_9_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS referral_level_10_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS referral_level_11_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS referral_level_12_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS referral_level_13_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS referral_level_14_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS referral_level_15_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS performance_usdt NUMERIC DEFAULT 0;

-- 2. Create FAQs table
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Insert initial settings
INSERT INTO settings (key, value, description) VALUES
  ('daily_roi_percentage', '0.33', 'Daily ROI percentage (e.g., 0.33 for 0.33%)'),
  ('global_auto_withdrawal_enabled', 'false', 'Enable or disable global auto-withdrawal system'),
  ('youtube_deposit_help', 'https://youtube.com', 'YouTube link for deposit guidance'),
  ('youtube_kyc_help', 'https://youtube.com', 'YouTube link for KYC guidance'),
  ('youtube_withdrawal_help', 'https://youtube.com', 'YouTube link for withdrawal guidance'),
  ('referral_level5_percentage', '0.1', 'Level 5 referral commission percentage'),
  ('referral_level6_percentage', '0.2', 'Level 6 referral commission percentage'),
  ('referral_level7_percentage', '0.3', 'Level 7 referral commission percentage'),
  ('referral_level8_percentage', '0.4', 'Level 8 referral commission percentage'),
  ('referral_level9_percentage', '0.5', 'Level 9 referral commission percentage'),
  ('referral_level10_percentage', '0.6', 'Level 10 referral commission percentage'),
  ('referral_level11_percentage', '0.7', 'Level 11 referral commission percentage'),
  ('referral_level12_percentage', '0.8', 'Level 12 referral commission percentage'),
  ('referral_level13_percentage', '0.9', 'Level 13 referral commission percentage'),
  ('referral_level14_percentage', '1.0', 'Level 14 referral commission percentage'),
  ('referral_level15_percentage', '4.0', 'Level 15 referral commission percentage')
ON CONFLICT (key) DO NOTHING;

-- 4. Update ROI function to use dynamic rate from settings
CREATE OR REPLACE FUNCTION credit_daily_roi_to_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  daily_roi_rate NUMERIC;
  roi_amount NUMERIC;
BEGIN
  -- Get rate from settings, default to 0.0033 if not found
  SELECT (COALESCE(value, '0.33')::NUMERIC / 100.0) INTO daily_roi_rate 
  FROM settings WHERE key = 'daily_roi_percentage';
  
  IF daily_roi_rate IS NULL THEN
    daily_roi_rate := 0.0033;
  END IF;

  -- Loop through all users with approved deposits
  FOR user_record IN
    SELECT 
      p.id as user_id,
      COALESCE(SUM(d.amount), 0) as total_deposits
    FROM profiles p
    LEFT JOIN deposits d ON d.user_id = p.id AND d.status = 'approved'
    GROUP BY p.id
    HAVING COALESCE(SUM(d.amount), 0) > 0
  LOOP
    -- Calculate daily ROI
    roi_amount := user_record.total_deposits * daily_roi_rate;
    
    -- Credit to ROI wallet
    UPDATE wallets
    SET 
      balance = balance + roi_amount,
      updated_at = NOW()
    WHERE user_id = user_record.user_id 
      AND wallet_type = 'roi';
    
    -- Log transaction
    INSERT INTO transactions (
      user_id,
      transaction_type,
      amount,
      status,
      admin_notes,
      created_at
    ) VALUES (
      user_record.user_id,
      'roi_credit',
      roi_amount,
      'completed',
      'Daily ROI credit (' || (daily_roi_rate * 100)::text || '%)',
      NOW()
    );
  END LOOP;
END;
$$;

-- 5. Add trigger to update performance_usdt when a deposit is approved
CREATE OR REPLACE FUNCTION update_referrer_performance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Update the referrer's performance
    UPDATE profiles
    SET performance_usdt = performance_usdt + NEW.amount
    WHERE id = (SELECT referrer_id FROM profiles WHERE id = NEW.user_id);
    
    -- Check and auto-enable levels for referrer
    PERFORM check_and_enable_referral_levels((SELECT referrer_id FROM profiles WHERE id = NEW.user_id));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_deposit_approved_update_performance
  AFTER UPDATE ON deposits
  FOR EACH ROW
  EXECUTE FUNCTION update_referrer_performance();

-- 6. Function to check and enable referral levels based on performance
CREATE OR REPLACE FUNCTION check_and_enable_referral_levels(referrer_uid UUID)
RETURNS VOID AS $$
DECLARE
  perf NUMERIC;
BEGIN
  IF referrer_uid IS NULL THEN RETURN; END IF;
  
  SELECT performance_usdt INTO perf FROM profiles WHERE id = referrer_uid;
  
  UPDATE profiles SET
    referral_level_5_enabled = (perf >= 10000),
    referral_level_6_enabled = (perf >= 25000),
    referral_level_7_enabled = (perf >= 50000),
    referral_level_8_enabled = (perf >= 75000),
    referral_level_9_enabled = (perf >= 100000),
    referral_level_10_enabled = (perf >= 150000),
    referral_level_11_enabled = (perf >= 200000),
    referral_level_12_enabled = (perf >= 300000),
    referral_level_13_enabled = (perf >= 400000),
    referral_level_14_enabled = (perf >= 500000),
    referral_level_15_enabled = (perf >= 1000000)
  WHERE id = referrer_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
