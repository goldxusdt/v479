-- Enable RLS on settings table (should already be enabled, but just in case)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to settings
CREATE POLICY "Allow public read access to settings"
ON settings FOR SELECT
USING (true);

-- Allow admins to manage settings
-- Note: This depends on the is_admin() function which should already exist
CREATE POLICY "Allow admins to manage settings"
ON settings FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
