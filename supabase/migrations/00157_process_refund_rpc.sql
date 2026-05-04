CREATE OR REPLACE FUNCTION process_refund(
  p_investment_id UUID,
  p_admin_id UUID
) RETURNS JSON AS $$
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

  -- 1. Deduct from deposit wallet
  UPDATE wallets 
  SET balance = balance - v_amount,
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
    'withdrawal',
    v_amount,
    v_amount,
    'completed',
    'Plan maturity refund processed by admin',
    NOW(),
    p_admin_id
  );

  -- 4. Notify user (Database notification)
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (v_user_id, 'Withdrawal Complete', 'Your withdrawal of ' || v_amount || ' USDT is complete and your funds have been sent.', 'withdrawal');

  RETURN json_build_object('success', true, 'user_id', v_user_id, 'amount', v_amount);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
