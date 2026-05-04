CREATE OR REPLACE FUNCTION public.handle_investment_option_deletion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Remove from coupons
    UPDATE public.coupons 
    SET applicable_plans = array_remove(applicable_plans, OLD.id)
    WHERE OLD.id = ANY(applicable_plans);

    -- 2. Check for active investments
    IF EXISTS (SELECT 1 FROM public.user_investment_selections WHERE investment_option_id = OLD.id AND is_active = true) THEN
        RAISE EXCEPTION 'Cannot delete plan because it has active investments. Please archive it instead.';
    END IF;

    -- 3. Transfer leftover funds for COMPLETED investments that haven't been refunded
    FOR r IN SELECT * FROM public.user_investment_selections WHERE investment_option_id = OLD.id AND is_refunded = false LOOP
        -- Add to user's deposit wallet
        UPDATE public.wallets SET balance = balance + r.amount, updated_at = now()
        WHERE user_id = r.user_id AND wallet_type = 'deposit';
        
        -- Record transaction
        INSERT INTO public.transactions (user_id, transaction_type, amount, net_amount, status, admin_notes)
        VALUES (r.user_id, 'refund', r.amount, r.amount, 'completed', 'Automatic fund transfer from deleted plan: ' || OLD.option_name);

        -- Send notification to user
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (r.user_id, 'Funds Transferred', 'Leftover funds from deleted plan ' || OLD.option_name || ' have been transferred to your deposit wallet.', 'deposit');
    END LOOP;

    -- 4. Associated user investments will be deleted by CASCADE FK
    -- (We don't need to manually delete them here, but doing it before the main delete is fine)
    DELETE FROM public.user_investment_selections WHERE investment_option_id = OLD.id;

    RETURN OLD;
END;
$$;
