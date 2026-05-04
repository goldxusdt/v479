
CREATE OR REPLACE FUNCTION public.check_and_unlock_referral_levels(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_network_volume numeric;
    v_targets jsonb;
    v_level_target numeric;
    v_default_targets numeric[] := ARRAY[0,0,0,0,10000, 25000, 50000, 100000, 200000, 400000, 800000, 1600000, 3200000, 6400000, 12800000];
BEGIN
    -- Get user network performance volume
    SELECT COALESCE(performance_usdt, 0), referral_level_targets 
    INTO v_network_volume, v_targets 
    FROM public.profiles 
    WHERE id = p_user_id;

    -- Check levels 5-15
    FOR i IN 5..15 LOOP
        -- Get target from custom profile targets or fallback to defaults
        v_level_target := COALESCE((v_targets->>('level' || i || '_target'))::numeric, v_default_targets[i]);
        
        IF v_level_target > 0 AND v_network_volume >= v_level_target THEN
            EXECUTE format('UPDATE public.profiles SET referral_level_%s_enabled = true WHERE id = %L', i, p_user_id);
        END IF;
    END LOOP;
END;
$function$;
