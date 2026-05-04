
DROP FUNCTION IF EXISTS public.process_withdrawal_approval(uuid, uuid, boolean, text);

CREATE OR REPLACE FUNCTION public.process_withdrawal_approval(p_withdrawal_id uuid, p_admin_id uuid, p_approved boolean, p_notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

    -- ADD to withdrawal wallet balance to reflect it on the user/admin side
    UPDATE wallets SET 
      balance = balance + withdrawal_rec.amount,
      updated_at = NOW()
    WHERE user_id = withdrawal_rec.user_id AND wallet_type = 'withdrawal';
    
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
    UPDATE wallets SET 
      balance = balance + withdrawal_rec.amount,
      updated_at = NOW()
    WHERE user_id = withdrawal_rec.user_id AND wallet_type = withdrawal_rec.wallet_type;
    
    -- Log
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (withdrawal_rec.user_id, 'Withdrawal Rejected', 'Your withdrawal request for ' || withdrawal_rec.amount || ' USDT has been rejected. Reason: ' || COALESCE(p_notes, 'None provided'), 'withdrawal');
  END IF;
END;
$$;
