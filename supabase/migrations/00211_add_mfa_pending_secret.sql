ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mfa_pending_secret text;
