-- Update get_referral_chain function to read commission rates from platform_settings
CREATE OR REPLACE FUNCTION get_referral_chain(user_id UUID)
RETURNS TABLE (
  level INTEGER,
  referrer_id UUID,
  commission_rate DECIMAL(5, 4)
) LANGUAGE plpgsql AS $$
DECLARE
  current_referrer UUID;
  current_level INTEGER := 1;
  rate_level1 DECIMAL(5, 4);
  rate_level2 DECIMAL(5, 4);
  rate_level3 DECIMAL(5, 4);
  rate_level4 DECIMAL(5, 4);
BEGIN
  -- Read commission rates from platform_settings
  SELECT COALESCE((setting_value::DECIMAL / 100), 0.08) INTO rate_level1
  FROM platform_settings WHERE setting_key = 'referral_level1_percentage';
  
  SELECT COALESCE((setting_value::DECIMAL / 100), 0.04) INTO rate_level2
  FROM platform_settings WHERE setting_key = 'referral_level2_percentage';
  
  SELECT COALESCE((setting_value::DECIMAL / 100), 0.02) INTO rate_level3
  FROM platform_settings WHERE setting_key = 'referral_level3_percentage';
  
  SELECT COALESCE((setting_value::DECIMAL / 100), 0.01) INTO rate_level4
  FROM platform_settings WHERE setting_key = 'referral_level4_percentage';
  
  -- Get the first referrer
  SELECT p.referrer_id INTO current_referrer FROM profiles p WHERE p.id = user_id;
  
  -- Loop through referral chain
  WHILE current_referrer IS NOT NULL AND current_level <= 4 LOOP
    level := current_level;
    referrer_id := current_referrer;
    
    -- Assign commission rate based on level
    CASE current_level
      WHEN 1 THEN commission_rate := rate_level1;
      WHEN 2 THEN commission_rate := rate_level2;
      WHEN 3 THEN commission_rate := rate_level3;
      WHEN 4 THEN commission_rate := rate_level4;
    END CASE;
    
    RETURN NEXT;
    
    -- Get next referrer in chain
    SELECT p.referrer_id INTO current_referrer FROM profiles p WHERE p.id = current_referrer;
    current_level := current_level + 1;
  END LOOP;
  
  RETURN;
END;
$$;

-- Add comment to document the fix
COMMENT ON FUNCTION get_referral_chain(UUID) IS 
'Returns the referral chain for a user with commission rates read from platform_settings in real-time';
