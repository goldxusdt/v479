-- Update roi_records table to link with specific investment selections
ALTER TABLE roi_records ADD COLUMN IF NOT EXISTS investment_selection_id uuid REFERENCES user_investment_selections(id);

-- Create a log table for ROI distribution if not already exists
CREATE TABLE IF NOT EXISTS roi_distribution_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    execution_time timestamp with time zone DEFAULT now(),
    total_records_processed integer DEFAULT 0,
    total_amount_distributed numeric DEFAULT 0,
    status text,
    error_details text
);

-- Re-enable Realtime for key tables (safely)
-- Instead of adding to publication which might fail if already exists, just do individual calls
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'roi_records') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE roi_records;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'roi_distribution_logs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE roi_distribution_logs;
    END IF;
END $$;

-- Create a function to handle daily ROI distribution
CREATE OR REPLACE FUNCTION distribute_daily_roi()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    v_roi_amount numeric;
    v_total_processed integer := 0;
    v_total_amount numeric := 0;
BEGIN
    -- Loop through all active investment selections
    FOR r IN 
        SELECT uis.id, uis.user_id, uis.amount, io.interest_rate
        FROM user_investment_selections uis
        JOIN investment_options io ON uis.investment_option_id = io.id
        WHERE uis.is_active = true
    LOOP
        -- Calculate daily ROI (Interest rate is monthly, divide by 30)
        v_roi_amount := (r.amount * (r.interest_rate / 100 / 30));
        
        -- Insert into roi_records
        INSERT INTO roi_records (user_id, roi_amount, roi_percentage, investment_selection_id)
        VALUES (r.user_id, v_roi_amount, (r.interest_rate / 30), r.id);
        
        -- Update user wallet
        UPDATE wallets 
        SET balance = balance + v_roi_amount,
            updated_at = now()
        WHERE user_id = r.user_id;
        
        -- Record in transactions
        INSERT INTO transactions (user_id, amount, type, status, description)
        VALUES (r.user_id, v_roi_amount, 'roi', 'completed', 'Daily ROI distribution');
        
        v_total_processed := v_total_processed + 1;
        v_total_amount := v_total_amount + v_roi_amount;
    END LOOP;
    
    -- Log the execution
    INSERT INTO roi_distribution_logs (total_records_processed, total_amount_distributed, status)
    VALUES (v_total_processed, v_total_amount, 'success');
    
    RETURN json_build_object(
        'success', true,
        'processed', v_total_processed,
        'total_amount', v_total_amount
    );
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO roi_distribution_logs (status, error_details)
        VALUES ('failed', SQLERRM);
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
