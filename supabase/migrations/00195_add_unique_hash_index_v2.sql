-- Add unique index on transaction_hash for transactions to prevent duplicates
CREATE UNIQUE INDEX idx_transactions_unique_hash ON public.transactions (transaction_hash) 
WHERE transaction_hash IS NOT NULL AND transaction_hash != '';
