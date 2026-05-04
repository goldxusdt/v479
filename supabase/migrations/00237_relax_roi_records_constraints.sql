-- Relax constraints on roi_records to support investment selections that are not tied to a single deposit
ALTER TABLE public.roi_records ALTER COLUMN deposit_id DROP NOT NULL;
ALTER TABLE public.roi_records ALTER COLUMN month_number DROP NOT NULL;

-- Also ensure process_plan_roi_payout is using the correct table schema
CREATE OR REPLACE FUNCTION public.process_plan_roi_payout(p_selection_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_uis_record RECORD;
    v_user_record RECORD;
    v_roi_amount NUMERIC;
    v_now TIMESTAMPTZ := NOW();
    v_last_payout TIMESTAMPTZ;
    v_target_wallet_type TEXT := 'roi';
    v_next_expected_payout TIMESTAMPTZ;
    v_base_interest_rate NUMERIC;
    v_adjusted_interest_rate NUMERIC;
    v_adjustment_record RECORD;
    v_interval INTERVAL;
BEGIN
    -- Get investment selection details with option info
    SELECT uis.*, io.interest_rate, io.option_name, io.roi_payout_frequency
    INTO v_uis_record
    FROM user_investment_selections uis
    JOIN investment_options io ON uis.investment_option_id = io.id
    WHERE uis.id = p_selection_id AND uis.is_active = true AND uis.status = 'active';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Active investment not found or already completed');
    END IF;

    -- Get user profile
    SELECT * INTO v_user_record FROM profiles WHERE id = v_uis_record.user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User profile not found');
    END IF;

    -- Determine interval based on frequency
    CASE LOWER(COALESCE(v_uis_record.roi_payout_frequency, 'daily'))
        WHEN 'daily' THEN v_interval := INTERVAL '24 hours';
        WHEN 'weekly' THEN v_interval := INTERVAL '7 days';
        WHEN 'monthly' THEN v_interval := INTERVAL '30 days';
        ELSE v_interval := INTERVAL '24 hours';
    END CASE;

    -- Payout date calculation
    v_last_payout := COALESCE(v_uis_record.last_roi_payout_at, v_uis_record.selected_at);
    v_next_expected_payout := v_last_payout + v_interval;

    -- Check if payout is due (allow a small 5min buffer for scheduler jitter)
    IF v_now < v_next_expected_payout - INTERVAL '5 minutes' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Payout not due yet', 'next_payout', v_next_expected_payout);
    END IF;

    -- Base interest rate
    v_base_interest_rate := v_uis_record.interest_rate;
    v_adjusted_interest_rate := v_base_interest_rate;

    -- ROI Adjustments
    SELECT percentage INTO v_adjustment_record
    FROM roi_adjustments
    WHERE is_active = true AND target_type = 'all' AND v_now BETWEEN start_date AND end_date
    ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN v_adjusted_interest_rate := v_adjustment_record.percentage; END IF;

    SELECT percentage INTO v_adjustment_record
    FROM roi_adjustments
    WHERE is_active = true AND target_type = 'user' AND target_value = v_user_record.id::text AND v_now BETWEEN start_date AND end_date
    ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN v_adjusted_interest_rate := v_adjustment_record.percentage; END IF;

    -- Use user_group column
    IF v_user_record.user_group IS NOT NULL THEN
        SELECT percentage INTO v_adjustment_record
        FROM roi_adjustments
        WHERE is_active = true AND target_type = 'group' AND target_value = v_user_record.user_group AND v_now BETWEEN start_date AND end_date
        ORDER BY created_at DESC LIMIT 1;
        IF FOUND THEN v_adjusted_interest_rate := v_adjustment_record.percentage; END IF;
    END IF;

    -- Calculate ROI amount
    CASE LOWER(COALESCE(v_uis_record.roi_payout_frequency, 'daily'))
        WHEN 'daily' THEN v_roi_amount := (v_uis_record.amount * (v_adjusted_interest_rate / 100 / 30));
        WHEN 'weekly' THEN v_roi_amount := (v_uis_record.amount * (v_adjusted_interest_rate / 100 / 30 * 7));
        WHEN 'monthly' THEN v_roi_amount := (v_uis_record.amount * (v_adjusted_interest_rate / 100));
        ELSE v_roi_amount := (v_uis_record.amount * (v_adjusted_interest_rate / 100 / 30));
    END CASE;

    IF v_roi_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'ROI amount is zero, check interest rates');
    END IF;

    -- Ensure next payout doesn't fall too far behind
    IF v_now > v_next_expected_payout + v_interval THEN
        v_next_expected_payout := v_now;
    END IF;

    -- Atomic updates
    UPDATE user_investment_selections
    SET total_roi_earned = COALESCE(total_roi_earned, 0) + v_roi_amount,
        last_roi_payout_at = v_next_expected_payout
    WHERE id = p_selection_id;

    -- UPSERT wallet balance with explicit cast
    INSERT INTO wallets (user_id, wallet_type, balance, updated_at)
    VALUES (v_user_record.id, v_target_wallet_type::public.wallet_type, v_roi_amount, v_now)
    ON CONFLICT (user_id, wallet_type) 
    DO UPDATE SET 
        balance = wallets.balance + EXCLUDED.balance,
        updated_at = EXCLUDED.updated_at;

    -- Logs (deposit_id is now nullable)
    INSERT INTO roi_records (user_id, roi_amount, roi_percentage, investment_selection_id, created_at)
    VALUES (v_user_record.id, v_roi_amount, (v_adjusted_interest_rate / 30), p_selection_id, v_now);
    
    INSERT INTO transactions (user_id, amount, net_amount, fee, transaction_type, status, admin_notes, created_at)
    VALUES (v_user_record.id, v_roi_amount, v_roi_amount, 0, 'roi_credit'::public.transaction_type, 'completed', 
            'ROI payout for ' || v_uis_record.option_name || ' (' || v_uis_record.roi_payout_frequency || ')', v_now);

    UPDATE profiles SET last_roi_credit_at = v_now WHERE id = v_user_record.id;

    RETURN jsonb_build_object(
        'success', true, 
        'roi_amount', v_roi_amount, 
        'next_payout', v_next_expected_payout + v_interval
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;
