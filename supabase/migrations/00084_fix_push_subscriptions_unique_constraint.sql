-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_push_subscriptions_user_id;

-- Add unique constraint to user_id
ALTER TABLE public.push_subscriptions 
ADD CONSTRAINT push_subscriptions_user_id_key UNIQUE (user_id);

-- Also add an index for performance if it was dropped
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);