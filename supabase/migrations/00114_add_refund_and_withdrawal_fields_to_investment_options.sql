ALTER TABLE investment_options 
ADD COLUMN IF NOT EXISTS auto_refund_duration_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_withdrawal_wallet TEXT;

-- Update existing plans if any
UPDATE investment_options SET auto_refund_duration_days = 0 WHERE auto_refund_duration_days IS NULL;
