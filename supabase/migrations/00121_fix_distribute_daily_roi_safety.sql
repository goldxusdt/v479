-- Fix distribute_daily_roi to include safety check for 24h interval
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
    v_last_credit TIMESTAMPTZ;
BEGIN
    -- Loop through all active investment selections
    FOR r IN 
        SELECT uis.id, uis.user_id, uis.amount, io.interest_rate, io.option_name, p.last_roi_credit_at
        FROM user_investment_selections uis
        JOIN investment_options io ON uis.investment_option_id = io.id
        JOIN profiles p ON p.id = uis.user_id
        WHERE uis.is_active = true AND uis.status = 'active'
    LOOP
        v_last_credit := r.last_roi_credit_at;
        
        -- If never credited, use investment selection time
        IF v_last_credit IS NULL THEN
            v_last_credit := r.selected_at;
        END IF;

        -- Only credit if 24 hours passed
        IF v_now >= v_last_credit + INTERVAL '23 hours 55 minutes' THEN
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
        END IF;
    END LOOP;
    
    -- Log the execution
    BEGIN
        INSERT INTO roi_distribution_logs (total_records_processed, total_amount_distributed, status, created_at)
        VALUES (v_total_processed, v_total_amount, 'success', v_now);
    EXCEPTION WHEN OTHERS THEN
        NULL;
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
