-- Update process_deposit_approval to use updated referral logic and performance tracking
CREATE OR REPLACE FUNCTION process_deposit_approval(
  deposit_id_param UUID,
  admin_id UUID
)
RETURNS VOID AS $$
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
  
  -- 3. Credit deposit wallet
  UPDATE wallets SET 
    balance = balance + deposit_record.net_amount,
    updated_at = NOW()
  WHERE user_id = deposit_record.user_id AND wallet_type = 'deposit';
  
  -- 4. Update the referrer's performance (Direct referral's deposit)
  UPDATE profiles
  SET performance_usdt = COALESCE(performance_usdt, 0) + deposit_record.amount
  WHERE id = (SELECT referrer_id FROM profiles WHERE id = deposit_record.user_id);
  
  -- 5. Auto-check performance-based levels for the direct referrer
  PERFORM check_and_enable_referral_levels((SELECT referrer_id FROM profiles WHERE id = deposit_record.user_id));
  
  -- 6. Process referral commissions for the chain (up to 15 levels)
  lock_date := NOW() + INTERVAL '30 days';
  
  FOR referral_item IN SELECT * FROM get_referral_chain(deposit_record.user_id) LOOP
    DECLARE
      commission_amt DECIMAL(20, 8);
    BEGIN
      commission_amt := deposit_record.net_amount * referral_item.commission_rate;
      
      IF commission_amt > 0 THEN
        -- Insert commission record
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
        
        -- Credit bonus wallet (locked)
        UPDATE wallets SET 
          balance = balance + commission_amt,
          updated_at = NOW()
        WHERE user_id = referral_item.referrer_id AND wallet_type = 'bonus';
        
        -- Create transaction record for commission
        INSERT INTO transactions (
          user_id,
          transaction_type,
          amount,
          net_amount,
          status,
          admin_notes
        ) VALUES (
          referral_item.referrer_id,
          'referral_bonus',
          commission_amt,
          commission_amt,
          'completed',
          'Referral commission Level ' || referral_item.level
        );
        
        -- Notify referrer
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (referral_item.referrer_id, 'Commission Received', 'You earned ' || commission_amt || ' USDT commission from Level ' || referral_item.level || ' referral.', 'bonus');
      END IF;
    END;
  END LOOP;
  
  -- 7. Notify user
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (deposit_record.user_id, 'Deposit Approved', 'Your deposit of ' || deposit_record.amount || ' USDT has been approved.', 'deposit');
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
