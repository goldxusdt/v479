-- Standardize helper functions with SECURITY DEFINER and fixed search_path
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role = 'admin'::public.user_role
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT is_admin(auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_security_logs()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT is_admin(auth.uid());
$function$;

-- Consolidate and clean up redundant policies for critical financial tables
-- Deposits
DROP POLICY IF EXISTS "Users can view their own deposits" ON deposits;
DROP POLICY IF EXISTS "Users can view own deposits" ON deposits;
CREATE POLICY "user_select_own_deposits" ON deposits FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own deposits" ON deposits;
DROP POLICY IF EXISTS "Users can create deposits" ON deposits;
CREATE POLICY "user_insert_own_deposits" ON deposits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "user_select_own_transactions" ON transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own transactions" ON transactions;
CREATE POLICY "user_insert_own_transactions" ON transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Withdrawals
DROP POLICY IF EXISTS "Users can view their own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Users can view own withdrawals" ON withdrawals;
CREATE POLICY "user_select_own_withdrawals" ON withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Users can create withdrawals" ON withdrawals;
CREATE POLICY "user_insert_own_withdrawals" ON withdrawals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Wallets
DROP POLICY IF EXISTS "Users can view their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can view own wallets" ON wallets;
CREATE POLICY "user_select_own_wallets" ON wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Standardize Admin access for these tables
DROP POLICY IF EXISTS "Admins have full access to deposits" ON deposits;
CREATE POLICY "admin_all_deposits" ON deposits FOR ALL TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins have full access to transactions" ON transactions;
CREATE POLICY "admin_all_transactions" ON transactions FOR ALL TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins have full access to withdrawals" ON withdrawals;
CREATE POLICY "admin_all_withdrawals" ON withdrawals FOR ALL TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins have full access to wallets" ON wallets;
DROP POLICY IF EXISTS "Admins have full access" ON wallets;
CREATE POLICY "admin_all_wallets" ON wallets FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Profiles hardening
-- Ensure is_admin check is used everywhere
DROP POLICY IF EXISTS "Admins have full access" ON profiles;
CREATE POLICY "admin_all_profiles" ON profiles FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Announcements hardening
DROP POLICY IF EXISTS "Admins have full access to announcements" ON announcements;
CREATE POLICY "admin_all_announcements" ON announcements FOR ALL TO authenticated USING (is_admin(auth.uid()));
