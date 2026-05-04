-- ==========================================
-- 1. FIX RLS ON TABLES MISSING IT
-- ==========================================

ALTER TABLE IF EXISTS tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pending_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth_links ENABLE ROW LEVEL SECURITY;

-- Default policies for newly enabled RLS tables
-- FAQs are public
DROP POLICY IF EXISTS "Public read access to FAQs" ON faqs;
CREATE POLICY "Public read access to FAQs" ON faqs FOR SELECT USING (true);

-- Tickets/Ticket messages should only be visible to owner or admin
DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
CREATE POLICY "Users can view own tickets" ON tickets FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own ticket messages" ON ticket_messages;
CREATE POLICY "Users can view own ticket messages" ON ticket_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_messages.ticket_id AND (tickets.user_id = auth.uid() OR is_admin(auth.uid())))
);

-- ==========================================
-- 2. FIX PROFILE DATA LEAK (CRITICAL)
-- ==========================================

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create a more restrictive policy
CREATE POLICY "Users can only view their own full profile" ON profiles
    FOR SELECT USING (auth.uid() = id OR is_admin(auth.uid()));

-- Optional: Create a view for public-safe data if needed, but for now we keep it tight.

-- ==========================================
-- 3. ENHANCE AUDIT LOGGING (IPS/DPI EQUIVALENT)
-- ==========================================

-- Trigger function for sensitive data changes
CREATE OR REPLACE FUNCTION public.log_sensitive_change()
RETURNS trigger AS $$
BEGIN
  IF (tg_op = 'UPDATE') THEN
    INSERT INTO public.admin_audit_logs (admin_id, action, target_table, target_id, old_value, new_value)
    VALUES (auth.uid(), 'Sensitive update: ' || tg_table_name, tg_table_name, COALESCE(new.id::text, old.id::text), to_jsonb(old), to_jsonb(new));
  ELSIF (tg_op = 'DELETE') THEN
    INSERT INTO public.admin_audit_logs (admin_id, action, target_table, target_id, old_value, new_value)
    VALUES (auth.uid(), 'Sensitive deletion: ' || tg_table_name, tg_table_name, old.id::text, to_jsonb(old), null);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to wallets and profiles
DROP TRIGGER IF EXISTS profiles_audit_trigger ON public.profiles;
CREATE TRIGGER profiles_audit_trigger
AFTER UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_change();

DROP TRIGGER IF EXISTS wallets_audit_trigger ON public.wallets;
CREATE TRIGGER wallets_audit_trigger
AFTER UPDATE OR DELETE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_change();

-- ==========================================
-- 4. SIMULATED FIREWALL (GEO-BLOCKING & RATE LIMITING)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.firewall_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL CHECK (type IN ('geo_block', 'ip_block', 'rate_limit')),
    value text NOT NULL, -- Country code, IP, or rule name
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.firewall_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage firewall rules" ON firewall_rules FOR ALL USING (is_admin(auth.uid()));

-- Rate limit tracking table
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier text NOT NULL, -- IP or user_id
    endpoint text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view rate limit logs" ON rate_limit_logs FOR SELECT USING (is_admin(auth.uid()));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_time ON rate_limit_logs (identifier, created_at);

-- Function to check rate limit (Can be called from Edge Functions or RPC)
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier text, p_endpoint text, p_limit integer, p_window_seconds integer)
RETURNS boolean AS $$
DECLARE
    v_count integer;
BEGIN
    -- Cleanup old logs (optionally do this in a background worker, but here for simplicity)
    DELETE FROM public.rate_limit_logs WHERE created_at < now() - (p_window_seconds || ' seconds')::interval;

    -- Count requests in window
    SELECT count(*) INTO v_count
    FROM public.rate_limit_logs
    WHERE identifier = p_identifier AND endpoint = p_endpoint AND created_at > now() - (p_window_seconds || ' seconds')::interval;

    IF v_count >= p_limit THEN
        RETURN false; -- Limit exceeded
    END IF;

    -- Log request
    INSERT INTO public.rate_limit_logs (identifier, endpoint) VALUES (p_identifier, p_endpoint);
    RETURN true; -- OK
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. ADVANCED SETTINGS SEEDING
-- ==========================================

INSERT INTO public.settings (key, value)
VALUES 
    ('firewall_geo_blocking_enabled', 'false'),
    ('firewall_geo_blacklist', '[]'),
    ('firewall_rate_limiting_enabled', 'true'),
    ('firewall_rate_limit_max_requests', '100'),
    ('firewall_rate_limit_window_seconds', '60'),
    ('firewall_maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;
