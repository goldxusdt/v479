import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "nav": {
        "home": "Home",
        "dashboard": "Dashboard",
        "deposit": "Deposit",
        "withdrawal": "Withdrawal",
        "referrals": "Referrals",
        "profile": "Profile",
        "wallets": "Wallets",
        "support": "Support",
        "transactions": "Transactions",
        "analytics": "Analytics",
        "network": "Network Hub",
        "sign_in": "Sign In",
        "join_now": "Join Now",
        "sign_out": "Sign Out"
      },
      "common": {
        "loading": "Loading...",
        "save": "Save Changes",
        "cancel": "Cancel",
        "submit": "Submit",
        "amount": "Amount",
        "status": "Status",
        "date": "Date",
        "total": "Total",
        "view_all": "View All",
        "copy": "Copy",
        "actions": "Actions",
        "details": "Details",
        "active": "Active",
        "pending": "Pending",
        "completed": "Completed",
        "rejected": "Rejected",
        "usdt": "USDT"
      },
      "hero": {
        "badge": "Live Platform Status: Active",
        "title": "The Gold Standard of Digital Wealth",
        "description": "Join the elite circle of investors earning consistent 10% monthly ROI. Secure, transparent, and built for your financial freedom.",
        "start": "Start Investing",
        "login": "Member Login",
        "audited": "Audited Security",
        "withdrawals": "Instant Withdrawals",
        "global": "Global Access"
      },
      "features": {
        "title": "Why Choose Us",
        "subtitle": "Built for Performance",
        "description": "We combine traditional gold stability with modern blockchain efficiency to deliver unmatched returns and security for our investors.",
        "high_yield": "High Yield ROI",
        "high_yield_desc": "Earn a consistent 10% monthly return on your investment, paid out automatically to your wallet.",
        "security": "Bank-Grade Security",
        "security_desc": "Your assets are protected by enterprise-level encryption and secure cold storage protocols.",
        "referral": "Multi-Level Referral",
        "referral_desc": "Unlock a powerful 15-tier commission structure, allowing you to earn from your network's growth at every depth.",
        "instant": "Instant Processing",
        "instant_desc": "Deposits and withdrawals are processed with lightning speed through our automated system.",
        "analytics": "Real-Time Analytics",
        "analytics_desc": "Track your earnings, team performance, and growth with our advanced dashboard.",
        "global": "Global Access",
        "global_desc": "Invest from anywhere in the world using USDT. No borders, no limits, just pure growth."
      },
      "dashboard": {
        "portfolio": "Portfolio Overview",
        "welcome": "Welcome back",
        "member_level": "Level {{level}} Member",
        "monthly_roi": "Monthly ROI",
        "daily_roi": "Daily ROI",
        "total_value": "Total Portfolio Value",
        "growth_active": "Asset growth active",
        "premium_tier": "Premium Tier",
        "next_payout": "Next Payout",
        "recent_activity": "Live Transactions",
        "recent_description": "Real-time updates of your latest activities",
        "no_activity": "No activity detected yet.",
        "referral_code": "Referral Code",
        "manage_network": "Manage Network"
      },
      "wallets": {
        "deposit": "Deposit Capital",
        "roi": "ROI Earnings",
        "bonus": "Network Bonus",
        "withdrawal": "Withdrawable"
      },
      "footer": {
        "about": "Your trusted platform for Gold USDT investments with automated ROI distribution and multi-level referral rewards.",
        "links": "Quick Links",
        "support": "Support",
        "connect": "Connect With Us",
        "rights": "All rights reserved"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
