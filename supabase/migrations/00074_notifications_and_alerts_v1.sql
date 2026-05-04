-- Browser Push Notification Subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_json JSONB NOT NULL,
    categories TEXT[] DEFAULT '{all}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Notification History
CREATE TABLE IF NOT EXISTS public.notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'all', 'group', 'individual'
    target_id UUID, -- for individual or group ref
    action_url TEXT,
    icon_url TEXT,
    sent_at TIMESTAMPTZ DEFAULT now(),
    stats JSONB DEFAULT '{"delivered": 0, "clicked": 0, "failed": 0}'::jsonb,
    created_by UUID REFERENCES auth.users(id)
);

-- Notification Templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT DEFAULT 'announcement',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Telegram Alerts History
CREATE TABLE IF NOT EXISTS public.telegram_alerts_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'sent', -- 'sent', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_alerts_history ENABLE ROW LEVEL SECURITY;

-- Subscriptions: users can manage their own
CREATE POLICY "Users can manage their own push subscriptions"
    ON public.push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all push subscriptions"
    ON public.push_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
        )
    );

-- Notification History: Admins only
CREATE POLICY "Admins can manage notification history"
    ON public.notification_history
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
        )
    );

-- Templates: Admins only
CREATE POLICY "Admins can manage notification templates"
    ON public.notification_templates
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
        )
    );

-- Telegram History: Admins only
CREATE POLICY "Admins can view telegram alerts history"
    ON public.telegram_alerts_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
        )
    );

-- Add Telegram Settings to settings table
INSERT INTO public.settings (key, value, description)
VALUES 
    ('telegram_alerts_enabled', 'false', 'Enable/disable Telegram alerts for admins'),
    ('telegram_alert_triggers', '{"new_user": true, "failed_login": true, "critical_error": true, "form_submission": true}', 'Configuration of Telegram alert triggers')
ON CONFLICT (key) DO NOTHING;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
