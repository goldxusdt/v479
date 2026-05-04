
-- Fix the USER_DEFINED error in functions
CREATE OR REPLACE FUNCTION public.add_wallet_balance(p_user_id uuid, p_wallet_type text, p_amount numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  UPDATE wallets 
  SET balance = balance + p_amount, updated_at = NOW()
  WHERE user_id = p_user_id AND wallet_type = p_wallet_type::public.wallet_type;
  
  -- If wallet doesn't exist, create it (shouldn't happen for roi/bonus usually but good for safety)
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, wallet_type, balance)
    VALUES (p_user_id, p_wallet_type::public.wallet_type, p_amount);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(p_user_id uuid, p_wallet_type text, p_amount numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance 
  FROM wallets 
  WHERE user_id = p_user_id AND wallet_type = p_wallet_type::public.wallet_type;
  
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Deduct
  UPDATE wallets 
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE user_id = p_user_id AND wallet_type = p_wallet_type::public.wallet_type;
END;
$$;

-- Add missing columns to withdrawals
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS wallet_type public.wallet_type;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS investment_selection_id uuid REFERENCES public.user_investment_selections(id);

-- Update existing records if needed
UPDATE public.withdrawals 
SET wallet_type = CASE WHEN is_referral_bonus THEN 'bonus'::public.wallet_type ELSE 'roi'::public.wallet_type END
WHERE wallet_type IS NULL;

-- Update process_withdrawal_approval to handle investment selections
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

    -- If withdrawal was from a specific investment selection, reduce its amount
    IF withdrawal_rec.investment_selection_id IS NOT NULL THEN
      UPDATE user_investment_selections
      SET amount = amount - withdrawal_rec.amount
      WHERE id = withdrawal_rec.investment_selection_id;
      
      -- If amount becomes 0, mark as completed or inactive?
      -- Requirement: "automatically reduce the withdrawal amount from the specific selected plan's balance AND the main deposit wallet"
      -- The deduct_wallet_balance already happened during creation of withdrawal (pending status).
      -- Wait, usually we deduct balance when user submits the request. 
      -- If approved, we don't need to deduct again from wallet.
    END IF;

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
