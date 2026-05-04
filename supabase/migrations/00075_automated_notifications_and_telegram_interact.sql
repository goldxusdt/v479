-- Add balance threshold settings to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS balance_threshold DECIMAL(20, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_balance_alert_at TIMESTAMPTZ;

-- Add Telegram message ID tracking to withdrawals and support tickets to allow updating/replying
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS telegram_message_id TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS telegram_message_id TEXT;

-- Update Telegram Alerts History to store message ID
ALTER TABLE public.telegram_alerts_history ADD COLUMN IF NOT EXISTS message_id TEXT;

-- Function to check and trigger balance push notification
CREATE OR REPLACE FUNCTION public.check_balance_threshold()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_new_balance DECIMAL(20, 2);
    v_threshold DECIMAL(20, 2);
    v_last_alert TIMESTAMPTZ;
BEGIN
    v_user_id := NEW.user_id;
    v_new_balance := NEW.balance;

    -- Get user's threshold and last alert time
    SELECT balance_threshold, last_balance_alert_at 
    INTO v_threshold, v_last_alert
    FROM public.profiles 
    WHERE id = v_user_id;

    -- Trigger if balance >= threshold AND (threshold > 0) AND (last alert > 1 hour ago OR null)
    IF v_threshold > 0 AND v_new_balance >= v_threshold AND (v_last_alert IS NULL OR v_last_alert < now() - interval '1 hour') THEN
        -- Update last alert time
        UPDATE public.profiles SET last_balance_alert_at = now() WHERE id = v_user_id;
        
        -- Note: We can't directly call Edge Functions from SQL without HTTP extension reliably in all environments
        -- So we'll rely on the app logic or a separate mechanism if possible.
        -- However, we can use pg_net if enabled.
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on wallet update
-- DROP TRIGGER IF EXISTS on_wallet_balance_change ON public.wallets;
-- CREATE TRIGGER on_wallet_balance_change
--     AFTER UPDATE OF balance ON public.wallets
--     FOR EACH ROW
--     EXECUTE FUNCTION public.check_balance_threshold();

-- Since we want automated ROI arrival push too, we'll implement a helper in the app
-- because SQL triggers calling external APIs are restricted.
