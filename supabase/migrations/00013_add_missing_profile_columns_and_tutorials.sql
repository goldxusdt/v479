-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Create tutorials table for admin management
CREATE TABLE IF NOT EXISTS tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  file_url TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_tutorials_order ON tutorials(order_index, is_active);

-- Enable RLS
ALTER TABLE tutorials ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active tutorials
CREATE POLICY "Anyone can view active tutorials"
  ON tutorials FOR SELECT
  USING (is_active = true);

-- Allow admins to manage tutorials
CREATE POLICY "Admins can manage tutorials"
  ON tutorials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE tutorials IS 'Stores tutorial content for deposit page with admin upload/delete capability';
