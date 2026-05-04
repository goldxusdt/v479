
CREATE OR REPLACE FUNCTION get_admin_analytics()
RETURNS JSON AS $$
DECLARE
    v_plan_performance JSON;
    v_daily_trends JSON;
    v_total_stats JSON;
BEGIN
    -- 1. Plan Performance
    SELECT json_agg(t) INTO v_plan_performance
    FROM (
        SELECT 
            io.id,
            io.option_name,
            COALESCE(SUM(uis.amount), 0) as total_invested,
            COALESCE(SUM(CASE WHEN uis.status = 'active' THEN uis.amount ELSE 0 END), 0) as active_invested,
            COALESCE((
                SELECT SUM(roi_amount) 
                FROM roi_records 
                WHERE investment_selection_id IN (
                    SELECT id FROM user_investment_selections WHERE investment_option_id = io.id
                )
            ), 0) as total_roi_paid,
            COUNT(DISTINCT CASE WHEN uis.status = 'active' THEN uis.user_id END) as active_users,
            COALESCE(SUM(CASE WHEN uis.status = 'active' THEN uis.amount * (io.interest_rate / 100) ELSE 0 END), 0) as projected_monthly_payout
        FROM investment_options io
        LEFT JOIN user_investment_selections uis ON io.id = uis.investment_option_id
        GROUP BY io.id, io.option_name
    ) t;

    -- 2. Daily Trends (Last 30 days)
    SELECT json_agg(t) INTO v_daily_trends
    FROM (
        SELECT 
            d.date::date as date,
            COALESCE(SUM(uis.amount), 0) as daily_volume,
            COALESCE((
                SELECT SUM(roi_amount) 
                FROM roi_records 
                WHERE created_at::date = d.date::date
            ), 0) as daily_roi_paid,
            (SELECT COUNT(*) FROM profiles WHERE created_at::date = d.date::date) as new_users
        FROM generate_series(
            current_date - interval '29 days',
            current_date,
            interval '1 day'
        ) d(date)
        LEFT JOIN user_investment_selections uis ON uis.selected_at::date = d.date::date
        GROUP BY d.date
        ORDER BY d.date ASC
    ) t;

    -- 3. Total Stats
    SELECT json_build_object(
        'total_active_volume', COALESCE(SUM(amount), 0),
        'total_projected_monthly', (
            SELECT SUM(uis.amount * (io.interest_rate / 100))
            FROM user_investment_selections uis
            JOIN investment_options io ON uis.investment_option_id = io.id
            WHERE uis.status = 'active'
        )
    ) INTO v_total_stats
    FROM user_investment_selections
    WHERE status = 'active';

    RETURN json_build_object(
        'plan_performance', COALESCE(v_plan_performance, '[]'::json),
        'daily_trends', COALESCE(v_daily_trends, '[]'::json),
        'total_stats', v_total_stats
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
