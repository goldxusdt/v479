-- Fix platform_settings
ALTER TABLE public.platform_settings 
DROP CONSTRAINT IF EXISTS platform_settings_updated_by_fkey;
ALTER TABLE public.platform_settings 
ADD CONSTRAINT platform_settings_updated_by_fkey 
FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fix ticket_messages
ALTER TABLE public.ticket_messages 
DROP CONSTRAINT IF EXISTS ticket_messages_user_id_fkey;
ALTER TABLE public.ticket_messages 
ADD CONSTRAINT ticket_messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix blog_posts
ALTER TABLE public.blog_posts 
DROP CONSTRAINT IF EXISTS blog_posts_author_id_fkey;
ALTER TABLE public.blog_posts 
ADD CONSTRAINT blog_posts_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fix upload_logs
ALTER TABLE public.upload_logs 
DROP CONSTRAINT IF EXISTS upload_logs_user_id_fkey;
ALTER TABLE public.upload_logs 
ADD CONSTRAINT upload_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix investment_hash_validations
ALTER TABLE public.investment_hash_validations 
DROP CONSTRAINT IF EXISTS investment_hash_validations_user_id_fkey;
ALTER TABLE public.investment_hash_validations 
ADD CONSTRAINT investment_hash_validations_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;