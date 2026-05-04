-- 1. Add referral_levels_overrides to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_levels_overrides JSONB DEFAULT '{}'::JSONB;

-- 2. Update settings with new commission rates
-- Levels 1-4
INSERT INTO public.settings (key, value) VALUES ('level1_commission', '8') ON CONFLICT (key) DO UPDATE SET value = '8';
INSERT INTO public.settings (key, value) VALUES ('level2_commission', '4') ON CONFLICT (key) DO UPDATE SET value = '2'; -- Changed 4 to 2 as per overview? Wait, task said 8, 4, 2, 1. But overview said 8, 4, 2, 1. Current was 8, 4, 3, 1.
-- Actually I'll follow the most recent specific instruction or the original overview.
-- Original overview: Level 1: 8%, Level 2: 4%, Level 3: 2%, Level 4: 1%
INSERT INTO public.settings (key, value) VALUES ('level2_commission', '4') ON CONFLICT (key) DO UPDATE SET value = '4';
INSERT INTO public.settings (key, value) VALUES ('level3_commission', '2') ON CONFLICT (key) DO UPDATE SET value = '2';
INSERT INTO public.settings (key, value) VALUES ('level4_commission', '1') ON CONFLICT (key) DO UPDATE SET value = '1';

-- Levels 5-15
INSERT INTO public.settings (key, value) VALUES ('level5_commission', '0.1') ON CONFLICT (key) DO UPDATE SET value = '0.1';
INSERT INTO public.settings (key, value) VALUES ('level6_commission', '0.2') ON CONFLICT (key) DO UPDATE SET value = '0.2';
INSERT INTO public.settings (key, value) VALUES ('level7_commission', '0.3') ON CONFLICT (key) DO UPDATE SET value = '0.3';
INSERT INTO public.settings (key, value) VALUES ('level8_commission', '0.4') ON CONFLICT (key) DO UPDATE SET value = '0.4';
INSERT INTO public.settings (key, value) VALUES ('level9_commission', '0.5') ON CONFLICT (key) DO UPDATE SET value = '0.5';
INSERT INTO public.settings (key, value) VALUES ('level10_commission', '0.6') ON CONFLICT (key) DO UPDATE SET value = '0.6';
INSERT INTO public.settings (key, value) VALUES ('level11_commission', '0.7') ON CONFLICT (key) DO UPDATE SET value = '0.7';
INSERT INTO public.settings (key, value) VALUES ('level12_commission', '0.8') ON CONFLICT (key) DO UPDATE SET value = '0.8';
INSERT INTO public.settings (key, value) VALUES ('level13_commission', '0.9') ON CONFLICT (key) DO UPDATE SET value = '0.9';
INSERT INTO public.settings (key, value) VALUES ('level14_commission', '1.0') ON CONFLICT (key) DO UPDATE SET value = '1.0';
INSERT INTO public.settings (key, value) VALUES ('level15_commission', '4.0') ON CONFLICT (key) DO UPDATE SET value = '4.0';

-- 3. Update check_and_enable_referral_levels function
CREATE OR REPLACE FUNCTION public.check_and_enable_referral_levels(referrer_uid UUID)
RETURNS VOID AS $$
DECLARE
  perf NUMERIC;
  overrides JSONB;
BEGIN
  IF referrer_uid IS NULL THEN RETURN; END IF;
  
  SELECT performance_usdt, referral_levels_overrides INTO perf, overrides FROM public.profiles WHERE id = referrer_uid;
  
  UPDATE public.profiles SET
    referral_level_5_enabled = COALESCE((overrides->>'level_5')::BOOLEAN, (perf >= 10000)),
    referral_level_6_enabled = COALESCE((overrides->>'level_6')::BOOLEAN, (perf >= 25000)),
    referral_level_7_enabled = COALESCE((overrides->>'level_7')::BOOLEAN, (perf >= 50000)),
    referral_level_8_enabled = COALESCE((overrides->>'level_8')::BOOLEAN, (perf >= 75000)),
    referral_level_9_enabled = COALESCE((overrides->>'level_9')::BOOLEAN, (perf >= 100000)),
    referral_level_10_enabled = COALESCE((overrides->>'level_10')::BOOLEAN, (perf >= 150000)),
    referral_level_11_enabled = COALESCE((overrides->>'level_11')::BOOLEAN, (perf >= 200000)),
    referral_level_12_enabled = COALESCE((overrides->>'level_12')::BOOLEAN, (perf >= 300000)),
    referral_level_13_enabled = COALESCE((overrides->>'level_13')::BOOLEAN, (perf >= 400000)),
    referral_level_14_enabled = COALESCE((overrides->>'level_14')::BOOLEAN, (perf >= 500000)),
    referral_level_15_enabled = COALESCE((overrides->>'level_15')::BOOLEAN, (perf >= 1000000))
  WHERE id = referrer_uid;
END;
$$ LANGUAGE plpgsql;
