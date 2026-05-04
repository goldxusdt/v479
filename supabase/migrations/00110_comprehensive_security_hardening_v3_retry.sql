
-- 1. Enable RLS on previously missed tables (CWE-862)
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;

-- 2. Add policies for missed tables
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_otp' AND tablename = 'otp_verifications') THEN
        CREATE POLICY "service_role_all_otp" ON public.otp_verifications FOR ALL TO service_role USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_pending' AND tablename = 'pending_signups') THEN
        CREATE POLICY "service_role_all_pending" ON public.pending_signups FOR ALL TO service_role USING (true);
    END IF;
END $$;

-- 3. Add CHECK constraints for data integrity (CWE-20, CWE-190)
-- Use a safer way to add constraints that might already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'balance_non_negative') THEN
        ALTER TABLE public.wallets ADD CONSTRAINT balance_non_negative CHECK (balance >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'amount_positive') THEN
        ALTER TABLE public.transactions ADD CONSTRAINT amount_positive CHECK (amount > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deposit_amount_positive') THEN
        ALTER TABLE public.deposits ADD CONSTRAINT deposit_amount_positive CHECK (amount > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'withdrawal_amount_positive') THEN
        ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawal_amount_positive CHECK (amount > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'otp_code_length') THEN
        ALTER TABLE public.otp_verifications ADD CONSTRAINT otp_code_length CHECK (length(otp_code) = 6);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_format') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$');
    END IF;
END $$;

-- 4. Secure Sensitive Information (CWE-200, CWE-209)
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT id, username, full_name, role, kyc_status, created_at, country, is_active, referral_code
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;

-- 5. Enhanced Audit Logging (CWE-778)
CREATE OR REPLACE FUNCTION public.log_critical_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.admin_audit_logs (
        admin_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data,
        ip_address
    )
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::jsonb ELSE NULL END,
        COALESCE(current_setting('request.headers', true)::jsonb->>'x-real-ip', '0.0.0.0')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to investment_options
DROP TRIGGER IF EXISTS audit_investment_options ON public.investment_options;
CREATE TRIGGER audit_investment_options
AFTER INSERT OR UPDATE OR DELETE ON public.investment_options
FOR EACH ROW EXECUTE FUNCTION public.log_critical_action();

-- Apply to platform_settings
DROP TRIGGER IF EXISTS audit_platform_settings ON public.platform_settings;
CREATE TRIGGER audit_platform_settings
AFTER INSERT OR UPDATE OR DELETE ON public.platform_settings
FOR EACH ROW EXECUTE FUNCTION public.log_critical_action();
