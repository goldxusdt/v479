-- Add missing columns to announcements
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS target_audience text DEFAULT 'all';

-- Ensure user_role enum exists (it should, from previous steps)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'admin');
    END IF;
END $$;

-- Add mfa_login_otp_verified to track session-specific verification if needed
-- Actually, AuthContext and RouteGuard use mfaVerified state, which is session-based.
-- We will handle the dual check in verify-otp.
