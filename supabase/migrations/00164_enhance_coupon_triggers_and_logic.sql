-- 1. Update can_use_coupon to use 'Invalid or Expired' message
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
        RETURN QUERY SELECT false, 'Invalid or Expired'::text, NULL::text, NULL::numeric;
        RETURN;
    END IF;
    
    -- Check campaign scheduling
    IF v_coupon.campaign_start_at IS NOT NULL AND now() < v_coupon.campaign_start_at THEN
        RETURN QUERY SELECT false, 'Invalid or Expired'::text, NULL::text, NULL::numeric;
        RETURN;
    END IF;
    
    IF v_coupon.campaign_end_at IS NOT NULL AND now() > v_coupon.campaign_end_at THEN
        RETURN QUERY SELECT false, 'Invalid or Expired'::text, NULL::text, NULL::numeric;
        RETURN;
    END IF;

    IF v_coupon.valid_from IS NOT NULL AND now() < v_coupon.valid_from THEN
        RETURN QUERY SELECT false, 'Invalid or Expired'::text, NULL::text, NULL::numeric;
        RETURN;
    END IF;
    
    IF v_coupon.expiry_date IS NOT NULL AND now() > v_coupon.expiry_date THEN
        RETURN QUERY SELECT false, 'Invalid or Expired'::text, NULL::text, NULL::numeric;
        RETURN;
    END IF;
    
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
        RETURN QUERY SELECT false, 'Invalid or Expired'::text, NULL::text, NULL::numeric;
        RETURN;
    END IF;
    
    -- Check redemption type
    IF v_coupon.redemption_type != 'all' AND v_coupon.redemption_type::text != p_transaction_type THEN
        RETURN QUERY SELECT false, 'Invalid or Expired'::text, NULL::text, NULL::numeric;
        RETURN;
    END IF;
    
    -- Check applicable plans
    IF v_coupon.applicable_plans IS NOT NULL AND array_length(v_coupon.applicable_plans, 1) > 0 THEN
        IF p_plan_id IS NULL OR NOT (p_plan_id = ANY(v_coupon.applicable_plans)) THEN
            RETURN QUERY SELECT false, 'Invalid or Expired'::text, NULL::text, NULL::numeric;
            RETURN;
        END IF;
    END IF;
    
    -- Check single use per user
    -- Enforce single use for all coupons as requested: "Each user can use a specific coupon code only once."
    SELECT COUNT(*) INTO v_user_usage_count FROM public.coupon_redemptions WHERE user_id = p_user_id AND coupon_id = v_coupon.id;
    IF v_user_usage_count > 0 THEN
        RETURN QUERY SELECT false, 'Invalid or Expired'::text, NULL::text, NULL::numeric;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT true, NULL::text, v_coupon.discount_type::text, v_coupon.discount_value;
END;
$$;

-- 2. Trigger to populate coupon_redemptions automatically for deposits
CREATE OR REPLACE FUNCTION handle_deposit_coupon_redemption()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.coupon_id IS NOT NULL THEN
        -- Check if redemption already exists to prevent duplicates from API + trigger
        IF NOT EXISTS (SELECT 1 FROM public.coupon_redemptions WHERE transaction_id = NEW.id AND transaction_type = 'deposit') THEN
            INSERT INTO public.coupon_redemptions (
                user_id,
                coupon_id,
                transaction_id,
                transaction_type,
                discount_applied,
                original_fee,
                final_fee
            )
            VALUES (
                NEW.user_id,
                NEW.coupon_id,
                NEW.id,
                'deposit',
                COALESCE(NEW.coupon_bonus, 0),
                NEW.fee + COALESCE(NEW.coupon_bonus, 0),
                NEW.fee
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_deposit_coupon_redemption ON deposits;
CREATE TRIGGER tr_deposit_coupon_redemption
AFTER INSERT ON deposits
FOR EACH ROW
EXECUTE FUNCTION handle_deposit_coupon_redemption();

-- 3. Trigger to populate coupon_redemptions automatically for withdrawals
CREATE OR REPLACE FUNCTION handle_withdrawal_coupon_redemption()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.applied_coupon_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.coupon_redemptions WHERE transaction_id = NEW.id AND transaction_type = 'withdrawal') THEN
            INSERT INTO public.coupon_redemptions (
                user_id,
                coupon_id,
                transaction_id,
                transaction_type,
                discount_applied,
                original_fee,
                final_fee
            )
            VALUES (
                NEW.user_id,
                NEW.applied_coupon_id,
                NEW.id,
                'withdrawal',
                COALESCE(NEW.coupon_discount_amount, 0),
                NEW.fee + COALESCE(NEW.coupon_discount_amount, 0),
                NEW.fee
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_withdrawal_coupon_redemption ON withdrawals;
CREATE TRIGGER tr_withdrawal_coupon_redemption
AFTER INSERT ON withdrawals
FOR EACH ROW
EXECUTE FUNCTION handle_withdrawal_coupon_redemption();

-- 4. Auto-deletion logic: coupons marked as inactive and is_auto_deleted = true when limit or time reached
CREATE OR REPLACE FUNCTION check_coupon_auto_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.usage_limit IS NOT NULL AND NEW.used_count >= NEW.usage_limit) OR 
       (NEW.expiry_date IS NOT NULL AND now() > NEW.expiry_date) OR
       (NEW.campaign_end_at IS NOT NULL AND now() > NEW.campaign_end_at) THEN
        
        NEW.is_active := false;
        NEW.is_auto_deleted := true;
        IF NEW.usage_limit IS NOT NULL AND NEW.used_count >= NEW.usage_limit THEN
            NEW.deletion_reason := 'Usage limit reached';
        ELSE
            NEW.deletion_reason := 'Expired';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_coupon_auto_delete ON coupons;
CREATE TRIGGER tr_coupon_auto_delete
BEFORE UPDATE OF used_count, expiry_date, campaign_end_at ON coupons
FOR EACH ROW
EXECUTE FUNCTION check_coupon_auto_delete();

-- 5. Backfill existing redemptions from deposits that have coupons but no redemption record
INSERT INTO public.coupon_redemptions (
    user_id,
    coupon_id,
    transaction_id,
    transaction_type,
    discount_applied,
    original_fee,
    final_fee,
    created_at
)
SELECT 
    d.user_id,
    d.coupon_id,
    d.id,
    'deposit',
    COALESCE(d.coupon_bonus, 0),
    d.fee + COALESCE(d.coupon_bonus, 0),
    d.fee,
    d.created_at
FROM deposits d
LEFT JOIN coupon_redemptions r ON r.transaction_id = d.id AND r.transaction_type = 'deposit'
WHERE d.coupon_id IS NOT NULL AND r.id IS NULL;
