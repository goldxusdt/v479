CREATE OR REPLACE FUNCTION public.add_withdrawal_balance(p_user_id uuid, p_amount numeric, p_wallet_type text, p_investment_selection_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF p_investment_selection_id IS NOT NULL THEN
    -- Refund to specific investment
    UPDATE user_investment_selections 
    SET amount = amount + p_amount, 
        is_active = true,
        status = 'active',
        completed_at = NULL
    WHERE id = p_investment_selection_id;
  ELSE
    -- Refund to regular wallet
    UPDATE wallets 
    SET balance = balance + p_amount, updated_at = NOW()
    WHERE user_id = p_user_id AND wallet_type = p_wallet_type::public.wallet_type;
  END IF;
END;
$function$;
