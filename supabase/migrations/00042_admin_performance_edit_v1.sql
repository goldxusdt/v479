-- Add more performance-related fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS manual_level_1_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS performance_ranking TEXT DEFAULT 'Regular';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_system_status TEXT DEFAULT 'Active'; -- Active, Suspended, Probation

-- Update the ROI distribution engine to also save the calculated Daily ROI in settings
-- This ensures the "Display" requirement (Feature 2) is met with stored data.
INSERT INTO public.settings (key, value) VALUES ('daily_roi_percentage', '0.33') ON CONFLICT (key) DO NOTHING;
