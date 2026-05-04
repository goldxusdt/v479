-- Add order_position to FAQs table for drag & drop reordering
ALTER TABLE public.faqs 
ADD COLUMN IF NOT EXISTS order_position INTEGER DEFAULT 0;

-- Create index for faster ordering queries
CREATE INDEX IF NOT EXISTS idx_faqs_order_position ON public.faqs(order_position);

-- Update existing FAQs with sequential order
UPDATE public.faqs SET order_position = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM public.faqs
) AS subquery
WHERE public.faqs.id = subquery.id;

-- Enhance investment_options table with new fields
ALTER TABLE public.investment_options
ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS duration_hours INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_users TEXT NOT NULL DEFAULT 'all',
ADD COLUMN IF NOT EXISTS specific_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS order_position INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_amount DECIMAL(20, 2),
ADD COLUMN IF NOT EXISTS roi_percentage DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add constraint for target_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investment_options_target_users_check'
  ) THEN
    ALTER TABLE public.investment_options
    ADD CONSTRAINT investment_options_target_users_check 
    CHECK (target_users IN ('all', 'specific'));
  END IF;
END $$;

-- Create indexes for investment_options
CREATE INDEX IF NOT EXISTS idx_investment_options_visible ON public.investment_options(is_visible);
CREATE INDEX IF NOT EXISTS idx_investment_options_target ON public.investment_options(target_users);
CREATE INDEX IF NOT EXISTS idx_investment_options_order ON public.investment_options(order_position);

-- Update existing investment options with default values
UPDATE public.investment_options 
SET 
  roi_percentage = COALESCE(roi_percentage, interest_rate),
  duration_days = COALESCE(duration_days, 30),
  duration_hours = COALESCE(duration_hours, 0),
  target_users = COALESCE(target_users, 'all'),
  is_visible = COALESCE(is_visible, TRUE),
  order_position = COALESCE(order_position, 0)
WHERE roi_percentage IS NULL OR duration_days IS NULL;

-- Create function to get active investment option for a user
CREATE OR REPLACE FUNCTION get_active_investment_option_for_user(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  option_name TEXT,
  description TEXT,
  min_amount DECIMAL(20, 2),
  max_amount DECIMAL(20, 2),
  roi_percentage DECIMAL(5, 2),
  interest_rate DECIMAL(5, 2),
  duration_days INTEGER,
  duration_hours INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    io.id,
    io.option_name,
    io.description,
    io.min_amount,
    io.max_amount,
    io.roi_percentage,
    io.interest_rate,
    io.duration_days,
    io.duration_hours,
    io.created_at
  FROM public.investment_options io
  WHERE io.is_active = TRUE 
    AND io.is_visible = TRUE
    AND (
      io.target_users = 'all' 
      OR (io.target_users = 'specific' AND user_id_param = ANY(io.specific_user_ids))
    )
  ORDER BY io.created_at DESC
  LIMIT 1;
END;
$$;

-- Add comprehensive notification event types
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_event_type') THEN
    CREATE TYPE notification_event_type AS ENUM (
      'user_registered',
      'deposit_requested',
      'deposit_approved',
      'deposit_rejected',
      'withdrawal_requested',
      'withdrawal_approved',
      'withdrawal_rejected',
      'kyc_submitted',
      'kyc_approved',
      'kyc_rejected',
      'referral_earned',
      'roi_credited',
      'support_ticket_created',
      'support_ticket_replied',
      'admin_login',
      'failed_login_attempt',
      'security_alert',
      'system_error'
    );
  END IF;
END $$;

-- Create notification_events table for tracking all system events
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type notification_event_type NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_sent_to_admin BOOLEAN DEFAULT FALSE,
  is_sent_to_telegram BOOLEAN DEFAULT FALSE,
  telegram_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notification_events
CREATE INDEX IF NOT EXISTS idx_notification_events_type ON public.notification_events(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_events_user ON public.notification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_created ON public.notification_events(created_at DESC);

-- RLS Policies for investment_options (drop existing and recreate)
DROP POLICY IF EXISTS "users_view_investment_options" ON public.investment_options;
DROP POLICY IF EXISTS "admin_all_investment_options" ON public.investment_options;

-- Admin can do everything
CREATE POLICY "admin_all_investment_options" ON public.investment_options
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Users can only view their applicable investment options
CREATE POLICY "users_view_investment_options" ON public.investment_options
FOR SELECT TO authenticated
USING (
  is_active = TRUE 
  AND is_visible = TRUE
  AND (
    target_users = 'all' 
    OR (target_users = 'specific' AND auth.uid() = ANY(specific_user_ids))
  )
);

-- RLS Policies for notification_events
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- Admin can view all notification events
CREATE POLICY "admin_view_notification_events" ON public.notification_events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Users can view their own notification events
CREATE POLICY "users_view_own_notification_events" ON public.notification_events
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Function to create notification event
CREATE OR REPLACE FUNCTION create_notification_event(
  event_type_param notification_event_type,
  user_id_param UUID,
  title_param TEXT,
  message_param TEXT,
  metadata_param JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  new_event_id UUID;
BEGIN
  INSERT INTO public.notification_events (
    event_type,
    user_id,
    title,
    message,
    metadata
  ) VALUES (
    event_type_param,
    user_id_param,
    title_param,
    message_param,
    metadata_param
  )
  RETURNING id INTO new_event_id;
  
  RETURN new_event_id;
END;
$$;