-- Fix FAQ policies
DROP POLICY IF EXISTS "Public read access to FAQs" ON public.faqs;
CREATE POLICY "Public read access to FAQs" ON public.faqs FOR SELECT TO public USING (is_active = true);
DROP POLICY IF EXISTS "Admin manage FAQs" ON public.faqs;
CREATE POLICY "Admin manage FAQs" ON public.faqs FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Fix Security Center policies
DROP POLICY IF EXISTS "Admins manage firewall rules" ON public.firewall_rules;
CREATE POLICY "Admins manage firewall rules" ON public.firewall_rules FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins view rate limit logs" ON public.rate_limit_logs;
CREATE POLICY "Admins view rate limit logs" ON public.rate_limit_logs FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Since waf_analytics is a view of security_events, ensure security_events has proper policy
DROP POLICY IF EXISTS "Admins view all security events" ON public.security_events;
CREATE POLICY "Admins view all security events" ON public.security_events FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Fix unique constraint on coupons by appending a suffix on soft delete
CREATE OR REPLACE FUNCTION public.handle_coupon_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- If marking as deleted, suffix the code to allow re-using the original code
  IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
    NEW.code := NEW.code || '_del_' || substr(md5(random()::text), 1, 6);
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_coupon_soft_delete ON public.coupons;
CREATE TRIGGER tr_coupon_soft_delete
  BEFORE UPDATE OF is_deleted ON public.coupons
  FOR EACH ROW
  WHEN (NEW.is_deleted = true AND OLD.is_deleted = false)
  EXECUTE FUNCTION public.handle_coupon_soft_delete();

-- Improve bulk delete RPC
CREATE OR REPLACE FUNCTION public.bulk_delete_used_coupons()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.coupons
  SET is_deleted = true,
      deletion_reason = 'Bulk Deleted - Used',
      is_active = false
  WHERE used_count > 0 
    AND (is_active = false OR expiry_date < NOW() OR used_count >= usage_limit);
END;
$function$;

-- Make waf_analytics view security_invoker if possible (Supabase feature, otherwise just ensure underlying table has policy)
-- In standard Postgres we can't easily change security_invoker on existing view without recreating.
-- But the SELECT policy on security_events is already there.

-- Add missing columns to security_events if any (metadata is there, but let's check)
-- Actually, the user mentioned "missing column issues", let's check ifwaf_analytics view is missing anything.
-- The view definition is fine.
