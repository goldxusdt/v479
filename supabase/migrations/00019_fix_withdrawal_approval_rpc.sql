-- Drop old function
DROP FUNCTION IF EXISTS process_withdrawal_approval(uuid, uuid);

-- New robust function
CREATE OR REPLACE FUNCTION process_withdrawal_approval(
  p_withdrawal_id UUID,
  p_admin_id UUID,
  p_approved BOOLEAN,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  withdrawal_rec RECORD;
  v_wallet_type TEXT;
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

    -- Note: Balance was already deducted from source wallet when request was created?
    -- No, usually it's deducted on approval OR held in a separate state.
    -- Let's check how createWithdrawal works.
    
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

    -- REFUND the user's balance
    v_wallet_type := CASE WHEN withdrawal_rec.is_referral_bonus THEN 'bonus' ELSE 'roi' END;
    
    UPDATE wallets SET 
      balance = balance + withdrawal_rec.amount,
      updated_at = NOW()
    WHERE user_id = withdrawal_rec.user_id AND wallet_type = v_wallet_type::USER_DEFINED;
    
    -- Log
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (withdrawal_rec.user_id, 'Withdrawal Rejected', 'Your withdrawal request for ' || withdrawal_rec.amount || ' USDT has been rejected. Reason: ' || COALESCE(p_notes, 'None provided'), 'withdrawal');
  END IF;
END;
$$;
