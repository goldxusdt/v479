-- 1. Fix Deposit Approval Logic (Don't double count invested capital)
CREATE OR REPLACE FUNCTION public.process_deposit_approval(deposit_id_param uuid, admin_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deposit_record RECORD;
  referral_item RECORD;
  lock_date TIMESTAMPTZ;
BEGIN
  -- Get deposit details
  SELECT * INTO deposit_record FROM deposits WHERE id = deposit_id_param;
  
  IF deposit_record IS NULL THEN
    RAISE EXCEPTION 'Deposit not found';
  END IF;
  
  IF deposit_record.status != 'pending' THEN
    RAISE EXCEPTION 'Deposit is not pending';
  END IF;
  
  -- 1. Update deposit status
  UPDATE deposits SET 
    status = 'approved',
    approved_at = NOW()
  WHERE id = deposit_id_param;
  
  -- 2. Update transaction status
  UPDATE transactions SET 
    status = 'completed',
    approved_at = NOW(),
    approved_by = admin_id
  WHERE id = deposit_record.transaction_id;

  -- 2.1 Increment coupon count if used
  IF deposit_record.coupon_id IS NOT NULL THEN
    UPDATE coupons 
    SET used_count = used_count + 1 
    WHERE id = deposit_record.coupon_id;
  END IF;
  
  -- 3. Credit wallet ONLY IF NOT auto-invested
  -- If it's auto-invested, the capital is considered "locked" in the investment selection
  IF deposit_record.plan_id IS NULL THEN
    UPDATE wallets SET 
      balance = balance + deposit_record.net_amount,
      updated_at = NOW()
    WHERE user_id = deposit_record.user_id AND wallet_type = 'deposit';
  END IF;
  
  -- 4. Process referral commissions
  lock_date := NOW() + INTERVAL '30 days';
  
  FOR referral_item IN SELECT * FROM get_referral_chain(deposit_record.user_id) LOOP
    DECLARE
      commission_amt DECIMAL(20, 8);
    BEGIN
      commission_amt := (deposit_record.amount - deposit_record.fee) * referral_item.commission_rate;
      
      IF commission_amt > 0 THEN
        INSERT INTO referral_commissions (
          referrer_id,
          referred_user_id,
          deposit_id,
          level,
          commission_rate,
          commission_amount,
          locked_until,
          is_locked
        ) VALUES (
          referral_item.referrer_id,
          deposit_record.user_id,
          deposit_id_param,
          referral_item.level,
          referral_item.commission_rate,
          commission_amt,
          lock_date,
          true
        );
        
        UPDATE wallets SET 
          balance = balance + commission_amt,
          updated_at = NOW()
        WHERE user_id = referral_item.referrer_id AND wallet_type = 'bonus';
        
        INSERT INTO transactions (
          user_id,
          transaction_type,
          amount,
          net_amount,
          status,
          admin_notes
        ) VALUES (
          referral_item.referrer_id,
          'referral_commission'::transaction_type,
          commission_amt,
          commission_amt,
          'completed',
          'Referral commission Level ' || referral_item.level
        );
        
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (referral_item.referrer_id, 'Commission Received', 'You earned ' || commission_amt || ' USDT commission from Level ' || referral_item.level || ' referral.', 'bonus');
      END IF;
    END;
  END LOOP;
  
  -- 5. Notify user of deposit approval
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (deposit_record.user_id, 'Deposit Approved', 'Your deposit of ' || deposit_record.amount || ' USDT has been approved.', 'deposit');

  -- 6. Auto-invest if plan_id is present
  IF deposit_record.plan_id IS NOT NULL THEN
    INSERT INTO user_investment_selections (
      user_id,
      investment_option_id,
      amount,
      is_active,
      status,
      selected_at,
      transaction_hash
    ) VALUES (
      deposit_record.user_id,
      deposit_record.plan_id,
      deposit_record.net_amount,
      true,
      'active',
      NOW(),
      deposit_record.transaction_hash
    );

    INSERT INTO notifications (user_id, title, message, type)
    VALUES (deposit_record.user_id, 'Auto-Investment Started', 'Your deposit has been auto-invested into the selected plan.', 'deposit');
  END IF;
  
END;
$function$;

-- 2. Fix Process Refund Logic (Return capital to user instead of deducting)
CREATE OR REPLACE FUNCTION public.process_refund(p_investment_id uuid, p_admin_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_amount NUMERIC;
  v_result JSON;
BEGIN
  -- Check if investment exists and is active and not refunded
  SELECT user_id, amount INTO v_user_id, v_amount
  FROM user_investment_selections
  WHERE id = p_investment_id AND is_active = true AND is_refunded = false;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Investment not found or already processed');
  END IF;

  -- 1. ADD to deposit wallet (Capital Return)
  UPDATE wallets 
  SET balance = balance + v_amount,
      updated_at = NOW()
  WHERE user_id = v_user_id AND wallet_type = 'deposit';

  -- 2. Mark investment as refunded and completed
  UPDATE user_investment_selections
  SET is_refunded = true,
      is_active = false,
      status = 'completed',
      completed_at = NOW()
  WHERE id = p_investment_id;

  -- 3. Record transaction
  INSERT INTO transactions (
    user_id,
    transaction_type,
    amount,
    net_amount,
    status,
    admin_notes,
    approved_at,
    approved_by
  ) VALUES (
    v_user_id,
    'withdrawal', -- Representing the movement of funds back to user control
    v_amount,
    v_amount,
    'completed',
    'Plan maturity capital return processed by admin',
    NOW(),
    p_admin_id
  );

  -- 4. Notify user
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (v_user_id, 'Investment Matured', 'Your investment of ' || v_amount || ' USDT has matured and capital has been returned to your wallet.', 'deposit');

  RETURN json_build_object('success', true, 'user_id', v_user_id, 'amount', v_amount);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$function$;
