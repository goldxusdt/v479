-- Function to track first referral
CREATE OR REPLACE FUNCTION track_first_referral()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referrer_id IS NOT NULL THEN
    UPDATE profiles
    SET first_referral_at = NOW()
    WHERE id = NEW.referrer_id AND first_referral_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for first referral
DROP TRIGGER IF EXISTS on_referral_created ON profiles;
CREATE TRIGGER on_referral_created
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION track_first_referral();

-- Function to track first deposit
CREATE OR REPLACE FUNCTION track_first_deposit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    UPDATE profiles
    SET first_deposit_at = NOW()
    WHERE id = NEW.user_id AND first_deposit_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for first deposit (on deposits table)
DROP TRIGGER IF EXISTS on_deposit_approved ON deposits;
CREATE TRIGGER on_deposit_approved
AFTER UPDATE OF status ON deposits
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved')
EXECUTE FUNCTION track_first_deposit();
