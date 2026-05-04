-- Add ip_address column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_audit_logs' AND column_name = 'ip_address') THEN
        ALTER TABLE public.admin_audit_logs ADD COLUMN ip_address text;
    END IF;
END $$;

-- Update the trigger function
CREATE OR REPLACE FUNCTION public.log_critical_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
