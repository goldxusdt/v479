ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_document_type TEXT;

-- Create an enum-like constraint if desired, but text is fine for flexibility
-- Possible values: 'passport', 'driver_license', 'state_id', 'national_id', 'other'
