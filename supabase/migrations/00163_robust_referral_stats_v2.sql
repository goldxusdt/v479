CREATE OR REPLACE FUNCTION get_referral_commission_stats(p_user_id UUID)
RETURNS TABLE (
  level INTEGER,
  total_commission DECIMAL(20, 8),
  member_count INTEGER,
  commission_rate DECIMAL(20, 8)
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE downline AS (
    -- Initial base case
    SELECT p.id, 1 as level
    FROM profiles p
    WHERE p.referrer_id = p_user_id
    
    UNION ALL
    
    -- Recursive step
    SELECT p.id, d.level + 1
    FROM profiles p
    INNER JOIN downline d ON p.referrer_id = d.id
    WHERE d.level < 50
  ),
  stats AS (
    SELECT 
      d.level,
      COALESCE(SUM(rc.commission_amount), 0) as total_commission,
      COUNT(DISTINCT d.id) as member_count
    FROM downline d
    LEFT JOIN referral_commissions rc ON rc.referred_user_id = d.id AND rc.referrer_id = p_user_id AND rc.level = d.level
    GROUP BY d.level
  )
  SELECT 
    s.level,
    s.total_commission,
    s.member_count,
    COALESCE(
      (SELECT (COALESCE(value, '0')::DECIMAL / 100.0)
       FROM settings 
       WHERE key = 'level' || s.level || '_commission'
          OR key = 'referral_level' || s.level || '_commission'
          OR key = 'referral_level' || s.level || '_percentage'
       ORDER BY (
         CASE 
           WHEN key = 'level' || s.level || '_commission' THEN 1
           WHEN key = 'referral_level' || s.level || '_commission' THEN 2
           ELSE 3
         END
       ) ASC
       LIMIT 1),
       0.001 -- Default 0.1% if not set for deep levels
    ) as commission_rate
  FROM stats s
  ORDER BY s.level ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
