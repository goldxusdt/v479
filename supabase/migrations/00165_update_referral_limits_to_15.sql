-- Update get_downline_network to 15 levels
CREATE OR REPLACE FUNCTION public.get_downline_network(p_user_id uuid, p_max_levels integer DEFAULT 15)
 RETURNS TABLE(user_id uuid, username text, email text, level integer, referrer_id uuid, created_at timestamp with time zone, kyc_status kyc_status, is_active boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH RECURSIVE downline AS (
    -- Initial base case (direct referrals)
    SELECT 
      p.id as user_id, 
      p.username, 
      p.email, 
      1 as level, 
      p.referrer_id, 
      p.created_at, 
      p.kyc_status, 
      p.is_active
    FROM profiles p
    WHERE p.referrer_id = p_user_id
    
    UNION ALL
    
    -- Recursive step
    SELECT 
      p.id, 
      p.username, 
      p.email, 
      d.level + 1, 
      p.referrer_id, 
      p.created_at, 
      p.kyc_status, 
      p.is_active
    FROM profiles p
    INNER JOIN downline d ON p.referrer_id = d.user_id
    WHERE d.level < p_max_levels
  )
  SELECT * FROM downline;
END;
$function$;

-- Update get_downline_summary to 15 levels
CREATE OR REPLACE FUNCTION public.get_downline_summary(target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result JSONB;
BEGIN
  WITH RECURSIVE downline AS (
    -- Anchor: Direct referrals (Level 1)
    SELECT 
      id, 
      referrer_id, 
      full_name,
      kyc_status,
      created_at,
      1 as level
    FROM public.profiles
    WHERE referrer_id = target_user_id

    UNION ALL

    -- Recursive step: referrals of referrals
    SELECT 
      p.id, 
      p.referrer_id, 
      p.full_name,
      p.kyc_status,
      p.created_at,
      d.level + 1
    FROM public.profiles p
    JOIN downline d ON p.referrer_id = d.id
    WHERE d.level < 15
  )
  SELECT jsonb_agg(summary) INTO result
  FROM (
    SELECT 
      level,
      count(*) as member_count,
      count(*) FILTER (WHERE kyc_status = 'approved') as active_count,
      -- Get total deposit volume for this level
      COALESCE((
        SELECT SUM(amount) 
        FROM public.deposits 
        WHERE user_id IN (SELECT id FROM downline d2 WHERE d2.level = downline.level)
        AND status = 'approved'
      ), 0) as total_volume
    FROM downline
    GROUP BY level
    ORDER BY level
  ) summary;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;

-- Update get_referral_commission_stats to 15 levels
CREATE OR REPLACE FUNCTION public.get_referral_commission_stats(p_user_id uuid)
 RETURNS TABLE(level integer, total_commission numeric, member_count integer, commission_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    WHERE d.level < 15
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
$function$;
