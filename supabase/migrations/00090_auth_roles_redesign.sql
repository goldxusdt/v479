-- 1. Ensure UserRole Enum exists and is restricted to admin and user
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('user', 'admin');
    END IF;
END
$$;

-- 2. Create the Admin check function for triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_count int;
  v_role public.user_role;
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

  -- Insert profile
  INSERT INTO public.profiles (
    id, 
    email, 
    role, 
    full_name,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    true
  );

  -- Create default wallets for the user
  INSERT INTO public.wallets (user_id, wallet_type, balance) VALUES 
    (NEW.id, 'deposit'::public.wallet_type, 0),
    (NEW.id, 'roi'::public.wallet_type, 0),
    (NEW.id, 'bonus'::public.wallet_type, 0),
    (NEW.id, 'withdrawal'::public.wallet_type, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-verify the Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Admin Permission Helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS Policies for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins have full access to all profiles" ON public.profiles;
CREATE POLICY "Admins have full access to all profiles" ON public.profiles
FOR ALL USING (is_admin());

-- 6. RLS Policies for Wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallets" ON public.wallets;
CREATE POLICY "Users can view own wallets" ON public.wallets
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins have full access to all wallets" ON public.wallets;
CREATE POLICY "Admins have full access to all wallets" ON public.wallets
FOR ALL USING (is_admin());

-- Ensure Admin can change roles (Update on profiles restricted to Admin only)
DROP POLICY IF EXISTS "Admins can update roles" ON public.profiles;
CREATE POLICY "Admins can update roles" ON public.profiles
FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
