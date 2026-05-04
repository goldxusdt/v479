import { Loader2, Lock, Mail, User, Phone, Shield, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalytics } from '@/services/analytics';
import { Logo } from '@/components/common/Logo';
import { supabase } from '@/services/supabase';
import { invokeEdgeFunction } from '@/services/functions';
import { 
  rateLimit, 
  validateEmail, 
  validatePasswordStrength, 
  validatePhone, 
  sanitizeInput,
  preventSQLInjection,
  detectAttackPattern
} from '@/services/security';
import { SEOHead } from '@/utils/seo';

import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot, 
  InputOTPSeparator 
} from '@/components/ui/input-otp';
import { useNavigate } from 'react-router-dom';

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const { signInWithGoogle } = useAuth();
  const { trackSignUp, trackFunnelStep } = useAnalytics();

  useEffect(() => {
    trackFunnelStep('signup_page_view', 2);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Security validations
    if (!validateEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Check for attack patterns
    if (detectAttackPattern(email) || detectAttackPattern(fullName)) {
      toast.error('Invalid input detected');
      return;
    }

    // SQL injection prevention
    if (!preventSQLInjection(email) || !preventSQLInjection(fullName)) {
      toast.error('Invalid characters detected in input');
      return;
    }

    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    if (!validatePhone(phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (!country) {
      toast.error('Please select your country');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Strong password validation
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.errors[0]);
      return;
    }

    // Rate limiting
    if (!rateLimit(`signup-${email}`, 3, 600000)) { // 3 attempts per 10 minutes
      return;
    }

    if (!acceptedTerms) {
      toast.error('You must accept the Terms & Conditions to continue');
      return;
    }

    setLoading(true);

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        toast.error('Email already registered. Please login instead.');
        setLoading(false);
        return;
      }

      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email);
      const sanitizedFullName = sanitizeInput(fullName);
      const sanitizedPhone = sanitizeInput(phone);

      // Send OTP to email
      const { data: otpData, error: otpError } = await invokeEdgeFunction('send-otp', {
        body: { 
          email: sanitizedEmail, 
          purpose: 'signup',
          userData: {
            fullName: sanitizedFullName,
            phone: sanitizedPhone,
            country,
            password,
            referralCode: referralCode || undefined
          }
        }
      });

      if (otpError) {
        throw otpError;
      }

      toast.success(otpData?.message || 'OTP code sent to your email. Please check your inbox.');
      setStep('otp');
    } catch (error: unknown) {
      console.error('Failed to send OTP:', error);
      toast.error((error as any).message || 'Failed to send OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit OTP code');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await invokeEdgeFunction('verify-otp', {
        body: { 
          email, 
          otp,
          purpose: 'signup'
        }
      });

      if (error) {
        throw error;
      }

      toast.success(data?.message || 'Account verified and created successfully!');
      
      // Track sign up success
      trackSignUp('email');
      
      // Navigate to login with state to pre-fill email
      navigate('/login', { state: { email } });
    } catch (error: unknown) {
      console.error('Failed to verify OTP:', error);
      toast.error((error as any).message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeEdgeFunction('send-otp', {
        body: { 
          email, 
          purpose: 'signup',
          userData: {
            fullName,
            phone,
            country,
            password,
            referralCode: referralCode || undefined
          }
        }
      });

      if (error) {
        throw error;
      }

      toast.success(data?.message || 'OTP code resent to your email');
    } catch (error: unknown) {
      console.error('Failed to resend OTP:', error);
      toast.error((error as any).message || 'Failed to resend OTP');
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
        title="Sign Up"
        description="Create your Gold X Usdt account and start earning 10% monthly ROI on your USDT investments. Join our multi-level referral program today."
        keywords={['sign up', 'register', 'create account', 'gold x usdt', 'crypto investment', 'usdt platform']}
        noindex={true}
      />
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-border">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <Logo size={64} className="" />
            </div>
            <CardTitle className="text-2xl text-center">
              {step === 'form' ? 'Create Account' : 'Verify Email'}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 'form' 
                ? 'Join Gold X Usdt and start earning today'
                : `Enter the 6-digit code sent to ${email}`
              }
            </CardDescription>
            {step === 'form' && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-2">
                <Shield className="h-3 w-3" />
                <span>Bank-level security & encryption</span>
              </div>
            )}
          </CardHeader>
        <CardContent className="space-y-4">
          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

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
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => {
                      // Only allow numbers, plus sign, and spaces
                      const value = e.target.value.replace(/[^\d+\s]/g, '');
                      setPhone(value);
                    }}
                    onKeyPress={(e) => {
                      // Prevent non-numeric characters (except + and space)
                      if (!/[\d+\s]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className="pl-10"
                    required
                    disabled={loading}
                    pattern="[\d+\s]+"
                    title="Please enter numbers only"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Numbers only (e.g., +1234567890)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={country} onValueChange={setCountry} disabled={loading} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
                    <SelectItem value="Australia">Australia</SelectItem>
                    <SelectItem value="Germany">Germany</SelectItem>
                    <SelectItem value="France">France</SelectItem>
                    <SelectItem value="India">India</SelectItem>
                    <SelectItem value="China">China</SelectItem>
                    <SelectItem value="Japan">Japan</SelectItem>
                    <SelectItem value="Brazil">Brazil</SelectItem>
                    <SelectItem value="Mexico">Mexico</SelectItem>
                    <SelectItem value="South Africa">South Africa</SelectItem>
                    <SelectItem value="Nigeria">Nigeria</SelectItem>
                    <SelectItem value="Singapore">Singapore</SelectItem>
                    <SelectItem value="UAE">United Arab Emirates</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
                    minLength={6}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralCode">Referral Code (Optional)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="referralCode"
                    type="text"
                    placeholder="Enter referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Checkbox 
                  id="terms" 
                  checked={acceptedTerms} 
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  className="border-primary data-[state=checked]:bg-primary"
                />
                <Label 
                  htmlFor="terms" 
                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I accept the{' '}
                  <Link to="/terms-and-conditions" className="text-primary hover:underline">
                    Terms & Conditions
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy-policy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </form>
          ) : (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10 border border-primary/20 ">
                  <Mail className="h-10 w-10 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Verify your email</h3>
                <p className="text-sm text-muted-foreground">
                  We've sent a 6-digit verification code to <span className="text-primary font-medium">{email}</span>.
                </p>
              </div>

              <div className="flex justify-center py-4">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="pt-2 space-y-4">
                <Button 
                  onClick={handleVerifyOTP} 
                  className="w-full" 
                  disabled={loading || otp.length !== 6}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify Account
                </Button>

                <p className="text-xs text-muted-foreground">
                  Didn't receive the email? Check your spam folder or click below to resend.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendLink}
                  disabled={loading}
                  className="w-full"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Resend OTP Code
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep('form')}
                  disabled={loading}
                  className="w-full text-sm"
                >
                  Back to Registration
                </Button>
              </div>
            </div>
          )}

          {step === 'form' && (
            <>
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
        </>
      )}
    </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
    </>
  );
}
