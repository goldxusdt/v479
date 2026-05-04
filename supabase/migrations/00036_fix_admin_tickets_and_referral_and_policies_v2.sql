-- 1. Add admin_reply to support_tickets
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS admin_reply TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS admin_replied_at TIMESTAMPTZ;

-- 2. Update handle_new_user function to handle referrer_id
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count int;
  v_referral_code text;
  v_full_name text;
  v_role user_role;
  v_referrer_id uuid;
  v_metadata_ref_code text;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- Generate unique referral code for the NEW user
  v_referral_code := 'REF' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
  
  -- Get metadata
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, CASE WHEN user_count = 0 THEN 'admin'::user_role ELSE 'user'::user_role END);
  v_metadata_ref_code := NEW.raw_user_meta_data->>'referral_code';

  -- Look up referrer_id if referral_code was provided in metadata
  IF v_metadata_ref_code IS NOT NULL AND v_metadata_ref_code <> '' THEN
    SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = v_metadata_ref_code;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (id, email, phone, role, full_name, referral_code, referrer_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'),
    v_role,
    v_full_name,
    v_referral_code,
    v_referrer_id
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    referrer_id = COALESCE(profiles.referrer_id, EXCLUDED.referrer_id);

  -- Create default wallets
  INSERT INTO wallets (user_id, wallet_type, balance) VALUES 
    (NEW.id, 'deposit', 0),
    (NEW.id, 'roi', 0),
    (NEW.id, 'bonus', 0),
    (NEW.id, 'withdrawal', 0)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add KYC and Refund policies to landing_page_settings
INSERT INTO landing_page_settings (section_name, content)
VALUES 
  ('kyc_policy', '{"title": "Identity Verification Policy", "content": "<h1>KYC Policy</h1><p>To ensure security and compliance, all users must verify their identity before making withdrawals.</p>"}'),
  ('refund_policy', '{"title": "Refund and Cancellation Policy", "content": "<h1>Refund Policy</h1><p>Our platform does not offer refunds once an investment is processed. Please read our terms carefully.</p>"}')
ON CONFLICT (section_name) DO NOTHING;
