-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gtbptywlxhleadgabivi_kyc_documents',
  'gtbptywlxhleadgabivi_kyc_documents',
  false,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- Storage policies for KYC documents
CREATE POLICY "Authenticated users can upload their own KYC documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'gtbptywlxhleadgabivi_kyc_documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own KYC documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'gtbptywlxhleadgabivi_kyc_documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all KYC documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'gtbptywlxhleadgabivi_kyc_documents' AND
  is_admin(auth.uid())
);

CREATE POLICY "Users can delete their own KYC documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'gtbptywlxhleadgabivi_kyc_documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);