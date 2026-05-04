import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdgeFunction } from '@/services/functions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShieldCheck, Loader2, LogOut } from 'lucide-react';

export default function AdminMFAVerifyPage() {
  const { user, setMfaVerified, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(''); // Authenticator Code
  const [emailOtp, setEmailOtp] = useState(''); // Email OTP
  const [isBackupMode, setIsBackupMode] = useState(false);

  const userEmail = user?.email || (location.state as any)?.email;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6 || (!isBackupMode && emailOtp.length < 6)) return;

    setLoading(true);
    try {
      const { error } = await invokeEdgeFunction('verify-otp', {
        body: {
          email: userEmail,
          email_otp: emailOtp,
          totp_code: otp,
          purpose: 'admin_login',
          isBackupCode: isBackupMode
        }
      });

      if (error) throw error;

      toast.success('Security verification successful');
      setMfaVerified(true);
      navigate('/admin');
    } catch (error: unknown) {
      toast.error((error as any).message || 'Invalid security code');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-primary/20 bg-card/50 backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldCheck className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Security Verification</CardTitle>
          <CardDescription>
            {isBackupMode 
              ? 'Enter one of your 8-character backup codes' 
              : 'Enter the 6-digit code from your authenticator app'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            {!isBackupMode && (
              <div className="space-y-2">
                <Label htmlFor="emailOtp" className="text-center block mb-2">
                  Email Verification Code
                </Label>
                <Input
                  id="emailOtp"
                  placeholder="000000"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  className="text-center text-xl tracking-[0.2em] font-bold h-12"
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-center block mb-2">
                {isBackupMode ? 'Enter Backup Code' : 'Authenticator App Code'}
              </Label>
              <Input
                id="otp"
                placeholder={isBackupMode ? 'XXXXXXXX' : '000000'}
                value={otp}
                onChange={(e) => setOtp(isBackupMode ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, '').substring(0, 6))}
                className="text-center text-xl tracking-[0.2em] font-bold h-12"
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full v56-primary-btn h-12" disabled={loading || otp.length < (isBackupMode ? 8 : 6) || (!isBackupMode && emailOtp.length < 6)}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isBackupMode ? 'Verify Backup Code' : 'Verify & Continue'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs" 
            onClick={() => {
              setIsBackupMode(!isBackupMode);
              setOtp('');
            }}
          >
            {isBackupMode ? 'Use Authenticator App' : 'Lost access? Use backup code'}
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-xs text-destructive hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="h-3 w-3 mr-2" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
