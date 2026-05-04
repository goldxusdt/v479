-- Drop the existing constraint
ALTER TABLE public.otp_verifications 
DROP CONSTRAINT IF EXISTS otp_verifications_purpose_check;

-- Add the updated constraint with admin_login included
ALTER TABLE public.otp_verifications 
ADD CONSTRAINT otp_verifications_purpose_check 
CHECK (purpose = ANY (ARRAY['signup'::text, 'login'::text, 'password_reset'::text, 'admin_login'::text, 'totp_verification'::text]));