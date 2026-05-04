ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS ip_address text;

-- Also update the log_critical_action function to be safe if it wasn't already
CREATE OR REPLACE FUNCTION public.log_critical_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.admin_audit_logs (
        admin_id,
        action,
        target_table,
        target_id,
        old_value,
        new_value,
        ip_address
    )
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id)::text,
        CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::jsonb ELSE NULL END,
        COALESCE(current_setting('request.headers', true)::jsonb->>'x-real-ip', '0.0.0.0')
    );
    RETURN NEW;
END;
$$;
