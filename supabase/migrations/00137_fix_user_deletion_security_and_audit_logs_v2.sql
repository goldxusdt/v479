-- Fix roi_distribution_logs
ALTER TABLE public.roi_distribution_logs 
DROP CONSTRAINT IF EXISTS roi_distribution_logs_admin_id_fkey;
ALTER TABLE public.roi_distribution_logs 
ADD CONSTRAINT roi_distribution_logs_admin_id_fkey 
FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fix admin_audit_logs
ALTER TABLE public.admin_audit_logs 
DROP CONSTRAINT IF EXISTS admin_audit_logs_admin_id_fkey;
ALTER TABLE public.admin_audit_logs 
ADD CONSTRAINT admin_audit_logs_admin_id_fkey 
FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fix login_attempts
ALTER TABLE public.login_attempts 
DROP CONSTRAINT IF EXISTS login_attempts_user_id_fkey;
ALTER TABLE public.login_attempts 
ADD CONSTRAINT login_attempts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix security_reports
ALTER TABLE public.security_reports 
DROP CONSTRAINT IF EXISTS security_reports_created_by_fkey;
ALTER TABLE public.security_reports 
ADD CONSTRAINT security_reports_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fix notification_history
ALTER TABLE public.notification_history 
DROP CONSTRAINT IF EXISTS notification_history_created_by_fkey;
ALTER TABLE public.notification_history 
ADD CONSTRAINT notification_history_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fix compliance_audit_exports
ALTER TABLE public.compliance_audit_exports 
DROP CONSTRAINT IF EXISTS compliance_audit_exports_admin_id_fkey;
ALTER TABLE public.compliance_audit_exports 
ADD CONSTRAINT compliance_audit_exports_admin_id_fkey 
FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fix investment_options
ALTER TABLE public.investment_options 
DROP CONSTRAINT IF EXISTS investment_options_created_by_fkey;
ALTER TABLE public.investment_options 
ADD CONSTRAINT investment_options_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fix notification_events
ALTER TABLE public.notification_events 
DROP CONSTRAINT IF EXISTS notification_events_user_id_fkey;
ALTER TABLE public.notification_events 
ADD CONSTRAINT notification_events_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;