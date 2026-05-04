import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AlertCircle, Clock } from 'lucide-react';

export function SessionTimeoutHandler() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [timeoutMinutes, setTimeoutMinutes] = useState(30);
  const [remainingSeconds, setRemainingSeconds] = useState(300); // 5 minutes warning
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = profile?.role === 'admin';
  const isAdminRoute = location.pathname.startsWith('/admin');

  const fetchTimeoutSetting = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'admin_session_timeout')
        .maybeSingle();

      if (data && !error) {
        setTimeoutMinutes(parseInt((data as any).value, 10) || 30);
      }
    } catch (err) {
      console.error('Error fetching timeout setting:', err);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setShowWarning(false);
    if (user) {
      // Log session timeout
      await (supabase.from('admin_security_logs') as any).insert({
        admin_id: user.id,
        event_type: 'admin_session_timeout',
        ip_address: 'browser_client',
        user_agent: navigator.userAgent,
        outcome: 'success',
        additional_details: { path: location.pathname }
      });
      
      await signOut();
      toast.info('Your session has expired due to inactivity. Please log in again.');
      navigate('/login');
    }
  }, [user, signOut, navigate, location.pathname]);

  const resetTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    if (!isAdmin || !isAdminRoute) return;

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningTimeMs = 5 * 60 * 1000; // 5 minutes before
    
    const timeToWarning = Math.max(timeoutMs - warningTimeMs, 1000); // At least 1 second

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingSeconds(Math.min(warningTimeMs / 1000, timeoutMinutes * 60));
      
      countdownTimerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, timeToWarning);

    logoutTimerRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutMs);
  }, [timeoutMinutes, isAdmin, isAdminRoute, handleLogout]);

  useEffect(() => {
    fetchTimeoutSetting();
  }, [fetchTimeoutSetting]);

  useEffect(() => {
    if (!isAdmin || !isAdminRoute) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setShowWarning(false);
      return;
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    const handleActivity = () => {
      if (!showWarning) {
        resetTimers();
      }
    };

    events.forEach((event) => window.addEventListener(event, handleActivity));
    resetTimers();

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isAdmin, isAdminRoute, resetTimers, showWarning]);

  const stayLoggedIn = () => {
    setShowWarning(false);
    resetTimers();
  };

  if (!showWarning) return null;

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Session Expiring
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p>Your admin session is about to expire due to inactivity.</p>
            <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
              <Clock className="h-8 w-8 text-primary mr-3 animate-pulse" />
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Remaining Time</p>
                <p className="text-3xl font-bold font-mono">
                  {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex sm:justify-between gap-2 pt-4">
          <Button variant="outline" onClick={handleLogout}>
            Logout Now
          </Button>
          <Button onClick={stayLoggedIn}>
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
