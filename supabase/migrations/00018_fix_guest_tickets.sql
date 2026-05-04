-- Allow NULL user_id for guest tickets in support_tickets
ALTER TABLE support_tickets ALTER COLUMN user_id DROP NOT NULL;

-- Add guest info columns
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- Update policies to allow anon insert
CREATE POLICY "Allow anon to create support tickets" ON support_tickets
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Allow admins to see guest tickets
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'admin'::user_role
  );
$$;
