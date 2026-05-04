import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import SignupPage from './pages/public/SignupPage';
import DashboardPage from './pages/user/DashboardPage';
import InvestmentPlansPage from './pages/user/InvestmentPlansPage';
import DepositPage from './pages/user/DepositPage';
import WithdrawalPage from './pages/user/WithdrawalPage';
import ReferralsPage from './pages/user/ReferralsPage';
import ProfilePage from './pages/user/ProfilePage';
import WalletsPage from './pages/user/WalletsPage';
import SupportPage from './pages/user/SupportPage';
import AdvancedReferralPage from './pages/user/AdvancedReferralPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminDepositsPage from './pages/admin/AdminDepositsPage';
import AdminWithdrawalsPage from './pages/admin/AdminWithdrawalsPage';
import AdminKYCPage from './pages/admin/AdminKYCPage';
import AdminTicketsPage from './pages/admin/AdminTicketsPage';
import AdminPendingActionsPage from './pages/admin/AdminPendingActionsPage';
import AdminContentPage from './pages/admin/AdminContentPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminTutorialsPage from './pages/admin/AdminTutorialsPage';
import AdminCouponsPage from './pages/admin/AdminCouponsPage';
import CouponPerformanceAnalyticsDashboard from './pages/admin/CouponPerformanceAnalyticsDashboard';
import CouponHistoryPage from './pages/admin/CouponHistoryPage';
import CouponAutoGenerationSettingsPage from './pages/admin/CouponAutoGenerationSettingsPage';
import AdminUploadLogsPage from './pages/admin/AdminUploadLogsPage';
import NotificationManagementPage from './pages/admin/NotificationManagementPage';
import AdminTelegramConfigPage from './pages/admin/AdminTelegramConfigPage';
import NotificationPreferencesPage from './pages/user/NotificationPreferencesPage';
import AdminTransactionsPage from './pages/admin/AdminTransactionsPage';
import AdminLandingPage from './pages/admin/AdminLandingPage';
import AdminMaintenancePage from './pages/admin/AdminMaintenancePage';
import KYCPolicyPage from './pages/public/KYCPolicyPage';
import RefundPolicyPage from './pages/public/RefundPolicyPage';

import TransactionsPage from './pages/user/TransactionsPage';
import DepositHistoryPage from './pages/user/DepositHistoryPage';
import AdminInvestmentHistoryPage from './pages/admin/AdminInvestmentHistoryPage';
import TermsPage from './pages/public/TermsPage';
import PrivacyPage from './pages/public/PrivacyPage';
import ContactPage from './pages/public/ContactPage';
import EventsPage from './pages/public/EventsPage';
import BlogPage from './pages/public/BlogPage';
import ForgotPasswordPage from './pages/public/ForgotPasswordPage';
import FAQPage from './pages/public/FAQPage';
import CalculatorPage from './pages/user/CalculatorPage';
import AdminAuditLogPage from './pages/admin/AdminAuditLogPage';
import AdminSecurityPage from './pages/admin/AdminSecurityPage';
import AdminSecurityAuditPage from './pages/admin/AdminSecurityAuditPage';
import AdminSecurityDashboardPage from './pages/admin/AdminSecurityDashboardPage';
import AnalyticsPage from './pages/user/AnalyticsPage';
import AdminMFASetupPage from './pages/admin/AdminMFASetupPage';
import AdminMFAVerifyPage from './pages/admin/AdminMFAVerifyPage';
import AdminFAQPage from './pages/admin/AdminFAQPage';
import AdminInvestmentOptionsPage from './pages/admin/AdminInvestmentOptionsPage';
import AdminInvestmentValidationsPage from './pages/admin/AdminInvestmentValidationsPage';
import AnnouncementsPage from './pages/user/AnnouncementsPage';
import AdminAnnouncementsPage from './pages/admin/AdminAnnouncementsPage';
import AdminBlogPage from './pages/admin/AdminBlogPage';
import AdminBlogEditor from './pages/admin/AdminBlogEditor';
import AdminEventsPage from './pages/admin/AdminEventsPage';
import AdminEventEditor from './pages/admin/AdminEventEditor';
import AdminMediaPage from './pages/admin/AdminMediaPage';
import BlogPostPage from './pages/public/BlogPostPage';
import EventDetailPage from './pages/public/EventDetailPage';

import AdminAnnouncementEditor from './pages/admin/AdminAnnouncementEditor';

import SecurityPage from './pages/user/SecurityPage';
import NotFound from './pages/public/NotFound';
import type { ReactNode } from 'react';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  { name: 'Home', path: '/', element: <LandingPage /> },
  { name: 'Login', path: '/login', element: <LoginPage />, visible: false },
  { name: 'Signup', path: '/signup', element: <SignupPage />, visible: false },
  { name: 'Forgot Password', path: '/forgot-password', element: <ForgotPasswordPage />, visible: false },
  { name: 'Analytics', path: '/analytics', element: <AnalyticsPage /> },

  { name: 'Dashboard', path: '/dashboard', element: <DashboardPage /> },
  { name: 'Invest', path: '/invest', element: <InvestmentPlansPage /> },
  { name: 'Wallets', path: '/wallets', element: <WalletsPage /> },
  { name: 'Deposit', path: '/deposit', element: <DepositPage /> },
  { name: 'Deposit History', path: '/deposit/history', element: <DepositHistoryPage /> },
  { name: 'Withdrawal', path: '/withdrawal', element: <WithdrawalPage /> },
  { name: 'Referrals', path: '/referrals', element: <ReferralsPage /> },
  { name: 'Advanced Referral', path: '/referrals/advanced', element: <AdvancedReferralPage />, visible: false },
  { name: 'Profile', path: '/profile', element: <ProfilePage /> },
  { name: 'Security', path: '/security', element: <SecurityPage /> },
  { name: 'Notification Preferences', path: '/profile/notifications', element: <NotificationPreferencesPage /> },
  { name: 'Transactions', path: '/transactions', element: <TransactionsPage /> },
  { name: 'Announcements', path: '/announcements', element: <AnnouncementsPage /> },
  { name: 'Support', path: '/support', element: <SupportPage /> },
  { name: 'Admin Dashboard', path: '/admin', element: <AdminDashboardPage />, visible: false },
  { name: 'Admin Users', path: '/admin/users', element: <AdminUsersPage />, visible: false },
  { name: 'Admin User Detail', path: '/admin/users/:userId', element: <AdminUserDetailPage />, visible: false },
  { name: 'Admin Deposits', path: '/admin/deposits', element: <AdminDepositsPage />, visible: false },
  { name: 'Admin Upload Logs', path: '/admin/upload-logs', element: <AdminUploadLogsPage />, visible: false },
  { name: 'Admin Withdrawals', path: '/admin/withdrawals', element: <AdminWithdrawalsPage />, visible: false },
  { name: 'Admin Notifications', path: '/admin/notifications', element: <NotificationManagementPage />, visible: false },
  { name: 'Telegram Alerts', path: '/admin/telegram-alerts', element: <AdminTelegramConfigPage />, visible: false },
  { name: 'Admin Transactions', path: '/admin/transactions', element: <AdminTransactionsPage />, visible: false },
  { name: 'Admin KYC', path: '/admin/kyc', element: <AdminKYCPage />, visible: false },
  { name: 'Admin Pending Actions', path: '/admin/pending-actions', element: <AdminPendingActionsPage />, visible: false },
  { name: 'Admin Tickets', path: '/admin/tickets', element: <AdminTicketsPage />, visible: false },
  { name: 'Admin Content', path: '/admin/content', element: <AdminContentPage />, visible: false },
  { name: 'Admin Tutorials', path: '/admin/tutorials', element: <AdminTutorialsPage />, visible: false },
  { name: 'Admin Settings', path: '/admin/settings', element: <AdminSettingsPage />, visible: false },
  { name: 'Admin FAQ Management', path: '/admin/faqs', element: <AdminFAQPage />, visible: false },
  { name: 'Admin Announcements', path: '/admin/announcements', element: <AdminAnnouncementsPage />, visible: false },
  { name: 'Admin Announcement New', path: '/admin/announcements/new', element: <AdminAnnouncementEditor />, visible: false },
  { name: 'Admin Announcement Edit', path: '/admin/announcements/edit/:id', element: <AdminAnnouncementEditor />, visible: false },
  { name: 'Admin Investment Options', path: '/admin/investment-options', element: <AdminInvestmentOptionsPage />, visible: false },
  { name: 'Admin Investment History', path: '/admin/investment-history', element: <AdminInvestmentHistoryPage />, visible: false },
  { name: 'Admin Investment Validations', path: '/admin/investment-validations', element: <AdminInvestmentValidationsPage />, visible: false },
  { name: 'Admin Maintenance', path: '/admin/maintenance', element: <AdminMaintenancePage />, visible: false },
  { name: 'Admin Coupons', path: '/admin/coupons', element: <AdminCouponsPage />, visible: false },
  { name: 'Coupon Analytics', path: '/admin/coupons/analytics', element: <CouponPerformanceAnalyticsDashboard />, visible: false },
  { name: 'Coupon History', path: '/admin/coupons/history', element: <CouponHistoryPage />, visible: false },
  { name: 'Coupon Auto-Gen Settings', path: '/admin/coupons/auto-gen', element: <CouponAutoGenerationSettingsPage />, visible: false },
  
  // Blog Admin
  { name: 'Admin Blog', path: '/admin/blog', element: <AdminBlogPage />, visible: false },
  { name: 'Admin Blog New', path: '/admin/blog/new', element: <AdminBlogEditor />, visible: false },
  { name: 'Admin Blog Edit', path: '/admin/blog/edit/:id', element: <AdminBlogEditor />, visible: false },
  
  // Events Admin
  { name: 'Admin Events', path: '/admin/events', element: <AdminEventsPage />, visible: false },
  { name: 'Admin Events New', path: '/admin/events/new', element: <AdminEventEditor />, visible: false },
  { name: 'Admin Events Edit', path: '/admin/events/edit/:id', element: <AdminEventEditor />, visible: false },
  
  // Media Admin
  { name: 'Admin Media', path: '/admin/media', element: <AdminMediaPage />, visible: false },

  { name: 'Terms & Conditions', path: '/terms-and-conditions', element: <TermsPage /> },
  { name: 'KYC Policy', path: '/kyc-policy', element: <KYCPolicyPage /> },
  { name: 'Refund Policy', path: '/refund-policy', element: <RefundPolicyPage /> },
  { name: 'Admin Landing Page', path: '/admin/landing', element: <AdminLandingPage />, visible: false },

  { name: 'Privacy Policy', path: '/privacy-policy', element: <PrivacyPage /> },
  { name: 'Contact', path: '/contact', element: <ContactPage /> },
  { name: 'Audit Logs', path: '/admin/audit-logs', element: <AdminAuditLogPage /> },
  { name: 'Security Dashboard', path: '/admin/security-dashboard', element: <AdminSecurityDashboardPage /> },
  { name: 'Security Audit', path: '/admin/security-audit', element: <AdminSecurityAuditPage /> },
  { name: 'Security Center', path: '/admin/security', element: <AdminSecurityPage />, visible: false },
  { name: 'MFA Setup', path: '/admin/mfa-setup', element: <AdminMFASetupPage />, visible: false },
  { name: 'MFA Verify', path: '/admin/mfa-verify', element: <AdminMFAVerifyPage />, visible: false },

  { name: 'Calculator', path: '/calculator', element: <CalculatorPage /> },
  { name: 'FAQ', path: '/faq', element: <FAQPage /> },
  { name: 'Events', path: '/events', element: <EventsPage /> },
  { name: 'Event Detail', path: '/events/:slug', element: <EventDetailPage />, visible: false },
  { name: 'Blog', path: '/blog', element: <BlogPage /> },
  { name: 'Blog Post', path: '/blog/:slug', element: <BlogPostPage />, visible: false },
  { name: 'Not Found', path: '*', element: <NotFound />, visible: false }
];

export default routes;
