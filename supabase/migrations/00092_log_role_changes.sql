CREATE OR REPLACE FUNCTION public.log_profile_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.admin_security_logs (
      admin_id,
      event_type,
      ip_address,
      user_agent,
      outcome,
      additional_details
    )
    VALUES (
      auth.uid(), -- ID of the admin making the change
      'role_change',
      'system', -- Or capture from context if possible, but triggers don't easily have IP
      'system_trigger',
      'success',
      jsonb_build_object(
        'target_user_id', NEW.id,
        'target_user_email', NEW.email,
        'old_role', OLD.role,
        'new_role', NEW.role,
        'changed_by', auth.uid()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_update ON public.profiles;
CREATE TRIGGER on_profile_role_update
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_role_changes();
