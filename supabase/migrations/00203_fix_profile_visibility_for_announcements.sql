-- Allow users to view profiles of admins (needed for announcements) and their own
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id OR 
  role = 'admin'::public.user_role OR 
  is_admin(auth.uid())
);

-- Ensure other roles like super_admin are also covered if they exist
-- Assuming 'admin' is the main one for now as per user_role enum
