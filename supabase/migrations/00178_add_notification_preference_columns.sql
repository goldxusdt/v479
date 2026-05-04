ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS withdrawal_status_notification_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS daily_roi_notification_enabled BOOLEAN DEFAULT TRUE;
