-- Ensure is_admin function is available
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'::public.user_role
  );
$$;

-- 1. WALLETS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_select_own_wallets" ON public.wallets;
CREATE POLICY "user_select_own_wallets" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- 2. TRANSACTIONS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_select_own_transactions" ON public.transactions;
CREATE POLICY "user_select_own_transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "user_insert_own_transactions" ON public.transactions;
CREATE POLICY "user_insert_own_transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Admins can update transactions (to approve/reject)
DROP POLICY IF EXISTS "admin_manage_all_transactions" ON public.transactions;
CREATE POLICY "admin_manage_all_transactions" ON public.transactions FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 3. DEPOSITS
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_select_own_deposits" ON public.deposits;
CREATE POLICY "user_select_own_deposits" ON public.deposits FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "user_insert_own_deposits" ON public.deposits;
CREATE POLICY "user_insert_own_deposits" ON public.deposits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "admin_manage_all_deposits" ON public.deposits;
CREATE POLICY "admin_manage_all_deposits" ON public.deposits FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 4. WITHDRAWALS
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_select_own_withdrawals" ON public.withdrawals;
CREATE POLICY "user_select_own_withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "user_insert_own_withdrawals" ON public.withdrawals;
CREATE POLICY "user_insert_own_withdrawals" ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "admin_manage_all_withdrawals" ON public.withdrawals;
CREATE POLICY "admin_manage_all_withdrawals" ON public.withdrawals FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 5. ROI RECORDS
ALTER TABLE public.roi_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own roi records" ON public.roi_records;
CREATE POLICY "Users can view their own roi records" ON public.roi_records FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_manage_roi_records" ON public.roi_records;
CREATE POLICY "admin_manage_roi_records" ON public.roi_records FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 6. REFERRAL COMMISSIONS
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own referral commissions" ON public.referral_commissions;
CREATE POLICY "Users can view their own referral commissions" ON public.referral_commissions FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_manage_referral_commissions" ON public.referral_commissions;
CREATE POLICY "admin_manage_referral_commissions" ON public.referral_commissions FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 7. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Ensure users can see their own profile
DROP POLICY IF EXISTS "Users can only view their own full profile" ON public.profiles;
CREATE POLICY "Users can view own or admin view all" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR is_admin(auth.uid()));
-- Admins can update any profile (e.g., to block/unblock)
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
CREATE POLICY "Admins manage all profiles" ON public.profiles FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
