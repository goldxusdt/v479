ALTER TABLE deposits ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES investment_options(id);
