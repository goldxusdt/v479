-- Create a webhook to trigger the telegram alert edge function
-- Note: This assumes the edge function is deployed at the standard path
-- We use a trigger to call the edge function via net.http_post

CREATE OR REPLACE FUNCTION notify_telegram_on_event()
RETURNS TRIGGER AS $$
BEGIN
  -- We use the supabase_functions schema to invoke the edge function if available
  -- or use a standard HTTP request if pg_net is available
  
  -- For this implementation, we will rely on the standard database webhook mechanism
  -- which is configured via the Supabase Dashboard or API.
  -- However, we can also add a manual trigger using http_post if pg_net is enabled.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- In a real Supabase environment, you'd go to Database -> Webhooks -> Create Webhook
-- Name: notify_telegram
-- Table: notification_events
-- Events: INSERT
-- Type: Edge Function
-- Function: send-telegram-alert
-- Method: POST
-- Headers: Authorization: Bearer <anon_key>

-- Since I cannot access the dashboard, I will simulate it by ensuring the edge function 
-- is called whenever an insert happens, if pg_net is available.

-- Check if pg_net is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    -- If pg_net is available, we can use it
    CREATE OR REPLACE FUNCTION trigger_telegram_webhook()
    RETURNS TRIGGER AS $function$
    BEGIN
      PERFORM net.http_post(
        url := (SELECT value FROM public.settings WHERE key = 'supabase_url') || '/functions/v1/send-telegram-alert',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM public.settings WHERE key = 'supabase_anon_key')
        ),
        body := jsonb_build_object(
          'record', row_to_json(NEW),
          'table', 'notification_events',
          'type', 'INSERT'
        )
      );
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS tr_trigger_telegram_webhook ON public.notification_events;
    CREATE TRIGGER tr_trigger_telegram_webhook
    AFTER INSERT ON public.notification_events
    FOR EACH ROW EXECUTE FUNCTION trigger_telegram_webhook();
  END IF;
END $$;
