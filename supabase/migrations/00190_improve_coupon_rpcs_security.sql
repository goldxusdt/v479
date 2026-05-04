-- Improve bulk delete RPCs with SECURITY DEFINER
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
    AND (is_active = false OR expiry_date < NOW() OR used_count >= usage_limit)
    AND is_deleted = false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.bulk_delete_expired_coupons()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.coupons
  SET is_deleted = true,
      deletion_reason = 'Bulk Deleted - Expired',
      is_active = false
  WHERE expiry_date < NOW() AND is_deleted = false;
END;
$function$;
