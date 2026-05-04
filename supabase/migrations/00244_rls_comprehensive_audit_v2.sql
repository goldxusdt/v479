-- RLS Audit Phase 2: Missing Tables and Cleanup

-- 1. Standardize is_admin helper
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

-- 2. KYC DOCUMENTS
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_manage_own_kyc" ON public.kyc_documents;
CREATE POLICY "user_manage_own_kyc" ON public.kyc_documents FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- 3. OTP VERIFICATIONS
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_all_otp" ON public.otp_verifications;
CREATE POLICY "admin_manage_all_otp" ON public.otp_verifications FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
-- Users can't select OTPs directly for security, but functions use service role. 
-- However, for audit/transparency:
DROP POLICY IF EXISTS "user_view_own_otp_meta" ON public.otp_verifications;
CREATE POLICY "user_view_own_otp_meta" ON public.otp_verifications FOR SELECT TO authenticated USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- 4. PENDING SIGNUPS
ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_all_pending" ON public.pending_signups;
CREATE POLICY "admin_manage_all_pending" ON public.pending_signups FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 5. TELEGRAM ALERTS HISTORY
ALTER TABLE public.telegram_alerts_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_view_all_alerts" ON public.telegram_alerts_history;
CREATE POLICY "admin_view_all_alerts" ON public.telegram_alerts_history FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- 6. NOTIFICATION SYSTEM TABLES
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_notification_history" ON public.notification_history FOR ALL TO authenticated USING (is_admin(auth.uid()));

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_notification_templates" ON public.notification_templates FOR ALL TO authenticated USING (is_admin(auth.uid()));

ALTER TABLE public.notification_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_notification_categories" ON public.notification_categories FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "anyone_view_notification_categories" ON public.notification_categories FOR SELECT USING (true);

-- 7. SETTINGS AND CONFIGURATION
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_platform_settings" ON public.platform_settings;
CREATE POLICY "admin_manage_platform_settings" ON public.platform_settings FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 8. SECURITY AND AUDIT
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
-- is_admin policy already exists, but ensure it's clean
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.admin_audit_logs FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- 9. USER INVESTMENT SELECTIONS - Strengthening update policy
ALTER TABLE public.user_investment_selections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can update own selections" ON public.user_investment_selections;
CREATE POLICY "Users can update own selections" ON public.user_investment_selections FOR UPDATE TO authenticated 
USING (auth.uid() = user_id AND status = 'pending') 
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 10. SUPPORT TICKETS - Standardizing
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own support tickets" ON public.support_tickets;
CREATE POLICY "Users can view own or admin view all tickets" ON public.support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "Users can update their own support tickets" ON public.support_tickets;
CREATE POLICY "Users can update own tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
