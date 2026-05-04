-- Add missing columns to coupon_redemptions for better analytics
ALTER TABLE public.coupon_redemptions 
ADD COLUMN IF NOT EXISTS original_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_fee numeric DEFAULT 0;

-- Ensure coupons table has total_savings tracking
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS total_savings numeric DEFAULT 0;

-- Add coupon_id and discount fields to transactions table for direct linking
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS applied_coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS coupon_discount_amount numeric DEFAULT 0;

-- Update the increment_coupon_usage function to also track total savings
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_coupon_id uuid, p_discount_amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.coupons 
    SET used_count = COALESCE(used_count, 0) + 1,
        total_savings = COALESCE(total_savings, 0) + p_discount_amount
    WHERE id = p_coupon_id;
END;
$$;
