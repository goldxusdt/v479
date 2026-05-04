
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS user_agent text;
