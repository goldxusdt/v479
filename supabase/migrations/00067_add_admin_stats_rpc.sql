CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'totalUsers', (SELECT count(*) FROM profiles),
    'totalDeposits', COALESCE((SELECT sum(amount) FROM deposits WHERE status = 'approved'), 0),
    'totalWithdrawals', COALESCE((SELECT sum(amount) FROM withdrawals WHERE status = 'approved'), 0),
    'totalFees', COALESCE((SELECT sum(fee) FROM deposits WHERE status = 'approved'), 0) + 
                 COALESCE((SELECT sum(fee) FROM withdrawals WHERE status = 'approved'), 0),
    'activeCoupons', (SELECT count(*) FROM coupons WHERE is_active = true),
    'nonKycUsers', (SELECT count(*) FROM profiles WHERE kyc_status = 'not_submitted'),
    'completeKycUsers', (SELECT count(*) FROM profiles WHERE kyc_status = 'approved'),
    'pendingDeposits', (SELECT count(*) FROM deposits WHERE status = 'pending'),
    'pendingWithdrawals', (SELECT count(*) FROM withdrawals WHERE status = 'pending'),
    'pendingKYC', (SELECT count(*) FROM profiles WHERE kyc_status = 'pending')
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$;
