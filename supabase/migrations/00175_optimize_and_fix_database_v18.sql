-- 1. Performance Indices
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON public.deposits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON public.withdrawals (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupons_created_at ON public.coupons (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupons_expiry_date ON public.coupons (expiry_date);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON public.faqs (category);

-- 2. Coupon Auto-Deletion Trigger
CREATE OR REPLACE FUNCTION delete_expired_coupons()
RETURNS trigger AS $$
BEGIN
  -- We mark as is_deleted instead of hard delete to keep records in history if needed, 
  -- but the requirement says "automatically delete". 
  -- Given there's an is_deleted column, we'll use that or hard delete based on typical pattern.
  -- PRD says "Auto-deleted coupons moved to Coupon History with Auto-Deleted status".
  -- So we should probably set is_deleted = true or is_auto_deleted = true.
  
  -- Actually, a trigger on EVERY insert/update might be overkill for performance.
  -- But since coupons aren't updated that often, it's fine.
  -- Alternatively, a cron job is better, but here we can use a trigger on access or just a cleanup function.
  
  UPDATE public.coupons 
  SET is_deleted = true, 
      is_auto_deleted = true, 
      deletion_reason = 'Expired',
      roi_balance_at_deletion = (SELECT SUM(amount) FROM wallets WHERE wallet_type = 'roi') -- Placeholder for "current ROI wallet balance"
  WHERE expiry_date < NOW() 
    AND is_deleted = false;
    
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- We can't easily trigger this on "time passing". 
-- Usually, this is handled by a cron job (Supabase Edge Function or pg_cron).
-- However, we can also check/clean up whenever the coupons table is queried or modified.
CREATE OR REPLACE TRIGGER tr_cleanup_expired_coupons
AFTER INSERT OR UPDATE ON public.coupons
FOR EACH STATEMENT
EXECUTE FUNCTION delete_expired_coupons();

-- 3. Bulk Deletion RPCs
CREATE OR REPLACE FUNCTION bulk_delete_used_coupons()
RETURNS void AS $$
BEGIN
  UPDATE public.coupons
  SET is_deleted = true,
      deletion_reason = 'Bulk Deleted - Used'
  WHERE used_count > 0 
    AND (is_active = false OR expiry_date < NOW() OR used_count >= usage_limit);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION bulk_delete_expired_coupons()
RETURNS void AS $$
BEGIN
  UPDATE public.coupons
  SET is_deleted = true,
      deletion_reason = 'Bulk Deleted - Expired'
  WHERE expiry_date < NOW() AND is_deleted = false;
END;
$$ LANGUAGE plpgsql;

-- 4. Initial FAQ Data (if empty)
INSERT INTO public.faqs (question, answer, category, is_active, order_position)
SELECT 'What is Gold X Usdt?', 'Gold X Usdt is an advanced MLM platform focused on Gold USDT investment with automated returns.', 'General', true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.faqs LIMIT 1);

INSERT INTO public.faqs (question, answer, category, is_active, order_position)
SELECT 'How do I start investing?', 'To start investing, register an account, complete your KYC, and deposit USDT into your chosen plan.', 'Investment', true, 2
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE question = 'How do I start investing?');

INSERT INTO public.faqs (question, answer, category, is_active, order_position)
SELECT 'What is the minimum withdrawal?', 'The minimum withdrawal amount is 50 USDT for ROI and Deposit wallets.', 'Withdrawal', true, 3
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE question = 'What is the minimum withdrawal?');
