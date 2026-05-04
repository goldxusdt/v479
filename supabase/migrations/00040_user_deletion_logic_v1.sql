CREATE OR REPLACE FUNCTION public.process_user_deletion_and_recalculate_referral_chain(target_user_id UUID, admin_id UUID)
RETURNS VOID AS $$
DECLARE
  v_referrer_id UUID;
  v_contribution NUMERIC;
  v_user_email TEXT;
  v_user_full_name TEXT;
BEGIN
  -- Get user info and referrer info before they are deleted
  SELECT referrer_id, email, full_name INTO v_referrer_id, v_user_email, v_user_full_name FROM public.profiles WHERE id = target_user_id;
  
  -- Calculate total approved deposits (the contribution to referrer's performance)
  SELECT COALESCE(SUM(amount), 0) INTO v_contribution 
  FROM public.deposits 
  WHERE user_id = target_user_id AND status = 'approved';
  
  -- 1. Irreversible Fund Handling: Wallets will be deleted by cascade, 
  -- and here we log the rescinded amount for audit.
  
  -- Log the administrative action
  INSERT INTO public.activity_logs (user_id, action, description, metadata)
  VALUES (admin_id, 'admin_user_deletion', 'Deleted user ' || COALESCE(v_user_email, target_user_id::text) || ' and rescinded all funds.', 
          jsonb_build_object(
            'deleted_user_id', target_user_id, 
            'deleted_user_email', v_user_email, 
            'deleted_user_name', v_user_full_name,
            'contribution_rescinded', v_contribution
          ));
  
  -- 2. Level/Rank Stability for other users: 
  -- Handled by only updating the direct referrer's performance and status based on rules.
  
  -- 3. Referral Target Recalculation (Point 3): Fix progress based ONLY on remaining referrals.
  IF v_referrer_id IS NOT NULL AND v_contribution > 0 THEN
    -- Update referrer performance (exclude deleted user's contribution)
    UPDATE public.profiles 
    SET performance_usdt = GREATEST(0, COALESCE(performance_usdt, 0) - v_contribution)
    WHERE id = v_referrer_id;
    
    -- Fix qualification status based on new performance
    PERFORM public.check_and_enable_referral_levels(v_referrer_id);
    
    -- Log recalculation for referrer audit
    INSERT INTO public.activity_logs (user_id, action, description, metadata)
    VALUES (v_referrer_id, 'performance_recalculated_on_deletion', 'Performance updated due to referral deletion.', 
            jsonb_build_object(
              'deleted_referral_id', target_user_id, 
              'reduction_amount', v_contribution,
              'reason', 'Referral user deleted by admin'
            ));
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
