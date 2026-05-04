-- Robust is_admin function with schema qualification and security definer
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  -- If uid is null, it's definitely not an admin
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  -- Select role directly from profiles
  -- SECURITY DEFINER ensures this bypasses RLS on the profiles table itself
  SELECT p.role INTO v_role 
  FROM public.profiles p 
  WHERE p.id = uid;

  RETURN v_role = 'admin'::public.user_role;
END;
$$;
