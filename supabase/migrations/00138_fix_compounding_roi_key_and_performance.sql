
CREATE OR REPLACE FUNCTION public.process_compounding_roi()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_default_roi_percentage NUMERIC;
  v_user_roi_pref BOOLEAN;
  v_user_roi_rate NUMERIC;
  v_total_roi DECIMAL(20, 8) := 0;
  investment_rec RECORD;
  v_is_active BOOLEAN;
BEGIN
  -- Get default ROI percentage from settings, checking multiple possible keys
  SELECT value::NUMERIC INTO v_default_roi_percentage 
  FROM public.settings 
  WHERE key = 'monthly_roi' 
     OR key = 'monthly_roi_percentage' 
     OR key = 'daily_roi_percentage' * 30 -- Approximation if needed
  ORDER BY (
    CASE 
      WHEN key = 'monthly_roi' THEN 1
      WHEN key = 'monthly_roi_percentage' THEN 2
      ELSE 3
    END
  ) ASC
  LIMIT 1;

  -- Default to 10 if not found
  IF v_default_roi_percentage IS NULL THEN
    v_default_roi_percentage := 10.0;
  END IF;

  -- Process each user's investment selection
  -- Using a cursor to avoid loading all at once
  FOR investment_rec IN 
    SELECT i.*, p.monthly_roi_percentage as user_rate, p.is_compounding
    FROM public.user_investment_selections i
    JOIN public.profiles p ON i.user_id = p.id
    WHERE i.is_active = true AND i.status = 'active'
  LOOP
    -- Calculate daily ROI (monthly / 30)
    v_user_roi_rate := (COALESCE(investment_rec.user_rate, v_default_roi_percentage) / 100.0) / 30.0;
    v_total_roi := investment_rec.amount * v_user_roi_rate;

    IF v_total_roi > 0 THEN
      -- Create transaction record
      INSERT INTO public.transactions (
        user_id,
        transaction_type,
        amount,
        net_amount,
        status,
        description
      ) VALUES (
        investment_rec.user_id,
        'roi_credit'::public.transaction_type,
        v_total_roi,
        v_total_roi,
        'completed',
        'Daily ROI from plan: ' || COALESCE(investment_rec.investment_option_id::text, 'Active Plan')
      );

      -- Credit wallet based on compounding preference
      IF investment_rec.is_compounding THEN
        -- Compounding: add back to deposit wallet to increase future ROI
        UPDATE public.wallets 
        SET balance = balance + v_total_roi,
            updated_at = NOW()
        WHERE user_id = investment_rec.user_id AND wallet_type = 'deposit';
        
        -- Also update the investment amount itself
        UPDATE public.user_investment_selections
        SET amount = amount + v_total_roi
        WHERE id = investment_rec.id;
      ELSE
        -- Non-compounding: add to ROI wallet for withdrawal
        UPDATE public.wallets 
        SET balance = balance + v_total_roi,
            updated_at = NOW()
        WHERE user_id = investment_rec.user_id AND wallet_type = 'roi';
      END IF;

      -- Log to ROI distribution logs
      INSERT INTO public.roi_distribution_logs (
        user_id,
        amount,
        compounded,
        status
      ) VALUES (
        investment_rec.user_id,
        v_total_roi,
        investment_rec.is_compounding,
        'success'
      );
    END IF;
  END LOOP;
END;
$$;
