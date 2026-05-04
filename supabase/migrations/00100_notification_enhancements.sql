-- 1. Create notification_categories table
CREATE TABLE IF NOT EXISTS notification_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text DEFAULT '#BF953F',
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Seed initial system categories
INSERT INTO notification_categories (name, description, color, is_system)
VALUES 
  ('New Blog Post', 'Notifications for new content', '#4ade80', true),
  ('System Announcement', 'General platform updates', '#3b82f6', true),
  ('Account Alert', 'Security or account related alerts', '#f87171', true),
  ('Balance Threshold Alert', 'Wallet balance notifications', '#fbbf24', true),
  ('ROI Arrival Notification', 'Investment return alerts', '#8b5cf6', true)
ON CONFLICT (name) DO NOTHING;

-- 3. Update notification_history table
ALTER TABLE notification_history ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES notification_categories(id);
ALTER TABLE notification_history ADD COLUMN IF NOT EXISTS recalled_at timestamp with time zone;

-- 4. Update notification_templates table
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES notification_categories(id);

-- 5. Add platform setting for recall window
INSERT INTO platform_settings (setting_key, setting_value, description)
VALUES ('notification_recall_window_minutes', '5', 'Window in minutes within which a global notification can be recalled.')
ON CONFLICT (setting_key) DO NOTHING;

-- 6. Add RLS for notification_categories
ALTER TABLE notification_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for categories"
  ON notification_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to manage categories"
  ON notification_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
