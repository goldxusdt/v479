-- Drop old function first
DROP FUNCTION IF EXISTS get_referral_chain(UUID);

-- Update get_referral_chain to handle 15 levels
CREATE OR REPLACE FUNCTION get_referral_chain(user_id UUID)
RETURNS TABLE (
  referrer_id UUID,
  level INTEGER,
  commission_rate DECIMAL(20, 8)
) AS $$
DECLARE
  current_referrer UUID;
  current_level INTEGER := 1;
  v_rate_val TEXT;
  v_rate DECIMAL(20, 8);
  v_enabled BOOLEAN;
BEGIN
  -- Get the first referrer
  SELECT p.referrer_id INTO current_referrer FROM profiles p WHERE p.id = user_id;
  
  -- Loop through referral chain up to level 15
  WHILE current_referrer IS NOT NULL AND current_level <= 15 LOOP
    -- Get commission rate for current level from settings table
    SELECT value INTO v_rate_val 
    FROM settings WHERE key = 'referral_level' || current_level || '_commission' 
    OR key = 'level' || current_level || '_commission';
    
    v_rate := (COALESCE(v_rate_val, '0')::DECIMAL / 100.0);
    
    -- Check if level is enabled for the current referrer
    IF current_level <= 4 THEN
      v_enabled := TRUE; -- Levels 1-4 are always enabled
    ELSE
      -- Dynamic check for levels 5-15
      CASE current_level
        WHEN 5 THEN SELECT referral_level_5_enabled INTO v_enabled FROM profiles WHERE id = current_referrer;
        WHEN 6 THEN SELECT referral_level_6_enabled INTO v_enabled FROM profiles WHERE id = current_referrer;
        WHEN 7 THEN SELECT referral_level_7_enabled INTO v_enabled FROM profiles WHERE id = current_referrer;
        WHEN 8 THEN SELECT referral_level_8_enabled INTO v_enabled FROM profiles WHERE id = current_referrer;
        WHEN 9 THEN SELECT referral_level_9_enabled INTO v_enabled FROM profiles WHERE id = current_referrer;
        WHEN 10 THEN SELECT referral_level_10_enabled INTO v_enabled FROM profiles WHERE id = current_referrer;
        WHEN 11 THEN SELECT referral_level_11_enabled INTO v_enabled FROM profiles WHERE id = current_referrer;
        WHEN 12 THEN SELECT referral_level_12_enabled INTO v_enabled FROM profiles WHERE id = current_referrer;
        WHEN 13 THEN SELECT referral_level_13_enabled INTO v_enabled FROM profiles WHERE id = current_referrer;
        WHEN 14 THEN SELECT referral_level_14_enabled INTO v_enabled FROM profiles WHERE id = current_referrer;
        WHEN 15 THEN SELECT referral_level_15_enabled INTO v_enabled FROM profiles WHERE id = current_referrer;
        ELSE v_enabled := FALSE;
      END CASE;
    END IF;
    
    IF v_enabled AND v_rate > 0 THEN
      referrer_id := current_referrer;
      level := current_level;
      commission_rate := v_rate;
      RETURN NEXT;
    END IF;
    
    -- Get next referrer in chain
    SELECT p.referrer_id INTO current_referrer FROM profiles p WHERE p.id = current_referrer;
    current_level := current_level + 1;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
