CREATE OR REPLACE FUNCTION trigger_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_pref_enabled BOOLEAN;
  v_service_key TEXT;
BEGIN
  -- Service role key for Edge Function authentication
  v_service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrbXZuY2lvZmZtdnp4aHVhb2h2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQyMTQ5NiwiZXhwIjoyMDg4OTk3NDk2fQ.iJ7Goqen3O6iKO8jz63fUJuTJRTqS4jCmjWNyN14ASw';

  -- Check user preferences from profiles table
  IF NEW.event_type = 'withdrawal_approved' OR NEW.event_type = 'withdrawal_rejected' THEN
    SELECT COALESCE(withdrawal_status_notification_enabled, TRUE) INTO v_pref_enabled FROM public.profiles WHERE id = NEW.user_id;
  ELSIF NEW.event_type = 'roi_arrival' THEN
    SELECT COALESCE(daily_roi_notification_enabled, TRUE) INTO v_pref_enabled FROM public.profiles WHERE id = NEW.user_id;
  ELSE
    -- For other types like referral_earned, we can default to true or add more checks
    v_pref_enabled := TRUE;
  END IF;

  IF v_pref_enabled THEN
    -- Use pg_net to call the Edge Function asynchronously
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_trigger_push_notification ON public.notification_events;
CREATE TRIGGER tr_trigger_push_notification
AFTER INSERT ON public.notification_events
FOR EACH ROW
EXECUTE FUNCTION trigger_push_notification();
