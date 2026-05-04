ALTER TABLE public.profiles ADD COLUMN is_first_admin BOOLEAN DEFAULT FALSE;

-- Update trigger to set this flag
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
  v_meta_role text;
  v_is_first boolean := false;
BEGIN
  -- Count existing profiles to determine if this is the first user
  SELECT COUNT(*) INTO v_user_count FROM public.profiles;
  
  -- Determine if a role was requested via metadata (only possible via admin-invoked edge functions)
  v_meta_role := NEW.raw_user_meta_data->>'role';
  
  -- REQUIREMENT: If zero users exist, assign Admin. Otherwise, default to User.
  IF v_user_count = 0 THEN
    v_role := 'admin'::public.user_role;
    v_is_first := true;
  ELSIF v_meta_role IS NOT NULL AND v_meta_role IN ('user', 'admin', 'super_admin') THEN
    v_role := v_meta_role::public.user_role;
  ELSE
    v_role := 'user'::public.user_role;
  END IF;

  -- Determine signup method
  v_signup_method := COALESCE(NEW.raw_app_metadata->>'provider', 'email');

  -- Generate unique referral code
  SELECT referral_code INTO v_referral_code FROM public.profiles WHERE id = NEW.id;
  
  IF v_referral_code IS NULL THEN
    v_referral_code := 'REF' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code) LOOP
      v_referral_code := 'REF' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
    END LOOP;
  END IF;

  -- Check for referral code in metadata
  v_metadata_ref_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_metadata_ref_code IS NOT NULL AND v_metadata_ref_code <> '' THEN
    SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = v_metadata_ref_code;
  END IF;

  -- Insert or update profile
  INSERT INTO public.profiles (
    id, email, role, full_name, is_active, signup_method, referral_code, referrer_id, country, phone, is_first_admin
  )
  VALUES (
    NEW.id, NEW.email, v_role, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), true, v_signup_method, v_referral_code, v_referrer_id, COALESCE(NEW.raw_user_meta_data->>'country', NULL), COALESCE(NEW.raw_user_meta_data->>'phone', NULL), v_is_first
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = CASE 
      WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN COALESCE(EXCLUDED.full_name, profiles.full_name)
      ELSE profiles.full_name 
    END,
    is_first_admin = EXCLUDED.is_first_admin;

  -- Create default wallets
  INSERT INTO public.wallets (user_id, wallet_type, balance) 
  VALUES 
    (NEW.id, 'deposit'::public.wallet_type, 0),
    (NEW.id, 'roi'::public.wallet_type, 0),
    (NEW.id, 'bonus'::public.wallet_type, 0),
    (NEW.id, 'withdrawal'::public.wallet_type, 0)
  ON CONFLICT (user_id, wallet_type) DO NOTHING;

  -- LOGGING
  INSERT INTO public.activity_logs (user_id, action, description, metadata)
  VALUES (
    NEW.id, 
    'user_created', 
    'User account created and assigned role: ' || v_role, 
    jsonb_build_object(
      'role', v_role, 
      'is_first_user', v_is_first,
      'signup_method', v_signup_method
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;
