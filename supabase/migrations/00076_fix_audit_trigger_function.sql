CREATE OR REPLACE FUNCTION public.audit_table_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    RETURN NULL;
END;
$$;
