CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  v_referral_code text;
  v_full_name text;
  v_role user_role;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- Generate unique referral code
  v_referral_code := 'REF' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
  
  -- Get metadata
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, CASE WHEN user_count = 0 THEN 'admin'::user_role ELSE 'user'::user_role END);

  -- Insert profile
  INSERT INTO public.profiles (id, email, phone, role, full_name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    v_role,
    v_full_name,
    v_referral_code
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

  -- Create default wallets
  INSERT INTO wallets (user_id, wallet_type, balance) VALUES 
    (NEW.id, 'deposit', 0),
    (NEW.id, 'roi', 0),
    (NEW.id, 'bonus', 0),
    (NEW.id, 'withdrawal', 0)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
