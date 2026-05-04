CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_user_count int;
  v_role public.user_role;
  v_signup_method text;
  v_referral_code text;
  v_referrer_id uuid;
  v_metadata_ref_code text;
  v_meta_role text;
  v_is_first boolean := false;
BEGIN
  -- 1. Determine if this is the first user
  -- We check if there are any profiles at all.
  SELECT COUNT(*) INTO v_user_count FROM public.profiles;
  
  -- 2. Determine Role from metadata (raw_user_meta_data)
  v_meta_role := NEW.raw_user_meta_data->>'role';
  
  IF v_user_count = 0 THEN
    v_role := 'admin'::public.user_role;
    v_is_first := true;
  ELSIF v_meta_role IS NOT NULL AND v_meta_role IN ('user', 'admin', 'super_admin') THEN
    v_role := v_meta_role::public.user_role;
  ELSE
    v_role := 'user'::public.user_role;
  END IF;

  -- 3. Determine Signup Method from metadata (raw_app_meta_data)
  v_signup_method := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  -- 4. Handle Referral Code (Generate a new one)
  v_referral_code := 'REF' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code) LOOP
    v_referral_code := 'REF' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
  END LOOP;

  -- 5. Check for referrer (from raw_user_meta_data)
  v_metadata_ref_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_metadata_ref_code IS NOT NULL AND v_metadata_ref_code <> '' THEN
    SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = v_metadata_ref_code;
  END IF;

  -- 6. Insert Profile
  INSERT INTO public.profiles (
    id, email, role, full_name, is_active, signup_method, referral_code, referrer_id, is_first_admin
  )
  VALUES (
    NEW.id, NEW.email, v_role, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), true, v_signup_method, v_referral_code, v_referrer_id, v_is_first
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = CASE 
      WHEN profiles.role = 'admin' THEN profiles.role 
      ELSE EXCLUDED.role 
    END,
    full_name = CASE 
      WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN EXCLUDED.full_name
      ELSE profiles.full_name 
    END,
    is_first_admin = profiles.is_first_admin OR EXCLUDED.is_first_admin;

  -- 7. Create Wallets
  INSERT INTO public.wallets (user_id, wallet_type, balance) 
  VALUES 
    (NEW.id, 'deposit'::public.wallet_type, 0),
    (NEW.id, 'roi'::public.wallet_type, 0),
    (NEW.id, 'bonus'::public.wallet_type, 0),
    (NEW.id, 'withdrawal'::public.wallet_type, 0)
  ON CONFLICT (user_id, wallet_type) DO NOTHING;

  -- 8. Activity Log
  INSERT INTO public.activity_logs (user_id, action, description, metadata)
  VALUES (
    NEW.id, 
    'user_created', 
    'User account created/updated with role: ' || v_role, 
    jsonb_build_object('role', v_role, 'is_first_user', v_is_first)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Re-raise the error so we can see what's wrong if it fails
  RAISE EXCEPTION 'handle_new_user error: %', SQLERRM;
END;
$function$;
