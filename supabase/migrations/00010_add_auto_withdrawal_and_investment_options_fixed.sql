-- Add auto withdrawal toggle to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS auto_withdrawal_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS next_auto_withdrawal_date DATE;

-- Create investment options table (6 options for interest rates)
CREATE TABLE IF NOT EXISTS investment_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_name TEXT NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  min_amount DECIMAL(20,2) DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user investment selections
CREATE TABLE IF NOT EXISTS user_investment_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_option_id UUID NOT NULL REFERENCES investment_options(id) ON DELETE CASCADE,
  amount DECIMAL(20,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, investment_option_id)
);

-- Create interest credit log table
CREATE TABLE IF NOT EXISTS interest_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(20,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  investment_option_id UUID REFERENCES investment_options(id),
  credited_at TIMESTAMPTZ DEFAULT NOW(),
  month_year TEXT NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Insert default investment options
INSERT INTO investment_options (option_name, interest_rate, min_amount, description) VALUES
  ('Basic Plan', 5.0, 100, 'Entry-level investment with 5% monthly interest'),
  ('Silver Plan', 7.5, 500, 'Mid-tier investment with 7.5% monthly interest'),
  ('Gold Plan', 10.0, 1000, 'Premium investment with 10% monthly interest'),
  ('Platinum Plan', 12.5, 5000, 'High-value investment with 12.5% monthly interest'),
  ('Diamond Plan', 15.0, 10000, 'Elite investment with 15% monthly interest'),
  ('VIP Plan', 20.0, 50000, 'Exclusive VIP investment with 20% monthly interest')
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE investment_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_investment_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_credits ENABLE ROW LEVEL SECURITY;

-- Investment options: Public read, admin write
CREATE POLICY "Anyone can view investment options" ON investment_options
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage investment options" ON investment_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- User investment selections: Users can view/update their own
CREATE POLICY "Users can view own selections" ON user_investment_selections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own selections" ON user_investment_selections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own selections" ON user_investment_selections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all selections" ON user_investment_selections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Interest credits: Users can view their own, admins can view all
CREATE POLICY "Users can view own interest credits" ON interest_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all interest credits" ON interest_credits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert interest credits" ON interest_credits
  FOR INSERT WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_investment_selections_user ON user_investment_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_interest_credits_user ON interest_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_interest_credits_month ON interest_credits(month_year);

COMMENT ON TABLE investment_options IS 'Available investment plans with different interest rates';
COMMENT ON TABLE user_investment_selections IS 'User-selected investment options';
COMMENT ON TABLE interest_credits IS 'Log of monthly interest credits to users';