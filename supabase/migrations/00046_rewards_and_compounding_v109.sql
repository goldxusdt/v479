-- 1. Modify profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_compounding_enabled BOOLEAN DEFAULT false;

-- 2. Create badges table
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  criteria_type TEXT, -- 'network_depth', 'total_volume', 'active_referrals'
  criteria_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create user_badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- 4. Create monthly_rewards table
CREATE TABLE IF NOT EXISTS public.monthly_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reward_type TEXT NOT NULL, -- 'top_performer', 'network_bonus', 'elite_bonus'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  distributed_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RPC for Downline Summary
-- This function calculates stats for 15 levels of downline for a given user
CREATE OR REPLACE FUNCTION get_downline_summary(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH RECURSIVE downline AS (
    -- Anchor: Direct referrals (Level 1)
    SELECT 
      id, 
      referrer_id, 
      full_name,
      kyc_status,
      created_at,
      1 as level
    FROM public.profiles
    WHERE referrer_id = target_user_id

    UNION ALL

    -- Recursive step: referrals of referrals
    SELECT 
      p.id, 
      p.referrer_id, 
      p.full_name,
      p.kyc_status,
      p.created_at,
      d.level + 1
    FROM public.profiles p
    JOIN downline d ON p.referrer_id = d.id
    WHERE d.level < 15
  )
  SELECT jsonb_agg(summary) INTO result
  FROM (
    SELECT 
      level,
      count(*) as member_count,
      count(*) FILTER (WHERE kyc_status = 'approved') as active_count,
      -- Get total deposit volume for this level
      COALESCE((
        SELECT SUM(amount) 
        FROM public.deposits 
        WHERE user_id IN (SELECT id FROM downline d2 WHERE d2.level = downline.level)
        AND status = 'approved'
      ), 0) as total_volume
    FROM downline
    GROUP BY level
    ORDER BY level
  ) summary;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- 6. RPC for ROI Compounding
-- This function credits ROI. If is_compounding_enabled is true, it goes to deposit capital.
-- Otherwise, it goes to ROI wallet.
CREATE OR REPLACE FUNCTION process_compounding_roi()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_deposit RECORD;
  v_roi_percentage NUMERIC;
  v_daily_roi_percentage NUMERIC;
  v_roi_amount NUMERIC;
  v_last_credit TIMESTAMPTZ;
BEGIN
  -- Get ROI percentages from settings
  SELECT value::NUMERIC INTO v_roi_percentage FROM public.settings WHERE key = 'monthly_roi_percentage';
  v_daily_roi_percentage := v_roi_percentage / 30.0; -- Approximate daily

  -- Loop through all active profiles who haven't been credited today
  FOR v_user IN 
    SELECT id, is_compounding_enabled 
    FROM public.profiles 
    WHERE is_active = true 
    AND (last_roi_credit_at IS NULL OR last_roi_credit_at < CURRENT_DATE)
  LOOP
    -- Calculate ROI for each active deposit
    FOR v_deposit IN 
      SELECT id, amount 
      FROM public.deposits 
      WHERE user_id = v_user.id AND status = 'approved'
    LOOP
      v_roi_amount := v_deposit.amount * (v_daily_roi_percentage / 100.0);
      
      IF v_roi_amount > 0 THEN
        -- 1. Create ROI transaction record
        INSERT INTO public.transactions (
          user_id, transaction_type, amount, fee, net_amount, status
        ) VALUES (
          v_user.id, 'roi_credit', v_roi_amount, 0, v_roi_amount, 'completed'
        );

        -- 2. Create ROI record
        INSERT INTO public.roi_records (
          user_id, deposit_id, roi_amount, roi_percentage, month_number
        ) VALUES (
          v_user.id, v_deposit.id, v_roi_amount, v_daily_roi_percentage, 1
        );

        -- 3. Update Wallet based on compounding preference
        IF v_user.is_compounding_enabled THEN
          -- Credit to DEPOSIT wallet (reinvestment)
          UPDATE public.wallets 
          SET balance = balance + v_roi_amount, updated_at = now()
          WHERE user_id = v_user.id AND wallet_type = 'deposit';
          
          -- ALSO update the deposit capital so future ROI is higher
          UPDATE public.deposits 
          SET amount = amount + v_roi_amount 
          WHERE id = v_deposit.id;
        ELSE
          -- Credit to ROI wallet (for withdrawal)
          UPDATE public.wallets 
          SET balance = balance + v_roi_amount, updated_at = now()
          WHERE user_id = v_user.id AND wallet_type = 'roi';
        END IF;
      END IF;
    END LOOP;

    -- Update last credit timestamp
    UPDATE public.profiles SET last_roi_credit_at = now() WHERE id = v_user.id;
  END LOOP;
END;
$$;

-- 7. Insert Initial Badges
INSERT INTO public.badges (name, description, icon_url, criteria_type, criteria_value)
VALUES 
('Pioneer', 'Top 5 performers on the network leaderboard', 'https://api.iconify.design/solar:crown-minimalistic-bold-duotone.svg', 'leaderboard_rank', 5),
('Elite Recruiter', 'Unlocked 10 levels of the referral system', 'https://api.iconify.design/solar:medal-star-bold-duotone.svg', 'network_depth', 10),
('Network Architect', 'Unlocked all 15 levels of the referral system', 'https://api.iconify.design/solar:star-rainbow-bold-duotone.svg', 'network_depth', 15),
('Volume King', 'Total network volume exceeded 1,000,000 USDT', 'https://api.iconify.design/solar:fire-bold-duotone.svg', 'total_volume', 1000000)
ON CONFLICT DO NOTHING;

-- Enable RLS and add basic policies
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to badges" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Users can view their own badges" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own monthly rewards" ON public.monthly_rewards FOR SELECT USING (auth.uid() = user_id);
