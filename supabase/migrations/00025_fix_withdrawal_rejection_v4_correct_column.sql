-- Update process_withdrawal_approval to allow rejecting approved withdrawals
CREATE OR REPLACE FUNCTION public.process_withdrawal_approval(
  p_withdrawal_id UUID,
  p_admin_id UUID,
  p_approved BOOLEAN,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  withdrawal_rec RECORD;
  v_wallet_type TEXT;
  v_old_status TEXT;
BEGIN
  -- Get withdrawal details
  SELECT * INTO withdrawal_rec FROM withdrawals WHERE id = p_withdrawal_id;
  
  IF withdrawal_rec IS NULL THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;
  
  v_old_status := withdrawal_rec.status;

  IF p_approved THEN
    -- If already approved, do nothing
    IF v_old_status = 'approved' THEN
      RETURN;
    END IF;

    -- If it was rejected before, we need to deduct balance again because it was refunded on rejection
    IF v_old_status = 'rejected' THEN
      v_wallet_type := CASE WHEN withdrawal_rec.is_referral_bonus THEN 'bonus' ELSE 'roi' END;
      
      -- Check balance first
      IF NOT EXISTS (
        SELECT 1 FROM wallets 
        WHERE user_id = withdrawal_rec.user_id 
        AND wallet_type = v_wallet_type::USER_DEFINED 
        AND balance >= withdrawal_rec.amount
      ) THEN
        RAISE EXCEPTION 'User has insufficient balance to re-approve this withdrawal';
      END IF;

      UPDATE wallets SET 
        balance = balance - withdrawal_rec.amount,
        updated_at = NOW()
      WHERE user_id = withdrawal_rec.user_id AND wallet_type = v_wallet_type::USER_DEFINED;
    END IF;

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

    INSERT INTO notifications (user_id, title, message, type)
    VALUES (withdrawal_rec.user_id, 'Withdrawal Approved', 'Your withdrawal request for ' || withdrawal_rec.amount || ' USDT has been approved.', 'withdrawal');
  ELSE
    -- Reject logic
    -- If already rejected, do nothing
    IF v_old_status = 'rejected' THEN
      RETURN;
    END IF;

    -- Update status
    UPDATE withdrawals SET 
      status = 'rejected'
    WHERE id = p_withdrawal_id;
    
    UPDATE transactions SET 
      status = 'rejected',
      admin_notes = p_notes
    WHERE id = withdrawal_rec.transaction_id;

    -- REFUND the user's balance
    v_wallet_type := CASE WHEN withdrawal_rec.is_referral_bonus THEN 'bonus' ELSE 'roi' END;
    
    UPDATE wallets SET 
      balance = balance + withdrawal_rec.amount,
      updated_at = NOW()
    WHERE user_id = withdrawal_rec.user_id AND wallet_type = v_wallet_type::USER_DEFINED;
    
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (withdrawal_rec.user_id, 'Withdrawal Rejected', 'Your withdrawal request for ' || withdrawal_rec.amount || ' USDT has been rejected. Reason: ' || COALESCE(p_notes, 'None provided'), 'withdrawal');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the view for referral stats to include total deposit per level
CREATE OR REPLACE VIEW user_referral_level_stats AS
WITH RECURSIVE referral_tree AS (
  -- Level 1
  SELECT 
    referrer_id,
    id AS referred_id,
    1 AS level
  FROM profiles
  WHERE referrer_id IS NOT NULL
  
  UNION ALL
  
  -- Levels 2 to 15
  SELECT 
    t.referrer_id,
    p.id AS referred_id,
    t.level + 1
  FROM referral_tree t
  JOIN profiles p ON p.referrer_id = t.referred_id
  WHERE t.level < 15
)
SELECT 
  rt.referrer_id AS user_id,
  rt.level,
  COUNT(rt.referred_id) AS user_count,
  COALESCE(SUM(w.balance), 0) AS total_deposit_balance
FROM referral_tree rt
LEFT JOIN wallets w ON w.user_id = rt.referred_id AND w.wallet_type = 'deposit'
GROUP BY rt.referrer_id, rt.level;
