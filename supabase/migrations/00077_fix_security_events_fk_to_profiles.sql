ALTER TABLE public.security_events
DROP CONSTRAINT IF EXISTS security_events_user_id_fkey;

ALTER TABLE public.security_events
ADD CONSTRAINT security_events_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE SET NULL;
