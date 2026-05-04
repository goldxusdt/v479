DROP FUNCTION IF EXISTS distribute_daily_roi();

-- Fix distribute_daily_roi to use correct column names and update last_roi_credit_at
CREATE OR REPLACE FUNCTION distribute_daily_roi()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    v_roi_amount numeric;
    v_total_processed integer := 0;
    v_total_amount numeric := 0;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Loop through all active investment selections
    FOR r IN 
        SELECT uis.id, uis.user_id, uis.amount, io.interest_rate, io.option_name
        FROM user_investment_selections uis
        JOIN investment_options io ON uis.investment_option_id = io.id
        WHERE uis.is_active = true AND uis.status = 'active'
    LOOP
        -- Calculate daily ROI (Interest rate is monthly, divide by 30)
        v_roi_amount := (r.amount * (r.interest_rate / 100 / 30));
        
        IF v_roi_amount > 0 THEN
            -- Insert into roi_records
            INSERT INTO roi_records (user_id, roi_amount, roi_percentage, investment_selection_id, created_at)
            VALUES (r.user_id, v_roi_amount, (r.interest_rate / 30), r.id, v_now);
            
            -- Update user wallet
            UPDATE wallets 
            SET balance = balance + v_roi_amount,
                updated_at = v_now
            WHERE user_id = r.user_id AND wallet_type = 'roi';
            
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
                r.user_id, 
                v_roi_amount, 
                v_roi_amount, 
                0, 
                'roi_credit', 
                'completed', 
                'Daily ROI for ' || r.option_name,
                v_now
            );

            -- Update last_roi_credit_at for the user
            UPDATE profiles SET last_roi_credit_at = v_now WHERE id = r.user_id;
            
            v_total_processed := v_total_processed + 1;
            v_total_amount := v_total_amount + v_roi_amount;
        END IF;
    END LOOP;
    
    -- Log the execution
    BEGIN
        INSERT INTO roi_distribution_logs (total_records_processed, total_amount_distributed, status, created_at)
        VALUES (v_total_processed, v_total_amount, 'success', v_now);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'roi_distribution_logs table might be missing';
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'processed', v_total_processed,
        'total_amount', v_total_amount
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create per-user ROI credit function
CREATE OR REPLACE FUNCTION credit_user_roi(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_credit TIMESTAMPTZ;
    v_roi_amount NUMERIC := 0;
    v_total_roi NUMERIC := 0;
    r RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_new_credit_at TIMESTAMPTZ;
BEGIN
    -- 1. Get last credit time or earliest approved investment
    SELECT last_roi_credit_at INTO v_last_credit
    FROM profiles WHERE id = p_user_id;
    
    IF v_last_credit IS NULL THEN
        SELECT MIN(selected_at) INTO v_last_credit
        FROM user_investment_selections
        WHERE user_id = p_user_id AND status = 'active';
    END IF;

    -- If still null, user has no active investments
    IF v_last_credit IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active investments found');
    END IF;

    -- 2. Check if 24 hours passed
    IF v_now >= v_last_credit + INTERVAL '23 hours 55 minutes' THEN
        v_new_credit_at := v_now; 

        -- 3. Calculate ROI for each active investment
        FOR r IN 
            SELECT uis.id, uis.amount, io.interest_rate, io.option_name
            FROM user_investment_selections uis
            JOIN investment_options io ON uis.investment_option_id = io.id
            WHERE uis.user_id = p_user_id AND uis.is_active = true AND uis.status = 'active'
        LOOP
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
        
        IF v_total_roi > 0 THEN
            -- 4. Update last_roi_credit_at
            UPDATE profiles SET last_roi_credit_at = v_new_credit_at WHERE id = p_user_id;
            
            -- Notify user
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (p_user_id, 'ROI Credited', 'Your daily ROI of ' || v_total_roi || ' USDT has been credited.', 'roi', v_now);
            
            RETURN jsonb_build_object('success', true, 'amount', v_total_roi, 'next_credit_at', v_new_credit_at + INTERVAL '24 hours');
        ELSE
            -- Even if no ROI (e.g. amount is 0), update the timestamp to prevent looping
            UPDATE profiles SET last_roi_credit_at = v_new_credit_at WHERE id = p_user_id;
            RETURN jsonb_build_object('success', true, 'amount', 0, 'message', 'ROI amount was zero');
        END IF;
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Wait 24 hours between credits');
    END IF;
END;
$$;
