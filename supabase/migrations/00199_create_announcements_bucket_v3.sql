-- Create bucket for announcements if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('announcements', 'announcements', true, 5242880, '{image/jpeg,image/png,image/gif,image/webp}')
ON CONFLICT (id) DO NOTHING;

-- Policies for announcements bucket with unique names
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'announcements_public_select') THEN
        CREATE POLICY "announcements_public_select" ON storage.objects FOR SELECT USING (bucket_id = 'announcements');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'announcements_admin_insert') THEN
        CREATE POLICY "announcements_admin_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'announcements');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'announcements_admin_update') THEN
        CREATE POLICY "announcements_admin_update" ON storage.objects FOR UPDATE TO authenticated WITH CHECK (bucket_id = 'announcements');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'announcements_admin_delete') THEN
        CREATE POLICY "announcements_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'announcements');
    END IF;
END $$;
