import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/contexts/SettingsContext';
import {
  LayoutDashboard,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  User,
  LifeBuoy,
  Settings,
  Shield,
  FileText,
  Calendar,
  Fingerprint,
  Ticket,
  Layout,
  History,
  BarChart3,
  ShieldCheck,
  Network,
  Send,
  Bot,
  Database,
  TrendingUp,
  HelpCircle,
  DollarSign,
  Megaphone,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/utils/utils';
import { Logo } from '@/components/common/Logo';

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
}

import { RightSlider } from './RightSlider';

export function Sidebar({ className, isCollapsed }: SidebarProps) {
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const location = useLocation();

  const siteTitle = settings?.site_title || 'GOLD X USDT';
  const siteTagline = settings?.site_tagline || 'Elite Investing';

  const userNavItems = [
    { type: 'group', label: 'Main' },
    { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard' },
    { icon: TrendingUp, label: 'Invest', path: '/invest' },
    { icon: Wallet, label: t('nav.wallets'), path: '/wallets' },
    { type: 'group', label: 'Actions' },
    { icon: ArrowDownToLine, label: t('nav.deposit'), path: '/deposit' },
    { icon: History, label: 'Deposit History', path: '/deposit/history' },
    { icon: ArrowUpFromLine, label: t('nav.withdrawal'), path: '/withdrawal' },
    { type: 'group', label: 'Network' },
    { icon: Users, label: t('nav.referrals'), path: '/referrals' },
    { icon: Network, label: 'Tree', path: '/referrals/advanced' },
    { icon: BarChart3, label: t('nav.analytics'), path: '/analytics' },
    { type: 'group', label: 'Account' },
    { icon: User, label: t('nav.profile'), path: '/profile' },
    { icon: ShieldCheck, label: 'Security', path: '/security' },
    { icon: FileText, label: t('nav.transactions'), path: '/transactions' },
    { icon: Megaphone, label: 'Announcements', path: '/announcements' },
    { icon: LifeBuoy, label: t('nav.support'), path: '/support' },
  ];

  const adminNavItems = [
    { type: 'group', label: 'Platform Core' },
    { icon: Shield, label: 'Admin Dashboard', path: '/admin' },
    { icon: LayoutDashboard, label: 'User View', path: '/dashboard' },
    
    { type: 'group', label: 'Blockchain API' },
    { icon: Bot, label: 'Telegram Alerts', path: '/admin/telegram-alerts' },
    { icon: Send, label: 'Notification Manager', path: '/admin/notifications' },
    
    { type: 'group', label: 'User Management' },
    { icon: Users, label: 'User Manager', path: '/admin/users' },
    { icon: Fingerprint, label: 'KYC Verification', path: '/admin/kyc' },
    
    { type: 'group', label: 'Investment Management' },
    { icon: DollarSign, label: 'Investment Options', path: '/admin/investment-options' },
    { icon: History, label: 'Investment History', path: '/admin/investment-history' },
    { icon: ShieldCheck, label: 'Invest. Validations', path: '/admin/investment-validations' },
    
    { type: 'group', label: 'Coupon Management' },
    { icon: Ticket, label: 'Coupons', path: '/admin/coupons' },
    
    { type: 'group', label: 'Financial Management' },
    { icon: ArrowDownToLine, label: 'Deposits', path: '/admin/deposits' },
    { icon: ArrowUpFromLine, label: 'Withdrawals', path: '/admin/withdrawals' },
    { icon: FileText, label: 'All Transactions', path: '/admin/transactions' },
    
    { type: 'group', label: 'Content Management' },
    { icon: Layout, label: 'Landing Page', path: '/admin/landing' },
    { icon: Megaphone, label: 'Announcements', path: '/admin/announcements' },
    { icon: FileText, label: 'Blog Posts', path: '/admin/blog' },
    { icon: Calendar, label: 'Event Management', path: '/admin/events' },
    { icon: ImageIcon, label: 'Media Library', path: '/admin/media' },
    { icon: HelpCircle, label: 'FAQ Management', path: '/admin/faqs' },
    
    { type: 'group', label: 'Security & Compliance' },
    { icon: ShieldCheck, label: 'Security Center', path: '/admin/security' },
    { icon: BarChart3, label: 'Security Dashboard', path: '/admin/security-dashboard' },
    { icon: History, label: 'Audit Logs', path: '/admin/audit-logs' },
    
    { type: 'group', label: 'Notification Management' },
    { icon: LifeBuoy, label: 'Support Tickets', path: '/admin/tickets' },
    
    { type: 'group', label: 'System Settings' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
    { icon: Database, label: 'Maintenance', path: '/admin/maintenance' },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  const isAdminPanel = location.pathname.startsWith('/admin');

  return (
    <aside className={cn(
      'bg-sidebar border-r border-sidebar-border relative overflow-hidden flex flex-col h-full w-full',
      isAdminPanel ? 'transition-none duration-0' : 'transition-all duration-500',
      className
    )}>
      {/* Background visual element */}
      <div className={cn(
        "absolute top-0 left-0 w-full h-full pointer-events-none opacity-5 bg-[radial-gradient(circle_at_0%_0%,hsl(var(--primary))_0%,transparent_50%)]",
        isAdminPanel && "animate-none"
      )} />
      
      <div className="flex flex-col h-full relative z-10">
        <div className={cn(
          "p-6 border-b border-sidebar-border flex items-center",
          isAdminPanel ? "transition-none" : "transition-all duration-500",
          isCollapsed ? "justify-center" : "justify-center"
        )}>
          <Link to="/" className="flex flex-col items-center gap-3 group">
            <div className={cn(
              "rounded-2xl bg-primary/10 border border-primary/20",
              isAdminPanel ? "transition-none" : "transition-all duration-500",
              isCollapsed ? "p-2" : "p-3"
            )}>
              <Logo size={isCollapsed ? 28 : 44} />
            </div>
            {!isCollapsed && (
              <div className={cn(
                "text-center animate-in fade-in duration-500",
                isAdminPanel && "animate-none duration-0"
              )}>
                <span className="font-black text-2xl tracking-tighter v56-gradient-text block uppercase">{siteTitle}</span>
                <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-muted-foreground opacity-60 italic">{siteTagline}</span>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto nav-scrollbar">
          {navItems.map((item, idx) => {
            if (item.type === 'group') {
              if (isCollapsed) return <div key={idx} className="h-px bg-white/5 my-4 mx-2" />;
              return (
                <div key={idx} className="px-4 pt-6 pb-2 text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground opacity-40">
                  {item.label}
                </div>
              );
            }

            const Icon = item.icon!;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path!}
                data-testid={`sidebar-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  'flex items-center gap-4 py-3 rounded-2xl relative group touch-target',
                  isAdminPanel ? 'transition-none duration-0' : 'transition-all duration-300',
                  isCollapsed ? "justify-center px-0" : "px-4",
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-glow'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground desktop-hover-effect'
                )}
              >
                {isActive && !isCollapsed && (
                  <div className="absolute left-[-1.5rem] w-2 h-8 bg-primary rounded-r-full " />
                )}
                <Icon 
                  data-testid="nav-icon"
                  className={cn(
                    'w-5 h-5',
                    !isAdminPanel && 'transition-transform group-hover:scale-110',
                    isActive && 'text-primary'
                  )} 
                />
                {!isCollapsed && (
                  <span 
                    data-testid="nav-label"
                    className={cn(
                      "text-xs font-bold uppercase tracking-widest animate-in slide-in-from-left-2 duration-300",
                      isAdminPanel && "animate-none duration-0"
                    )}
                  >
                    {item.label}
                  </span>
                )}
                {isCollapsed && (
                  <div 
                    data-testid="nav-tooltip"
                    className={cn(
                      "absolute left-full ml-4 px-3 py-1 bg-popover text-popover-foreground rounded-md text-[10px] font-bold uppercase tracking-widest whitespace-nowrap z-50 pointer-events-none border border-border shadow-xl",
                      isAdminPanel ? "opacity-0 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
                    )}
                  >
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
          
          {/* Right Slider Trigger integrated into Sidebar */}
          <div className="pt-4 mt-4 border-t border-sidebar-border">
            <RightSlider isSidebarItem isCollapsed={isCollapsed} />
          </div>
        </nav>

        <div className={cn(
          "p-4 border-t border-sidebar-border",
          isAdminPanel ? "transition-none" : "transition-all duration-500",
          isCollapsed && "items-center"
        )}>
          {!isCollapsed ? (
            <div className={cn(
              "v56-glass p-4 rounded-2xl border border-white/5 bg-white/5 text-center animate-in fade-in duration-500",
              isAdminPanel && "animate-none duration-0"
            )}>
              <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Status</p>
              <div className="flex items-center justify-center gap-2">
                <div className={cn("w-2 h-2 rounded-full bg-green-500", !isAdminPanel && "animate-pulse")} />
                <span className="text-xs font-bold">Secure</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className={cn("w-2 h-2 rounded-full bg-green-500", !isAdminPanel && "animate-pulse")} />
            </div>
          )}
          {!isCollapsed && (
            <div className="mt-4 text-[10px] text-muted-foreground text-center font-bold tracking-widest opacity-50 uppercase">
              © 2026 GOLD X USDT
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
