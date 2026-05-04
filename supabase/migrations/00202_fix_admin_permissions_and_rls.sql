-- Robust is_admin functions
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role = 'admin'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT is_admin(auth.uid());
$$;

-- Fix recursion in profiles policy
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
CREATE POLICY "Admins have full access" ON public.profiles
FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Update announcements policies
DROP POLICY IF EXISTS "Admins have full access to announcements" ON public.announcements;
CREATE POLICY "Admins have full access to announcements" ON public.announcements
FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Update notification_categories policies
DROP POLICY IF EXISTS "Allow admins to manage categories" ON public.notification_categories;
CREATE POLICY "Allow admins to manage categories" ON public.notification_categories
FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Update notification_templates policies
DROP POLICY IF EXISTS "Admins can manage notification templates" ON public.notification_templates;
CREATE POLICY "Admins can manage notification templates" ON public.notification_templates
FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Update security related table policies
DROP POLICY IF EXISTS "Admins can view all security logs" ON public.admin_security_logs;
CREATE POLICY "Admins can view all security logs" ON public.admin_security_logs
FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins view all security events" ON public.security_events;
CREATE POLICY "Admins view all security events" ON public.security_events
FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

-- Fix can_manage_security_logs if it's used elsewhere
CREATE OR REPLACE FUNCTION public.can_manage_security_logs()
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
    SELECT is_admin(auth.uid());
$$;
