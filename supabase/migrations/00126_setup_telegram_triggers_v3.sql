-- Enable pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Add Supabase URL and Anon Key to settings for use in triggers
INSERT INTO public.settings (key, value)
VALUES 
  ('supabase_url', 'https://gkmvncioffmvzxhuaohv.supabase.co'),
  ('supabase_anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrbXZuY2lvZmZtdnp4aHVhb2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MjE0OTYsImV4cCI6MjA4ODk5NzQ5Nn0.6ihaQhcvqhYj1NXUbcl4-57Dh6F4lWgizUxgEVJ1HVw')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Create the trigger function for Telegram alerts
CREATE OR REPLACE FUNCTION public.trigger_telegram_webhook()
RETURNS TRIGGER AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  -- Get credentials from settings
  SELECT value INTO v_url FROM public.settings WHERE key = 'supabase_url';
  SELECT value INTO v_key FROM public.settings WHERE key = 'supabase_anon_key';

  -- Call the edge function asynchronously using pg_net
  PERFORM net.http_post(
    url := v_url || '/functions/v1/send-telegram-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'record', row_to_json(NEW),
      'table', TG_TABLE_NAME,
      'type', TG_OP
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to notification_events
DROP TRIGGER IF EXISTS tr_trigger_telegram_webhook ON public.notification_events;
CREATE TRIGGER tr_trigger_telegram_webhook
AFTER INSERT ON public.notification_events
FOR EACH ROW EXECUTE FUNCTION public.trigger_telegram_webhook();

-- Also attach it directly to other tables for redundant/immediate alerts if needed
-- But since they already call create_notification_event, the trigger on notification_events is enough.
-- However, we must ensure notification_events captures ALL events we care about.

-- Verify if we need triggers on other tables directly
-- The existing functions like on_deposit_notification already call create_notification_event.
-- So the notification_events trigger SHOULD be sufficient as long as those are firing correctly.
