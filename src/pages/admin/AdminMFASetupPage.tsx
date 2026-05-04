import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { invokeEdgeFunction } from '@/services/functions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShieldCheck, Copy, Loader2, RefreshCw, LogOut } from 'lucide-react';

export default function AdminMFASetupPage() {
  const { user, profile, refreshProfile, setMfaVerified } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [otp, setOtp] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const fetchSetupData = async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeEdgeFunction('mfa-setup');
      if (error) throw error;
      setSetupData(data);
    } catch (error: unknown) {
      console.error('Failed to fetch MFA setup data:', error);
      toast.error((error as any).message || 'Failed to initialize MFA setup');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.mfa_enabled) {
      navigate('/admin');
      return;
    }
    fetchSetupData();
  }, [profile]);

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData || otp.length !== 6) return;

    setLoading(true);
    try {
      const { data, error } = await invokeEdgeFunction('verifyTOTP', {
        body: {
          userId: user?.id,
          otp,
          purpose: 'totp_verification'
        }
      });

      if (error) throw error;

      toast.success('MFA enabled successfully!');
      if (data.backup_codes) {
        setBackupCodes(data.backup_codes);
      }
      setMfaVerified(true);
      await refreshProfile();
      
      if (!data.backup_codes) {
        navigate('/admin');
      }
    } catch (error: unknown) {
      toast.error((error as any).message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (backupCodes.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-primary/20 bg-card/50 backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <ShieldCheck className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">MFA Enabled!</CardTitle>
            <CardDescription>
              Please save these backup codes. They are the only way to access your account if you lose your authenticator app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
              {backupCodes.map((code, i) => (
                <div key={i} className="flex justify-between items-center group">
                  <span>{code}</span>
                </div>
              ))}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4" 
              onClick={() => copyToClipboard(backupCodes.join('\n'))}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy All Codes
            </Button>
          </CardContent>
          <CardFooter>
            <Button className="w-full v56-primary-btn" onClick={() => navigate('/admin')}>
              Done
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-primary/20 bg-card/50 backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldCheck className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {profile?.is_first_admin ? 'Welcome, System Administrator' : 'Setup Mandatory MFA'}
          </CardTitle>
          <CardDescription>
            {profile?.is_first_admin 
              ? 'As the first user, you have been assigned the Admin role. To secure the platform, you must enable Multi-Factor Authentication.'
              : 'Administrators are required to use Two-Factor Authentication to secure the platform.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-white rounded-xl">
              {setupData ? (
                <QRCodeSVG value={setupData.otpauth_url} size={200} />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center bg-muted animate-pulse rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Scan this QR code with your authenticator app</p>
              <p className="text-xs text-muted-foreground mt-1">(Google Authenticator, Authy, Microsoft Authenticator, etc.)</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Or enter code manually:</Label>
            <div className="flex gap-2">
              <Input 
                value={setupData?.secret || ''} 
                readOnly 
                className="bg-muted font-mono text-xs" 
              />
              <Button variant="ghost" size="icon" onClick={() => setupData && copyToClipboard(setupData.secret)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          <form onSubmit={handleVerifyAndEnable} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                className="text-center text-2xl tracking-[0.5em] font-black h-12"
                required
              />
            </div>
            <Button type="submit" className="w-full v56-primary-btn" disabled={loading || !setupData || otp.length !== 6}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Enable
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button variant="link" size="sm" onClick={fetchSetupData} disabled={loading} className="text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            Regenerate QR Code
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs text-destructive hover:text-destructive" 
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/login');
            }}
          >
            <LogOut className="h-3 w-3 mr-2" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

const Separator = () => <div className="h-[1px] w-full bg-primary/10 my-4" />;
