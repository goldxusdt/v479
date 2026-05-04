CREATE OR REPLACE FUNCTION on_transaction_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'referral_bonus' OR NEW.transaction_type = 'referral_commission' THEN
    PERFORM create_notification_event(
      'referral_earned',
      NEW.user_id,
      'Referral Bonus Earned',
      'You have earned ' || NEW.amount || ' USDT from a referral!',
      jsonb_build_object('amount', NEW.amount, 'tx_id', NEW.id)
    );
  ELSIF NEW.transaction_type = 'roi_credit' THEN
    PERFORM create_notification_event(
      'roi_arrival',
      NEW.user_id,
      'Daily ROI Credited',
      'Your daily ROI of ' || NEW.amount || ' USDT has been credited to your wallet.',
      jsonb_build_object('amount', NEW.amount, 'tx_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
