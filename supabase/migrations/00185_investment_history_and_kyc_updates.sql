-- Add expires_at to investment_options
ALTER TABLE public.investment_options ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Create investment_history table
CREATE TABLE IF NOT EXISTS public.investment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    plan_name TEXT NOT NULL,
    plan_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expired_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    participant_count INTEGER DEFAULT 0,
    total_deposit_amount NUMERIC(20, 2) DEFAULT 0,
    metadata JSONB
);

-- Enable RLS for investment_history
ALTER TABLE public.investment_history ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on investment_history
CREATE POLICY "Admins can manage investment history" ON public.investment_history
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Users can view their own part? No, the PRD says Investment History is for Admin side.
-- So no user policy needed for now.

-- Add uploaded_by_admin to kyc_documents
ALTER TABLE public.kyc_documents ADD COLUMN IF NOT EXISTS uploaded_by_admin BOOLEAN DEFAULT FALSE;

-- Function to handle plan expiration and move to history
CREATE OR REPLACE FUNCTION public.process_plan_expiration()
RETURNS void AS $$
DECLARE
    plan_record RECORD;
    p_count INTEGER;
    t_amount NUMERIC;
BEGIN
    FOR plan_record IN 
        SELECT * FROM public.investment_options 
        WHERE is_active = true 
        AND expires_at IS NOT NULL 
        AND expires_at <= now()
    LOOP
        -- Calculate stats
        SELECT COUNT(DISTINCT user_id), COALESCE(SUM(amount), 0)
        INTO p_count, t_amount
        FROM public.user_investment_selections
        WHERE investment_option_id = plan_record.id
        AND status = 'active';

        -- Insert into history
        INSERT INTO public.investment_history (
            plan_id,
            plan_name,
            plan_description,
            created_at,
            expired_at,
            participant_count,
            total_deposit_amount,
            metadata
        ) VALUES (
            plan_record.id,
            plan_record.option_name,
            plan_record.description,
            plan_record.created_at,
            now(),
            p_count,
            t_amount,
            to_jsonb(plan_record)
        );

        -- Deactivate plan
        UPDATE public.investment_options
        SET is_active = false, is_visible = false
        WHERE id = plan_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
