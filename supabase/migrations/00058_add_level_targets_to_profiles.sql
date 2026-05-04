ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_level_targets jsonb DEFAULT '{}'::jsonb;
