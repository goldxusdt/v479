-- 1. Add signup_method column to profiles if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'signup_method') THEN
    ALTER TABLE public.profiles ADD COLUMN signup_method text;
  END IF;
END $$;

-- 2. Update OTP purpose constraint to include password_change
ALTER TABLE public.otp_verifications DROP CONSTRAINT IF EXISTS otp_verifications_purpose_check;
ALTER TABLE public.otp_verifications ADD CONSTRAINT otp_verifications_purpose_check 
  CHECK (purpose = ANY (ARRAY['signup'::text, 'login'::text, 'password_reset'::text, 'admin_login'::text, 'totp_verification'::text, 'password_change'::text]));

-- 3. Update handle_new_user function to include signup_method
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_count int;
  v_role public.user_role;
  v_signup_method text;
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
  -- NEW.raw_app_metadata -> 'provider' usually contains 'email' or 'google'
  v_signup_method := COALESCE(NEW.raw_app_metadata->>'provider', 'email');

  -- Insert profile
  INSERT INTO public.profiles (
    id, 
    email, 
    role, 
    full_name,
    is_active,
    signup_method
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    true,
    v_signup_method
  );

  -- Create default wallets for the user
  INSERT INTO public.wallets (user_id, wallet_type, balance) VALUES 
    (NEW.id, 'deposit'::public.wallet_type, 0),
    (NEW.id, 'roi'::public.wallet_type, 0),
    (NEW.id, 'bonus'::public.wallet_type, 0),
    (NEW.id, 'withdrawal'::public.wallet_type, 0);

  RETURN NEW;
END;
$$;
