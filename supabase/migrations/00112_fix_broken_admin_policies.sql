-- Fix broken policies on investment_options that use auth.users
DROP POLICY IF EXISTS "admin_all_investment_options" ON public.investment_options;
CREATE POLICY "admin_all_investment_options" ON public.investment_options
FOR ALL TO authenticated
USING (public.is_admin());

-- Fix broken policies on notification_events that use auth.users
DROP POLICY IF EXISTS "admin_view_notification_events" ON public.notification_events;
CREATE POLICY "admin_view_notification_events" ON public.notification_events
FOR SELECT TO authenticated
USING (public.is_admin());

-- Ensure Admins have full access to profiles as well
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
CREATE POLICY "Admins have full access" ON public.profiles
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Double check if there are any other tables with auth.users access in policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT tablename, policyname, schemaname
        FROM pg_policies 
        WHERE (qual LIKE '%auth.users%' OR with_check LIKE '%auth.users%')
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            policy_record.policyname, policy_record.schemaname, policy_record.tablename);
        
        -- If it was an admin policy, recreate it safely
        IF policy_record.policyname LIKE '%admin%' THEN
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL TO authenticated USING (public.is_admin())', 
                policy_record.policyname, policy_record.schemaname, policy_record.tablename);
        END IF;
    END LOOP;
END $$;
