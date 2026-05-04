import { useState, useEffect } from 'react';
import { Bell, Smartphone, CheckCircle2, Loader2, Shield, TrendingUp, Wallet, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToPush, unsubscribeFromPush, getSubscriptionData, updateSubscriptionPreferences } from '@/services/notifications';
import { updateProfile } from '@/services/api';
import { supabase } from '@/services/supabase';
import { toast } from 'sonner';
import { SEOHead } from '@/utils/seo';

import type { NotificationCategory } from '@/types';

export default function NotificationPreferencesPage() {
  const { user, profile } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<NotificationCategory[]>([]);
  const [threshold, setThreshold] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [prefs, setPrefs] = useState({
    withdrawal: true,
    roi: true
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [subRes, categoriesRes] = await Promise.all([
        getSubscriptionData(user!.id),
        supabase.from('notification_categories').select('*').order('created_at', { ascending: true })
      ]);

      const sub = subRes as any;
      setIsSubscribed(!!sub);
      if (sub) {
        setUserCategories(sub.categories || []);
      }
      
      setAvailableCategories(categoriesRes.data || []);
      setThreshold(profile?.balance_threshold?.toString() || '0');
      setPrefs({
        withdrawal: profile?.withdrawal_status_notification_enabled ?? true,
        roi: profile?.daily_roi_notification_enabled ?? true
      });
    } catch (error) {
      console.error('Error loading notification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubscription = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribeFromPush(user.id);
        setIsSubscribed(false);
        setUserCategories([]);
        toast.success('Unsubscribed from push notifications');
      } else {
        await subscribeToPush(user.id);
        setIsSubscribed(true);
        // Default to all available categories
        const allCatNames = availableCategories.map(c => c.name);
        await updateSubscriptionPreferences(user.id, allCatNames);
        setUserCategories(allCatNames);
        toast.success('Successfully subscribed to push notifications!');
      }
    } catch (error: unknown) {
      console.error('Subscription error:', error);
      toast.error((error as any).message || 'Failed to update subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCategory = async (catName: string) => {
    if (!user || !isSubscribed) return;
    
    const newCats = userCategories.includes(catName) 
      ? userCategories.filter(c => c !== catName)
      : [...userCategories, catName];
    
    try {
      await updateSubscriptionPreferences(user.id, newCats);
      setUserCategories(newCats);
      toast.success('Preference updated');
    } catch (error) {
      toast.error('Failed to update preference');
    }
  };

  const handleTogglePref = async (key: 'withdrawal' | 'roi', value: boolean) => {
    if (!user) return;
    try {
      const updateData = key === 'withdrawal' 
        ? { withdrawal_status_notification_enabled: value }
        : { daily_roi_notification_enabled: value };
      
      await updateProfile(user.id, updateData);
      setPrefs(prev => ({ ...prev, [key]: value }));
      toast.success('Preference updated');
    } catch (error) {
      toast.error('Failed to update preference');
    }
  };

  const handleSaveThreshold = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const val = parseFloat(threshold);
      if (isNaN(val) || val < 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      await updateProfile(user.id, { balance_threshold: val });
      toast.success('Balance threshold updated');
    } catch (error) {
      toast.error('Failed to update threshold');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-8 max-w-4xl mx-auto">
      <SEOHead title="Notification Preferences" noindex={true} />
      
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-4xl font-black v56-gradient-text tracking-tight leading-tight flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          Notification <span className="text-foreground">Preferences</span>
        </h1>
        <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
          Manage how you receive updates and alerts
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="v56-glass premium-border overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-white/5">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Browser Push Notifications
                </CardTitle>
                <CardDescription>
                  Receive real-time updates directly in your browser.
                </CardDescription>
              </div>
              <Badge variant={isSubscribed ? "default" : "outline"} className={isSubscribed ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : ""}>
                {isSubscribed ? 'Subscribed' : 'Not Subscribed'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Enable Push Notifications</Label>
                <p className="text-xs text-muted-foreground">Get notified about blog posts, announcements, and account activity.</p>
              </div>
              <Switch 
                checked={isSubscribed} 
                onCheckedChange={handleToggleSubscription}
                disabled={actionLoading}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                Individual Alerts
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Withdrawal Status</Label>
                    <p className="text-[10px] text-muted-foreground">Notify when your withdrawal is approved or rejected.</p>
                  </div>
                  <Switch 
                    checked={prefs.withdrawal} 
                    onCheckedChange={(val) => handleTogglePref('withdrawal', val)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Daily ROI Payouts</Label>
                    <p className="text-[10px] text-muted-foreground">Notify when your daily ROI is credited.</p>
                  </div>
                  <Switch 
                    checked={prefs.roi} 
                    onCheckedChange={(val) => handleTogglePref('roi', val)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Tag className="h-3 w-3" />
                Notification Categories
              </h3>
              
              <div className="space-y-3">
                {availableCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold">{category.name}</Label>
                        <p className="text-[10px] text-muted-foreground">{category.description || 'Receive alerts for this category'}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={userCategories.includes(category.name)} 
                      onCheckedChange={() => handleToggleCategory(category.name)}
                      disabled={!isSubscribed} 
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Balance Alert Threshold</Label>
                  <p className="text-[10px] text-muted-foreground italic">Set a value to receive an alert when your total balance reaches it.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Wallet size={14} />
                  </div>
                  <Input 
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="Enter amount (e.g. 1000)"
                    className="pl-9 text-xs font-bold bg-white/5 border-white/10 rounded-xl h-11 transition-all focus:bg-white/10"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-[10px] font-black uppercase text-muted-foreground opacity-30">USDT</span>
                  </div>
                </div>
                <Button 
                  onClick={handleSaveThreshold}
                  disabled={actionLoading}
                  className="rounded-xl px-6 font-black uppercase tracking-widest text-[10px] h-11 shadow-lg shadow-primary/20"
                >
                  {actionLoading ? 'Saving...' : 'Set Threshold'}
                </Button>
              </div>
            </div>

            {isSubscribed && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-green-500">You are successfully subscribed!</p>
                  <p className="text-[10px] text-muted-foreground">Push notifications are active on this device. You can manage individual categories above.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border overflow-hidden opacity-50">
          <CardHeader className="bg-white/5 border-b border-white/5">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Manage automated emails sent to your registered address.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground italic">Email notification settings are managed by system security policy and cannot be disabled at this time.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
