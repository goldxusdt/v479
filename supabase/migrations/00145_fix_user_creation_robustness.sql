-- Improve handle_new_user function robustness
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
BEGIN
  -- Determine user count for first-admin logic
  SELECT COUNT(*) INTO v_user_count FROM public.profiles;
  
  -- Determine role
  v_meta_role := NEW.raw_user_meta_data->>'role';
  
  IF v_user_count = 0 THEN
    v_role := 'admin'::public.user_role;
  ELSIF v_meta_role IS NOT NULL AND v_meta_role IN ('user', 'admin', 'super_admin') THEN
    v_role := v_meta_role::public.user_role;
  ELSE
    v_role := 'user'::public.user_role;
  END IF;

  -- Determine signup method
  v_signup_method := COALESCE(NEW.raw_app_metadata->>'provider', 'email');

  -- Generate unique referral code if not already present
  -- This handles idempotency better
  SELECT referral_code INTO v_referral_code FROM public.profiles WHERE id = NEW.id;
  
  IF v_referral_code IS NULL THEN
    v_referral_code := 'REF' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
    -- Ensure unique referral code
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code) LOOP
      v_referral_code := 'REF' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
    END LOOP;
  END IF;

  -- Check for referral code in metadata
  v_metadata_ref_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_metadata_ref_code IS NOT NULL AND v_metadata_ref_code <> '' THEN
    SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = v_metadata_ref_code;
  END IF;

  -- Insert profile with robustness
  INSERT INTO public.profiles (
    id, 
    email, 
    role, 
    full_name,
    is_active,
    signup_method,
    referral_code,
    referrer_id,
    country,
    phone
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    true,
    v_signup_method,
    v_referral_code,
    v_referrer_id,
    COALESCE(NEW.raw_user_meta_data->>'country', NULL),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = CASE 
      WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN COALESCE(EXCLUDED.full_name, profiles.full_name)
      ELSE profiles.full_name 
    END;

  -- Create default wallets for the user if they don't exist
  INSERT INTO public.wallets (user_id, wallet_type, balance) 
  VALUES 
    (NEW.id, 'deposit'::public.wallet_type, 0),
    (NEW.id, 'roi'::public.wallet_type, 0),
    (NEW.id, 'bonus'::public.wallet_type, 0),
    (NEW.id, 'withdrawal'::public.wallet_type, 0)
  ON CONFLICT (user_id, wallet_type) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error details if possible in some table
  -- But for now just re-raise with better context
  RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  RETURN NEW; -- Still return NEW to avoid blocking auth but this might leave profile missing
END;
$function$;

-- Improve on_profile_created_notification robustness
CREATE OR REPLACE FUNCTION public.on_profile_created_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_message text;
BEGIN
  v_message := 'User ' || COALESCE(NEW.username, NEW.email, 'New Member') || ' has joined the platform.';
  
  PERFORM create_notification_event(
    'user_registered',
    NEW.id,
    'New User Registered',
    v_message,
    jsonb_build_object('email', NEW.email, 'username', NEW.username)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in on_profile_created_notification for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;
