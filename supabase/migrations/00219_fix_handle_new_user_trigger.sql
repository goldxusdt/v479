CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  ref_id uuid;
  new_ref_code text;
BEGIN
  -- Count existing profiles to determine if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Look up referrer if code provided in metadata
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    SELECT id INTO ref_id FROM public.profiles WHERE referral_code = NEW.raw_user_meta_data->>'referral_code';
  END IF;

  -- Generate a unique referral code for the new user
  new_ref_code := 'REF' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  -- Insert a profile synced with fields collected at signup.
  INSERT INTO public.profiles (
    id, 
    email, 
    phone, 
    role, 
    referral_code, 
    full_name, 
    country,
    referrer_id,
    kyc_status
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
    new_ref_code,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'country',
    ref_id,
    'not_submitted'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- If first user, ensure is_first_admin is set
  IF user_count = 0 THEN
    UPDATE public.profiles SET is_first_admin = true, role = 'admin' WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;