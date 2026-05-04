-- Update get_downline_network to have default p_max_levels
CREATE OR REPLACE FUNCTION get_downline_network(p_user_id UUID, p_max_levels INTEGER DEFAULT 15)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    email TEXT,
    level INTEGER,
    referrer_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    kyc_status public.kyc_status,
    is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE downline AS (
    -- Initial base case (direct referrals)
    SELECT 
      p.id as user_id, 
      p.username, 
      p.email, 
      1 as level, 
      p.referrer_id, 
      p.created_at, 
      p.kyc_status, 
      p.is_active
    FROM profiles p
    WHERE p.referrer_id = p_user_id
    
    UNION ALL
    
    -- Recursive step
    SELECT 
      p.id, 
      p.username, 
      p.email, 
      d.level + 1, 
      p.referrer_id, 
      p.created_at, 
      p.kyc_status, 
      p.is_active
    FROM profiles p
    INNER JOIN downline d ON p.referrer_id = d.user_id
    WHERE d.level < p_max_levels
  )
  SELECT * FROM downline;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update level unlocking logic to be count-based instead of volume-based (Requirement 7)
CREATE OR REPLACE FUNCTION check_and_enable_referral_levels(referrer_uid UUID)
RETURNS VOID AS $$
DECLARE
  ref_count INTEGER;
  overrides JSONB;
  v_targets INTEGER[];
  i INTEGER;
  v_target_val TEXT;
BEGIN
  IF referrer_uid IS NULL THEN RETURN; END IF;
  
  -- Get count of direct referrals (Level 1) instead of volume
  SELECT COUNT(*) INTO ref_count FROM public.profiles WHERE referrer_id = referrer_uid;
  SELECT referral_levels_overrides INTO overrides FROM public.profiles WHERE id = referrer_uid;
  
  -- Load targets from settings (now interpreted as account counts)
  v_targets := ARRAY[]::INTEGER[];
  FOR i IN 5..15 LOOP
    SELECT value INTO v_target_val FROM public.settings WHERE key = 'level' || i || '_target' OR key = 'referral_level_' || i || '_target';
    v_targets := array_append(v_targets, COALESCE(v_target_val, (i * 5)::TEXT)::INTEGER);
  END LOOP;

  -- Update profiles based on count
  UPDATE public.profiles SET
    referral_level_5_enabled = COALESCE((overrides->>'level_5')::BOOLEAN, (ref_count >= v_targets[1])),
    referral_level_6_enabled = COALESCE((overrides->>'level_6')::BOOLEAN, (ref_count >= v_targets[2])),
    referral_level_7_enabled = COALESCE((overrides->>'level_7')::BOOLEAN, (ref_count >= v_targets[3])),
    referral_level_8_enabled = COALESCE((overrides->>'level_8')::BOOLEAN, (ref_count >= v_targets[4])),
    referral_level_9_enabled = COALESCE((overrides->>'level_9')::BOOLEAN, (ref_count >= v_targets[5])),
    referral_level_10_enabled = COALESCE((overrides->>'level_10')::BOOLEAN, (ref_count >= v_targets[6])),
    referral_level_11_enabled = COALESCE((overrides->>'level_11')::BOOLEAN, (ref_count >= v_targets[7])),
    referral_level_12_enabled = COALESCE((overrides->>'level_12')::BOOLEAN, (ref_count >= v_targets[8])),
    referral_level_13_enabled = COALESCE((overrides->>'level_13')::BOOLEAN, (ref_count >= v_targets[9])),
    referral_level_14_enabled = COALESCE((overrides->>'level_14')::BOOLEAN, (ref_count >= v_targets[10])),
    referral_level_15_enabled = COALESCE((overrides->>'level_15')::BOOLEAN, (ref_count >= v_targets[11]))
  WHERE id = referrer_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add cooling_period_start to profiles to track the overall cooling period
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_approved_deposit_at TIMESTAMPTZ;

-- Trigger to update last_approved_deposit_at when a deposit is approved
CREATE OR REPLACE FUNCTION update_last_deposit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        UPDATE profiles SET last_approved_deposit_at = NEW.approved_at WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_last_deposit_timestamp ON deposits;
CREATE TRIGGER tr_update_last_deposit_timestamp
AFTER UPDATE OF status ON deposits
FOR EACH ROW
EXECUTE FUNCTION update_last_deposit_timestamp();

-- Initialize existing last_approved_deposit_at for users with approved deposits
UPDATE profiles p
SET last_approved_deposit_at = d.approved_at
FROM (
    SELECT user_id, MAX(approved_at) as approved_at
    FROM deposits
    WHERE status = 'approved'
    GROUP BY user_id
) d
WHERE p.id = d.user_id AND p.last_approved_deposit_at IS NULL;
