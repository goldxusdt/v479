-- Ensure missing columns exist (idempotent)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS kyc_id_front TEXT,
ADD COLUMN IF NOT EXISTS kyc_id_back TEXT,
ADD COLUMN IF NOT EXISTS kyc_selfie TEXT;

-- Update bucket to public
UPDATE storage.buckets SET public = true WHERE id = 'kyc_documents';

-- KYC Documents Policies
DROP POLICY IF EXISTS "Users can update their own KYC documents" ON storage.objects;
CREATE POLICY "Users can update their own KYC documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'kyc_documents' AND 
  (storage.foldername(name))[2] = (auth.uid())::text
);

-- Public Assets Policies for Admins
DROP POLICY IF EXISTS "Admins can update public assets" ON storage.objects;
CREATE POLICY "Admins can update public assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'public_assets' AND 
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);

DROP POLICY IF EXISTS "Admins can delete public assets" ON storage.objects;
CREATE POLICY "Admins can delete public assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'public_assets' AND 
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);

-- Ensure anyone can upload to public_assets (for admins or users)
DROP POLICY IF EXISTS "Authenticated users can upload public assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload public assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'public_assets'
);
