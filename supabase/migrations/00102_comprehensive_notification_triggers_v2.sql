-- Function to generate notification event on profile insert (new user)
CREATE OR REPLACE FUNCTION on_profile_created_notification()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification_event(
    'user_registered',
    NEW.id,
    'New User Registered',
    'User ' || COALESCE(NEW.username, NEW.email) || ' has joined the platform.',
    jsonb_build_object('email', NEW.email, 'username', NEW.username)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_profile_created ON public.profiles;
CREATE TRIGGER tr_on_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION on_profile_created_notification();

-- Function for deposit notifications
CREATE OR REPLACE FUNCTION on_deposit_notification()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
  
  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification_event(
      'deposit_requested',
      NEW.user_id,
      'Deposit Requested',
      'User ' || user_email || ' has requested a deposit of ' || NEW.amount || ' USDT.',
      jsonb_build_object('amount', NEW.amount, 'deposit_id', NEW.id)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
      PERFORM create_notification_event(
        'deposit_approved',
        NEW.user_id,
        'Deposit Approved',
        'Your deposit of ' || NEW.amount || ' USDT has been approved.',
        jsonb_build_object('amount', NEW.amount, 'deposit_id', NEW.id)
      );
    ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
      PERFORM create_notification_event(
        'deposit_rejected',
        NEW.user_id,
        'Deposit Rejected',
        'Your deposit of ' || NEW.amount || ' USDT has been rejected.',
        jsonb_build_object('amount', NEW.amount, 'deposit_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_deposit_notification ON public.deposits;
CREATE TRIGGER tr_on_deposit_notification
AFTER INSERT OR UPDATE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION on_deposit_notification();

-- Function for withdrawal notifications
CREATE OR REPLACE FUNCTION on_withdrawal_notification()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
  
  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification_event(
      'withdrawal_requested',
      NEW.user_id,
      'Withdrawal Requested',
      'User ' || user_email || ' has requested a withdrawal of ' || NEW.amount || ' USDT.',
      jsonb_build_object('amount', NEW.amount, 'withdrawal_id', NEW.id)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
      PERFORM create_notification_event(
        'withdrawal_approved',
        NEW.user_id,
        'Withdrawal Approved',
        'Your withdrawal of ' || NEW.amount || ' USDT has been approved.',
        jsonb_build_object('amount', NEW.amount, 'withdrawal_id', NEW.id)
      );
    ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
      PERFORM create_notification_event(
        'withdrawal_rejected',
        NEW.user_id,
        'Withdrawal Rejected',
        'Your withdrawal of ' || NEW.amount || ' USDT has been rejected.',
        jsonb_build_object('amount', NEW.amount, 'withdrawal_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_withdrawal_notification ON public.withdrawals;
CREATE TRIGGER tr_on_withdrawal_notification
AFTER INSERT OR UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION on_withdrawal_notification();

-- Function for KYC notifications
CREATE OR REPLACE FUNCTION on_kyc_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.kyc_status IS DISTINCT FROM NEW.kyc_status THEN
    IF NEW.kyc_status = 'pending' THEN
      PERFORM create_notification_event(
        'kyc_submitted',
        NEW.id,
        'KYC Submitted',
        'User ' || COALESCE(NEW.username, NEW.email) || ' has submitted KYC for verification.',
        jsonb_build_object('email', NEW.email, 'kyc_status', NEW.kyc_status)
      );
    ELSIF NEW.kyc_status = 'approved' THEN
      PERFORM create_notification_event(
        'kyc_approved',
        NEW.id,
        'KYC Approved',
        'Your KYC verification has been approved!',
        jsonb_build_object('email', NEW.email, 'kyc_status', NEW.kyc_status)
      );
    ELSIF NEW.kyc_status = 'rejected' THEN
      PERFORM create_notification_event(
        'kyc_rejected',
        NEW.id,
        'KYC Rejected',
        'Your KYC verification has been rejected. Please check details and try again.',
        jsonb_build_object('email', NEW.email, 'kyc_status', NEW.kyc_status)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_kyc_notification ON public.profiles;
CREATE TRIGGER tr_on_kyc_notification
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION on_kyc_notification();

-- Function for referral notifications
CREATE OR REPLACE FUNCTION on_transaction_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'referral_bonus' THEN
    PERFORM create_notification_event(
      'referral_earned',
      NEW.user_id,
      'Referral Bonus Earned',
      'You have earned ' || NEW.amount || ' USDT from a referral!',
      jsonb_build_object('amount', NEW.amount, 'tx_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_transaction_notification ON public.transactions;
CREATE TRIGGER tr_on_transaction_notification
AFTER INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION on_transaction_notification();

-- Trigger for support tickets
CREATE OR REPLACE FUNCTION on_support_ticket_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification_event(
      'support_ticket_created',
      NEW.user_id,
      'New Support Ticket',
      'User has created a new support ticket: ' || NEW.subject,
      jsonb_build_object('ticket_id', NEW.id, 'subject', NEW.subject)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_support_ticket_notification ON public.support_tickets;
CREATE TRIGGER tr_on_support_ticket_notification
AFTER INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION on_support_ticket_notification();
