ALTER TABLE public.referral_commissions 
DROP CONSTRAINT IF EXISTS referral_commissions_level_check;

ALTER TABLE public.referral_commissions 
ADD CONSTRAINT referral_commissions_level_check 
CHECK (level >= 1 AND level <= 15);
