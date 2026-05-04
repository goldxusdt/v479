-- Add columns to user_investment_selections
ALTER TABLE user_investment_selections ADD COLUMN IF NOT EXISTS last_roi_payout_at TIMESTAMPTZ;
ALTER TABLE user_investment_selections ADD COLUMN IF NOT EXISTS total_roi_earned NUMERIC DEFAULT 0;

-- Initialize columns for existing active investments
UPDATE user_investment_selections 
SET last_roi_payout_at = selected_at 
WHERE status = 'active' AND last_roi_payout_at IS NULL;

-- RPC to process ROI payout for a specific investment
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
    -- We use a 5-minute margin to account for system execution time drifts
    IF v_now < v_last_payout + INTERVAL '23 hours 55 minutes' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Payout not due yet');
    END IF;

    -- Calculate ROI (Daily ROI is monthly interest rate / 30)
    v_roi_amount := (v_uis_record.amount * (v_uis_record.interest_rate / 100 / 30));

    IF v_roi_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'ROI amount is zero');
    END IF;

    -- Determine target wallet based on compounding preference
    IF v_user_record.is_compounding_enabled THEN
        v_target_wallet_type := 'deposit';
        
        -- Update investment amount if compounding
        UPDATE user_investment_selections
        SET amount = amount + v_roi_amount,
            total_roi_earned = COALESCE(total_roi_earned, 0) + v_roi_amount,
            last_roi_payout_at = v_now
        WHERE id = p_selection_id;
    ELSE
        v_target_wallet_type := 'roi';
        
        -- Just update ROI total and payout date
        UPDATE user_investment_selections
        SET total_roi_earned = COALESCE(total_roi_earned, 0) + v_roi_amount,
            last_roi_payout_at = v_now
        WHERE id = p_selection_id;
    END IF;

    -- Update user wallet
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
        'Daily ROI for ' || v_uis_record.option_name || (CASE WHEN v_user_record.is_compounding_enabled THEN ' (Compounded)' ELSE '' END),
        v_now
    );

    -- Update user-level last_roi_credit_at for backward compatibility
    UPDATE profiles SET last_roi_credit_at = v_now WHERE id = v_user_record.id;

    RETURN jsonb_build_object(
        'success', true, 
        'roi_amount', v_roi_amount, 
        'payout_at', v_now
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redefine distribute_daily_roi to call process_plan_roi_payout
CREATE OR REPLACE FUNCTION distribute_daily_roi()
RETURNS JSONB AS $$
DECLARE
    r RECORD;
    v_total_processed integer := 0;
    v_total_amount numeric := 0;
    v_res JSONB;
BEGIN
    FOR r IN SELECT id FROM user_investment_selections WHERE is_active = true AND status = 'active' LOOP
        v_res := process_plan_roi_payout(r.id);
        IF (v_res->>'success')::boolean THEN
            v_total_processed := v_total_processed + 1;
            v_total_amount := v_total_amount + (v_res->>'roi_amount')::numeric;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'plans_processed', v_total_processed,
        'total_amount', v_total_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
