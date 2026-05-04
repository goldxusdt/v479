-- Robust handle_new_user function with better error handling and schema qualification
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_count int;
  v_referral_code text;
  v_full_name text;
  v_role public.user_role;
  v_referrer_id uuid;
  v_metadata_ref_code text;
  v_phone text;
  v_country text;
BEGIN
  -- Get current user count to determine initial admin
  SELECT COUNT(*) INTO v_user_count FROM public.profiles;
  
  -- Generate unique referral code for the NEW user
  -- Format: REF + 8 random uppercase alphanumeric chars
  v_referral_code := 'REF' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
  
  -- Extract metadata safely
  -- Note: NEW.raw_user_meta_data can be null
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    v_full_name := NEW.raw_user_meta_data->>'full_name';
    v_phone := NEW.raw_user_meta_data->>'phone';
    v_country := NEW.raw_user_meta_data->>'country';
    v_metadata_ref_code := NEW.raw_user_meta_data->>'referral_code';
    
    -- Try to cast role if provided, otherwise default based on user count
    BEGIN
      IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
        v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
      ELSE
        IF v_user_count = 0 THEN
          v_role := 'admin'::public.user_role;
        ELSE
          v_role := 'user'::public.user_role;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_role := 'user'::public.user_role;
    END;
  ELSE
    v_role := CASE WHEN v_user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END;
  END IF;

  -- Ensure role is not null
  IF v_role IS NULL THEN
    v_role := 'user'::public.user_role;
  END IF;

  -- Look up referrer_id if referral_code was provided in metadata
  IF v_metadata_ref_code IS NOT NULL AND v_metadata_ref_code <> '' AND v_metadata_ref_code <> 'null' THEN
    SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = v_metadata_ref_code;
  END IF;

  -- Insert profile with robust handling
  -- Use ON CONFLICT to handle potential race conditions or re-triggered confirmation events
  INSERT INTO public.profiles (
    id, 
    email, 
    phone, 
    role, 
    full_name, 
    referral_code, 
    referrer_id, 
    country,
    kyc_status,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.phone, v_phone),
    v_role,
    v_full_name,
    v_referral_code,
    v_referrer_id,
    v_country,
    'not_submitted'::public.kyc_status,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    country = COALESCE(EXCLUDED.country, profiles.country),
    email = COALESCE(EXCLUDED.email, profiles.email),
    -- Only update role if it was explicitly provided or if current is default
    role = CASE 
             WHEN EXCLUDED.role = 'admin'::public.user_role THEN EXCLUDED.role 
             ELSE profiles.role 
           END,
    referrer_id = COALESCE(profiles.referrer_id, EXCLUDED.referrer_id);

  -- Create default wallets if they don't exist
  -- We specify the conflict target (user_id, wallet_type) to be safe
  BEGIN
    INSERT INTO public.wallets (user_id, wallet_type, balance) VALUES 
      (NEW.id, 'deposit'::public.wallet_type, 0),
      (NEW.id, 'roi'::public.wallet_type, 0),
      (NEW.id, 'bonus'::public.wallet_type, 0),
      (NEW.id, 'withdrawal'::public.wallet_type, 0)
    ON CONFLICT (user_id, wallet_type) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log error or ignore if wallets already exist through other means
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Ensure triggers are correctly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW 
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();
