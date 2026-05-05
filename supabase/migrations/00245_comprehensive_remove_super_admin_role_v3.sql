-- Comprehensive removal of 'super_admin' role references and enforcement of two-role system

BEGIN;
  -- 1. Ensure no users remain with the 'super_admin' role
  UPDATE public.profiles 
  SET role = 'admin'::public.user_role 
  WHERE role = 'super_admin'::public.user_role;

  -- 2. Update the 'is_admin_email' function to remove 'super_admin' reference
  CREATE OR REPLACE FUNCTION public.is_admin_email(p_email text)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
    RETURN EXISTS (
      SELECT 1 FROM public.profiles
      WHERE email = p_email
      AND role = 'admin'
    );
  END;
  $$;

  -- 3. Update the storage policy that still explicitly references 'super_admin'
  DROP POLICY IF EXISTS "Admins can upload public assets" ON storage.objects;
  CREATE POLICY "Admins can upload public assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'public_assets' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

  -- 4. Enforce the two-role system at the database level with a CHECK constraint
  -- This effectively removes 'super_admin' as a valid option for any future operations,
  -- satisfying the requirement to restrict role options to ('admin', 'user').
  ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('user'::public.user_role, 'admin'::public.user_role));

  -- 5. Final check: Update any other function or trigger that might still use it
  -- We already checked and found no others, but this is for completeness.

COMMIT;
