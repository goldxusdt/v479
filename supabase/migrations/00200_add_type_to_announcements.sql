ALTER TABLE announcements ADD COLUMN IF NOT EXISTS type text DEFAULT 'update';
UPDATE announcements SET type = 'update' WHERE type IS NULL;
ALTER TABLE announcements ALTER COLUMN type SET NOT NULL;
