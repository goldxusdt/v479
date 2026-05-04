-- Add internal_swap to transaction_type enum
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'internal_swap';

-- Function for swapping funds
CREATE OR REPLACE FUNCTION swap_wallet_funds(
  p_source_wallet text,
  p_amount numeric
) RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_source_balance numeric;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  IF p_source_wallet NOT IN ('roi', 'bonus') THEN
    RETURN json_build_object('success', false, 'message', 'Invalid source wallet');
  END IF;

  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Amount must be greater than zero');
  END IF;

  -- Get source balance
  SELECT balance INTO v_source_balance FROM wallets 
  WHERE user_id = v_user_id AND wallet_type::text = p_source_wallet;

  IF v_source_balance IS NULL OR v_source_balance < p_amount THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient balance');
  END IF;

  -- 1. Deduct from source
  UPDATE wallets SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = v_user_id AND wallet_type::text = p_source_wallet;

  -- 2. Add to deposit
  UPDATE wallets SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = v_user_id AND wallet_type = 'deposit';

  -- 3. Record transaction
  INSERT INTO transactions (user_id, transaction_type, amount, net_amount, status, admin_notes)
  VALUES (v_user_id, 'internal_swap', p_amount, p_amount, 'completed', 'Internal swap from ' || p_source_wallet || ' to deposit wallet');

  RETURN json_build_object('success', true, 'message', 'Funds swapped successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for deleting investment plan (user investment selection)
CREATE OR REPLACE FUNCTION delete_user_investment_selection(
  p_investment_id uuid
) RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_investment record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  SELECT * INTO v_investment FROM user_investment_selections 
  WHERE id = p_investment_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Investment not found');
  END IF;

  IF v_investment.is_active = true THEN
    RETURN json_build_object('success', false, 'message', 'Cannot delete active investments');
  END IF;

  -- Transfer leftover funds if not already refunded
  IF v_investment.is_refunded = false THEN
    UPDATE wallets SET balance = balance + v_investment.amount, updated_at = now()
    WHERE user_id = v_user_id AND wallet_type = 'deposit';

    INSERT INTO transactions (user_id, transaction_type, amount, net_amount, status, admin_notes)
    VALUES (v_user_id, 'refund', v_investment.amount, v_investment.amount, 'completed', 'Leftover funds from deleted investment ' || p_investment_id);
  END IF;

  -- Hard delete the record
  DELETE FROM user_investment_selections WHERE id = p_investment_id;

  RETURN json_build_object('success', true, 'message', 'Investment deleted and funds transferred to deposit wallet');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
