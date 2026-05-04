UPDATE public.profiles p
SET signup_method = COALESCE(u.raw_app_meta_data->>'provider', 'email')
FROM auth.users u
WHERE p.id = u.id;
