ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_roi_credit_at TIMESTAMPTZ;

-- Update existing profiles with a default value
UPDATE profiles SET last_roi_credit_at = created_at WHERE last_roi_credit_at IS NULL;
