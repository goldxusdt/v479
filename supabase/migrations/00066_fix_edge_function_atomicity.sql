-- 1. Optimized Daily ROI Credit RPC (handles per-user logic correctly)
CREATE OR REPLACE FUNCTION credit_daily_roi(p_date DATE)
RETURNS TABLE (
  total_processed INTEGER,
  success_count INTEGER,
  fail_count INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user RECORD;
  v_daily_rate NUMERIC;
  v_interest_amount NUMERIC;
  v_deposit_balance NUMERIC;
  v_now TIMESTAMPTZ := NOW();
  v_success_count INTEGER := 0;
  v_fail_count INTEGER := 0;
  v_total_processed INTEGER := 0;
BEGIN
  -- Get global daily rate
  SELECT value::NUMERIC INTO v_daily_rate FROM settings WHERE key = 'daily_roi_percentage';
  v_daily_rate := COALESCE(v_daily_rate, 0.33);

  -- Process all users who have not received ROI in the last 23 hours
  FOR v_user IN 
    SELECT id FROM profiles 
    WHERE (last_roi_credit_at IS NULL OR v_now - last_roi_credit_at >= INTERVAL '23 hours')
  LOOP
    BEGIN
      v_total_processed := v_total_processed + 1;
      
      -- Get deposit balance
      SELECT balance INTO v_deposit_balance FROM wallets 
      WHERE user_id = v_user.id AND wallet_type = 'deposit';
      
      IF v_deposit_balance > 0 THEN
        v_interest_amount := (v_deposit_balance * v_daily_rate) / 100;
        
        IF v_interest_amount > 0 THEN
          -- Atomic updates
          UPDATE wallets SET balance = balance + v_interest_amount 
          WHERE user_id = v_user.id AND wallet_type = 'roi';
          
          UPDATE profiles SET last_roi_credit_at = v_now 
          WHERE id = v_user.id;
          
          INSERT INTO transactions (user_id, transaction_type, amount, status, admin_notes)
          VALUES (v_user.id, 'roi_credit', v_interest_amount, 'completed', 'Daily ROI credit (' || v_daily_rate || '%)');
          
          v_success_count := v_success_count + 1;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_fail_count := v_fail_count + 1;
      RAISE NOTICE 'Error processing user %: %', v_user.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_total_processed, v_success_count, v_fail_count;
END;
$$;

-- 2. Optimized Auto-Withdrawal RPC
CREATE OR REPLACE FUNCTION run_auto_withdrawals()
RETURNS TABLE (
  total_users INTEGER,
  success_count INTEGER,
  fail_count INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user RECORD;
  v_roi_balance NUMERIC;
  v_fee_amount NUMERIC;
  v_net_amount NUMERIC;
  v_fee_percent NUMERIC := 5;
  v_now TIMESTAMPTZ := NOW();
  v_next_month_20th DATE;
  v_success_count INTEGER := 0;
  v_fail_count INTEGER := 0;
  v_total_users INTEGER := 0;
BEGIN
  -- Only run on 20th
  IF EXTRACT(DAY FROM v_now) != 20 THEN
    RAISE EXCEPTION 'Auto-withdrawals only run on the 20th of the month';
  END IF;

  v_next_month_20th := (v_now + INTERVAL '1 month')::DATE;
  v_next_month_20th := date_trunc('month', v_next_month_20th) + INTERVAL '19 days';

  FOR v_user IN 
    SELECT id, withdrawal_wallet_address FROM profiles 
    WHERE auto_withdrawal_enabled = true
  LOOP
    BEGIN
      v_total_users := v_total_users + 1;
      
      -- Get ROI balance with FOR UPDATE to prevent concurrent modifications
      SELECT balance INTO v_roi_balance FROM wallets 
      WHERE user_id = v_user.id AND wallet_type = 'roi'
      FOR UPDATE;
      
      IF v_roi_balance > 0 THEN
        v_fee_amount := (v_roi_balance * v_fee_percent) / 100;
        v_net_amount := v_roi_balance - v_fee_amount;
        
        -- Atomic updates
        UPDATE wallets SET balance = 0 
        WHERE user_id = v_user.id AND wallet_type = 'roi';
        
        UPDATE wallets SET balance = balance + v_net_amount 
        WHERE user_id = v_user.id AND wallet_type = 'withdrawal';
        
        INSERT INTO withdrawals (user_id, amount, fee, net_amount, status, wallet_address, network, completed_at)
        VALUES (v_user.id, v_roi_balance, v_fee_amount, v_net_amount, 'approved', COALESCE(v_user.withdrawal_wallet_address, 'Auto-withdrawal'), 'BEP20', v_now);
        
        INSERT INTO transactions (user_id, transaction_type, amount, fee, net_amount, status, admin_notes)
        VALUES (v_user.id, 'withdrawal', v_roi_balance, v_fee_amount, v_net_amount, 'completed', 'Auto-withdrawal processed on 20th (5% fee)');
        
        UPDATE profiles SET next_auto_withdrawal_date = v_next_month_20th 
        WHERE id = v_user.id;
        
        v_success_count := v_success_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_fail_count := v_fail_count + 1;
      RAISE NOTICE 'Error processing auto-withdrawal for user %: %', v_user.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_total_users, v_success_count, v_fail_count;
END;
$$;
