-- RPC to process monthly rewards for top performers
CREATE OR REPLACE FUNCTION process_monthly_rewards()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_user RECORD;
  v_rank INTEGER := 0;
  v_bonus_amount NUMERIC;
  v_badge_id UUID;
BEGIN
  v_period_start := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;

  -- 1. Process Top 5 Leaderboard Performers
  FOR v_user IN 
    -- Same ranking logic as getLeaderboard but based on performance_usdt
    SELECT id, full_name, performance_usdt
    FROM public.profiles
    WHERE is_active = true
    ORDER BY performance_usdt DESC NULLS LAST
    LIMIT 5
  LOOP
    v_rank := v_rank + 1;
    
    -- Bonus Calculation (example: 1000, 500, 250, 100, 50)
    v_bonus_amount := CASE 
      WHEN v_rank = 1 THEN 1000
      WHEN v_rank = 2 THEN 500
      WHEN v_rank = 3 THEN 250
      WHEN v_rank = 4 THEN 100
      ELSE 50
    END;

    -- A. Distribute Bonus
    INSERT INTO public.monthly_rewards (user_id, amount, reward_type, period_start, period_end)
    VALUES (v_user.id, v_bonus_amount, 'top_performer', v_period_start, v_period_end);

    -- B. Update Wallet (Credit to BONUS wallet)
    UPDATE public.wallets 
    SET balance = balance + v_bonus_amount, updated_at = now()
    WHERE user_id = v_user.id AND wallet_type = 'bonus';

    -- C. Create Transaction
    INSERT INTO public.transactions (user_id, transaction_type, amount, fee, net_amount, status)
    VALUES (v_user.id, 'referral_commission', v_bonus_amount, 0, v_bonus_amount, 'completed');

    -- D. Award Badge (Pioneer Badge for top 5)
    SELECT id INTO v_badge_id FROM public.badges WHERE name = 'Pioneer' LIMIT 1;
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges (user_id, badge_id)
      VALUES (v_user.id, v_badge_id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;

    -- E. Log activity
    INSERT INTO public.activity_logs (user_id, action, description)
    VALUES (v_user.id, 'monthly_reward_credited', 'Received $' || v_bonus_amount || ' for Rank #' || v_rank || ' on leaderboard.');
  END LOOP;

  -- 2. Award Elite Recruiter / Network Architect Badges based on network depth
  FOR v_user IN SELECT id, 
    (CASE WHEN referral_level_15_enabled THEN 15 
          WHEN referral_level_14_enabled THEN 14
          WHEN referral_level_13_enabled THEN 13
          WHEN referral_level_12_enabled THEN 12
          WHEN referral_level_11_enabled THEN 11
          WHEN referral_level_10_enabled THEN 10
          WHEN referral_level_9_enabled THEN 9
          WHEN referral_level_8_enabled THEN 8
          WHEN referral_level_7_enabled THEN 7
          WHEN referral_level_6_enabled THEN 6
          WHEN referral_level_5_enabled THEN 5
          ELSE 4 END) as levels
    FROM public.profiles WHERE is_active = true
  LOOP
    -- Award Network Architect if 15 levels unlocked
    IF v_user.levels = 15 THEN
      SELECT id INTO v_badge_id FROM public.badges WHERE name = 'Network Architect' LIMIT 1;
      IF v_badge_id IS NOT NULL THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (v_user.id, v_badge_id) ON CONFLICT DO NOTHING;
      END IF;
    -- Award Elite Recruiter if 10+ levels unlocked
    ELSIF v_user.levels >= 10 THEN
      SELECT id INTO v_badge_id FROM public.badges WHERE name = 'Elite Recruiter' LIMIT 1;
      IF v_badge_id IS NOT NULL THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (v_user.id, v_badge_id) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$$;
