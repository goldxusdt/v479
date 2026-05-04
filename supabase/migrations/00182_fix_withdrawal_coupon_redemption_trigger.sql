CREATE OR REPLACE FUNCTION public.handle_withdrawal_coupon_redemption()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check for coupon_id since that is the column name in withdrawals table
    IF NEW.coupon_id IS NOT NULL THEN
        -- Check if redemption already exists to prevent duplicates from API + trigger
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
                NEW.coupon_id,
                NEW.id,
                'withdrawal',
                COALESCE(NEW.coupon_discount, 0),
                NEW.fee + COALESCE(NEW.coupon_discount, 0),
                NEW.fee
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;
