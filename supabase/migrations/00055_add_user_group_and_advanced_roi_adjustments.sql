-- 1. Add user_group column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_group text DEFAULT 'standard';

-- 2. Add target fields to roi_adjustments
ALTER TABLE public.roi_adjustments ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'all'; -- 'all', 'user', 'group'
ALTER TABLE public.roi_adjustments ADD COLUMN IF NOT EXISTS target_value text; -- user_id (uuid) or group name (text)

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_group ON public.profiles(user_group);
CREATE INDEX IF NOT EXISTS idx_roi_adjustments_dates ON public.roi_adjustments(start_date, end_date);

-- 4. Update ROI process function to support advanced targeting
CREATE OR REPLACE FUNCTION public.process_compounding_roi()
RETURNS void AS $$
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
  
  -- Loop through all active profiles who haven't been credited today
  FOR v_user IN 
    SELECT id, is_compounding_enabled, custom_roi_percentage, user_group 
    FROM public.profiles 
    WHERE is_active = true 
    AND (last_roi_credit_at IS NULL OR last_roi_credit_at < CURRENT_DATE)
  LOOP
    -- Determine the applicable ROI percentage for this user
    -- Priority 1: User Custom ROI (explicitly set on profile)
    IF v_user.custom_roi_percentage IS NOT NULL THEN
      v_current_roi_percentage := v_user.custom_roi_percentage;
    ELSE
      -- Priority 2: Most recent active adjustment (Target User > Target Group > Target All)
      SELECT percentage INTO v_active_adjustment_percentage 
      FROM public.roi_adjustments 
      WHERE is_active = true 
        AND now() BETWEEN start_date AND end_date
        AND (
          (target_type = 'user' AND target_value = v_user.id::text) OR
          (target_type = 'group' AND target_value = v_user.user_group) OR
          (target_type = 'all')
        )
      ORDER BY 
        CASE target_type 
          WHEN 'user' THEN 1 
          WHEN 'group' THEN 2 
          WHEN 'all' THEN 3 
        END ASC, 
        created_at DESC
      LIMIT 1;

      IF v_active_adjustment_percentage IS NOT NULL THEN
        v_current_roi_percentage := v_active_adjustment_percentage;
      ELSE
        -- Priority 3: Default Global Setting
        v_current_roi_percentage := v_default_roi_percentage;
      END IF;
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
          user_id, transaction_type, amount, fee, net_amount, status, admin_notes
        ) VALUES (
          v_user.id, 'roi_credit', v_roi_amount, 0, v_roi_amount, 'completed', 
          'ROI Credit: ' || ROUND(v_current_roi_percentage, 2) || '% monthly (' || ROUND(v_daily_roi_percentage, 4) || '% daily)'
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
