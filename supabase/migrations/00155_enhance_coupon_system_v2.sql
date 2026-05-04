-- Add scheduling and auto-deletion columns to coupons
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS campaign_start_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS campaign_end_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS auto_activate BOOLEAN DEFAULT TRUE;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS auto_deactivate BOOLEAN DEFAULT TRUE;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_auto_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Create table for auto-generation settings
CREATE TABLE IF NOT EXISTS coupon_auto_generation_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL, -- 'tier' or 'performance'
    name TEXT NOT NULL,
    threshold NUMERIC NOT NULL,
    discount_type TEXT NOT NULL,
    discount_value NUMERIC NOT NULL,
    validity_days INTEGER NOT NULL,
    transaction_type TEXT DEFAULT 'all',
    applicable_plans UUID[] DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE coupon_auto_generation_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'coupon_auto_generation_settings' AND policyname = 'Admins have full access to coupon_auto_generation_settings'
    ) THEN
        CREATE POLICY "Admins have full access to coupon_auto_generation_settings"
        ON coupon_auto_generation_settings
        FOR ALL
        TO authenticated
        USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

-- Update can_use_coupon to support scheduling
CREATE OR REPLACE FUNCTION public.can_use_coupon(
    p_user_id uuid,
    p_coupon_code text,
    p_transaction_type text,
    p_plan_id uuid DEFAULT NULL
)
RETURNS TABLE(is_valid boolean, error_message text, discount_type text, discount_value numeric) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_coupon record;
    v_usage_count int;
    v_user_usage_count int;
BEGIN
    SELECT * INTO v_coupon FROM public.coupons WHERE code = p_coupon_code AND is_active = true AND is_auto_deleted = false;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Invalid or inactive coupon code.'::text, NULL::text, NULL::numeric;
        RETURN;
    END IF;
    
    -- Check campaign scheduling
    IF v_coupon.campaign_start_at IS NOT NULL AND now() < v_coupon.campaign_start_at THEN
        RETURN QUERY SELECT false, ('Coupon is not yet active. Campaign starts on ' || v_coupon.campaign_start_at::text)::text, NULL::text, NULL::numeric;
        RETURN;
    END IF;
    
    IF v_coupon.campaign_end_at IS NOT NULL AND now() > v_coupon.campaign_end_at THEN
        RETURN QUERY SELECT false, 'This coupon campaign has ended.'::text, NULL::text, NULL::numeric;
        RETURN;
    END IF;

    IF v_coupon.valid_from IS NOT NULL AND now() < v_coupon.valid_from THEN
        RETURN QUERY SELECT false, 'Coupon is not yet valid.'::text, NULL::text, NULL::numeric;
        RETURN;
    END IF;
    
    IF v_coupon.expiry_date IS NOT NULL AND now() > v_coupon.expiry_date THEN
        RETURN QUERY SELECT false, 'Coupon has expired.'::text, NULL::text, NULL::numeric;
        RETURN;
    END IF;
    
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
        RETURN QUERY SELECT false, 'Coupon has reached its maximum usage limit.'::text, NULL::text, NULL::numeric;
        RETURN;
    END IF;
    
    -- Check redemption type
    IF v_coupon.redemption_type != 'all' AND v_coupon.redemption_type::text != p_transaction_type THEN
        RETURN QUERY SELECT false, ('Coupon is only valid for ' || v_coupon.redemption_type || 's.')::text, NULL::text, NULL::numeric;
        RETURN;
    END IF;
    
    -- Check applicable plans
    IF v_coupon.applicable_plans IS NOT NULL AND array_length(v_coupon.applicable_plans, 1) > 0 THEN
        IF p_plan_id IS NULL OR NOT (p_plan_id = ANY(v_coupon.applicable_plans)) THEN
            RETURN QUERY SELECT false, 'Coupon is not valid for the selected investment plan.'::text, NULL::text, NULL::numeric;
            RETURN;
        END IF;
    END IF;
    
    -- Check single use per user
    IF v_coupon.single_use_per_user THEN
        SELECT COUNT(*) INTO v_user_usage_count FROM public.coupon_redemptions WHERE user_id = p_user_id AND coupon_id = v_coupon.id;
        IF v_user_usage_count > 0 THEN
            RETURN QUERY SELECT false, 'You have already used this coupon code.'::text, NULL::text, NULL::numeric;
            RETURN;
        END IF;
    END IF;
    
    RETURN QUERY SELECT true, NULL::text, v_coupon.discount_type::text, v_coupon.discount_value;
END;
$$;
