-- RPC to bulk sync referral level targets from global settings to all user profiles
CREATE OR REPLACE FUNCTION public.bulk_sync_referral_targets()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_targets jsonb := '{}'::jsonb;
    v_rec record;
    v_updated_count integer := 0;
BEGIN
    -- Check if requester is admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Collect all level targets from the settings table
    -- Levels 5-15 have targets in settings as 'level5_target', 'level6_target', etc.
    FOR v_rec IN 
        SELECT key, value 
        FROM public.settings 
        WHERE key LIKE 'level%_target'
    LOOP
        v_targets := v_targets || jsonb_build_object(v_rec.key, v_rec.value::numeric);
    END LOOP;

    -- Update all profiles with these targets
    UPDATE public.profiles
    SET referral_level_targets = v_targets;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'updated_count', v_updated_count,
        'targets', v_targets
    );
END;
$$;
