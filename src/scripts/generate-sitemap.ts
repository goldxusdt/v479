import { SitemapStream, streamToPromise } from 'sitemap';
import { createWriteStream, writeFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Static pages for the sitemap
 */
const staticPages = [
  { url: '/', priority: 1.0, changefreq: 'daily' },
  { url: '/login', priority: 0.8, changefreq: 'monthly' },
  { url: '/signup', priority: 0.8, changefreq: 'monthly' },
  { url: '/dashboard', priority: 0.9, changefreq: 'daily' },
  { url: '/deposit', priority: 0.9, changefreq: 'weekly' },
  { url: '/withdrawal', priority: 0.9, changefreq: 'weekly' },
  { url: '/referrals', priority: 0.8, changefreq: 'weekly' },
  { url: '/terms-and-conditions', priority: 0.5, changefreq: 'monthly' },
  { url: '/privacy-policy', priority: 0.5, changefreq: 'monthly' },
  { url: '/contact', priority: 0.7, changefreq: 'monthly' },
  { url: '/blog', priority: 0.8, changefreq: 'daily' },
  { url: '/events', priority: 0.8, changefreq: 'daily' },
  { url: '/faq', priority: 0.7, changefreq: 'weekly' }
];

const generateSitemap = async () => {
  const hostname = process.env.VITE_APP_URL || 'https://goldxusdt.com';
  const sitemap = new SitemapStream({ hostname });
  const publicDir = resolve(process.cwd(), 'public');
  const writeStream = createWriteStream(resolve(publicDir, 'sitemap.xml'));
  
  sitemap.pipe(writeStream);
  
  // Add static pages
  for (const page of staticPages) {
    sitemap.write(page);
  }
  
  // Note: For dynamic pages like blog posts, in a real environment we would fetch from the database.
  // Since this is a build-time script and we don't want to depend on live DB during CI, 
  // we'll stick to static pages or add placeholders if needed.
  
  sitemap.end();
  await streamToPromise(sitemap);
  console.log('Sitemap generated successfully at public/sitemap.xml');

  // Generate robots.txt
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
Disallow: /profile/
Disallow: /wallets/
Disallow: /transactions/

Sitemap: ${hostname}/sitemap.xml
`;
  writeFileSync(resolve(publicDir, 'robots.txt'), robotsTxt);
  console.log('robots.txt generated successfully at public/robots.txt');
};

generateSitemap().catch(err => {
  console.error('Error generating sitemap:', err);
  process.exit(1);
});
