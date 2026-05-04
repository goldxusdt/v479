-- Create custom types for coupons
DO $$ BEGIN
    CREATE TYPE coupon_discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE coupon_redemption_type AS ENUM ('deposit', 'withdrawal', 'all');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update coupons table
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS discount_type coupon_discount_type DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS discount_value numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS redemption_type coupon_redemption_type DEFAULT 'all',
ADD COLUMN IF NOT EXISTS applicable_plans uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS single_use_per_user boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS valid_from timestamp with time zone;

-- Migrate existing data if any
UPDATE public.coupons SET discount_value = percentage WHERE percentage IS NOT NULL;

-- Create coupon_redemptions table
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    transaction_id uuid, -- Link to deposit or withdrawal ID if possible
    transaction_type text CHECK (transaction_type IN ('deposit', 'withdrawal')),
    discount_applied numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Policies for coupon_redemptions
DO $$ BEGIN
    CREATE POLICY "Users can view their own redemptions" 
    ON public.coupon_redemptions FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can view all redemptions" 
    ON public.coupon_redemptions FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Helper function to validate coupon usage
CREATE OR REPLACE FUNCTION public.can_use_coupon(p_user_id uuid, p_coupon_code text, p_transaction_type text, p_plan_id uuid DEFAULT NULL)
RETURNS TABLE (
    is_valid boolean,
    error_message text,
    discount_type text,
    discount_value numeric
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_coupon record;
    v_usage_count int;
    v_user_usage_count int;
BEGIN
    SELECT * INTO v_coupon FROM public.coupons WHERE code = p_coupon_code AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Invalid or inactive coupon code.'::text, NULL::text, NULL::numeric;
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
    
    -- Check redemption type (deposit/withdrawal/all)
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
