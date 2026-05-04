-- Update handle_investment_option_deletion to be more robust and handle enum types correctly
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
    -- If there are still investments marked as active, we block manual deletion.
    -- Automatic expiration will mark them as inactive first.
    IF EXISTS (SELECT 1 FROM public.user_investment_selections WHERE investment_option_id = OLD.id AND is_active = true) THEN
        RAISE EXCEPTION 'Cannot delete plan because it has active investments. Please archive it instead.';
    END IF;

    -- 3. Transfer leftover funds for ALL investments in this plan that haven't been refunded yet
    -- This ensures that when a plan is deleted, users get their principal back.
    FOR r IN SELECT * FROM public.user_investment_selections WHERE investment_option_id = OLD.id AND is_refunded = false LOOP
        -- Add to user's deposit wallet
        UPDATE public.wallets SET balance = balance + r.amount, updated_at = now()
        WHERE user_id = r.user_id AND wallet_type = 'deposit'::public.wallet_type;
        
        -- Record transaction
        INSERT INTO public.transactions (user_id, transaction_type, amount, net_amount, status, admin_notes)
        VALUES (r.user_id, 'refund'::public.transaction_type, r.amount, r.amount, 'completed'::public.transaction_status, 'Automatic fund transfer from deleted plan: ' || OLD.option_name);

        -- Send notification to user
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (r.user_id, 'Funds Transferred', 'Funds from deleted plan ' || OLD.option_name || ' have been transferred to your deposit wallet.', 'deposit');
    END LOOP;

    -- 4. Associated user investments will be deleted by CASCADE FK
    -- We've already handled the fund transfers.
    DELETE FROM public.user_investment_selections WHERE investment_option_id = OLD.id;

    RETURN OLD;
END;
$$;

-- Improve process_plan_expiration to handle both plan and its investments
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
        -- Calculate stats for history
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

        -- 1. Mark all active investments in this plan as completed/inactive
        -- This allows the deletion trigger to proceed without the "active investments" exception.
        UPDATE public.user_investment_selections
        SET is_active = false, status = 'completed', completed_at = now()
        WHERE investment_option_id = plan_record.id
        AND is_active = true;

        -- 2. Delete the plan completely from investment_options
        -- This ensures it's removed from both Deposit and Investment views.
        -- The handle_investment_option_deletion trigger will handle returning principal to users.
        DELETE FROM public.investment_options
        WHERE id = plan_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
