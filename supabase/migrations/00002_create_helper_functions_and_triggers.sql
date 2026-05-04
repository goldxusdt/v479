-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'admin'::user_role
  );
$$;

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  ref_code TEXT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  ref_code := generate_referral_code();
  
  -- Insert a profile synced with fields collected at signup
  INSERT INTO public.profiles (id, email, username, referral_code, role)
  VALUES (
    NEW.id,
    NEW.email,
    SPLIT_PART(NEW.email, '@', 1),
    ref_code,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END
  );
  
  -- Create wallets for the new user
  INSERT INTO public.wallets (user_id, wallet_type, balance)
  VALUES
    (NEW.id, 'deposit'::public.wallet_type, 0),
    (NEW.id, 'roi'::public.wallet_type, 0),
    (NEW.id, 'bonus'::public.wallet_type, 0),
    (NEW.id, 'withdrawal'::public.wallet_type, 0);
  
  RETURN NEW;
END;
$$;

-- Trigger to sync users after confirmation
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_pages_updated_at BEFORE UPDATE ON public.content_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get referral chain (up to 4 levels)
CREATE OR REPLACE FUNCTION get_referral_chain(user_id UUID)
RETURNS TABLE (
  level INTEGER,
  referrer_id UUID,
  commission_rate DECIMAL(5, 4)
) LANGUAGE plpgsql AS $$
DECLARE
  current_referrer UUID;
  current_level INTEGER := 1;
  rates DECIMAL(5, 4)[] := ARRAY[0.08, 0.04, 0.02, 0.01];
BEGIN
  SELECT p.referrer_id INTO current_referrer FROM profiles p WHERE p.id = user_id;
  
  WHILE current_referrer IS NOT NULL AND current_level <= 4 LOOP
    level := current_level;
    referrer_id := current_referrer;
    commission_rate := rates[current_level];
    RETURN NEXT;
    
    SELECT p.referrer_id INTO current_referrer FROM profiles p WHERE p.id = current_referrer;
    current_level := current_level + 1;
  END LOOP;
  
  RETURN;
END;
$$;

-- Function to process deposit approval
CREATE OR REPLACE FUNCTION process_deposit_approval(
  deposit_id_param UUID,
  admin_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  deposit_record RECORD;
  referral_chain RECORD;
  lock_date TIMESTAMPTZ;
BEGIN
  -- Get deposit details
  SELECT * INTO deposit_record FROM deposits WHERE id = deposit_id_param;
  
  IF deposit_record IS NULL THEN
    RAISE EXCEPTION 'Deposit not found';
  END IF;
  
  IF deposit_record.status != 'pending'::transaction_status THEN
    RAISE EXCEPTION 'Deposit is not pending';
  END IF;
  
  -- Update deposit status
  UPDATE deposits SET 
    status = 'approved'::transaction_status,
    approved_at = NOW()
  WHERE id = deposit_id_param;
  
  -- Update transaction status
  UPDATE transactions SET 
    status = 'approved'::transaction_status,
    approved_at = NOW(),
    approved_by = admin_id
  WHERE id = deposit_record.transaction_id;
  
  -- Credit deposit wallet
  UPDATE wallets SET 
    balance = balance + deposit_record.net_amount
  WHERE user_id = deposit_record.user_id AND wallet_type = 'deposit'::wallet_type;
  
  -- Process referral commissions
  lock_date := NOW() + INTERVAL '30 days';
  
  FOR referral_chain IN 
    SELECT * FROM get_referral_chain(deposit_record.user_id)
  LOOP
    DECLARE
      commission_amt DECIMAL(20, 8);
    BEGIN
      commission_amt := deposit_record.net_amount * referral_chain.commission_rate;
      
      -- Insert commission record
      INSERT INTO referral_commissions (
        referrer_id,
        referred_user_id,
        deposit_id,
        level,
        commission_rate,
        commission_amount,
        locked_until,
        is_locked
      ) VALUES (
        referral_chain.referrer_id,
        deposit_record.user_id,
        deposit_id_param,
        referral_chain.level,
        referral_chain.commission_rate,
        commission_amt,
        lock_date,
        true
      );
      
      -- Credit bonus wallet (locked)
      UPDATE wallets SET 
        balance = balance + commission_amt
      WHERE user_id = referral_chain.referrer_id AND wallet_type = 'bonus'::wallet_type;
      
      -- Create transaction record
      INSERT INTO transactions (
        user_id,
        transaction_type,
        amount,
        net_amount,
        status
      ) VALUES (
        referral_chain.referrer_id,
        'referral_commission'::transaction_type,
        commission_amt,
        commission_amt,
        'completed'::transaction_status
      );
    END;
  END LOOP;
  
  -- Log activity
  INSERT INTO activity_logs (user_id, action, description)
  VALUES (deposit_record.user_id, 'deposit_approved', 'Deposit approved and credited');
END;
$$;

-- Function to process withdrawal approval
CREATE OR REPLACE FUNCTION process_withdrawal_approval(
  withdrawal_id_param UUID,
  admin_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  withdrawal_record RECORD;
  source_wallet wallet_type;
BEGIN
  -- Get withdrawal details
  SELECT * INTO withdrawal_record FROM withdrawals WHERE id = withdrawal_id_param;
  
  IF withdrawal_record IS NULL THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;
  
  IF withdrawal_record.status != 'pending'::transaction_status THEN
    RAISE EXCEPTION 'Withdrawal is not pending';
  END IF;
  
  -- Determine source wallet
  IF withdrawal_record.is_referral_bonus THEN
    source_wallet := 'bonus'::wallet_type;
  ELSE
    source_wallet := 'roi'::wallet_type;
  END IF;
  
  -- Update withdrawal status
  UPDATE withdrawals SET 
    status = 'approved'::transaction_status,
    approved_at = NOW(),
    completed_at = NOW()
  WHERE id = withdrawal_id_param;
  
  -- Update transaction status
  UPDATE transactions SET 
    status = 'completed'::transaction_status,
    approved_at = NOW(),
    approved_by = admin_id
  WHERE id = withdrawal_record.transaction_id;
  
  -- Deduct from source wallet
  UPDATE wallets SET 
    balance = balance - withdrawal_record.amount
  WHERE user_id = withdrawal_record.user_id AND wallet_type = source_wallet;
  
  -- Credit withdrawal wallet
  UPDATE wallets SET 
    balance = balance + withdrawal_record.net_amount
  WHERE user_id = withdrawal_record.user_id AND wallet_type = 'withdrawal'::wallet_type;
  
  -- Log activity
  INSERT INTO activity_logs (user_id, action, description)
  VALUES (withdrawal_record.user_id, 'withdrawal_approved', 'Withdrawal approved and processed');
END;
$$;