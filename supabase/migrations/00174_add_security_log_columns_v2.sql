ALTER TABLE admin_security_logs 
ADD COLUMN IF NOT EXISTS geolocation JSONB,
ADD COLUMN IF NOT EXISTS device_fingerprint JSONB;
