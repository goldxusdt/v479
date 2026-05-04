-- Function to check and handle completed investments
CREATE OR REPLACE FUNCTION handle_completed_investments()
RETURNS TABLE (deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    count_deleted INTEGER := 0;
BEGIN
    -- We'll mark them as completed rather than literal hard delete to maintain history
    -- But if the user really wants "auto delete" from active view:
    
    -- Update status to 'completed' and is_active to false for expired investments
    WITH expired_investments AS (
        SELECT uis.id, uis.user_id, uis.amount
        FROM user_investment_selections uis
        JOIN investment_options io ON uis.investment_option_id = io.id
        WHERE uis.is_active = true
          AND uis.status = 'active'
          AND io.duration_days > 0 -- Only plans with duration
          AND NOW() >= (uis.selected_at + (io.duration_days * INTERVAL '1 day') + (io.duration_hours * INTERVAL '1 hour'))
    )
    UPDATE user_investment_selections
    SET 
        is_active = false,
        status = 'completed',
        completed_at = NOW()
    FROM expired_investments
    WHERE user_investment_selections.id = expired_investments.id;

    -- Log the completions (optional notifications could be added here)
    -- For each expired investment, we could notify the user.
    -- For now, let's just return the count of updated rows.
    
    GET DIAGNOSTICS count_deleted = ROW_COUNT;
    RETURN QUERY SELECT count_deleted;
END;
$$;
