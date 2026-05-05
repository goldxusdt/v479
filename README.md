
# Gold X Usdt MLM Platform

A production-ready Multi-Level Marketing (MLM) investment platform built with React, TypeScript, Supabase, and shadcn/ui. Features automated ROI distribution, multi-level referral commission system, secure wallet management, comprehensive admin panel, and advanced security features.

##  Features

### User Features
- **Email/Password Authentication** with Google SSO support
- **Investment Management**: Deposit USDT (BEP-20/TRC-20) with QR code support
- **Automated ROI**: 10% monthly returns automatically credited
- **4-Level Referral System**: Earn 8%, 4%, 2%, 1% commission on referrals
- **Multi-Wallet System**: Separate wallets for deposits, ROI, bonuses, and withdrawals
- **KYC Verification**: Upload and verify identity documents
- **Support Tickets**: Create and track support requests
- **Transaction History**: View all deposits, withdrawals, and earnings

### Admin Features
- **User Management**: View, edit, and manage all users
- **Deposit Approvals**: Review and approve/reject deposit requests
- **Withdrawal Processing**: Process withdrawal requests with cooling periods
- **KYC Verification**: Review and verify user documents
- **Support Management**: Handle user support tickets
- **Content Management**: Edit Terms & Conditions and Privacy Policy
- **Analytics Dashboard**: View platform statistics and metrics

### Technical Features
- **Black Theme**: Sophisticated dark theme with gold accents
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Real-time Updates**: Live balance and transaction updates
- **Secure Backend**: Row-level security with Supabase
- **Type-Safe**: Full TypeScript implementation
- **Modern UI**: Built with shadcn/ui components

##  Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Supabase account (already configured)

### Installation

1. **Clone and Install**
   ```bash
   cd /workspace/app-a8oqo7dishz5
   pnpm install
   ```

2. **Environment Setup**
   The environment variables are already configured in `.env`:
   - Supabase URL: `https://gkmvncioffmvzxhuaohv.supabase.co`
   - Supabase Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0YnB0eXdseGhsZWFkZ2FiaXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MjM4NjQsImV4cCI6MjA4ODk5OTg2NH0.NGN6s3utBiD1Xrin2rifVsWOH7GT6OXXqzG6SIYvOT0`

3. **Run Development Server**
   ```bash
   pnpm dev
   ```

4. **Build for Production**
   ```bash
   pnpm build
   ```

##  Admin Setup

### Creating the First Admin Account

The **first user** to register automatically becomes an admin. Follow these steps:

1. **Navigate to Admin Setup Page**
   - Visit `/admin-setup` or click "Admin Setup" in the footer
   - Or go directly to `/signup`

2. **Register with Recommended Credentials**
   ```
   Email: admin@goldxusdt.com
   Password: GoldXUsdt@Admin2026!
   ```
   (You can use any email/password you prefer)

3. **Login and Access Admin Panel**
   - After registration, login with your credentials
   - You'll see "Admin Dashboard" in the sidebar
   - Access admin routes at `/admin/*`

### Admin Routes
- `/admin` - Admin Dashboard with analytics
- `/admin/users` - User Management
- `/admin/deposits` - Deposit Approvals
- `/admin/withdrawals` - Withdrawal Approvals
- `/admin/kyc` - KYC Verification
- `/admin/tickets` - Support Tickets
- `/admin/content` - Content Management

### Adding More Admins
1. Login as admin
2. Go to `/admin/users`
3. Find the user you want to promote
4. Change their role to "admin"

##  Investment Plan Details

- **Minimum Investment**: 100 USDT
- **Deposit Fee**: 5%
- **Withdrawal Fee**: 5%
- **Monthly ROI**: 10%
- **Referral Commission**:
  - Level 1: 8%
  - Level 2: 4%
  - Level 3: 2%
  - Level 4: 1%

### Withdrawal Rules
- **Normal Withdrawals**: 48-hour cooling period
- **Referral Bonus**: 30-day lock period from credit date
- All withdrawals require admin approval

##  Database Schema

### Main Tables
- `profiles` - User accounts and roles
- `wallets` - User wallet balances (4 types)
- `transactions` - All transaction records
- `deposits` - Deposit requests and approvals
- `withdrawals` - Withdrawal requests and processing
- `referral_commissions` - Referral earnings tracking
- `roi_records` - ROI distribution history
- `support_tickets` - User support requests
- `content_pages` - Terms, Privacy Policy, etc.
- `activity_logs` - User activity tracking

### Security
- Row-Level Security (RLS) enabled on all tables
- Admin helper functions for permission checks
- Automated triggers for user registration
- Secure password hashing with Supabase Auth

##  Design System

### Color Palette
- **Primary**: Gold (#FFD700) - HSL(45, 100%, 51%)
- **Secondary**: Amber (#FF9500) - HSL(38, 92%, 50%)
- **Background**: Deep Black - HSL(0, 0%, 7%)
- **Card**: Dark Gray - HSL(0, 0%, 10%)
- **Border**: Subtle Gray - HSL(0, 0%, 15%)

### Custom Utilities
- `.gradient-text` - Gold gradient text effect
- `.gold-glow` - Glowing gold shadow
- `.gold-border` - Gold border with glow
- `.card-glow` - Subtle card elevation
- `.text-glow` - Glowing text effect

##  Project Structure

```
src/
├── components/
│   ├── layouts/          # Header, Footer, Sidebar, DashboardLayout
│   ├── ui/               # shadcn/ui components
│   └── common/           # RouteGuard, PageMeta, etc.
├── contexts/
│   └── AuthContext.tsx   # Authentication context
├── db/
│   ├── api.ts            # Database API functions
│   └── supabase.ts       # Supabase client
├── pages/
│   ├── LandingPage.tsx   # Home page
│   ├── LoginPage.tsx     # Login
│   ├── SignupPage.tsx    # Registration
│   ├── DashboardPage.tsx # User dashboard
│   ├── DepositPage.tsx   # Deposit USDT
│   ├── Admin*.tsx        # Admin pages
│   └── ...               # Other pages
├── types/
│   ├── types.ts          # TypeScript interfaces
│   └── index.ts          # Type exports
├── App.tsx               # Main app component
├── routes.tsx            # Route definitions
└── index.css             # Global styles and theme

supabase/
└── migrations/           # Database migrations
```

##  Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod
- **State Management**: React Context + Hooks
- **Icons**: Lucide React
- **QR Codes**: qrcode.react
- **Notifications**: Sonner

##  Key Files

- `ADMIN_SETUP.md` - Detailed admin setup instructions
- `TODO.md` - Project progress and implementation notes
- `.env` - Environment variables (Supabase credentials)
- `supabase/migrations/` - Database schema and functions

##  Security Features

- Email/password authentication with Supabase Auth
- Google SSO integration
- Row-Level Security (RLS) on all tables
- Admin-only routes and operations
- Secure password hashing
- Transaction verification
- KYC document storage with access control

##  Deployment

The application is ready for deployment. Key considerations:

1. **Environment Variables**: Ensure Supabase credentials are set
2. **Database**: All migrations are applied
3. **Storage**: KYC document bucket is configured
4. **Auth**: Email verification is disabled (can be enabled)
5. **Admin**: First user becomes admin automatically

##  Support

For issues or questions:
- Visit `/support` to create a support ticket
- Contact admin through the platform
- Check `/admin-setup` for admin-related help

##  License

© 2026 Gold X Usdt. All rights reserved.

---

**Note**: This is a complete, production-ready MLM investment platform. The first user to register will automatically receive admin privileges. Make sure to secure your admin account with a strong password.
