-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_downline_network(uuid, integer);
DROP FUNCTION IF EXISTS public.get_referral_commission_stats(uuid);

-- Now recreate them
CREATE OR REPLACE FUNCTION public.get_downline_network(p_user_id uuid, p_max_levels integer DEFAULT 15)
 RETURNS TABLE(user_id uuid, username text, email text, level integer, referrer_id uuid, created_at timestamp with time zone, kyc_status text, is_active boolean)
 LANGUAGE plpgsql
 STABLE
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
    FROM public.profiles p
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
    FROM public.profiles p
    INNER JOIN downline d ON p.referrer_id = d.user_id
    WHERE d.level < p_max_levels
  )
  SELECT * FROM downline;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_referral_commission_stats(p_user_id uuid)
 RETURNS TABLE(level integer, total_commission numeric, member_count integer, commission_rate numeric)
 LANGUAGE plpgsql
 STABLE
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
      COALESCE(SUM(rc.commission_amount), 0)::numeric as total_commission,
      COUNT(DISTINCT d.id)::integer as member_count
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
       FROM public.settings 
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
    )::numeric as commission_rate
  FROM stats s
  ORDER BY s.level ASC;
END;
$function$;

-- Implementation of Referral Level Unlocking (already planned)
CREATE OR REPLACE FUNCTION public.check_and_unlock_referral_levels(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_invested numeric;
    v_targets jsonb;
    v_level_target numeric;
BEGIN
    -- Get user total active investment
    SELECT COALESCE(SUM(amount), 0) INTO v_total_invested 
    FROM public.user_investment_selections 
    WHERE user_id = p_user_id AND status = 'active';

    -- Get targets
    SELECT referral_level_targets INTO v_targets 
    FROM public.profiles 
    WHERE id = p_user_id;

    IF v_targets IS NULL THEN
        RETURN;
    END IF;

    -- Check levels 5-15
    FOR i IN 5..15 LOOP
        v_level_target := COALESCE((v_targets->>('level' || i || '_target'))::numeric, 0);
        
        IF v_level_target > 0 AND v_total_invested >= v_level_target THEN
            EXECUTE format('UPDATE public.profiles SET referral_level_%s_enabled = true WHERE id = %L', i, p_user_id);
        END IF;
    END LOOP;
END;
$$;

-- Triggers for unlocking
CREATE OR REPLACE FUNCTION public.tr_check_referral_unlock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.check_and_unlock_referral_levels(NEW.user_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_investment_check_unlock ON public.user_investment_selections;
CREATE TRIGGER on_investment_check_unlock
AFTER INSERT OR UPDATE ON public.user_investment_selections
FOR EACH ROW EXECUTE FUNCTION public.tr_check_referral_unlock();

CREATE OR REPLACE FUNCTION public.tr_check_referral_unlock_on_new_ref()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.referrer_id IS NOT NULL THEN
        PERFORM public.check_and_unlock_referral_levels(NEW.referrer_id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_referral_check_unlock ON public.profiles;
CREATE TRIGGER on_new_referral_check_unlock
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tr_check_referral_unlock_on_new_ref();
