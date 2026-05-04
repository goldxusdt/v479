CREATE OR REPLACE FUNCTION public.swap_wallet_funds(p_source_wallet text, p_amount numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

  -- Get source balance with explicit cast
  SELECT balance INTO v_source_balance FROM wallets 
  WHERE user_id = v_user_id AND wallet_type = p_source_wallet::public.wallet_type;

  IF v_source_balance IS NULL OR v_source_balance < p_amount THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient balance');
  END IF;

  -- 1. Deduct from source
  UPDATE wallets SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = v_user_id AND wallet_type = p_source_wallet::public.wallet_type;

  -- 2. Add to deposit
  UPDATE wallets SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = v_user_id AND wallet_type = 'deposit'::public.wallet_type;

  -- 3. Record transaction
  INSERT INTO transactions (user_id, transaction_type, amount, net_amount, status, admin_notes)
  VALUES (v_user_id, 'internal_swap', p_amount, p_amount, 'completed', 'Internal swap from ' || p_source_wallet || ' to deposit wallet');

  RETURN json_build_object('success', true, 'message', 'Funds swapped successfully');
END;
$function$;
