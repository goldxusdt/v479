import { Home, TrendingUp, ArrowUpFromLine, Users, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/utils';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: TrendingUp, label: 'Invest', path: '/invest' },
  { icon: ArrowUpFromLine, label: 'Withdraw', path: '/withdrawal' },
  { icon: Users, label: 'Referrals', path: '/referrals' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/80 backdrop-blur-lg border-t border-border px-4 py-3 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
      <div className="flex justify-between items-center max-w-lg mx-auto h-full">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1.5 transition-all relative flex-1 touch-target",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("h-6 w-6 transition-transform", isActive && "scale-110")} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute -top-1 left-0 right-0 h-1 bg-primary rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
