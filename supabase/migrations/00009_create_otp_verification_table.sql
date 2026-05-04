-- Create OTP verification table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'login', 'password_reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_email_purpose ON otp_verifications(email, purpose, verified);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at);

-- Auto-delete expired OTPs (cleanup function)
CREATE OR REPLACE FUNCTION delete_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM otp_verifications
  WHERE expires_at < NOW();
END;
$$;

-- RLS Policies (no direct access from client)
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access
CREATE POLICY "Service role only" ON otp_verifications
  FOR ALL
  USING (false);

COMMENT ON TABLE otp_verifications IS 'Stores OTP codes for email verification during signup and login';