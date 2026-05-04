ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_portfolio_value NUMERIC DEFAULT 0;

CREATE OR REPLACE FUNCTION update_profile_total_portfolio_value()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET total_portfolio_value = (
        SELECT COALESCE(SUM(balance), 0)
        FROM wallets
        WHERE user_id = NEW.user_id
    )
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_total_portfolio_value ON wallets;
CREATE TRIGGER tr_update_total_portfolio_value
AFTER INSERT OR UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION update_profile_total_portfolio_value();

-- Initial sync
UPDATE profiles p
SET total_portfolio_value = (
    SELECT COALESCE(SUM(balance), 0)
    FROM wallets w
    WHERE w.user_id = p.id
);
