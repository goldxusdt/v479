CREATE OR REPLACE VIEW public.admin_user_summary AS
WITH user_wallets AS (
  SELECT 
    user_id,
    COALESCE(MAX(CASE WHEN wallet_type = 'deposit' THEN balance END), 0) as deposit_balance,
    COALESCE(MAX(CASE WHEN wallet_type = 'roi' THEN balance END), 0) as roi_balance,
    COALESCE(MAX(CASE WHEN wallet_type = 'bonus' THEN balance END), 0) as bonus_balance,
    COALESCE(MAX(CASE WHEN wallet_type = 'withdrawal' THEN balance END), 0) as withdrawal_balance
  FROM public.wallets
  GROUP BY user_id
),
user_fees AS (
  SELECT 
    user_id,
    SUM(fee) as total_fees_paid
  FROM (
    SELECT user_id, fee FROM public.deposits WHERE status = 'approved'
    UNION ALL
    SELECT user_id, fee FROM public.withdrawals WHERE status = 'approved'
  ) combined_fees
  GROUP BY user_id
)
SELECT 
  p.*,
  COALESCE(w.deposit_balance, 0) as deposit,
  COALESCE(w.roi_balance, 0) as roi,
  COALESCE(w.bonus_balance, 0) as bonus,
  COALESCE(w.withdrawal_balance, 0) as withdrawal,
  COALESCE(f.total_fees_paid, 0) as total_fees_paid
FROM public.profiles p
LEFT JOIN user_wallets w ON p.id = w.user_id
LEFT JOIN user_fees f ON p.id = f.user_id;
