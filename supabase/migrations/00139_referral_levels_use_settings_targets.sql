
CREATE OR REPLACE FUNCTION public.check_and_enable_referral_levels(referrer_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  perf NUMERIC;
  overrides JSONB;
  v_targets NUMERIC[];
  i INTEGER;
  v_target_val TEXT;
BEGIN
  IF referrer_uid IS NULL THEN RETURN; END IF;
  
  SELECT performance_usdt, referral_levels_overrides INTO perf, overrides FROM public.profiles WHERE id = referrer_uid;
  
  -- Load targets from settings
  v_targets := ARRAY[]::NUMERIC[];
  FOR i IN 5..15 LOOP
    SELECT value INTO v_target_val FROM public.settings WHERE key = 'level' || i || '_target' OR key = 'referral_level_' || i || '_target';
    v_targets := array_append(v_targets, COALESCE(v_target_val, '0')::NUMERIC);
  END LOOP;

  -- Default targets if settings are missing or zero
  IF v_targets[1] = 0 THEN v_targets[1] := 10000; END IF;
  IF v_targets[2] = 0 THEN v_targets[2] := 25000; END IF;
  IF v_targets[3] = 0 THEN v_targets[3] := 50000; END IF;
  IF v_targets[4] = 0 THEN v_targets[4] := 75000; END IF;
  IF v_targets[5] = 0 THEN v_targets[5] := 100000; END IF;
  IF v_targets[6] = 0 THEN v_targets[6] := 150000; END IF;
  IF v_targets[7] = 0 THEN v_targets[7] := 200000; END IF;
  IF v_targets[8] = 0 THEN v_targets[8] := 300000; END IF;
  IF v_targets[9] = 0 THEN v_targets[9] := 400000; END IF;
  IF v_targets[10] = 0 THEN v_targets[10] := 500000; END IF;
  IF v_targets[11] = 0 THEN v_targets[11] := 1000000; END IF;
  
  UPDATE public.profiles SET
    referral_level_5_enabled = COALESCE((overrides->>'level_5')::BOOLEAN, (perf >= v_targets[1])),
    referral_level_6_enabled = COALESCE((overrides->>'level_6')::BOOLEAN, (perf >= v_targets[2])),
    referral_level_7_enabled = COALESCE((overrides->>'level_7')::BOOLEAN, (perf >= v_targets[3])),
    referral_level_8_enabled = COALESCE((overrides->>'level_8')::BOOLEAN, (perf >= v_targets[4])),
    referral_level_9_enabled = COALESCE((overrides->>'level_9')::BOOLEAN, (perf >= v_targets[5])),
    referral_level_10_enabled = COALESCE((overrides->>'level_10')::BOOLEAN, (perf >= v_targets[6])),
    referral_level_11_enabled = COALESCE((overrides->>'level_11')::BOOLEAN, (perf >= v_targets[7])),
    referral_level_12_enabled = COALESCE((overrides->>'level_12')::BOOLEAN, (perf >= v_targets[8])),
    referral_level_13_enabled = COALESCE((overrides->>'level_13')::BOOLEAN, (perf >= v_targets[9])),
    referral_level_14_enabled = COALESCE((overrides->>'level_14')::BOOLEAN, (perf >= v_targets[10])),
    referral_level_15_enabled = COALESCE((overrides->>'level_15')::BOOLEAN, (perf >= v_targets[11]))
  WHERE id = referrer_uid;
END;
$$;
