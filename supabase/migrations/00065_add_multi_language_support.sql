-- Add translations JSONB column to existing content tables
ALTER TABLE landing_page_settings ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE investment_options ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- Create blog_posts table with multi-language support
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image TEXT,
  author_id UUID REFERENCES profiles(id),
  category TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  translations JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for blog_posts
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Policies for blog_posts
CREATE POLICY "Anyone can view published blog posts" ON blog_posts
  FOR SELECT USING (is_published = true OR (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')));

CREATE POLICY "Admins can manage blog posts" ON blog_posts
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Update landing_page_settings with initial translations for Hero section (example)
-- We will update others via the CMS or additional migrations if needed, 
-- but this shows the structure.
UPDATE landing_page_settings 
SET translations = '{
  "fr": {
    "badge": "Statut de la plateforme : Actif",
    "title": "La Norme d''Or de la Richesse Numérique",
    "description": "Rejoignez le cercle d''élite des investisseurs gagnant un ROI mensuel constant de 10%. Sécurisé, transparent et conçu pour votre liberté financière.",
    "primary_button": "Commencer à Investir",
    "secondary_button": "Connexion Membre"
  },
  "es": {
    "badge": "Estado de la Plataforma: Activo",
    "title": "El Estándar de Oro de la Riqueza Digital",
    "description": "Únase al círculo de élite de inversores que obtienen un ROI mensual constante del 10%. Seguro, transparente y diseñado para su libertad financiera.",
    "primary_button": "Empezar a Invertir",
    "secondary_button": "Login de Miembro"
  }
}'::jsonb
WHERE section_name = 'hero';
