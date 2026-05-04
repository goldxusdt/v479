/**
 * SEO and AI Optimization Utilities
 * Provides comprehensive SEO features for better search engine visibility
 */

import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/contexts/SettingsContext';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  canonical?: string;
  schemas?: string[]; // Array of JSON-LD strings
}

/**
 * Supported language codes
 */
const SUPPORTED_LANGS = ['en'];

/**
 * Generate comprehensive SEO meta tags
 */
export function SEOHead({
  title,
  description,
  keywords = [],
  image,
  url,
  type = 'website',
  author = 'Gold X Usdt',
  publishedTime,
  modifiedTime,
  noindex = false,
  canonical,
  schemas = []
}: SEOProps) {
  const { settings: platformSettings } = useSettings();
  const { t, i18n } = useTranslation();

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://goldxusdt.com';
  const fullUrl = url ? `${siteUrl}${url}` : (typeof window !== 'undefined' ? window.location.href : siteUrl);
  
  // Use platform settings or defaults, with fallback to translations
  const siteName = platformSettings?.site_title || t('common.site_title', 'Gold X Usdt');
  const siteTagline = platformSettings?.site_tagline || t('hero.title', 'The Gold Standard of Digital Wealth');
  const defaultDesc = platformSettings?.seo_description || t('hero.description', 'Secure USDT Investment Platform');
  const defaultKeywords = platformSettings?.seo_keywords || 'gold usdt, crypto investment, passive income, high roi';
  const ogTitle = platformSettings?.og_title || siteName;
  const ogDesc = platformSettings?.og_description || defaultDesc;
  const adminLogo = platformSettings?.logo_header_url || platformSettings?.logo_footer_url;
  const ogImage = platformSettings?.og_image || image || adminLogo || '/logo.svg';
  const twitterCard = platformSettings?.twitter_card || 'summary_large_image';
  const analyticsCode = platformSettings?.analytics_code;
  const gaId = platformSettings?.ga_measurement_id;
  const headerScripts = platformSettings?.header_scripts;

  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} | ${siteTagline}`;
  const fullDescription = description || defaultDesc;
  const finalKeywords = keywords.length > 0 ? keywords : defaultKeywords.split(',').map((k: string) => k.trim());
  
  const fullImage = ogImage.startsWith('http') ? `${ogImage}${ogImage.includes('?') ? '&' : '?'}v=2` : `${siteUrl}${ogImage}?v=2`;

  // Map current language to OG locale format (e.g., 'en_US', 'fr_FR')
  const localeMap: Record<string, string> = {
    'en': 'en_US'
  };

  // Add default organization schema if none provided
  const finalSchemas = schemas.length > 0 ? schemas : [organizationSchema, websiteSchema];

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      {finalKeywords.length > 0 && <meta name="keywords" content={finalKeywords.filter(Boolean).join(', ')} />}
      <meta name="author" content={author} />
      {canonical && <link rel="canonical" href={canonical} />}
      {!canonical && <link rel="canonical" href={fullUrl} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Alternate Languages - Hreflang Tags */}
      {SUPPORTED_LANGS.map(lang => (
        <link 
          key={lang}
          rel="alternate" 
          hrefLang={lang} 
          href={`${siteUrl}${url || (typeof window !== 'undefined' ? window.location.pathname : '')}${typeof window !== 'undefined' ? window.location.search : ''}`} 
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={fullUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title ? `${title} | ${ogTitle}` : ogTitle} />
      <meta property="og:description" content={description || ogDesc} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={localeMap[i18n.language] || 'en_US'} />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title ? `${title} | ${ogTitle}` : ogTitle} />
      <meta name="twitter:description" content={description || ogDesc} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:creator" content="@goldxusdt" />

      {/* Additional SEO Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta name="theme-color" content={platformSettings?.primary_color || '#D4AF37'} />
      
      {/* Structured Data */}
      {finalSchemas.map((schema, index) => (
        <script key={`schema-${index}`} type="application/ld+json">
          {schema}
        </script>
      ))}
      
      {/* Google Analytics 4 (GA4) */}
      {gaId && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <script>
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', {
                page_path: window.location.pathname,
              });
            `}
          </script>
        </>
      )}
      
      {/* Inject Analytics and Scripts */}
      {analyticsCode && <script type="text/javascript">{analyticsCode}</script>}
      {headerScripts && <script type="text/javascript">{headerScripts}</script>}
    </Helmet>
  );
}

/**
 * Generate JSON-LD structured data for AI and search engines
 */
export function generateStructuredData(type: string, data: any): string {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': type,
    ...data
  };

  return JSON.stringify(baseData);
}

/**
 * Organization structured data
 */
export const organizationSchema = generateStructuredData('Organization', {
  name: 'Gold X Usdt',
  description: 'Multi-Level Marketing platform for Gold USDT investments with automated ROI distribution',
  url: window.location.origin,
  logo: `${window.location.origin}/logo.svg?v=2`,
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Service',
    email: 'support@goldxusdt.com'
  },
  sameAs: [
    'https://twitter.com/goldxusdt',
    'https://facebook.com/goldxusdt',
    'https://linkedin.com/company/goldxusdt'
  ]
});

/**
 * Website structured data
 */
export const websiteSchema = generateStructuredData('WebSite', {
  name: 'Gold X Usdt',
  url: window.location.origin,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${window.location.origin}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string'
  }
});

/**
 * Financial Service structured data
 */
export const financialServiceSchema = generateStructuredData('FinancialService', {
  name: 'Gold X Usdt Investment Platform',
  description: 'Cryptocurrency investment platform with 10% monthly ROI and multi-level referral system',
  url: window.location.origin,
  serviceType: 'Investment Platform',
  areaServed: 'Worldwide',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Investment Plans',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Gold USDT Investment',
          description: '10% monthly ROI on USDT investments'
        }
      }
    ]
  }
});

/**
 * Breadcrumb structured data generator
 */
export function generateBreadcrumbSchema(items: { name: string; url: string }[]): string {
  return generateStructuredData('BreadcrumbList', {
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${window.location.origin}${item.url}`
    }))
  });
}

/**
 * FAQ structured data generator
 */
export function generateFAQSchema(faqs: { question: string; answer: string }[]): string {
  return generateStructuredData('FAQPage', {
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  });
}

/**
 * Article structured data generator
 */
export function generateArticleSchema(article: {
  title: string;
  description: string;
  image: string;
  author: string;
  publishedDate: string;
  modifiedDate?: string;
}): string {
  return generateStructuredData('Article', {
    headline: article.title,
    description: article.description,
    image: article.image,
    author: {
      '@type': 'Person',
      name: article.author
    },
    publisher: {
      '@type': 'Organization',
      name: 'Gold X Usdt',
      logo: {
        '@type': 'ImageObject',
        url: `${window.location.origin}/logo.svg?v=2`
      }
    },
    datePublished: article.publishedDate,
    dateModified: article.modifiedDate || article.publishedDate
  });
}

/**
 * Product structured data generator
 */
export function generateProductSchema(product: {
  name: string;
  description: string;
  image: string;
  price: number;
  currency: string;
  availability: string;
}): string {
  return generateStructuredData('Product', {
    name: product.name,
    description: product.description,
    image: product.image,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability: `https://schema.org/${product.availability}`
    }
  });
}

/**
 * SEO-friendly URL slug generator
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Generate sitemap data
 */
export const sitemapPages = [
  { url: '/', priority: 1.0, changefreq: 'daily' },
  { url: '/login', priority: 0.8, changefreq: 'monthly' },
  { url: '/signup', priority: 0.8, changefreq: 'monthly' },
  { url: '/dashboard', priority: 0.9, changefreq: 'daily' },
  { url: '/deposit', priority: 0.9, changefreq: 'weekly' },
  { url: '/withdrawal', priority: 0.9, changefreq: 'weekly' },
  { url: '/referrals', priority: 0.8, changefreq: 'weekly' },
  { url: '/terms-and-conditions', priority: 0.5, changefreq: 'monthly' },
  { url: '/privacy-policy', priority: 0.5, changefreq: 'monthly' },
  { url: '/contact', priority: 0.7, changefreq: 'monthly' }
];

/**
 * Generate robots.txt content
 */
export const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
Disallow: /profile/
Disallow: /wallets/
Disallow: /transactions/

Sitemap: ${window.location.origin}/sitemap.xml
`;

/**
 * Meta keywords for different pages
 */
export const pageKeywords = {
  home: [
    'gold usdt',
    'cryptocurrency investment',
    'mlm platform',
    'passive income',
    'usdt investment',
    'crypto roi',
    'referral program',
    'blockchain investment'
  ],
  deposit: [
    'deposit usdt',
    'crypto deposit',
    'bep20 deposit',
    'trc20 deposit',
    'usdt wallet',
    'cryptocurrency deposit'
  ],
  withdrawal: [
    'withdraw usdt',
    'crypto withdrawal',
    'usdt withdrawal',
    'cryptocurrency withdrawal',
    'withdraw earnings'
  ],
  referrals: [
    'referral program',
    'mlm referral',
    'crypto referral',
    'earn commission',
    'referral bonus',
    'multi-level marketing'
  ]
};

/**
 * AI-optimized content structure
 */
export interface AIOptimizedContent {
  mainHeading: string;
  subHeadings: string[];
  keyPoints: string[];
  callToAction: string;
  semanticKeywords: string[];
}

/**
 * Generate AI-friendly content structure
 */
export function generateAIContent(topic: string): AIOptimizedContent {
  const contentMap: Record<string, AIOptimizedContent> = {
    investment: {
      mainHeading: 'Secure Your Financial Future with Gold X Usdt',
      subHeadings: [
        'Why Choose Gold X Usdt?',
        'Investment Plans and Returns',
        'How It Works',
        'Security and Transparency'
      ],
      keyPoints: [
        '10% monthly ROI on all investments',
        'Minimum investment of 100 USDT',
        'Multi-level referral commission system',
        'Secure blockchain-based transactions',
        'Automated daily ROI distribution'
      ],
      callToAction: 'Start Investing Today',
      semanticKeywords: [
        'cryptocurrency investment',
        'passive income',
        'roi',
        'usdt',
        'blockchain',
        'financial growth'
      ]
    },
    referral: {
      mainHeading: 'Earn More with Our Referral Program',
      subHeadings: [
        'Multi-Level Commission Structure',
        'How to Refer',
        'Track Your Earnings',
        'Referral Benefits'
      ],
      keyPoints: [
        'Up to 15 levels of referral commissions',
        'Level 1: 8% commission',
        'Level 2: 4% commission',
        'Automatic commission crediting',
        'Real-time referral tracking'
      ],
      callToAction: 'Share Your Referral Link',
      semanticKeywords: [
        'referral program',
        'mlm',
        'commission',
        'passive income',
        'network marketing'
      ]
    }
  };

  return contentMap[topic] || contentMap.investment;
}
