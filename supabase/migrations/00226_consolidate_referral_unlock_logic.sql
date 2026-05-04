
-- Consolidate referral level unlocking logic
CREATE OR REPLACE FUNCTION public.check_and_unlock_referral_levels(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_network_volume numeric;
    v_referral_count integer;
    v_targets jsonb;
    v_level_vol_target numeric;
    v_level_count_target integer;
    -- Default volume targets (USDT)
    v_def_vol_targets numeric[] := ARRAY[0,0,0,0, 10000, 25000, 50000, 100000, 200000, 400000, 800000, 1600000, 3200000, 6400000, 12800000];
    -- Default referral count targets (Active direct referrals)
    v_def_count_targets integer[] := ARRAY[0,0,0,0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 100];
BEGIN
    -- Get user network stats
    SELECT 
        COALESCE(performance_usdt, 0), 
        (SELECT COUNT(*) FROM public.profiles WHERE referrer_id = p_user_id),
        referral_level_targets 
    INTO v_network_volume, v_referral_count, v_targets 
    FROM public.profiles 
    WHERE id = p_user_id;

    -- Check levels 5-15
    FOR i IN 5..15 LOOP
        -- Get volume target
        v_level_vol_target := COALESCE((v_targets->>('level' || i || '_vol_target'))::numeric, v_def_vol_targets[i]);
        -- Get count target
        v_level_count_target := COALESCE((v_targets->>('level' || i || '_count_target'))::integer, v_def_count_targets[i]);
        
        -- Unlock if EITHER target is met
        IF (v_level_vol_target > 0 AND v_network_volume >= v_level_vol_target) OR
           (v_level_count_target > 0 AND v_referral_count >= v_level_count_target) THEN
            EXECUTE format('UPDATE public.profiles SET referral_level_%s_enabled = true WHERE id = %L', i, p_user_id);
        END IF;
    END LOOP;
END;
$function$;

-- Update the trigger function to call our consolidated logic
CREATE OR REPLACE FUNCTION public.tr_check_referral_unlock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- After an investment is made/updated, check referrers up the chain
    -- But performance_usdt is already updated by update_referrer_performance
    -- So we just need to make sure the referrer of the user who invested is checked
    PERFORM public.check_and_unlock_referral_levels(
        (SELECT referrer_id FROM public.profiles WHERE id = NEW.user_id)
    );
    RETURN NEW;
END;
$function$;
