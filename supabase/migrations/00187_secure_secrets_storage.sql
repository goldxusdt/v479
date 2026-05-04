-- Create internal schema for sensitive data
CREATE SCHEMA IF NOT EXISTS internal;

-- Create secrets table
CREATE TABLE IF NOT EXISTS internal.secrets (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deny all access to public for this schema
REVOKE ALL ON SCHEMA internal FROM public;
REVOKE ALL ON ALL TABLES IN SCHEMA internal FROM public;

-- Insert service role key
INSERT INTO internal.secrets (key, value)
VALUES ('service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrbXZuY2lvZmZtdnp4aHVhb2h2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQyMTQ5NiwiZXhwIjoyMDg4OTk3NDk2fQ.iJ7Goqen3O6iKO8jz63fUJuTJRTqS4jCmjWNyN14ASw')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Update trigger function to use the secret from the internal table
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_pref_enabled BOOLEAN;
  v_service_key TEXT;
BEGIN
  -- Get Service role key from internal secrets table
  -- SECURITY DEFINER ensures the function can access the internal schema
  SELECT value INTO v_service_key FROM internal.secrets WHERE key = 'service_role_key';

  -- Check user preferences
  IF NEW.event_type = 'withdrawal_approved' OR NEW.event_type = 'withdrawal_rejected' THEN
    SELECT COALESCE(withdrawal_status_notification_enabled, TRUE) INTO v_pref_enabled FROM public.profiles WHERE id = NEW.user_id;
  ELSIF NEW.event_type = 'roi_arrival' THEN
    SELECT COALESCE(daily_roi_notification_enabled, TRUE) INTO v_pref_enabled FROM public.profiles WHERE id = NEW.user_id;
  ELSE
    v_pref_enabled := TRUE;
  END IF;

  IF v_pref_enabled AND v_service_key IS NOT NULL THEN
    PERFORM
      net.http_post(
        url := 'https://gkmvncioffmvzxhuaohv.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', v_service_key,
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
          'title', NEW.title,
          'body', NEW.message,
          'target_type', 'individual',
          'target_id', NEW.user_id,
          'action_url', '/',
          'created_by', 'system'
        )
      );
  END IF;

  RETURN NEW;
END;
$function$;
