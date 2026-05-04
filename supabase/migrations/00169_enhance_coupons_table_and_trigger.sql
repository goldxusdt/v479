ALTER TABLE coupons ADD COLUMN IF NOT EXISTS targeted_user_id UUID REFERENCES profiles(id);
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS roi_balance_at_deletion NUMERIC DEFAULT NULL;

-- Update the auto-generate function to store the targeted user ID
-- (I will do this in the edge function later)

-- Update the auto-deletion trigger to capture ROI balance if user_id is present
CREATE OR REPLACE FUNCTION check_coupon_auto_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_roi_balance NUMERIC;
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

        -- Capture ROI balance if targeted_user_id exists
        IF NEW.targeted_user_id IS NOT NULL THEN
            SELECT balance INTO v_roi_balance 
            FROM public.wallets 
            WHERE user_id = NEW.targeted_user_id AND wallet_type = 'roi';
            
            NEW.roi_balance_at_deletion := v_roi_balance;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
