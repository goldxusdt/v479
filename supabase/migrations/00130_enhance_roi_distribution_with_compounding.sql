CREATE OR REPLACE FUNCTION public.distribute_daily_roi()
RETURNS jsonb AS $$
DECLARE
    v_user_record RECORD;
    r RECORD;
    v_roi_amount numeric;
    v_total_processed_users integer := 0;
    v_total_amount numeric := 0;
    v_now TIMESTAMPTZ := NOW();
    v_last_credit TIMESTAMPTZ;
    v_target_wallet_type TEXT;
BEGIN
    -- Loop through all users who have active investment selections
    FOR v_user_record IN 
        SELECT DISTINCT p.id, p.last_roi_credit_at, p.is_compounding_enabled
        FROM profiles p
        JOIN user_investment_selections uis ON uis.user_id = p.id
        WHERE uis.is_active = true AND uis.status = 'active'
    LOOP
        v_last_credit := v_user_record.last_roi_credit_at;
        
        -- If never credited, find earliest investment
        IF v_last_credit IS NULL THEN
            SELECT MIN(selected_at) INTO v_last_credit
            FROM user_investment_selections
            WHERE user_id = v_user_record.id AND status = 'active';
        END IF;

        -- Only credit if 24 hours passed (with a small 5min margin)
        IF v_last_credit IS NOT NULL AND v_now >= v_last_credit + INTERVAL '23 hours 55 minutes' THEN
            -- Calculate ROI for each active investment of THIS user
            FOR r IN 
                SELECT uis.id, uis.amount, io.interest_rate, io.option_name
                FROM user_investment_selections uis
                JOIN investment_options io ON uis.investment_option_id = io.id
                WHERE uis.user_id = v_user_record.id AND uis.is_active = true AND uis.status = 'active'
            LOOP
                -- Daily ROI is monthly interest rate / 30
                v_roi_amount := (r.amount * (r.interest_rate / 100 / 30));
                
                IF v_roi_amount > 0 THEN
                    -- Determine target wallet based on compounding preference
                    IF v_user_record.is_compounding_enabled THEN
                        v_target_wallet_type := 'deposit';
                        
                        -- If compounding, we also update the investment amount so the next ROI is higher
                        UPDATE user_investment_selections
                        SET amount = amount + v_roi_amount
                        WHERE id = r.id;
                    ELSE
                        v_target_wallet_type := 'roi';
                    END IF;

                    -- Insert into roi_records
                    INSERT INTO roi_records (user_id, roi_amount, roi_percentage, investment_selection_id, created_at)
                    VALUES (v_user_record.id, v_roi_amount, (r.interest_rate / 30), r.id, v_now);
                    
                    -- Update user wallet
                    UPDATE wallets 
                    SET balance = balance + v_roi_amount,
                        updated_at = v_now
                    WHERE user_id = v_user_record.id AND wallet_type = v_target_wallet_type;
                    
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
                        'Daily ROI for ' || r.option_name || (CASE WHEN v_user_record.is_compounding_enabled THEN ' (Compounded)' ELSE '' END),
                        v_now
                    );
                    
                    v_total_amount := v_total_amount + v_roi_amount;
                END IF;
            END LOOP;

            -- Update last_roi_credit_at for the user
            UPDATE profiles SET last_roi_credit_at = v_now WHERE id = v_user_record.id;
            
            -- Notify user
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (v_user_record.id, 'ROI Credited', 'Your daily ROI has been credited' || (CASE WHEN v_user_record.is_compounding_enabled THEN ' and compounded to your capital.' ELSE '.' END), 'roi', v_now);
            
            v_total_processed_users := v_total_processed_users + 1;
        END IF;
    END LOOP;
    
    -- Log the execution
    BEGIN
        INSERT INTO roi_distribution_logs (total_records_processed, total_amount_distributed, status, created_at)
        VALUES (v_total_processed_users, v_total_amount, 'success', v_now);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'users_processed', v_total_processed_users,
        'total_amount', v_total_amount
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
