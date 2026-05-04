-- Update process_plan_roi_payout to remove compounding logic
CREATE OR REPLACE FUNCTION process_plan_roi_payout(p_selection_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_uis_record RECORD;
    v_user_record RECORD;
    v_roi_amount NUMERIC;
    v_now TIMESTAMPTZ := NOW();
    v_last_payout TIMESTAMPTZ;
    v_target_wallet_type TEXT;
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

    -- Check if payout is due (daily = 24 hours)
    IF v_now < v_last_payout + INTERVAL '23 hours 55 minutes' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Payout not due yet');
    END IF;

    -- Calculate ROI (Daily ROI is monthly interest rate / 30)
    -- WE USE THE ORIGINAL AMOUNT (uis.amount) - NO COMPOUNDING
    v_roi_amount := (v_uis_record.amount * (v_uis_record.interest_rate / 100 / 30));

    IF v_roi_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'ROI amount is zero');
    END IF;

    -- ROI ALWAYS goes to 'roi' wallet now
    v_target_wallet_type := 'roi';
    
    -- Just update ROI total and payout date in user_investment_selections
    UPDATE user_investment_selections
    SET total_roi_earned = COALESCE(total_roi_earned, 0) + v_roi_amount,
        last_roi_payout_at = v_now
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
        'payout_at', v_now
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove compounding logic from distribute_daily_roi (if any remains)
-- Actually distribute_daily_roi calls process_plan_roi_payout, so it's already updated.

-- Drop the compounding RPC if it exists
DROP FUNCTION IF EXISTS process_compounding_roi();

-- Remove the compounding column from profiles (optional, but requested by PRD)
-- ALTER TABLE profiles DROP COLUMN IF EXISTS is_compounding_enabled;
-- We'll just leave it but ignore it in UI.
