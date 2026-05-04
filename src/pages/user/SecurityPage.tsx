import { Shield, Lock, Smartphone, History, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/utils/seo';

export default function SecurityPage() {
  const navigate = useNavigate();

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-4xl mx-auto">
      <SEOHead 
        title="Account Security" 
        description="Manage your account security settings, 2FA, and login history."
      />

      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-fit flex items-center gap-2 hover:bg-white/5" 
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="space-y-1">
          <h1 className="text-3xl font-black v56-gradient-text tracking-tighter uppercase italic">Account <span className="text-foreground">Security</span></h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-70">Protect your assets and personal data</p>
        </div>
      </div>

      {/* Development Notice */}
      <Card className="v56-glass border-primary/20 bg-primary/5 overflow-hidden">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-primary/20 border border-primary/30">
            <AlertCircle className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-primary">Module Under Development</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The account security management dashboard is under development. Here you will soon be able to manage your two-factor authentication, connected devices, and login history.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary uppercase text-[9px] font-black tracking-widest">Version 2.0 Feature</Badge>
              <Badge variant="outline" className="bg-green-500/10 border-green-500/20 text-green-500 uppercase text-[9px] font-black tracking-widest">Priority: High</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 grayscale-[0.5]">
        <Card className="v56-glass premium-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Smartphone className="h-5 w-5 text-blue-400" />
              </div>
              <CardTitle className="text-base font-bold">Two-Factor Auth</CardTitle>
            </div>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Coming Soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Add an extra layer of security to your account by requiring a code from your mobile device.</p>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <Lock className="h-5 w-5 text-purple-400" />
              </div>
              <CardTitle className="text-base font-bold">Password Management</CardTitle>
            </div>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Coming Soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Regularly update your password to keep your account secure. Password strength meter included.</p>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <History className="h-5 w-5 text-orange-400" />
              </div>
              <CardTitle className="text-base font-bold">Active Sessions</CardTitle>
            </div>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Coming Soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">View and manage all devices currently logged into your account. Remote logout capability.</p>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20">
                <ShieldCheck className="h-5 w-5 text-green-400" />
              </div>
              <CardTitle className="text-base font-bold">Security Audit</CardTitle>
            </div>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Coming Soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Comprehensive review of your security settings with personalized recommendations.</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pt-8">
        <div className="flex flex-col items-center gap-3 opacity-30">
          <Shield className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-[10px] uppercase font-black tracking-[0.4em] text-muted-foreground">Shield Protocol Active</p>
        </div>
      </div>
    </div>
  );
}
