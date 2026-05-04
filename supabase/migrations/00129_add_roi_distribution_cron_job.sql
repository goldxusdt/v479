-- Add a cron job to distribute daily ROI every hour
-- The function distribute_daily_roi() handles the 24-hour check per user
SELECT cron.schedule(
  'distribute-daily-roi-job',
  '0 * * * *', -- Every hour at minute 0
  'SELECT public.distribute_daily_roi();'
);

-- Fix the existing cron jobs to use the correct project URL and a reliable way to get the key
-- Or better, call them directly if they are SQL functions.
-- For now, let's just ensure we have the ROI distribution running.

-- Optional: Update the ROI distribution function to also handle the case 
-- where last_roi_credit_at is updated more accurately.
