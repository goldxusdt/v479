-- Create function to credit daily ROI to users
CREATE OR REPLACE FUNCTION credit_daily_roi_to_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  daily_roi_rate NUMERIC := 0.0033; -- 0.33% daily
  roi_amount NUMERIC;
BEGIN
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
    -- Calculate daily ROI based on total deposits
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
      type,
      amount,
      status,
      description,
      created_at
    ) VALUES (
      user_record.user_id,
      'roi_credit',
      roi_amount,
      'completed',
      'Daily ROI credit (0.33%)',
      NOW()
    );
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION credit_daily_roi_to_users() TO authenticated;
GRANT EXECUTE ON FUNCTION credit_daily_roi_to_users() TO service_role;