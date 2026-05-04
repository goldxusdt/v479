-- 1. Fix Profiles RLS Data Leak
-- Drop the broad public view policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Add secure policy for users to view their own profile
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Ensure admins still have full access (should already exist but let's be sure)
-- DROP POLICY IF EXISTS "Admins have full access" ON profiles; -- Already exists from is_admin()

-- 2. Fix ROI Payout Time Drift
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
    v_target_wallet_type TEXT;
    v_next_expected_payout TIMESTAMPTZ;
BEGIN
    -- Get investment selection details with option info
    SELECT uis.*, io.interest_rate, io.option_name
    INTO v_uis_record
    FROM user_investment_selections uis
    JOIN investment_options io ON uis.investment_option_id = io.id
    WHERE uis.id = p_selection_id AND uis.is_active = true AND uis.status = 'active';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Active investment not found');
    END IF;

    -- Get user profile
    SELECT * INTO v_user_record FROM profiles WHERE id = v_uis_record.user_id;

    -- Payout date is 24 hours after last payout or selection date
    v_last_payout := COALESCE(v_uis_record.last_roi_payout_at, v_uis_record.selected_at);
    v_next_expected_payout := v_last_payout + INTERVAL '24 hours';

    -- Check if payout is due (allow a small 5min buffer for scheduler jitter)
    IF v_now < v_next_expected_payout - INTERVAL '5 minutes' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Payout not due yet');
    END IF;

    -- Calculate ROI (Daily ROI is monthly interest rate / 100 / 30)
    v_roi_amount := (v_uis_record.amount * (v_uis_record.interest_rate / 100 / 30));

    IF v_roi_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'ROI amount is zero');
    END IF;

    -- ROI ALWAYS goes to 'roi' wallet
    v_target_wallet_type := 'roi';
    
    -- Update ROI total and payout date in user_investment_selections
    -- We set last_roi_payout_at to v_next_expected_payout to avoid forward drift
    -- If we are significantly late, we catch up or align to current time
    IF v_now > v_next_expected_payout + INTERVAL '23 hours' THEN
        v_next_expected_payout := v_now;
    END IF;

    UPDATE user_investment_selections
    SET total_roi_earned = COALESCE(total_roi_earned, 0) + v_roi_amount,
        last_roi_payout_at = v_next_expected_payout
    WHERE id = p_selection_id;

    -- Update user wallet (ROI wallet)
    UPDATE wallets 
    SET balance = balance + v_roi_amount,
        updated_at = v_now
    WHERE user_id = v_user_record.id AND wallet_type = v_target_wallet_type;

    -- Insert into roi_records for tracking
    INSERT INTO roi_records (user_id, roi_amount, roi_percentage, investment_selection_id, created_at)
    VALUES (v_user_record.id, v_roi_amount, (v_uis_record.interest_rate / 30), p_selection_id, v_now);
    
    -- Record in transactions
    INSERT INTO transactions (
        user_id, 
        amount, 
        net_amount, 
        fee, 
        transaction_type, 
        status, 
        admin_notes,
        created_at
    ) VALUES (
        v_user_record.id, 
        v_roi_amount, 
        v_roi_amount, 
        0, 
        'roi_credit', 
        'completed', 
        'Daily ROI for ' || v_uis_record.option_name,
        v_now
    );

    -- Update user-level last_roi_credit_at
    UPDATE profiles SET last_roi_credit_at = v_now WHERE id = v_user_record.id;

    RETURN jsonb_build_object(
        'success', true, 
        'roi_amount', v_roi_amount, 
        'payout_at', v_next_expected_payout
    );
END;
$function$;
