-- Add is_refunded to user_investment_selections
ALTER TABLE user_investment_selections ADD COLUMN IF NOT EXISTS is_refunded BOOLEAN DEFAULT FALSE;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_user_investment_selections_is_refunded ON user_investment_selections(is_refunded);

-- Helper function to get pending refunds
CREATE OR REPLACE FUNCTION get_pending_refunds()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  plan_name TEXT,
  fund_value NUMERIC,
  wallet_address TEXT,
  maturity_date TIMESTAMPTZ,
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uis.id,
    uis.user_id,
    p.full_name as user_name,
    io.option_name as plan_name,
    uis.amount as fund_value,
    p.withdrawal_wallet_address as wallet_address,
    (uis.selected_at + (io.duration_days || ' days')::INTERVAL) as maturity_date,
    p.email
  FROM user_investment_selections uis
  JOIN investment_options io ON uis.investment_option_id = io.id
  JOIN profiles p ON uis.user_id = p.id
  WHERE uis.is_active = true 
    AND uis.is_refunded = false
    AND (uis.selected_at + (io.duration_days || ' days')::INTERVAL) <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
