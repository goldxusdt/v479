CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_count int;
  v_role public.user_role;
  v_signup_method text;
  v_referral_code text;
  v_referrer_id uuid;
  v_metadata_ref_code text;
BEGIN
  -- Check how many users already exist in profiles
  SELECT COUNT(*) INTO v_user_count FROM public.profiles;
  
  -- Logic: The very first email ID that registers in the new Supabase project 
  -- must automatically become the Admin.
  -- All other users who register after that must get the User role.
  IF v_user_count = 0 THEN
    v_role := 'admin'::public.user_role;
  ELSE
    v_role := 'user'::public.user_role;
  END IF;

  -- Determine signup method
  v_signup_method := COALESCE(NEW.raw_app_metadata->>'provider', 'email');

  -- Generate unique referral code
  v_referral_code := 'REF' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
  
  -- Ensure unique referral code (rare collision chance)
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code) LOOP
    v_referral_code := 'REF' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
  END LOOP;

  -- Check for referral code in metadata (passed from signup form)
  v_metadata_ref_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_metadata_ref_code IS NOT NULL THEN
    SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = v_metadata_ref_code;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (
    id, 
    email, 
    role, 
    full_name,
    is_active,
    signup_method,
    referral_code,
    referrer_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    true,
    v_signup_method,
    v_referral_code,
    v_referrer_id
  );

  -- Create default wallets for the user
  INSERT INTO public.wallets (user_id, wallet_type, balance) VALUES 
    (NEW.id, 'deposit'::public.wallet_type, 0),
    (NEW.id, 'roi'::public.wallet_type, 0),
    (NEW.id, 'bonus'::public.wallet_type, 0),
    (NEW.id, 'withdrawal'::public.wallet_type, 0);

  RETURN NEW;
END;
$function$;