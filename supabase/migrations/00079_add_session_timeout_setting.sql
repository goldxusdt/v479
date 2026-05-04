INSERT INTO public.settings (key, value, description)
VALUES ('admin_session_timeout', '30', 'Admin session inactivity timeout in minutes')
ON CONFLICT (key) DO NOTHING;
