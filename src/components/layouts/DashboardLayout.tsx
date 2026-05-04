import { ReactNode, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { SessionTimeoutHandler } from '@/components/auth/SessionTimeoutHandler';
import { AdminNotificationListener } from '@/components/admin/AdminNotificationListener';
import { cn } from '@/utils/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAdminPanel = location.pathname.startsWith('/admin');

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className={cn(
      "flex min-h-screen w-full bg-background/95 overflow-hidden",
      isAdminPanel && "no-animations no-motion"
    )}>
      <SessionTimeoutHandler />
      {isAdminPanel && <AdminNotificationListener />}
      
      {/* Desktop Collapsible Sidebar */}
      <div className={cn(
        "hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-500 ease-in-out relative group",
        isCollapsed ? "w-20" : "w-72",
        isAdminPanel && "transition-none duration-0"
      )}>
        <Sidebar isCollapsed={isCollapsed} className="w-full" />
        
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute -right-4 top-10 h-8 w-8 rounded-full border border-sidebar-border bg-sidebar shadow-md z-50 opacity-0 group-hover:opacity-100 transition-opacity",
            isAdminPanel && "transition-none"
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <main className={cn(
        "flex-1 w-full overflow-x-hidden overflow-y-auto pt-16 md:pt-20 lg:pt-0 pb-20 lg:pb-0 scroll-smooth relative",
        isAdminPanel && "scroll-auto"
      )}>
        <div className={cn(
          "p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700",
          isAdminPanel && "animate-none fade-in-0 duration-0"
        )}>
          {children}
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}
