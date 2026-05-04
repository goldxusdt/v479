-- Create the trigger function for Telegram alerts using the http extension
CREATE OR REPLACE FUNCTION public.trigger_telegram_webhook()
RETURNS TRIGGER AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  -- Get credentials from settings
  SELECT value INTO v_url FROM public.settings WHERE key = 'supabase_url';
  SELECT value INTO v_key FROM public.settings WHERE key = 'supabase_anon_key';

  -- Call the edge function using the http extension (synchronous but reliable in this environment)
  BEGIN
    PERFORM http((
      'POST',
      v_url || '/functions/v1/send-telegram-alert',
      ARRAY[
        http_header('Authorization', 'Bearer ' || v_key),
        http_header('Content-Type', 'application/json')
      ],
      'application/json',
      jsonb_build_object(
        'record', row_to_json(NEW),
        'table', TG_TABLE_NAME,
        'type', TG_OP
      )::text
    )::http_request);
  EXCEPTION WHEN OTHERS THEN
    -- Prevent trigger failure from blocking the transaction
    RAISE WARNING 'Telegram alert failed: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach the trigger to notification_events
DROP TRIGGER IF EXISTS tr_trigger_telegram_webhook ON public.notification_events;
CREATE TRIGGER tr_trigger_telegram_webhook
AFTER INSERT ON public.notification_events
FOR EACH ROW EXECUTE FUNCTION public.trigger_telegram_webhook();
