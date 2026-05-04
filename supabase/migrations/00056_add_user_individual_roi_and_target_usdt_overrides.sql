-- 1. Add target_usdt to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_usdt numeric DEFAULT 1000;

-- 2. Ensure settings has a default target_usdt
INSERT INTO public.settings (key, value)
VALUES ('target_usdt', '1000')
ON CONFLICT (key) DO NOTHING;
