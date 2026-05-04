-- Restrict public_assets upload to admins only
DROP POLICY IF EXISTS "Authenticated users can upload public assets" ON storage.objects;
CREATE POLICY "Admins can upload public assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'public_assets' AND 
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);
