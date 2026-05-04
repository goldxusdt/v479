ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Update RLS to filter out deleted coupons for users
DROP POLICY IF EXISTS "Users can view active coupons" ON coupons;
CREATE POLICY "Users can view active coupons" ON coupons
  FOR SELECT TO authenticated
  USING (is_active = TRUE AND is_deleted = FALSE AND (expiry_date IS NULL OR expiry_date > NOW()));

-- Update Admin policy to include is_deleted but allow admins to see everything
DROP POLICY IF EXISTS "Admin can do everything on coupons" ON coupons;
CREATE POLICY "Admin can do everything on coupons" ON coupons
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
