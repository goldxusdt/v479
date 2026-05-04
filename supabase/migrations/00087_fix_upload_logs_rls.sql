-- Allow anyone authenticated to insert into upload_logs
DROP POLICY IF EXISTS "Anyone can insert upload logs" ON public.upload_logs;
CREATE POLICY "Anyone can insert upload logs"
ON public.upload_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all (already exists, but making sure)
DROP POLICY IF EXISTS "Admins can view all upload logs" ON public.upload_logs;
CREATE POLICY "Admins can view all upload logs"
ON public.upload_logs FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
