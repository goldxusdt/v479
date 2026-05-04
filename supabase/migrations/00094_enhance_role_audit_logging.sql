CREATE OR REPLACE FUNCTION public.log_profile_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Log to admin_audit_logs for the UI
    INSERT INTO public.admin_audit_logs (
      admin_id,
      action,
      target_table,
      target_id,
      old_value,
      new_value
    )
    VALUES (
      auth.uid(),
      'role_change',
      'profiles',
      NEW.id::text,
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role)
    );

    -- Also log to security logs for deeper auditing
    INSERT INTO public.admin_security_logs (
      admin_id,
      event_type,
      outcome,
      additional_details
    )
    VALUES (
      auth.uid(),
      'role_change_security_event',
      'success',
      jsonb_build_object(
        'target_user_id', NEW.id,
        'old_role', OLD.role,
        'new_role', NEW.role,
        'operator', auth.uid()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
