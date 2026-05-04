CREATE OR REPLACE FUNCTION public.deduct_withdrawal_balance(
    p_user_id uuid,
    p_wallet_type text,
    p_amount numeric,
    p_investment_selection_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_balance NUMERIC;
BEGIN
  IF p_investment_selection_id IS NOT NULL THEN
    -- Deduct from specific investment
    SELECT amount INTO current_balance 
    FROM user_investment_selections 
    WHERE id = p_investment_selection_id AND user_id = p_user_id AND status = 'active';
    
    IF current_balance IS NULL THEN
      RAISE EXCEPTION 'Active investment not found';
    END IF;
    
    IF current_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient balance in investment';
    END IF;
    
    -- Deduct from investment
    UPDATE user_investment_selections 
    SET amount = amount - p_amount, 
        is_active = CASE WHEN (amount - p_amount) > 0 THEN true ELSE false END,
        status = CASE WHEN (amount - p_amount) > 0 THEN 'active' ELSE 'completed' END,
        completed_at = CASE WHEN (amount - p_amount) > 0 THEN NULL ELSE NOW() END
    WHERE id = p_investment_selection_id;
    
  ELSE
    -- Deduct from regular wallet
    SELECT balance INTO current_balance 
    FROM wallets 
    WHERE user_id = p_user_id AND wallet_type = p_wallet_type::public.wallet_type;
    
    IF current_balance IS NULL THEN
      RAISE EXCEPTION 'Wallet not found';
    END IF;
    
    IF current_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient balance in % wallet', p_wallet_type;
    END IF;
    
    -- Deduct from wallet
    UPDATE wallets 
    SET balance = balance - p_amount, updated_at = NOW()
    WHERE user_id = p_user_id AND wallet_type = p_wallet_type::public.wallet_type;
  END IF;
END;
$function$;
