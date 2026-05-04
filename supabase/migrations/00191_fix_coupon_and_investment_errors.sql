-- 1. Remove recursive and broken triggers/functions on coupons
DROP TRIGGER IF EXISTS tr_cleanup_expired_coupons ON public.coupons;
DROP FUNCTION IF EXISTS public.delete_expired_coupons();

-- 2. Fix the unique constraint on coupons to allow re-using codes of deleted coupons
-- First, remove the old suffixing trigger if it exists
DROP TRIGGER IF EXISTS tr_coupon_soft_delete ON public.coupons;
DROP FUNCTION IF EXISTS public.handle_coupon_soft_delete();

-- Second, replace the unique constraint with a conditional unique index
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_code_key;

-- We use a conditional unique index so 'code' must be unique ONLY among non-deleted coupons
DROP INDEX IF EXISTS idx_coupons_code_active;
CREATE UNIQUE INDEX idx_coupons_code_active ON public.coupons (code) WHERE (is_deleted = false);

-- 3. Fix the 'amount' vs 'balance' error in any relevant functions
-- Re-defining check_coupon_auto_delete to ensure it's robust and uses correct columns
CREATE OR REPLACE FUNCTION public.check_coupon_auto_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_roi_balance NUMERIC;
BEGIN
    -- Check for usage limit, expiry date, or campaign end
    IF (NEW.usage_limit IS NOT NULL AND NEW.used_count >= NEW.usage_limit) OR 
       (NEW.expiry_date IS NOT NULL AND now() > NEW.expiry_date) OR
       (NEW.campaign_end_at IS NOT NULL AND now() > NEW.campaign_end_at) THEN
        
        -- Mark as inactive and auto-deleted
        NEW.is_active := false;
        -- We don't necessarily want to mark it as is_deleted automatically 
        -- if we want it to show in 'active' but 'expired' list, 
        -- but if the system treats auto-delete as soft-delete:
        NEW.is_auto_deleted := true;
        
        IF NEW.usage_limit IS NOT NULL AND NEW.used_count >= NEW.usage_limit THEN
            NEW.deletion_reason := 'Usage limit reached';
        ELSE
            NEW.deletion_reason := 'Expired';
        END IF;

        -- Capture ROI balance if targeted_user_id exists
        IF NEW.targeted_user_id IS NOT NULL THEN
            -- FIX: use 'balance' instead of 'amount'
            SELECT balance INTO v_roi_balance 
            FROM public.wallets 
            WHERE user_id = NEW.targeted_user_id AND wallet_type = 'roi';
            
            NEW.roi_balance_at_deletion := v_roi_balance;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

-- 4. Ensure bulk delete operations are safe and don't fire recursive triggers
-- We already dropped tr_cleanup_expired_coupons which was the main cause.

-- 5. Fix handle_investment_option_deletion to be safe
CREATE OR REPLACE FUNCTION public.handle_investment_option_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- This update on coupons will fire tr_coupon_auto_delete (BEFORE UPDATE),
    -- which is now safe and fixed.
    UPDATE public.coupons 
    SET applicable_plans = array_remove(applicable_plans, OLD.id)
    WHERE OLD.id = ANY(applicable_plans);
    RETURN OLD;
END;
$function$;
