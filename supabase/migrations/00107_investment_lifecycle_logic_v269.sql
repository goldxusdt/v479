CREATE OR REPLACE FUNCTION process_completed_investments()
RETURNS void AS $$
DECLARE
    selection_record RECORD;
BEGIN
    -- Find active investments that have exceeded their duration
    FOR selection_record IN 
        SELECT uis.id, uis.user_id, uis.amount, io.option_name, uis.selected_at, io.duration_days, io.duration_hours
        FROM user_investment_selections uis
        JOIN investment_options io ON uis.investment_option_id = io.id
        WHERE uis.status = 'active'
        AND (io.duration_days > 0 OR io.duration_hours > 0) -- Ignore indefinite
        AND (uis.selected_at + (io.duration_days * interval '1 day') + (io.duration_hours * interval '1 hour')) <= now()
    LOOP
        -- 1. Mark as completed
        UPDATE user_investment_selections 
        SET status = 'completed', 
            is_active = false, 
            completed_at = now() 
        WHERE id = selection_record.id;
        
        -- 2. Log activity
        INSERT INTO activity_logs (user_id, action, description, created_at)
        VALUES (selection_record.user_id, 'investment_completed', 'Investment plan ' || selection_record.option_name || ' of ' || selection_record.amount || ' USDT has completed its duration.', now());
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
