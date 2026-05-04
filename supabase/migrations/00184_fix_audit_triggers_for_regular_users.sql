CREATE OR REPLACE FUNCTION public.log_sensitive_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only log if the action is performed by an admin
  -- Regular user wallet updates (e.g., from withdrawals) shouldn't be logged to admin_audit_logs
  -- to avoid RLS violation errors for the users.
  IF (public.is_admin(auth.uid())) THEN
    IF (tg_op = 'UPDATE') THEN
      INSERT INTO public.admin_audit_logs (admin_id, action, target_table, target_id, old_value, new_value)
      VALUES (auth.uid(), 'Sensitive update: ' || tg_table_name, tg_table_name, COALESCE(new.id::text, old.id::text), to_jsonb(old), to_jsonb(new));
    ELSIF (tg_op = 'DELETE') THEN
      INSERT INTO public.admin_audit_logs (admin_id, action, target_table, target_id, old_value, new_value)
      VALUES (auth.uid(), 'Sensitive deletion: ' || tg_table_name, tg_table_name, old.id::text, to_jsonb(old), null);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_table_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Only log if the action is performed by an admin
    IF (public.is_admin(auth.uid())) THEN
        IF (TG_OP = 'UPDATE') THEN
            INSERT INTO public.admin_audit_logs (
                admin_id,
                action,
                target_table,
                target_id,
                old_value,
                new_value
            )
            VALUES (
                auth.uid(),
                'UPDATE',
                TG_TABLE_NAME,
                OLD.id::text,
                to_jsonb(OLD),
                to_jsonb(NEW)
            );
            RETURN NEW;
        ELSIF (TG_OP = 'DELETE') THEN
            INSERT INTO public.admin_audit_logs (
                admin_id,
                action,
                target_table,
                target_id,
                old_value
            )
            VALUES (
                auth.uid(),
                'DELETE',
                TG_TABLE_NAME,
                OLD.id::text,
                to_jsonb(OLD)
            );
            RETURN OLD;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO public.admin_audit_logs (
                admin_id,
                action,
                target_table,
                target_id,
                new_value
            )
            VALUES (
                auth.uid(),
                'INSERT',
                TG_TABLE_NAME,
                NEW.id::text,
                to_jsonb(NEW)
            );
            RETURN NEW;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$function$;
