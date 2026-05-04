import { Loader2, Lock, Mail, Shield, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { Logo } from '@/components/common/Logo';
import { 
  rateLimit, 
  validateEmail, 
  sanitizeInput, 
  trackFailedLogin, 
  resetFailedLogins,
  getDeviceFingerprint,
  getGeolocationData
} from '@/services/security';
import { logLoginAttempt } from '@/services/api';
import { SEOHead } from '@/utils/seo';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string })?.from || '/dashboard';
  const initialEmail = (location.state as { email?: string })?.email || '';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { 
    signInWithEmail, 
    signInWithGoogle
  } = useAuth();

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!rateLimit(`login-${email}`, 5, 300000)) return;

    const lockoutStatus = trackFailedLogin(email);
    if (lockoutStatus.isLocked) {
      toast.error(`Account temporarily locked. Try again in ${lockoutStatus.lockoutTime} seconds.`);
      return;
    }

    setLoading(true);
    try {
      const sanitizedEmail = sanitizeInput(email);
      
      // Capture security data
      const fingerprint = await getDeviceFingerprint();
      const geolocation = await getGeolocationData();
      const ipAddress = geolocation?.ip || 'unknown';

      // Simple password login for all
      const res = await signInWithEmail(sanitizedEmail, password);
      
      if (res.error) {
        // Log failed attempt if profile exists
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', sanitizedEmail).maybeSingle();
        const profileId = (profile as any)?.id;
        
        await logLoginAttempt({
          email: sanitizedEmail,
          user_id: profileId,
          success: false,
          ip_address: ipAddress,
          geolocation,
          device_fingerprint: fingerprint
        });

        toast.error(res.error.message);
        if (lockoutStatus.remainingAttempts > 0) {
          toast.warning(`${lockoutStatus.remainingAttempts} attempts remaining before account lockout`);
        }
        return;
      }

      // Log successful attempt
      const { data: userProfile } = await supabase.from('profiles').select('id, role').eq('email', sanitizedEmail).maybeSingle();
      const userProfileId = (userProfile as any)?.id;
      const isAdmin = (userProfile as any)?.role === 'admin';
      
      await logLoginAttempt({
        email: sanitizedEmail,
        user_id: userProfileId,
        success: true,
        ip_address: ipAddress,
        geolocation,
        device_fingerprint: fingerprint
      });

      resetFailedLogins(email);

      if (isAdmin) {
        // Trigger Email OTP for admin login
        const { invokeEdgeFunction } = await import('@/services/functions');
        await invokeEdgeFunction('send-otp', {
          body: {
            email: sanitizedEmail,
            purpose: 'admin_login'
          }
        });
        
        toast.info('Admin verification required. Check your email for OTP.');
        navigate('/admin/mfa-verify', { state: { email: sanitizedEmail }, replace: true });
        return;
      }

      toast.success('Login successful! Welcome back.');
      navigate(from, { replace: true });
    } catch (error: unknown) {
      toast.error((error as any).message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error((error as any).message);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Login"
        description="Sign in to your Gold X Usdt account to manage your investments, track ROI, and access your referral dashboard."
        keywords={['login', 'sign in', 'gold x usdt', 'crypto login', 'usdt platform']}
        noindex={true}
      />
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-border">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <Logo size={64} className="" />
            </div>
            <CardTitle className="text-2xl text-center">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center">
              Sign in to your Gold X Usdt account
            </CardDescription>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-2">
              <Shield className="h-3 w-3" />
              <span>Secured with advanced encryption</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleInitialSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>

            <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
