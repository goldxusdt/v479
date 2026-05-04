-- Task 3: VAPID Keys
INSERT INTO settings (key, value, description)
VALUES 
  ('vapid_public_key', 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEXvShL4MVA4Z9Nqo69PipU1vxqPbYsFH7iGQGKodes10pbPfNDD8ZwyCJab7vHCoo3_vlnC-PWA22Y6IDgmZKkw', 'VAPID Public Key for Browser Push Notifications'),
  ('vapid_private_key', 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg1q3N6GPo-Eqoly2oVjdxpJ6hTEBr8bSgKrZcWtzElFWhRANCAARe9KEvgxUDhn02qjr0-KlTW_Go9tiwUfuIZAYqh16zXSls980MPxnDIIlpvu8cKijf--WcL49YDbZjogOCZkqT', 'VAPID Private Key for Browser Push Notifications')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Task 4: KYC Storage Fixes
-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc_documents', 'kyc_documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Clean up potentially confusing old policies
DROP POLICY IF EXISTS "Authenticated users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own KYC documents" ON storage.objects;

-- Create robust policies for kyc_documents
CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kyc_documents' AND 
  (storage.foldername(name))[1] = 'kyc' AND 
  (storage.foldername(name))[2] = (auth.uid())::text
);

CREATE POLICY "Users can view their own KYC documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc_documents' AND (
    (storage.foldername(name))[2] = (auth.uid())::text OR
    (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
  )
);

CREATE POLICY "Users can delete their own KYC documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'kyc_documents' AND 
  (storage.foldername(name))[2] = (auth.uid())::text
);
