-- Add custom_roi_percentage to profiles
ALTER TABLE public.profiles ADD COLUMN custom_roi_percentage NUMERIC DEFAULT NULL;

-- Create roi_adjustments table for period-specific ROI
CREATE TABLE public.roi_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    percentage NUMERIC NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Update process_compounding_roi to support custom and adjusted ROI
CREATE OR REPLACE FUNCTION public.process_compounding_roi()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user RECORD;
  v_deposit RECORD;
  v_default_roi_percentage NUMERIC;
  v_active_adjustment_percentage NUMERIC;
  v_current_roi_percentage NUMERIC;
  v_daily_roi_percentage NUMERIC;
  v_roi_amount NUMERIC;
BEGIN
  -- 1. Get default ROI percentage from settings
  SELECT value::NUMERIC INTO v_default_roi_percentage 
  FROM public.settings 
  WHERE key = 'monthly_roi_percentage';
  
  -- 2. Check for active global ROI adjustments for the current date
  SELECT percentage INTO v_active_adjustment_percentage 
  FROM public.roi_adjustments 
  WHERE is_active = true 
    AND now() BETWEEN start_date AND end_date
  ORDER BY created_at DESC
  LIMIT 1;

  -- Loop through all active profiles who haven't been credited today
  FOR v_user IN 
    SELECT id, is_compounding_enabled, custom_roi_percentage 
    FROM public.profiles 
    WHERE is_active = true 
    AND (last_roi_credit_at IS NULL OR last_roi_credit_at < CURRENT_DATE)
  LOOP
    -- Determine the applicable ROI percentage for this user
    -- Priority: User Custom ROI > Active Period Adjustment > Default ROI
    IF v_user.custom_roi_percentage IS NOT NULL THEN
      v_current_roi_percentage := v_user.custom_roi_percentage;
    ELSIF v_active_adjustment_percentage IS NOT NULL THEN
      v_current_roi_percentage := v_active_adjustment_percentage;
    ELSE
      v_current_roi_percentage := v_default_roi_percentage;
    END IF;

    v_daily_roi_percentage := v_current_roi_percentage / 30.0;

    -- Calculate ROI for each active deposit
    FOR v_deposit IN 
      SELECT id, amount 
      FROM public.deposits 
      WHERE user_id = v_user.id AND status = 'approved'
    LOOP
      v_roi_amount := v_deposit.amount * (v_daily_roi_percentage / 100.0);
      
      IF v_roi_amount > 0 THEN
        -- 1. Create ROI transaction record
        INSERT INTO public.transactions (
          user_id, transaction_type, amount, fee, net_amount, status
        ) VALUES (
          v_user.id, 'roi_credit', v_roi_amount, 0, v_roi_amount, 'completed'
        );

        -- 2. Create ROI record
        INSERT INTO public.roi_records (
          user_id, deposit_id, roi_amount, roi_percentage, month_number
        ) VALUES (
          v_user.id, v_deposit.id, v_roi_amount, v_daily_roi_percentage, 1
        );

        -- 3. Update Wallet based on compounding preference
        IF v_user.is_compounding_enabled THEN
          -- Credit to DEPOSIT wallet (reinvestment)
          UPDATE public.wallets 
          SET balance = balance + v_roi_amount, updated_at = now()
          WHERE user_id = v_user.id AND wallet_type = 'deposit';
          
          -- ALSO update the deposit capital so future ROI is higher
          UPDATE public.deposits 
          SET amount = amount + v_roi_amount 
          WHERE id = v_deposit.id;
        ELSE
          -- Credit to ROI wallet (for withdrawal)
          UPDATE public.wallets 
          SET balance = balance + v_roi_amount, updated_at = now()
          WHERE user_id = v_user.id AND wallet_type = 'roi';
        END IF;
      END IF;
    END LOOP;

    -- Update last credit timestamp
    UPDATE public.profiles SET last_roi_credit_at = now() WHERE id = v_user.id;
  END LOOP;
END;
$function$;
