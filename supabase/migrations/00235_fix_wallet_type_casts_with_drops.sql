-- Drop existing functions to allow redefinition
DROP FUNCTION IF EXISTS public.process_withdrawal_approval(uuid, boolean, uuid, text);
DROP FUNCTION IF EXISTS public.credit_user_roi(uuid);
DROP FUNCTION IF EXISTS public.process_refund(uuid, uuid);
DROP FUNCTION IF EXISTS public.process_deposit_approval(uuid, uuid);

-- 1. Fix process_withdrawal_approval
CREATE OR REPLACE FUNCTION public.process_withdrawal_approval(p_withdrawal_id uuid, p_approved boolean, p_admin_id uuid, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  withdrawal_rec RECORD;
BEGIN
  -- Get withdrawal details
  SELECT * INTO withdrawal_rec FROM withdrawals WHERE id = p_withdrawal_id;
  
  IF withdrawal_rec IS NULL THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;
  
  IF withdrawal_rec.status != 'pending' THEN
    RAISE EXCEPTION 'Withdrawal is not pending';
  END IF;

  IF p_approved THEN
    -- Approve logic
    UPDATE withdrawals SET 
      status = 'approved',
      approved_at = NOW(),
      completed_at = NOW()
    WHERE id = p_withdrawal_id;
    
    UPDATE transactions SET 
      status = 'completed',
      approved_at = NOW(),
      approved_by = p_admin_id,
      admin_notes = p_notes
    WHERE id = withdrawal_rec.transaction_id;

    -- If withdrawal was from a specific investment selection, reduce its amount
    IF withdrawal_rec.investment_selection_id IS NOT NULL THEN
      UPDATE user_investment_selections
      SET 
        amount = amount - withdrawal_rec.amount,
        status = CASE WHEN (amount - withdrawal_rec.amount) <= 0 THEN 'completed' ELSE status END,
        is_active = CASE WHEN (amount - withdrawal_rec.amount) <= 0 THEN false ELSE is_active END
      WHERE id = withdrawal_rec.investment_selection_id;
    END IF;

    -- ADD to withdrawal wallet balance with explicit cast
    UPDATE wallets SET 
      balance = balance + withdrawal_rec.amount,
      updated_at = NOW()
    WHERE user_id = withdrawal_rec.user_id AND wallet_type = 'withdrawal'::public.wallet_type;
    
    -- Log
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (withdrawal_rec.user_id, 'Withdrawal Approved', 'Your withdrawal request for ' || withdrawal_rec.amount || ' USDT has been approved.', 'withdrawal');
  ELSE
    -- Reject logic
    UPDATE withdrawals SET 
      status = 'rejected'
    WHERE id = p_withdrawal_id;
    
    UPDATE transactions SET 
      status = 'rejected',
      admin_notes = p_notes
    WHERE id = withdrawal_rec.transaction_id;

    -- REFUND the user's balance with explicit cast
    UPDATE wallets SET 
      balance = balance + withdrawal_rec.amount,
      updated_at = NOW()
    WHERE user_id = withdrawal_rec.user_id AND wallet_type = withdrawal_rec.wallet_type::public.wallet_type;
    
    -- Log
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (withdrawal_rec.user_id, 'Withdrawal Rejected', 'Your withdrawal request for ' || withdrawal_rec.amount || ' USDT has been rejected. Reason: ' || COALESCE(p_notes, 'None provided'), 'withdrawal');
  END IF;
END;
$function$;

-- 2. Fix credit_user_roi
CREATE OR REPLACE FUNCTION public.credit_user_roi(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_last_credit TIMESTAMPTZ;
    v_roi_amount NUMERIC := 0;
    v_total_roi NUMERIC := 0;
    v_deposit_balance NUMERIC := 0;
    r RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_new_credit_at TIMESTAMPTZ;
BEGIN
    -- 1. Check current deposit balance with explicit cast
    SELECT balance INTO v_deposit_balance
    FROM wallets 
    WHERE user_id = p_user_id AND wallet_type = 'deposit'::public.wallet_type;

    IF v_deposit_balance IS NULL OR v_deposit_balance <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Zero or negative deposit balance. ROI stopped.');
    END IF;

    -- 2. Get last credit time or earliest approved investment
    SELECT last_roi_credit_at INTO v_last_credit
    FROM profiles WHERE id = p_user_id;
    
    IF v_last_credit IS NULL THEN
        SELECT MIN(approved_at) INTO v_last_credit
        FROM deposits
        WHERE user_id = p_user_id AND status = 'approved';
    END IF;

    -- If still null, user has no active investments
    IF v_last_credit IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active investments found');
    END IF;

    -- 3. Check if enough time passed
    IF v_now >= v_last_credit + INTERVAL '23 hours' THEN
        v_new_credit_at := v_now; 

        -- 4. Calculate ROI for each active investment
        FOR r IN 
            SELECT uis.id, uis.amount, io.interest_rate, io.option_name
            FROM user_investment_selections uis
            JOIN investment_options io ON uis.investment_option_id = io.id
            WHERE uis.user_id = p_user_id AND uis.is_active = true AND uis.status = 'active'
        LOOP
            v_roi_amount := (r.amount * (r.interest_rate / 100 / 30));
            
            IF v_roi_amount > 0 THEN
                v_total_roi := v_total_roi + v_roi_amount;
                
                -- Credit to ROI wallet with explicit cast
                UPDATE wallets 
                SET balance = balance + v_roi_amount,
                    updated_at = v_now
                WHERE user_id = p_user_id AND wallet_type = 'roi'::public.wallet_type;
                
                -- Insert into roi_records
                INSERT INTO roi_records (user_id, roi_amount, roi_percentage, investment_selection_id, created_at)
                VALUES (p_user_id, v_roi_amount, (r.interest_rate / 30), r.id, v_now);
                
                -- Record in transactions
                INSERT INTO transactions (
                    user_id, 
                    amount, 
                    net_amount,
                    fee,
                    transaction_type, 
                    status, 
                    admin_notes,
                    created_at
                ) VALUES (
                    p_user_id, 
                    v_roi_amount, 
                    v_roi_amount,
                    0,
                    'roi_credit'::public.transaction_type, 
                    'completed', 
                    'Daily ROI for ' || r.option_name,
                    v_now
                );
            END IF;
        END LOOP;
        
        UPDATE profiles SET last_roi_credit_at = v_new_credit_at WHERE id = p_user_id;
        
        IF v_total_roi > 0 THEN
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (p_user_id, 'ROI Credited', 'Your daily ROI of ' || ROUND(v_total_roi, 4) || ' USDT has been credited.', 'roi', v_now);
            
            RETURN jsonb_build_object('success', true, 'amount', v_total_roi, 'next_credit_at', v_new_credit_at + INTERVAL '24 hours');
        ELSE
            RETURN jsonb_build_object('success', true, 'amount', 0, 'message', 'ROI processed, no active yield generated');
        END IF;
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Please wait until the next cycle');
    END IF;
END;
$function$;

-- 3. Fix process_refund
CREATE OR REPLACE FUNCTION public.process_refund(p_investment_id uuid, p_admin_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_amount NUMERIC;
BEGIN
  -- Check if investment exists and is active and not refunded
  SELECT user_id, amount INTO v_user_id, v_amount
  FROM user_investment_selections
  WHERE id = p_investment_id AND is_active = true AND is_refunded = false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Investment not found or already processed');
  END IF;

  -- 1. ADD to deposit wallet with explicit cast
  UPDATE wallets 
  SET balance = balance + v_amount,
      updated_at = NOW()
  WHERE user_id = v_user_id AND wallet_type = 'deposit'::public.wallet_type;

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
    'withdrawal'::public.transaction_type, 
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

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'amount', v_amount);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- 4. Fix process_deposit_approval
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
  
  -- 3. Credit wallet with explicit cast
  IF deposit_record.plan_id IS NULL THEN
    UPDATE wallets SET 
      balance = balance + deposit_record.net_amount,
      updated_at = NOW()
    WHERE user_id = deposit_record.user_id AND wallet_type = 'deposit'::public.wallet_type;
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
        WHERE user_id = referral_item.referrer_id AND wallet_type = 'bonus'::public.wallet_type;
        
        INSERT INTO transactions (
          user_id,
          transaction_type,
          amount,
          net_amount,
          status,
          admin_notes
        ) VALUES (
          referral_item.referrer_id,
          'referral_commission'::public.transaction_type,
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
  
  -- 5. Notify user
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (deposit_record.user_id, 'Deposit Approved', 'Your deposit of ' || deposit_record.amount || ' USDT has been approved.', 'deposit');

  -- 6. Auto-invest
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
