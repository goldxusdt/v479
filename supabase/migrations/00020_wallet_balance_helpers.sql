CREATE OR REPLACE FUNCTION deduct_wallet_balance(
  p_user_id UUID,
  p_wallet_type TEXT,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance 
  FROM wallets 
  WHERE user_id = p_user_id AND wallet_type = p_wallet_type::USER_DEFINED;
  
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Deduct
  UPDATE wallets 
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE user_id = p_user_id AND wallet_type = p_wallet_type::USER_DEFINED;
END;
$$;

CREATE OR REPLACE FUNCTION add_wallet_balance(
  p_user_id UUID,
  p_wallet_type TEXT,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE wallets 
  SET balance = balance + p_amount, updated_at = NOW()
  WHERE user_id = p_user_id AND wallet_type = p_wallet_type::USER_DEFINED;
  
  -- If wallet doesn't exist, create it (shouldn't happen for roi/bonus usually but good for safety)
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, wallet_type, balance)
    VALUES (p_user_id, p_wallet_type::USER_DEFINED, p_amount);
  END IF;
END;
$$;
