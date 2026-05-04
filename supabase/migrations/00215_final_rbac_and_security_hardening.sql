-- Update check_can_update_role to use 'admin'
CREATE OR REPLACE FUNCTION public.check_can_update_role()
RETURNS trigger AS $$
BEGIN
    -- Only admin can change roles
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) THEN
            RAISE EXCEPTION 'Only Admins can change user roles';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update is_admin to only include 'admin'
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a trigger to auth.users for deletion if we want to clean up profiles immediately
-- Usually profiles has ON DELETE CASCADE on user_id, but let's make sure.
-- Actually, the requirement is about logout.

-- We can create a table to track revoked sessions if we want real-time logout across devices,
-- but the postgres_changes subscription in AuthContext is easier for the "current" session.
