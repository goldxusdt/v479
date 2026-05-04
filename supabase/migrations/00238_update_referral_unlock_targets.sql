-- Update the check_and_unlock_referral_levels function to match frontend targets and ensure automatic unlocking
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
    -- Updated volume targets to match frontend (USDT)
    -- L1-4: 0, L5: 10k, L6: 25k, L7: 50k, L8: 75k, L9: 100k, L10: 150k, L11: 200k, L12: 300k, L13: 400k, L14: 500k, L15: 1M
    v_def_vol_targets numeric[] := ARRAY[0,0,0,0, 10000, 25000, 50000, 75000, 100000, 150000, 200000, 300000, 400000, 500000, 1000000];
BEGIN
    -- Get user network stats
    -- Note: We use performance_usdt which is already updated by update_referrer_performance
    SELECT 
        COALESCE(performance_usdt, 0), 
        referral_level_targets 
    INTO v_network_volume, v_targets 
    FROM public.profiles 
    WHERE id = p_user_id;

    -- Check levels 5-15
    FOR i IN 5..15 LOOP
        -- Get volume target (prefer user-specific override if exists)
        v_level_vol_target := COALESCE((v_targets->>('level' || i || '_vol_target'))::numeric, v_def_vol_targets[i]);
        
        -- Unlock if target is met (Volume based)
        IF (v_level_vol_target > 0 AND v_network_volume >= v_level_vol_target) THEN
            EXECUTE format('UPDATE public.profiles SET referral_level_%s_enabled = true WHERE id = %L', i, p_user_id);
        END IF;
    END LOOP;
END;
$function$;

-- Run the unlock check for all users to fix any previously stuck levels
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.profiles WHERE is_active = true LOOP
        PERFORM public.check_and_unlock_referral_levels(r.id);
    END LOOP;
END $$;
