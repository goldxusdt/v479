DROP VIEW IF EXISTS admin_user_summary;

CREATE VIEW admin_user_summary AS
SELECT 
    p.*,
    COALESCE((SELECT balance FROM wallets WHERE user_id = p.id AND wallet_type = 'deposit'), 0) as deposit,
    COALESCE((SELECT balance FROM wallets WHERE user_id = p.id AND wallet_type = 'roi'), 0) as roi,
    COALESCE((SELECT balance FROM wallets WHERE user_id = p.id AND wallet_type = 'bonus'), 0) as bonus,
    COALESCE((SELECT balance FROM wallets WHERE user_id = p.id AND wallet_type = 'withdrawal'), 0) as withdrawal,
    COALESCE((SELECT SUM(fee) FROM transactions WHERE user_id = p.id AND status = 'completed'), 0) as total_fees_paid
FROM profiles p;

-- Grant access to the view
GRANT SELECT ON admin_user_summary TO authenticated;
GRANT SELECT ON admin_user_summary TO service_role;
