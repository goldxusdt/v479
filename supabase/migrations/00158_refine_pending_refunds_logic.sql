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
    (uis.selected_at + (COALESCE(io.duration_days, 0) || ' days')::INTERVAL + (COALESCE(io.duration_hours, 0) || ' hours')::INTERVAL) as maturity_date,
    p.email
  FROM user_investment_selections uis
  JOIN investment_options io ON uis.investment_option_id = io.id
  JOIN profiles p ON uis.user_id = p.id
  WHERE uis.is_active = true 
    AND uis.is_refunded = false
    AND (uis.selected_at + (COALESCE(io.duration_days, 0) || ' days')::INTERVAL + (COALESCE(io.duration_hours, 0) || ' hours')::INTERVAL) <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
