
CREATE OR REPLACE FUNCTION public.credit_user_roi(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_credit TIMESTAMPTZ;
    v_roi_amount NUMERIC := 0;
    v_total_roi NUMERIC := 0;
    v_deposit_balance NUMERIC := 0;
    r RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_new_credit_at TIMESTAMPTZ;
BEGIN
    -- 1. Check current deposit balance
    -- Requirement: Stop if deposit balance reaches zero
    SELECT balance INTO v_deposit_balance
    FROM wallets 
    WHERE user_id = p_user_id AND wallet_type = 'deposit';

    IF v_deposit_balance IS NULL OR v_deposit_balance <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Zero or negative deposit balance. ROI stopped.');
    END IF;

    -- 2. Get last credit time or earliest approved investment
    SELECT last_roi_credit_at INTO v_last_credit
    FROM profiles WHERE id = p_user_id;
    
    IF v_last_credit IS NULL THEN
        SELECT MIN(approved_at) INTO v_last_credit
        FROM deposits
        WHERE user_id = p_user_id AND status = 'approved';
    END IF;

    -- If still null, user has no active investments
    IF v_last_credit IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active investments found');
    END IF;

    -- 3. Check if enough time passed (Using 23 hours to handle client drift)
    IF v_now >= v_last_credit + INTERVAL '23 hours' THEN
        v_new_credit_at := v_now; 

        -- 4. Calculate ROI for each active investment
        FOR r IN 
            SELECT uis.id, uis.amount, io.interest_rate, io.option_name
            FROM user_investment_selections uis
            JOIN investment_options io ON uis.investment_option_id = io.id
            WHERE uis.user_id = p_user_id AND uis.is_active = true AND uis.status = 'active'
        LOOP
            -- Standard ROI calculation: (amount * monthly_rate / 30 days)
            -- e.g. 10% monthly = 0.33% daily
            v_roi_amount := (r.amount * (r.interest_rate / 100 / 30));
            
            IF v_roi_amount > 0 THEN
                v_total_roi := v_total_roi + v_roi_amount;
                
                -- Credit to ROI wallet
                UPDATE wallets 
                SET balance = balance + v_roi_amount,
                    updated_at = v_now
                WHERE user_id = p_user_id AND wallet_type = 'roi';
                
                -- Insert into roi_records
                INSERT INTO roi_records (user_id, roi_amount, roi_percentage, investment_selection_id, created_at)
                VALUES (p_user_id, v_roi_amount, (r.interest_rate / 30), r.id, v_now);
                
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
                    p_user_id, 
                    v_roi_amount, 
                    v_roi_amount,
                    0,
                    'roi_credit', 
                    'completed', 
                    'Daily ROI for ' || r.option_name,
                    v_now
                );
            END IF;
        END LOOP;
        
        -- Even if v_total_roi is 0, we update last_roi_credit_at if they have active investments
        -- to prevent the timer from being stuck at 0.
        UPDATE profiles SET last_roi_credit_at = v_new_credit_at WHERE id = p_user_id;
        
        IF v_total_roi > 0 THEN
            -- Notify user
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (p_user_id, 'ROI Credited', 'Your daily ROI of ' || ROUND(v_total_roi, 4) || ' USDT has been credited.', 'roi', v_now);
            
            RETURN jsonb_build_object('success', true, 'amount', v_total_roi, 'next_credit_at', v_new_credit_at + INTERVAL '24 hours');
        ELSE
            RETURN jsonb_build_object('success', true, 'amount', 0, 'message', 'ROI processed, no active yield generated');
        END IF;
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Please wait until the next cycle');
    END IF;
END;
$$;
