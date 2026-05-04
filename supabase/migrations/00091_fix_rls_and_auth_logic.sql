-- Standardize is_admin helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up profiles policies
DROP POLICY IF EXISTS "Admins can update roles" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can only view their own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- 1. Everyone can view public profile info (optional, but good for referrals)
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
FOR SELECT USING (true);

-- 2. Users can update their own profile fields except role
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- 3. Admins have full control over all profiles
CREATE POLICY "Admins have full access" ON public.profiles
FOR ALL USING (is_admin());

-- Clean up wallets policies
DROP POLICY IF EXISTS "Admins have full access to all wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can view own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Wallets are viewable by owners" ON public.wallets;
DROP POLICY IF EXISTS "Wallets are manageable by admins" ON public.wallets;

-- 1. Users can view their own wallets
CREATE POLICY "Users can view own wallets" ON public.wallets
FOR SELECT USING (auth.uid() = user_id);

-- 2. Admins have full access
CREATE POLICY "Admins have full access" ON public.wallets
FOR ALL USING (is_admin());
