-- Add new columns to investment_options
ALTER TABLE investment_options 
ADD COLUMN IF NOT EXISTS deposit_fee_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS coupon_code text,
ADD COLUMN IF NOT EXISTS roi_payout_frequency text DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS wallet_address text;

-- Add status to user_investment_selections
ALTER TABLE user_investment_selections
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- Create table for hash validation
CREATE TABLE IF NOT EXISTS investment_hash_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  transaction_hash text UNIQUE NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, validated, rejected
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for investment_hash_validations
ALTER TABLE investment_hash_validations ENABLE ROW LEVEL SECURITY;

-- Helper functions for policies
CREATE OR REPLACE FUNCTION can_manage_all_hash_validations()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_view_own_hash_validations(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for investment_hash_validations
DROP POLICY IF EXISTS "Admins can manage all hash validations" ON investment_hash_validations;
CREATE POLICY "Admins can manage all hash validations"
ON investment_hash_validations FOR ALL TO authenticated
USING (can_manage_all_hash_validations());

DROP POLICY IF EXISTS "Users can view own hash validations" ON investment_hash_validations;
CREATE POLICY "Users can view own hash validations"
ON investment_hash_validations FOR SELECT TO authenticated
USING (can_view_own_hash_validations(user_id));

DROP POLICY IF EXISTS "Users can insert own hash validations" ON investment_hash_validations;
CREATE POLICY "Users can insert own hash validations"
ON investment_hash_validations FOR INSERT TO authenticated
WITH CHECK (can_view_own_hash_validations(user_id));

-- Add unique constraint to option_name
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'investment_options_option_name_unique') THEN
        ALTER TABLE investment_options ADD CONSTRAINT investment_options_option_name_unique UNIQUE (option_name);
    END IF;
END $$;

-- Insert the Special Fixed Plan
INSERT INTO investment_options (
  option_name, 
  description, 
  min_amount, 
  max_amount,
  interest_rate,
  roi_percentage, 
  duration_days, 
  duration_hours, 
  deposit_fee_percentage, 
  roi_payout_frequency,
  is_locked, 
  is_active, 
  is_visible,
  wallet_address
) VALUES (
  'Special Fixed Plan',
  'Premium non-expiring fixed investment plan with stable returns linked to physical gold reserves.',
  50,
  1000000,
  15, -- interest_rate
  15, -- roi_percentage
  0,
  0,
  5,
  'daily',
  true,
  true,
  true,
  '0xFixedPlanDepositAddressGoldX'
) ON CONFLICT (option_name) DO NOTHING;
