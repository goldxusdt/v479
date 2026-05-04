-- Fix credit_daily_roi_to_users to use correct column names
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
  -- Get daily ROI rate from settings if available, else default to 0.33%
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
    -- Calculate daily ROI based on total deposits
    roi_amount := user_record.total_deposits * daily_roi_rate;
    
    IF roi_amount > 0 THEN
      -- Credit to ROI wallet
      UPDATE wallets
      SET 
        balance = balance + roi_amount,
        updated_at = NOW()
      WHERE user_id = user_record.user_id 
        AND wallet_type = 'roi';
      
      -- Log transaction with CORRECT column names
      INSERT INTO transactions (
        user_id,
        transaction_type,
        amount,
        net_amount,
        fee,
        status,
        admin_notes,
        created_at
      ) VALUES (
        user_record.user_id,
        'roi_credit',
        roi_amount,
        roi_amount,
        0,
        'completed',
        'Daily ROI credit (' || (daily_roi_rate * 100) || '%)',
        NOW()
      );
      
      -- Update last_roi_credit_at
      UPDATE profiles SET last_roi_credit_at = NOW() WHERE id = user_record.user_id;
    END IF;
  END LOOP;
END;
$$;
