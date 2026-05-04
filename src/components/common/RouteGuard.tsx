import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface RouteGuardProps {
  children: React.ReactNode;
}

// Please add the pages that can be accessed without logging in to PUBLIC_ROUTES.
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/admin-setup',
  '/verify-email',
  '/reset-password',
  '/forgot-password',
  '/terms-and-conditions',
  '/privacy-policy',
  '/contact',
  '/events',
  '/announcements',
  '/blog',
  '/faq',
  '/calculator',
  '/kyc-policy',
  '/refund-policy',
  '/403',
  '/404'
];

function matchPublicRoute(path: string, patterns: string[]) {
  return patterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      return regex.test(path);
    }
    return path === pattern;
  });
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, profile, loading, mfaVerified, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    // Session Integrity Check (CWE-287)
    const currentUA = window.navigator.userAgent;
    const storedUA = sessionStorage.getItem('ua_integrity');
    if (user && storedUA && storedUA !== currentUA) {
      toast.error('Session anomaly detected. Please login again.');
      signOut();
      return;
    }
    if (user && !storedUA) {
      sessionStorage.setItem('ua_integrity', currentUA);
    }

    const isPublic = matchPublicRoute(location.pathname, PUBLIC_ROUTES);

    if (!user && !isPublic) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
      return;
    }

    // Admin MFA & Route Protection
    const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
    const isUserAdmin = profile?.role === 'admin';
    
    if (isUserAdmin) {
      const isMFASetupPage = location.pathname === '/admin/mfa-setup';
      const isMFAVerifyPage = location.pathname === '/admin/mfa-verify';
      const isMFAPage = isMFASetupPage || isMFAVerifyPage;
      
      // 1. If MFA is not enabled -> Force Setup
      if (!profile.mfa_enabled) {
        if (!isMFASetupPage) {
          console.log('Admin MFA not enabled, redirecting to setup');
          navigate('/admin/mfa-setup', { replace: true });
          return;
        }
      } 
      // 2. If MFA is enabled but not verified in current session -> Force Verification
      else if (!mfaVerified) {
        if (!isMFAVerifyPage) {
          console.log('Admin MFA enabled but not verified, redirecting to verification');
          navigate('/admin/mfa-verify', { replace: true });
          return;
        }
      }
      // 3. If MFA is enabled and verified -> Protect against setup/verify pages
      else if (isMFAPage) {
        console.log('Admin MFA already verified, redirecting to admin dashboard');
        navigate('/admin', { replace: true });
        return;
      }
    }

    if (isAdminRoute && !isUserAdmin) {
      toast.error('Unauthorized access. Admin privileges required.');
      navigate('/', { replace: true });
    }
  }, [user, profile, loading, mfaVerified, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}