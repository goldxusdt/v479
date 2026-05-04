-- Create a new trigger that fires on user creation (INSERT)
-- This ensures profiles are created even if email verification is disabled
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- We keep on_auth_user_confirmed as well for users who might still need confirmation later
-- The handle_new_user function uses ON CONFLICT (id) DO UPDATE, so it is safe to fire both.
