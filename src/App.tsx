import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { RouteGuard } from '@/components/common/RouteGuard';
import './utils/i18n';

import { Header } from '@/components/layouts/Header';
import { Footer } from '@/components/layouts/Footer';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';

import routes from './routes';

import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/utils/utils';

function AppContent() {
  const location = useLocation();

  // Capture referral code from URL and store in sessionStorage
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref) {
      sessionStorage.setItem('referral_code', ref);
      console.log('Referral code stored:', ref);
    }
  }, [location]);

  const isAuthPage = ['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password'].includes(location.pathname);
  const isDashboardPage = location.pathname.startsWith('/dashboard') || 
                          location.pathname.startsWith('/deposit') || 
                          location.pathname.startsWith('/withdrawal') ||
                          location.pathname.startsWith('/referrals') ||
                          location.pathname.startsWith('/profile') ||
                          location.pathname.startsWith('/wallets') ||
                          location.pathname.startsWith('/support') ||
                          location.pathname.startsWith('/transactions') ||
                          location.pathname.startsWith('/analytics') ||
                          location.pathname.startsWith('/admin');
  
  const isAdminPanel = location.pathname.startsWith('/admin');

  return (
    <TooltipProvider>
      <IntersectObserver />
      <div className={cn(
        "flex flex-col min-h-screen",
        isAdminPanel && "no-animations no-motion"
      )}>
        {!isAuthPage && <Header />}
        {isDashboardPage ? (
          <DashboardLayout>
            <ErrorBoundary>
              <Routes>
                {routes.map((route, index) => (
                  <Route key={index} path={route.path} element={route.element} />
                ))}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </DashboardLayout>
        ) : (
          <main className="flex-grow">
            <ErrorBoundary>
              <Routes>
                {routes.map((route, index) => (
                  <Route key={index} path={route.path} element={route.element} />
                ))}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </main>
        )}
        {!isAuthPage && !isDashboardPage && <Footer />}
      </div>
      <Toaster />
      <Analytics />
      <SpeedInsights />
    </TooltipProvider>
  );
}

import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <RouteGuard>
          <AppContent />
        </RouteGuard>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
