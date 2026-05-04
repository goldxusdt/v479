-- Add ROI and referral percentage settings
INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
  ('roi_percentage_monthly', '10', 'Monthly ROI percentage (e.g., 10 for 10%)'),
  ('referral_level1_percentage', '8', 'Level 1 referral commission percentage'),
  ('referral_level2_percentage', '4', 'Level 2 referral commission percentage'),
  ('referral_level3_percentage', '2', 'Level 3 referral commission percentage'),
  ('referral_level4_percentage', '1', 'Level 4 referral commission percentage'),
  ('bscscan_api_key', '', 'BSCScan API key for BEP-20 transaction verification'),
  ('tronscan_api_key', '', 'TronScan API key for TRC-20 transaction verification')
ON CONFLICT (setting_key) DO NOTHING;