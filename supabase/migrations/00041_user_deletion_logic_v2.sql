CREATE OR REPLACE FUNCTION public.process_user_deletion_and_recalculate_referral_chain(target_user_id UUID, admin_id UUID)
RETURNS VOID AS $$
DECLARE
  v_referrer_id UUID;
  v_contribution NUMERIC;
  v_user_email TEXT;
  v_user_full_name TEXT;
  v_direct_refs_count INTEGER;
BEGIN
  -- Get user info and referrer info before they are deleted
  SELECT referrer_id, email, full_name INTO v_referrer_id, v_user_email, v_user_full_name 
  FROM public.profiles 
  WHERE id = target_user_id;
  
  -- Calculate total approved deposits of the deleted user (rescinded contribution)
  SELECT COALESCE(SUM(amount), 0) INTO v_contribution 
  FROM public.deposits 
  WHERE user_id = target_user_id AND status = 'approved';
  
  -- 1. Compression: Move direct referrals up to the deleted user's referrer (Rule 2 stability)
  UPDATE public.profiles 
  SET referrer_id = v_referrer_id 
  WHERE referrer_id = target_user_id;
  
  GET DIAGNOSTICS v_direct_refs_count = ROW_COUNT;
  
  -- 2. Recalculate Referrer Performance based ONLY on remaining active referrals (Rule 3)
  IF v_referrer_id IS NOT NULL THEN
    -- Sum deposits from all current direct referrals (including the newly compressed ones)
    UPDATE public.profiles p
    SET performance_usdt = (
      SELECT COALESCE(SUM(d.amount), 0)
      FROM public.profiles sub
      JOIN public.deposits d ON d.user_id = sub.id
      WHERE sub.referrer_id = p.id AND d.status = 'approved'
    )
    WHERE p.id = v_referrer_id;
    
    -- Fix qualification status based on new performance calculation
    PERFORM public.check_and_enable_referral_levels(v_referrer_id);
    
    -- Log recalculation for referrer audit
    INSERT INTO public.activity_logs (user_id, action, description, metadata)
    VALUES (v_referrer_id, 'network_recalculated', 'Referral network and performance updated after user deletion.', 
            jsonb_build_object(
              'deleted_node_id', target_user_id, 
              'rescinded_node_contribution', v_contribution,
              'new_direct_referrals_count', v_direct_refs_count
            ));
  END IF;

  -- 3. Log the administrative action
  INSERT INTO public.activity_logs (user_id, action, description, metadata)
  VALUES (admin_id, 'admin_user_deletion_executed', 'Deleted user ' || COALESCE(v_user_email, target_user_id::text) || ' and updated referral chain.', 
          jsonb_build_object(
            'deleted_user_id', target_user_id, 
            'deleted_user_email', v_user_email, 
            'contribution_removed', v_contribution,
            'chain_compressed', v_direct_refs_count > 0
          ));
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
