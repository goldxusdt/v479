ALTER TABLE withdrawals ALTER COLUMN cooling_period_end DROP NOT NULL;
ALTER TABLE withdrawals ALTER COLUMN cooling_period_end SET DEFAULT now();
