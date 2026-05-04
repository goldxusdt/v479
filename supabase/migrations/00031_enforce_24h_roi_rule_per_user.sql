CREATE OR REPLACE FUNCTION credit_daily_roi_to_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  daily_roi_rate NUMERIC;
  roi_amount NUMERIC;
  v_last_credit TIMESTAMPTZ;
  v_eligible_capital NUMERIC;
BEGIN
  -- Get daily ROI rate from settings if available, else default to 0.33%
  SELECT (COALESCE(value, '0.33')::NUMERIC / 100.0) INTO daily_roi_rate
  FROM settings WHERE key = 'daily_roi_percentage' OR key = 'daily_roi_rate';
  
  IF daily_roi_rate IS NULL THEN
    daily_roi_rate := 0.0033;
  END IF;

  -- Loop through users who are eligible for ROI
  FOR user_record IN
    SELECT 
      p.id as user_id,
      p.last_roi_credit_at,
      -- Find the earliest approved deposit to determine when ROI should start
      MIN(d.approved_at) as first_deposit_approved_at
    FROM profiles p
    JOIN deposits d ON d.user_id = p.id AND d.status = 'approved'
    GROUP BY p.id
    HAVING MIN(d.approved_at) <= NOW() - INTERVAL '24 hours' -- Must have at least one deposit older than 24h
  LOOP
    -- Check if it's been at least 24 hours since last credit
    IF user_record.last_roi_credit_at IS NULL OR user_record.last_roi_credit_at <= NOW() - INTERVAL '24 hours' THEN
      
      -- Calculate eligible capital: Deposits approved at least 24 hours ago
      -- (This ensures new deposits only start paying after 24 hours)
      SELECT COALESCE(SUM(amount), 0) INTO v_eligible_capital
      FROM deposits
      WHERE user_id = user_record.user_id 
        AND status = 'approved'
        AND approved_at <= NOW() - INTERVAL '24 hours';

      IF v_eligible_capital > 0 THEN
        roi_amount := v_eligible_capital * daily_roi_rate;
        
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
          net_amount,
          fee,
          status,
          admin_notes,
          created_at
        ) VALUES (
          user_record.user_id,
          'roi_credit'::transaction_type,
          roi_amount,
          roi_amount,
          0,
          'completed',
          'Daily ROI credit (' || (daily_roi_rate * 100) || '%) on ' || v_eligible_capital || ' USDT capital',
          NOW()
        );
        
        -- Update last_roi_credit_at
        UPDATE profiles SET last_roi_credit_at = NOW() WHERE id = user_record.user_id;
      END IF;
    END IF;
  END LOOP;
END;
$$;
