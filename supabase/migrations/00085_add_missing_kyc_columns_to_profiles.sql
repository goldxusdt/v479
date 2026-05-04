ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS kyc_id_front TEXT,
ADD COLUMN IF NOT EXISTS kyc_id_back TEXT,
ADD COLUMN IF NOT EXISTS kyc_selfie TEXT;

-- Update the kyc_documents bucket to be public if we want getPublicUrl to work
UPDATE storage.buckets SET public = true WHERE id = 'kyc_documents';