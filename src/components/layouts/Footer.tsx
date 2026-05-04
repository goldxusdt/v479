import { Link } from 'react-router-dom';
import { Facebook, Instagram } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/contexts/SettingsContext';
import { Logo } from '@/components/common/Logo';

export function Footer() {
  const { settings } = useSettings();
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-card">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 group transition-transform hover:scale-105 origin-left">
              <Logo size={32} variant="footer" />
              <span className="font-black text-xl tracking-tighter v56-gradient-text uppercase">
                {settings?.site_title || 'Gold X Usdt'}
              </span>
            </Link>
            <p className="text-sm text-muted-foreground italic">
              {t('footer.about', 'Your trusted platform for Gold USDT investments with automated ROI distribution and multi-level referral rewards.')}
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t('footer.links', 'Quick Links')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('nav.home', 'Home')}
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('nav.dashboard', 'Dashboard')}
                </Link>
              </li>
              <li>
                <Link to="/deposit" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('nav.deposit', 'Deposit')}
                </Link>
              </li>
              <li>
                <Link to="/referrals" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('nav.referrals', 'Referrals')}
                </Link>
              </li>
              <li>
                <Link to="/calculator" className="text-muted-foreground hover:text-foreground transition-colors">
                  Calculator
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/events" className="text-muted-foreground hover:text-foreground transition-colors">
                  Events
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t('footer.support', 'Support')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/support" className="text-muted-foreground hover:text-foreground transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-muted-foreground hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/kyc-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                  KYC Policy
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t('footer.connect', 'Connect With Us')}</h3>
            <div className="flex gap-4">
              {settings.social_facebook && (
                <a 
                  href={settings.social_facebook} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-muted-foreground hover:text-primary transition-all duration-300 hover:drop-shadow-[0_0_8px_hsla(47,65%,53%,0.8)]"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {settings.social_twitter && (
                <a 
                  href={settings.social_twitter} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-muted-foreground hover:text-primary transition-all duration-300 hover:drop-shadow-[0_0_8px_hsla(47,65%,53%,0.8)]"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                  </svg>
                </a>
              )}
              {settings.social_instagram && (
                <a 
                  href={settings.social_instagram} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-muted-foreground hover:text-primary transition-all duration-300 hover:drop-shadow-[0_0_8px_hsla(47,65%,53%,0.8)]"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {settings.social_telegram && (
                <a 
                  href={settings.social_telegram} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-muted-foreground hover:text-primary transition-all duration-300 hover:drop-shadow-[0_0_8px_hsla(47,65%,53%,0.8)]"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.13-.31-1.08-.66.02-.18.27-.36.74-.55 2.91-1.27 4.85-2.11 5.81-2.52 2.76-1.15 3.33-1.35 3.7-.1.08.28.1.58.07.88z"></path>
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© 2026 Gold X Usdt. {t('footer.rights', 'All rights reserved.')}</p>
        </div>
      </div>
    </footer>
  );
}
