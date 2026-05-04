CREATE OR REPLACE VIEW admin_user_summary AS
SELECT 
    p.*,
    COALESCE((SELECT balance FROM wallets WHERE user_id = p.id AND wallet_type = 'deposit'), 0) as deposit_balance,
    COALESCE((SELECT balance FROM wallets WHERE user_id = p.id AND wallet_type = 'roi'), 0) as roi_balance,
    COALESCE((SELECT balance FROM wallets WHERE user_id = p.id AND wallet_type = 'bonus'), 0) as bonus_balance,
    COALESCE((SELECT balance FROM wallets WHERE user_id = p.id AND wallet_type = 'withdrawal'), 0) as withdrawal_balance
FROM profiles p;

-- Grant access to the view
GRANT SELECT ON admin_user_summary TO authenticated;
GRANT SELECT ON admin_user_summary TO service_role;
