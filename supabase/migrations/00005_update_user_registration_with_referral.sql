-- Update the handle_new_user function to support referral codes
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  ref_code TEXT;
  referrer_user_id UUID;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  ref_code := generate_referral_code();
  
  -- Get referrer ID from metadata if referral code was provided
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    SELECT id INTO referrer_user_id 
    FROM profiles 
    WHERE referral_code = NEW.raw_user_meta_data->>'referral_code';
  END IF;
  
  -- Insert a profile synced with fields collected at signup
  INSERT INTO public.profiles (id, email, username, referral_code, role, referrer_id)
  VALUES (
    NEW.id,
    NEW.email,
    SPLIT_PART(NEW.email, '@', 1),
    ref_code,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
    referrer_user_id
  );
  
  -- Create wallets for the new user
  INSERT INTO public.wallets (user_id, wallet_type, balance)
  VALUES
    (NEW.id, 'deposit'::public.wallet_type, 0),
    (NEW.id, 'roi'::public.wallet_type, 0),
    (NEW.id, 'bonus'::public.wallet_type, 0),
    (NEW.id, 'withdrawal'::public.wallet_type, 0);
  
  RETURN NEW;
END;
$$;