
CREATE OR REPLACE FUNCTION public.update_referrer_performance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_referrer_id uuid;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get the referrer
    SELECT referrer_id INTO v_referrer_id FROM public.profiles WHERE id = NEW.user_id;
    
    IF v_referrer_id IS NOT NULL THEN
        -- Update the referrer's performance
        UPDATE public.profiles
        SET performance_usdt = COALESCE(performance_usdt, 0) + NEW.amount
        WHERE id = v_referrer_id;
        
        -- Check and auto-enable levels for referrer using our consolidated logic
        PERFORM public.check_and_unlock_referral_levels(v_referrer_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
