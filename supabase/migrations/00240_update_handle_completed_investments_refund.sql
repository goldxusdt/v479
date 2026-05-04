-- Update handle_completed_investments to automatically refund principal upon completion
CREATE OR REPLACE FUNCTION public.handle_completed_investments()
RETURNS TABLE (deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record RECORD;
    v_count INTEGER := 0;
BEGIN
    -- 1. Find and handle active investments that have exceeded their duration
    FOR v_record IN 
        SELECT uis.*, io.option_name 
        FROM public.user_investment_selections uis
        JOIN public.investment_options io ON uis.investment_option_id = io.id
        WHERE uis.is_active = true
          AND uis.status = 'active'
          AND uis.is_refunded = false
          AND io.duration_days > 0
          AND NOW() >= (uis.selected_at + (io.duration_days * INTERVAL '1 day') + (io.duration_hours * INTERVAL '1 hour'))
    LOOP
        -- A. Transfer principal to deposit wallet
        UPDATE public.wallets 
        SET balance = balance + v_record.amount, updated_at = now()
        WHERE user_id = v_record.user_id AND wallet_type = 'deposit'::public.wallet_type;

        -- B. Record transaction
        INSERT INTO public.transactions (user_id, transaction_type, amount, net_amount, status, admin_notes)
        VALUES (v_record.user_id, 'refund'::public.transaction_type, v_record.amount, v_record.amount, 'completed'::public.transaction_status, 'Automatic principal return for completed investment: ' || v_record.option_name);

        -- C. Send notification
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (v_record.user_id, 'Investment Completed', 'Your investment in ' || v_record.option_name || ' has completed. Principal of ' || v_record.amount || ' USDT has been returned to your deposit wallet.', 'deposit');

        -- D. Update selection status
        UPDATE public.user_investment_selections
        SET 
            is_active = false,
            status = 'completed',
            completed_at = NOW(),
            is_refunded = true
        WHERE id = v_record.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN QUERY SELECT v_count;
END;
$$;
