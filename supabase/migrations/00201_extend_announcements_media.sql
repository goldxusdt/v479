-- Add media columns to announcements
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS video_url text;

-- Migrate existing image_url to image_urls array
UPDATE announcements 
SET image_urls = ARRAY[image_url] 
WHERE image_url IS NOT NULL AND (image_urls IS NULL OR cardinality(image_urls) = 0);
