import { useState } from 'react';
import { Mail, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { invokeEdgeFunction } from '@/services/functions';

interface SMTPSettingsManagerProps {
  settings: any;
  updateSetting: (key: string, value: string) => void;
}

export function SMTPSettingsManager({ settings, updateSetting }: SMTPSettingsManagerProps) {
  const [testingEmail, setTestingEmail] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');

  const handleTestEmail = async () => {
    if (!testRecipient) {
      toast.error('Please enter a recipient email for testing');
      return;
    }

    setTestingEmail(true);
    try {
      const { error } = await invokeEdgeFunction('send-email', {
        body: {
          to: testRecipient,
          subject: 'SMTP Configuration Test',
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #D4AF37;">SMTP Test Successful!</h2>
              <p>This is a test email from your platform <strong>${settings.site_title || 'Gold X Usdt'}</strong>.</p>
              <p>Your SMTP settings are correctly configured and working.</p>
              <hr />
              <p style="font-size: 12px; color: #666;">Timestamp: ${new Date().toLocaleString()}</p>
            </div>
          `
        }
      });

      if (error) throw error;
      toast.success('Test email sent successfully! Please check your inbox.');
    } catch (error: unknown) {
      console.error('Email test failed:', error);
      toast.error('Failed to send test email. Check SMTP settings and console logs.');
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <Card className="v56-glass premium-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle>SMTP Configuration</CardTitle>
        </div>
        <CardDescription>Configure Hostinger or external SMTP for system emails</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>SMTP Host</Label>
            <Input
              value={settings.smtp_host}
              onChange={(e) => updateSetting('smtp_host', e.target.value)}
              placeholder="smtp.hostinger.com"
              className="premium-border bg-white/5"
            />
          </div>
          <div className="space-y-2">
            <Label>SMTP Port</Label>
            <Input
              value={settings.smtp_port}
              onChange={(e) => updateSetting('smtp_port', e.target.value)}
              placeholder="465"
              className="premium-border bg-white/5"
            />
          </div>
          <div className="space-y-2">
            <Label>SMTP User (Email Address)</Label>
            <Input
              value={settings.smtp_user}
              onChange={(e) => updateSetting('smtp_user', e.target.value)}
              placeholder="noreply@yourdomain.com"
              className="premium-border bg-white/5"
            />
          </div>
          <div className="space-y-2">
            <Label>SMTP Password</Label>
            <Input
              type="password"
              value={settings.smtp_pass}
              onChange={(e) => updateSetting('smtp_pass', e.target.value)}
              placeholder="••••••••"
              className="premium-border bg-white/5"
            />
          </div>
          <div className="space-y-2">
            <Label>Sender Name</Label>
            <Input
              value={settings.smtp_from_name}
              onChange={(e) => updateSetting('smtp_from_name', e.target.value)}
              placeholder="Gold X Usdt Team"
              className="premium-border bg-white/5"
            />
          </div>
          <div className="space-y-2">
            <Label>Sender Email (Must match User)</Label>
            <Input
              value={settings.smtp_from_email}
              onChange={(e) => updateSetting('smtp_from_email', e.target.value)}
              placeholder="noreply@yourdomain.com"
              className="premium-border bg-white/5"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 space-y-4">
          <div className="space-y-2">
            <Label className="text-primary font-bold">Verify Connection</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter email to receive test message"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="premium-border bg-white/5"
              />
              <Button 
                onClick={handleTestEmail} 
                disabled={testingEmail}
                className="premium-border rounded-xl font-bold uppercase tracking-widest text-[10px]"
                variant="outline"
              >
                {testingEmail ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Send className="h-3 w-3 mr-2" />}
                Send Test
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
