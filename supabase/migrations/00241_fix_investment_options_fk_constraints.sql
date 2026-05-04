-- Fix foreign key constraints for investment_options to allow deletion
-- We use ON DELETE SET NULL to preserve financial history while allowing plans to be removed

-- 1. Fix transactions table constraint
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_plan_id_fkey;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_plan_id_fkey 
FOREIGN KEY (plan_id) 
REFERENCES investment_options(id) 
ON DELETE SET NULL;

-- 2. Fix deposits table constraint
ALTER TABLE public.deposits 
DROP CONSTRAINT IF EXISTS deposits_plan_id_fkey;

ALTER TABLE public.deposits
ADD CONSTRAINT deposits_plan_id_fkey 
FOREIGN KEY (plan_id) 
REFERENCES investment_options(id) 
ON DELETE SET NULL;
