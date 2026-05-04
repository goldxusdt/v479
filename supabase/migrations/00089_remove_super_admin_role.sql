-- Update existing super_admins to admins
UPDATE profiles SET role = 'admin'::user_role WHERE role = 'super_admin'::user_role;

-- Update RLS policies to remove super_admin
DROP POLICY IF EXISTS "Admins can delete public assets" ON storage.objects;
CREATE POLICY "Admins can delete public assets" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'public_assets' AND 
  is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Admins can update public assets" ON storage.objects;
CREATE POLICY "Admins can update public assets" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'public_assets' AND 
  is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
CREATE POLICY "Users can view their own KYC documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc_documents' AND 
  (storage.foldername(name))[2] = auth.uid()::text OR is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Admins can view all upload logs" ON public.upload_logs;
CREATE POLICY "Admins can view all upload logs" ON public.upload_logs
FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view upload logs" ON public.upload_logs;
-- Redundant, but keeping consistency

DROP POLICY IF EXISTS "Admins can manage security reports" ON public.security_reports;
CREATE POLICY "Admins can manage security reports" ON public.security_reports
FOR ALL TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all security logs" ON public.admin_security_logs;
CREATE POLICY "Admins can view all security logs" ON public.admin_security_logs
FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admins can view all push subscriptions" ON public.push_subscriptions
FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage notification history" ON public.notification_history;
CREATE POLICY "Admins can manage notification history" ON public.notification_history
FOR ALL TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage notification templates" ON public.notification_templates;
CREATE POLICY "Admins can manage notification templates" ON public.notification_templates
FOR ALL TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view telegram alerts history" ON public.telegram_alerts_history;
CREATE POLICY "Admins can view telegram alerts history" ON public.telegram_alerts_history
FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

-- Note: We can't easily drop a value from an enum in Postgres without complex maneuvers.
-- We will just stop using it and update the frontend types.
