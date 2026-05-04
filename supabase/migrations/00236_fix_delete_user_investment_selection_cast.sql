CREATE OR REPLACE FUNCTION public.delete_user_investment_selection(p_investment_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

  -- Transfer funds if not already refunded and amount is positive
  IF v_investment.is_refunded = false AND v_investment.amount > 0 THEN
    -- Update deposit wallet with explicit cast
    UPDATE wallets SET balance = balance + v_investment.amount, updated_at = now()
    WHERE user_id = v_user_id AND wallet_type = 'deposit'::public.wallet_type;

    -- Record transaction
    INSERT INTO transactions (user_id, transaction_type, amount, net_amount, status, admin_notes)
    VALUES (v_user_id, 'refund'::public.transaction_type, v_investment.amount, v_investment.amount, 'completed', 'Refund from deleted investment ' || p_investment_id);
  END IF;

  -- Hard delete the record
  DELETE FROM user_investment_selections WHERE id = p_investment_id;

  RETURN json_build_object('success', true, 'message', 'Investment deleted and funds transferred to deposit wallet');
END;
$function$;
